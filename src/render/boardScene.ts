// The Pixi scene for the 400×600 board: background, danger line, ghost guide, held-ball
// preview, and one BallView per live ball. Consumes worker snapshots/events and runs every
// render-only animation (§5.3 pop + coin-flip, §9.2 gaze/settle/spin, §9.2b squash, tier-11
// halo). Nothing here feeds back into physics.

import { Container, FillGradient, Graphics, type Application } from 'pixi.js';
import { PHYSICS } from '../config/physics';
import { APEX_TIER, tierRadiusPx } from '../config/tiers';
import type { BallSnapshot, SimEvent, Snapshot } from '../engine/types';
import { BallView, type GraphicsQuality } from './ballView';
import { getCoreTexture } from './coreArt';
import {
  ORIENTATION,
  advanceSettle,
  buildRotationMatrix,
  coinFlipYaw,
  computeGaze,
  createSettleState,
  displayAngleFor,
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
}

interface LiveBall {
  view: BallView;
  settle: SettleState;
  squashStartMs: number;
  squashAmp: number;
  popStartMs: number;
  lastX: number;
  lastY: number;
  lastAngle: number;
  kind: BallSnapshot['kind'];
  rot: Float32Array;
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
  private readonly bg = new Graphics();
  private readonly frame = new Graphics();
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

  private readonly app: Application;

  constructor(app: Application, opts: BoardSceneOptions) {
    this.app = app;
    this.opts = { ...opts };
    this.root.addChild(this.boardLayer);
    this.boardLayer.addChild(
      this.bg,
      this.frame,
      this.ghost,
      this.ballLayer,
      this.fxLayer,
      this.dangerLine,
    );
    this.setLand(opts.land ?? DEFAULT_LAND, opts.restored ?? true);
    this.drawFrame();
    this.drawDangerLine(false, 1);
    app.stage.addChild(this.root);
  }

  // --- layout -----------------------------------------------------------------------------

