// The Pixi scene for the 400×600 board: per-land frame, background, danger line, ghost guide,
// held-ball preview, and one BallView per live ball. Consumes worker snapshots/events and runs
// every render-only animation (§5.3 pop + coin-flip, §9.2 gaze/settle/spin, §9.2b squash,
// tier-11 halo) using the admin-tunable VisualTuning. Nothing here feeds back into physics.

import {
  Assets,
  Container,
  FillGradient,
  Graphics,
  Sprite,
  Texture,
  type Application,
} from 'pixi.js';
import { PHYSICS } from '../config/physics';
import { APEX_TIER, tierRadiusPx } from '../config/tiers';
import { DEFAULT_VISUAL, type ArtStyleId, type VisualTuning } from '../config/tuning';
import type { BallSnapshot, SimEvent, Snapshot } from '../engine/types';
import { BallView, type GraphicsQuality } from './ballView';
import { artGeneration, coreTextureFor, setArtStyle, setTierArtOverrides } from './artStyles';
import { FRAME, FRAME_H, FRAME_W, LandFrame } from './frame';
import {
  ORIENTATION,
  advanceSettle,
  buildRotationMatrix,
  coinFlipYaw,
  computeGaze,
  createSettleState,
  displayAngleFor,
  idleJiggleScales,
  isAtRest,
  popScale,
  squashAmplitude,
  squashEnvelope,
  squashScales,
  type SettleState,
} from './orientation';
import { DEFAULT_LAND, LAND_PALETTES } from './palette';
import type { LandId } from '../types';

export interface BoardSceneOptions {
  quality: GraphicsQuality;
  reduceMotion: boolean;
  showTierNumbers: boolean;
  land?: LandId;
  restored?: boolean;
  /** Admin-tunable feel (defaults to the design-doc values). */
  visual?: VisualTuning;
  artStyle?: ArtStyleId;
  tierArt?: Partial<Record<number, string>>;
  frameArtUrl?: string;
  backgroundArtUrl?: string;
  /** Hide the decorative frame (e.g. for the admin preview). */
  showFrame?: boolean;
}

interface LiveBall {
  view: BallView;
  settle: SettleState;
  squashStartMs: number;
  squashAmp: number;
  popStartMs: number;
  kind: BallSnapshot['kind'];
  rot: Float32Array;
  phase: number;
}

interface DyingBall {
  view: BallView;
  startMs: number;
}

const BOARD_W = PHYSICS.boardWidthPx;
const BOARD_H = PHYSICS.boardHeightPx;

export class BoardScene {
  readonly root = new Container();
  private readonly boardLayer = new Container();
  private readonly frame = new LandFrame();
  private readonly bg = new Graphics();
  private readonly bgImageHolder = new Container();
  private readonly frameEdge = new Graphics();
  private readonly dangerLine = new Graphics();
  private readonly ghost = new Graphics();
  private readonly ballLayer = new Container();
  private readonly fxLayer = new Container();
  private readonly balls = new Map<number, LiveBall>();
  private readonly dying: DyingBall[] = [];
  private heldView: BallView | null = null;
  private heldTier = 0;
  private heldX = BOARD_W / 2;
  private ghostVisible = false;
  private pointer: { x: number; y: number } | null = null;
  private snapshot: Snapshot | null = null;
  private clockMs = 0;
  private opts: BoardSceneOptions;
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;
  private warning = false;
  private artGen = artGeneration();
  private bgImageUrl: string | undefined;
  private pendingPops = new Set<number>();
  private readonly app: Application;

  constructor(app: Application, opts: BoardSceneOptions) {
    this.app = app;
    this.opts = { ...opts };
    this.root.addChild(this.boardLayer);
    this.boardLayer.position.set(FRAME.side, FRAME.top);
    // The board mask keeps the backdrop image and any overshoot inside the play area.
    const boardMask = new Graphics().rect(0, 0, BOARD_W, BOARD_H).fill({ color: 0xffffff });
    const boardContent = new Container();
    boardContent.mask = boardMask;
    boardContent.addChild(
      this.bg,
      this.bgImageHolder,
      this.ghost,
      this.ballLayer,
      this.fxLayer,
      this.dangerLine,
    );
    this.boardLayer.addChild(this.frame.container, boardContent, boardMask, this.frameEdge);
    setArtStyle(opts.artStyle ?? 'gummy');
    setTierArtOverrides(opts.tierArt ?? {});
    this.artGen = artGeneration();
    this.applyLook();
    this.drawFrameEdge();
    this.drawDangerLine(false, 1);
    app.stage.addChild(this.root);
  }