  /** Scales the logical board to fit (letterboxed, centred) in the given CSS-pixel area. */
  resize(width: number, height: number): void {
    this.scale = Math.min(width / BOARD_W, height / BOARD_H);
    this.offsetX = (width - BOARD_W * this.scale) / 2;
    this.offsetY = (height - BOARD_H * this.scale) / 2;
    this.root.scale.set(this.scale);
    this.root.position.set(this.offsetX, this.offsetY);
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

  setLand(land: LandId, restored: boolean): void {
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
    // soft ground band behind the floor
    this.bg.rect(0, BOARD_H * 0.82, BOARD_W, BOARD_H * 0.18).fill({ color: ground, alpha: 0.55 });
  }

  setOptions(opts: Partial<BoardSceneOptions>): void {
    const qualityChanged = opts.quality !== undefined && opts.quality !== this.opts.quality;
    const numbersChanged =
      opts.showTierNumbers !== undefined && opts.showTierNumbers !== this.opts.showTierNumbers;
    this.opts = { ...this.opts, ...opts };
    if (qualityChanged) {
      for (const [, b] of this.balls) b.view.destroy();
      this.balls.clear();
      this.ballLayer.removeChildren();
      if (this.heldView) {
        this.heldView.destroy();
        this.heldView = null;
      }
      this.heldTier = 0;
    } else if (numbersChanged) {
      for (const [, b] of this.balls) b.view.setTierNumberVisible(this.opts.showTierNumbers);
      this.heldView?.setTierNumberVisible(this.opts.showTierNumbers);
    }
    if (opts.land !== undefined || opts.restored !== undefined) {
      this.setLand(this.opts.land ?? DEFAULT_LAND, this.opts.restored ?? true);
    }
  }

  private drawFrame(): void {
    const g = this.frame;
    g.clear();
    // painted-looking walls: a soft inner shadow line on the three closed sides
    g.rect(0, 0, BOARD_W, BOARD_H).stroke({ width: 6, color: '#ffffff', alpha: 0.35 });
    g.moveTo(0, BOARD_H)
      .lineTo(BOARD_W, BOARD_H)
      .stroke({ width: 4, color: '#6b5a4a', alpha: 0.25 });
  }

  private drawDangerLine(warning: boolean, pulse: number): void {
    const g = this.dangerLine;
    g.clear();
    const y = PHYSICS.dangerLineYPx;
    const dash = 10;
    const gap = 8;
    const color = warning ? '#e0473f' : '#7a6a80';
    const alpha = warning ? 0.55 + 0.45 * pulse : 0.45;
    for (let x = 6; x < BOARD_W - 6; x += dash + gap) {
      g.moveTo(x, y).lineTo(Math.min(x + dash, BOARD_W - 6), y);
    }
    g.stroke({ width: warning ? 3 : 2, color, alpha, cap: 'round' });
  }

  // --- input ------------------------------------------------------------------------------

  setPointer(p: { x: number; y: number } | null): void {
    this.pointer = p;
  }

  /** Where the held ball sits on the rail and whether the ghost guide is shown. */
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
        if (b && !this.pendingPops.has(e.id) && this.clockMs - b.popStartMs > ORIENTATION.popMs) {
          // §9.2b: (re)start the envelope; never on the merge pop
          b.squashStartMs = this.clockMs;
          b.squashAmp = squashAmplitude(e.speedMps);
        }
        break;
      }
      case 'thaw': {
        const b = this.balls.get(e.id);
        b?.view.setFrozen(false);
        break;
      }
      default:
        break;
    }
  }

  private pendingPops = new Set<number>();

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
        // vanished without a merge event (e.g. apex parents handled above, or a reset)
        live.view.destroy();
        this.balls.delete(id);
      }
    }

    // parents shrinking to zero (§5.3)
    for (let i = this.dying.length - 1; i >= 0; i--) {
      const d = this.dying[i];
      const t = (this.clockMs - d.startMs) / ORIENTATION.parentShrinkMs;
      if (t >= 1) {
        d.view.destroy();
        this.dying.splice(i, 1);
      } else {
        d.view.setPop(1 - t);
      }
    }

    this.updateHeld(snap);
    this.updateDanger(snap);
  }

  private createLive(bs: BallSnapshot): LiveBall {
    const view = new BallView({
      tier: bs.kind === 'rock' ? 1 : bs.tier,
      radius: bs.radius,
      quality: this.opts.quality,
      coreTexture: getCoreTexture(bs.kind === 'rock' ? 1 : bs.tier),
      showTierNumber: this.opts.showTierNumbers,
      kind: bs.kind,
    });
    this.ballLayer.addChild(view.container);
    const live: LiveBall = {
      view,
      settle: createSettleState(),
      squashStartMs: -Infinity,
      squashAmp: 0,
      popStartMs: -Infinity,
      lastX: bs.x,
      lastY: bs.y,
      lastAngle: bs.angle,
      kind: bs.kind,
      rot: new Float32Array(9),
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
    live.lastX = bs.x;
    live.lastY = bs.y;
    live.lastAngle = bs.angle;
    live.view.setTransform(bs.x, bs.y, bs.angle);
    if (bs.kind === 'ice' && live.kind !== 'ice') live.view.setFrozen(true);
    if (bs.kind === 'ball' && live.kind === 'ice') live.view.setFrozen(false);
    live.kind = bs.kind;

    // §9.2 orientation
    const reduce = this.opts.reduceMotion;
    const atRest = isAtRest(bs.vx, bs.vy, bs.angvel);
    const settle = advanceSettle(live.settle, atRest, dtMs);
    const displayAngle = displayAngleFor(bs.angle, settle);
    let yaw = 0;
    let pitch = 0;
    if (!reduce) {
      const g = computeGaze({ x: bs.x, y: bs.y, pointer: this.pointer, vxPx: bs.vx, vyPx: bs.vy });
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
      } else {
        live.view.setPop(popScale(sincePop));
      }
    } else {
      live.view.setPop(1);
      live.view.container.alpha = 1;
    }

    // §9.2b squash
    const sinceSquash = this.clockMs - live.squashStartMs;
    if (!reduce && sinceSquash >= 0 && sinceSquash <= 220) {
      const { scaleX, scaleY } = squashScales(squashEnvelope(sinceSquash, live.squashAmp));
      live.view.setSquash(scaleX, scaleY);
    } else {
      live.view.setSquash(1, 1);
    }

    // tier-11 shimmer
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
        this.heldView = new BallView({
          tier,
          radius: tierRadiusPx(tier),
          quality: this.opts.quality,
          coreTexture: getCoreTexture(tier),
          showTierNumber: this.opts.showTierNumbers,
        });
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
      const g = computeGaze({ x, y: PHYSICS.dropRailYPx, pointer: this.pointer, vxPx: 0, vyPx: 0 });
      this.heldView.setOrientation(buildRotationMatrix(0, g.yaw, g.pitch));
    }
    if (this.ghostVisible) {
      const dash = 8;
      const gap = 8;
      const top = PHYSICS.dropRailYPx + r;
      for (let y = top; y < BOARD_H - 4; y += dash + gap) {
        this.ghost.moveTo(x, y).lineTo(x, Math.min(y + dash, BOARD_H - 4));
      }
      this.ghost.stroke({ width: 2, color: '#ffffff', alpha: 0.55, cap: 'round' });
      this.ghost
        .moveTo(x - r, PHYSICS.dropRailYPx)
        .lineTo(x + r, PHYSICS.dropRailYPx)
        .stroke({
          width: 1,
          color: '#ffffff',
          alpha: 0.3,
        });
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
    this.root.destroy({ children: true });
  }
}