  private get visual(): VisualTuning {
    return this.opts.visual ?? DEFAULT_VISUAL;
  }

  private get frameVisible(): boolean {
    return this.opts.showFrame !== false;
  }

  // --- layout -----------------------------------------------------------------------------

  /** Scales the logical board (+ frame) to fit, letterboxed and centred, in a CSS-pixel area. */
  resize(width: number, height: number): void {
    const fw = this.frameVisible ? FRAME_W : BOARD_W;
    const fh = this.frameVisible ? FRAME_H : BOARD_H;
    this.scale = Math.min(width / fw, height / fh);
    const left = (width - fw * this.scale) / 2;
    const top = (height - fh * this.scale) / 2;
    this.root.scale.set(this.scale);
    this.root.position.set(left, top);
    this.boardLayer.position.set(
      this.frameVisible ? FRAME.side : 0,
      this.frameVisible ? FRAME.top : 0,
    );
    this.offsetX = left + this.boardLayer.position.x * this.scale;
    this.offsetY = top + this.boardLayer.position.y * this.scale;
  }

  /** Converts a CSS-pixel position relative to the canvas into board px. */
  toBoard(px: number, py: number): { x: number; y: number } {
    return { x: (px - this.offsetX) / this.scale, y: (py - this.offsetY) / this.scale };
  }

  get boardRect(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.offsetX,
      y: this.offsetY,
      width: BOARD_W * this.scale,
      height: BOARD_H * this.scale,
    };
  }

  // --- look -------------------------------------------------------------------------------

  private applyLook(): void {
    const land = this.opts.land ?? DEFAULT_LAND;
    const restored = this.opts.restored ?? true;
    const p = LAND_PALETTES[land] ?? LAND_PALETTES[DEFAULT_LAND];
    const sky = restored
      ? { top: p.skyTop, bottom: p.skyBottom }
      : { top: p.dim.skyTop, bottom: p.dim.skyBottom };
    const ground = restored ? p.ground : p.dim.ground;
    this.bg.clear();
    const grad = new FillGradient({
      type: 'linear',
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      colorStops: [
        { offset: 0, color: sky.top },
        { offset: 1, color: sky.bottom },
      ],
      textureSpace: 'local',
    });
    this.bg.rect(0, 0, BOARD_W, BOARD_H).fill(grad);
    this.bg.rect(0, BOARD_H * 0.82, BOARD_W, BOARD_H * 0.18).fill({ color: ground, alpha: 0.55 });

    this.frame.container.visible = this.frameVisible;
    if (this.frameVisible) this.frame.set(land, restored, this.opts.frameArtUrl);
    this.setBackgroundImage(this.opts.backgroundArtUrl);
  }

  private setBackgroundImage(url?: string): void {
    if (url === this.bgImageUrl) return;
    this.bgImageUrl = url;
    this.bgImageHolder.removeChildren().forEach((c) => c.destroy());
    if (!url) return;
    const wanted = url;
    Assets.load<Texture>({ src: url, alias: `bg#${url}`, loadParser: 'loadTextures' })
      .then((tex) => {
        if (this.bgImageUrl !== wanted) return;
        const s = new Sprite(tex);
        s.width = BOARD_W;
        s.height = BOARD_H;
        this.bgImageHolder.addChild(s);
      })
      .catch((err) =>
        console.warn('Background art failed to load; using the palette backdrop.', err),
      );
  }

  setOptions(opts: Partial<BoardSceneOptions>): void {
    const prev = this.opts;
    this.opts = { ...prev, ...opts };
    if (opts.artStyle !== undefined) setArtStyle(opts.artStyle);
    if (opts.tierArt !== undefined) setTierArtOverrides(opts.tierArt);
    const rebuild =
      (opts.quality !== undefined && opts.quality !== prev.quality) ||
      artGeneration() !== this.artGen;
    if (rebuild) this.rebuildViews();
    else if (opts.showTierNumbers !== undefined && opts.showTierNumbers !== prev.showTierNumbers) {
      for (const [, b] of this.balls) b.view.setTierNumberVisible(this.opts.showTierNumbers);
      this.heldView?.setTierNumberVisible(this.opts.showTierNumbers);
    }
    if (
      opts.land !== undefined ||
      opts.restored !== undefined ||
      opts.frameArtUrl !== undefined ||
      opts.backgroundArtUrl !== undefined ||
      opts.showFrame !== undefined
    ) {
      this.applyLook();
    }
    if (opts.showFrame !== undefined && opts.showFrame !== prev.showFrame) {
      const host = this.app.canvas;
      this.resize(host.clientWidth || host.width, host.clientHeight || host.height);
    }
  }

  /** Throws away every ball view so the next update rebuilds them with the current art. */
  private rebuildViews(): void {
    for (const [, b] of this.balls) b.view.destroy();
    this.balls.clear();
    for (const d of this.dying) d.view.destroy();
    this.dying.length = 0;
    this.heldView?.destroy();
    this.heldView = null;
    this.heldTier = 0;
    this.artGen = artGeneration();
  }

  private drawFrameEdge(): void {
    const g = this.frameEdge;
    g.clear();
    g.rect(0, 0, BOARD_W, BOARD_H).stroke({ width: 4, color: '#ffffff', alpha: 0.3 });
  }

  private drawDangerLine(warning: boolean, pulse: number): void {
    const g = this.dangerLine;
    g.clear();
    const y = PHYSICS.dangerLineYPx;
    const dash = 10;
    const gap = 8;
    const color = warning ? '#e0473f' : '#7a6a80';
    const alpha = warning ? 0.55 + 0.45 * pulse : 0.45;
    for (let x = 6; x < BOARD_W - 6; x += dash + gap)
      g.moveTo(x, y).lineTo(Math.min(x + dash, BOARD_W - 6), y);
    g.stroke({ width: warning ? 3 : 2, color, alpha, cap: 'round' });
  }

  // --- input ------------------------------------------------------------------------------

  setPointer(p: { x: number; y: number } | null): void {
    this.pointer = p;
  }

  setHeld(x: number, ghostVisible: boolean): void {
    this.heldX = x;
    this.ghostVisible = ghostVisible;
  }

  // --- sim feed ---------------------------------------------------------------------------

  applyFrame(snapshot: Snapshot, events: SimEvent[]): void {
    this.snapshot = snapshot;
    for (const e of events) this.handleEvent(e);
  }

  private handleEvent(e: SimEvent): void {
    switch (e.type) {
      case 'merge':
      case 'apex': {
        for (const pid of e.parentIds) {
          const b = this.balls.get(pid);
          if (!b) continue;
          this.balls.delete(pid);
          b.view.setSquash(1, 1);
          this.dying.push({ view: b.view, startMs: this.clockMs });
        }
        if (e.type === 'merge') this.pendingPops.add(e.resultId);
        this.spawnMergeBurst(e.x, e.y, e.type === 'apex' ? APEX_TIER : e.tier);
        break;
      }
      case 'impact': {
        const b = this.balls.get(e.id);
        if (e.speedMps < this.visual.impactThresholdMps) break;
        if (b && !this.pendingPops.has(e.id) && this.clockMs - b.popStartMs > ORIENTATION.popMs) {
          // §9.2b: (re)start the envelope; never on the merge pop
          b.squashStartMs = this.clockMs;
          b.squashAmp = squashAmplitude(e.speedMps, this.visual.impactThresholdMps);
        }
        break;
      }
      case 'thaw': {
        this.balls.get(e.id)?.view.setFrozen(false);
        break;
      }
      default:
        break;
    }
  }

  private spawnMergeBurst(x: number, y: number, tier: number): void {
    if (this.opts.reduceMotion) return;
    const g = new Graphics();
    const r = tierRadiusPx(Math.min(tier, APEX_TIER));
    g.circle(0, 0, r * 0.6).fill({ color: '#ffffff', alpha: 0.6 });
    g.position.set(x, y);
    this.fxLayer.addChild(g);
    const start = this.clockMs;
    const dur = 260;
    const tick = () => {
      const t = (this.clockMs - start) / dur;
      if (t >= 1) {
        this.app.ticker.remove(tick);
        g.destroy();
        return;
      }
      g.scale.set(1 + t * 1.6);
      g.alpha = 0.6 * (1 - t);
    };
    this.app.ticker.add(tick);
  }

  // --- per-frame --------------------------------------------------------------------------

  /** Called from the Pixi ticker. dtMs is render time, never physics time. */
  update(dtMs: number): void {
    this.clockMs += dtMs;
    if (artGeneration() !== this.artGen) this.rebuildViews(); // custom art finished loading / style changed
    const snap = this.snapshot;
    if (!snap) return;

    const seen = new Set<number>();
    for (const bs of snap.balls) {
      seen.add(bs.id);
      let live = this.balls.get(bs.id);
      if (!live) live = this.createLive(bs);
      this.updateLive(live, bs, dtMs);
    }
    for (const [id, live] of this.balls) {
      if (!seen.has(id)) {
        live.view.destroy();
        this.balls.delete(id);
      }
    }

    for (let i = this.dying.length - 1; i >= 0; i--) {
      const d = this.dying[i];
      const t = (this.clockMs - d.startMs) / ORIENTATION.parentShrinkMs;
      if (t >= 1) {
        d.view.destroy();
        this.dying.splice(i, 1);
      } else d.view.setPop(1 - t);
    }

    this.updateHeld(snap);
    this.updateDanger(snap);
  }

  private makeView(tier: number, radius: number, kind?: BallSnapshot['kind']): BallView {
    return new BallView({
      tier,
      radius,
      quality: this.opts.quality,
      artStyle: this.opts.artStyle ?? 'gummy',
      coreTexture: coreTextureFor(tier),
      showTierNumber: this.opts.showTierNumbers,
      kind,
    });
  }

  private createLive(bs: BallSnapshot): LiveBall {
    const view = this.makeView(bs.kind === 'rock' ? 1 : bs.tier, bs.radius, bs.kind);
    this.ballLayer.addChild(view.container);
    const live: LiveBall = {
      view,
      settle: createSettleState(),
      squashStartMs: -Infinity,
      squashAmp: 0,
      popStartMs: -Infinity,
      kind: bs.kind,
      rot: new Float32Array(9),
      phase: (bs.id * 0.618) % (Math.PI * 2),
    };
    if (this.pendingPops.has(bs.id)) {
      this.pendingPops.delete(bs.id);
      live.popStartMs = this.clockMs;
      if (this.opts.reduceMotion) view.container.alpha = 0;
    }
    this.balls.set(bs.id, live);
    return live;
  }

  private updateLive(live: LiveBall, bs: BallSnapshot, dtMs: number): void {
    const v = this.visual;
    live.view.setTransform(bs.x, bs.y, bs.angle);
    if (bs.kind === 'ice' && live.kind !== 'ice') live.view.setFrozen(true);
    if (bs.kind === 'ball' && live.kind === 'ice') live.view.setFrozen(false);
    live.kind = bs.kind;

    // §9.2 orientation
    const reduce = this.opts.reduceMotion;
    const atRest = isAtRest(bs.vx, bs.vy, bs.angvel);
    const settle = advanceSettle(live.settle, atRest, dtMs);
    const displayAngle = displayAngleFor(bs.angle, settle, v.visualSpinScale);
    let yaw = 0;
    let pitch = 0;
    if (!reduce) {
      const g = computeGaze(
        { x: bs.x, y: bs.y, pointer: this.pointer, vxPx: bs.vx, vyPx: bs.vy },
        v,
      );
      yaw = g.yaw;
      pitch = g.pitch;
    }
    const sincePop = this.clockMs - live.popStartMs;
    if (!reduce && sincePop >= 0 && sincePop < ORIENTATION.coinFlipMs) yaw += coinFlipYaw(sincePop);
    live.view.setOrientation(buildRotationMatrix(displayAngle, yaw, pitch, live.rot));
    live.view.setPointerFacing(Math.sign(yaw));

    // §5.3 pop (or crossfade under reduce-motion)
    if (sincePop >= 0 && sincePop < ORIENTATION.popMs) {
      if (reduce) {
        live.view.container.alpha = Math.min(1, sincePop / ORIENTATION.popMs);
        live.view.setPop(1);
      } else live.view.setPop(popScale(sincePop));
    } else {
      live.view.setPop(1);
      live.view.container.alpha = 1;
    }

    // §9.2b squash + admin idle jiggle
    let sx = 1;
    let sy = 1;
    const sinceSquash = this.clockMs - live.squashStartMs;
    if (!reduce && sinceSquash >= 0 && sinceSquash <= v.squashDurationMs) {
      const env = squashEnvelope(sinceSquash, live.squashAmp, v.squashDurationMs, v.jiggleCycles);
      const s = squashScales(env, v.squashAmplitudeX, v.squashAmplitudeY);
      sx = s.scaleX;
      sy = s.scaleY;
    }
    if (!reduce && v.idleJiggle > 0 && bs.kind !== 'rock') {
      const j = idleJiggleScales(this.clockMs, v.idleJiggle, live.phase);
      sx *= j.scaleX;
      sy *= j.scaleY;
    }
    live.view.setSquash(sx, sy);

    if (bs.tier === APEX_TIER && bs.kind === 'ball') {
      live.view.setHalo(reduce ? 0.35 : 0.25 + 0.25 * Math.sin(this.clockMs / 260));
    }
  }

  private updateHeld(snap: Snapshot): void {
    const tier = snap.gameOver ? 0 : snap.heldTier;
    if (tier !== this.heldTier) {
      this.heldView?.destroy();
      this.heldView = null;
      this.heldTier = tier;
      if (tier > 0) {
        this.heldView = this.makeView(tier, tierRadiusPx(tier));
        this.ballLayer.addChild(this.heldView.container);
      }
    }
    this.ghost.clear();
    if (!this.heldView) return;
    const r = this.heldView.radius;
    const x = Math.min(Math.max(this.heldX, r), BOARD_W - r);
    this.heldView.setTransform(x, PHYSICS.dropRailYPx, 0);
    this.heldView.container.alpha = snap.canDrop ? 1 : 0.6;
    if (!this.opts.reduceMotion) {
      const g = computeGaze(
        { x, y: PHYSICS.dropRailYPx, pointer: this.pointer, vxPx: 0, vyPx: 0 },
        this.visual,
      );
      this.heldView.setOrientation(buildRotationMatrix(0, g.yaw, g.pitch));
    }
    if (this.ghostVisible) {
      const dash = 8;
      const gap = 8;
      const top = PHYSICS.dropRailYPx + r;
      for (let y = top; y < BOARD_H - 4; y += dash + gap)
        this.ghost.moveTo(x, y).lineTo(x, Math.min(y + dash, BOARD_H - 4));
      this.ghost.stroke({ width: 2, color: '#ffffff', alpha: 0.55, cap: 'round' });
      this.ghost
        .moveTo(x - r, PHYSICS.dropRailYPx)
        .lineTo(x + r, PHYSICS.dropRailYPx)
        .stroke({ width: 1, color: '#ffffff', alpha: 0.3 });
    }
  }

  private updateDanger(snap: Snapshot): void {
    const pulse = 0.5 + 0.5 * Math.sin(this.clockMs / 120);
    if (snap.warning || this.warning !== snap.warning) {
      this.warning = snap.warning;
      this.drawDangerLine(snap.warning, this.opts.reduceMotion ? 1 : pulse);
    }
  }

  destroy(): void {
    for (const [, b] of this.balls) b.view.destroy();
    this.balls.clear();
    for (const d of this.dying) d.view.destroy();
    this.dying.length = 0;
    this.heldView?.destroy();
    this.frame.destroy();
    this.root.destroy({ children: true });
  }
}
