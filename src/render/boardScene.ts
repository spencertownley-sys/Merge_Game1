// The Pixi scene for the board: per-land frame and backdrop, the glass box whose rim is the
// danger line, the dotted drop guide, the held ball hanging above the rim, and one BallView per
// live ball. Consumes worker snapshots/events and runs every render-only animation (§5.3 pop +
// coin-flip, merge bursts, combo badges, §9.2 gaze/settle/spin, §9.2b squash, the held ball's
// waiting pulse, tier-11 halo) using the admin-tunable VisualTuning. Layout and effects follow
// the reference video (game design §2, revised 2026-10-10); all art and words are Smoosh's own.
// Nothing here feeds back into physics.

import {
  Assets,
  ColorMatrixFilter,
  Container,
  FillGradient,
  Graphics,
  Sprite,
  Text,
  Texture,
  type Application,
} from 'pixi.js';
import { PHYSICS } from '../config/physics';
import { APEX_TIER, tierDef, tierRadiusPx } from '../config/tiers';
import { mulberry32 } from '../engine/rng';
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
import type { LandId, WallBlock } from '../types';
import { clampDropX, landingOnWalls } from '../engine/walls';

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
  /** Fog levels (previewCount 0): soft mist drifts over the hanging zone. */
  fog?: boolean;
  /** Shaped boxes: static glass blocks inside the board (same geometry the sim uses). */
  walls?: readonly WallBlock[];
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

/** Greyed-out look for a land that has not been restored yet. */
export function dimFilter(): ColorMatrixFilter {
  const f = new ColorMatrixFilter();
  f.desaturate();
  f.brightness(1.04, true);
  return f;
}

/** A render-only effect; `tick` returns false once it is finished and destroyed. */
interface Effect {
  tick(nowMs: number): boolean;
}

const BOARD_W = PHYSICS.boardWidthPx;
const BOARD_H = PHYSICS.boardHeightPx;
/** The glass box's front rim, which is also the danger line (§7). */
const RIM_Y = PHYSICS.dangerLineYPx;
/** How far the back edge of the box's opening sits above and inside the front rim. */
const RIM_DEPTH = 16;
const RIM_INSET = 14;

const DISPLAY_FONT = "'Fredoka', 'Baloo 2', 'Nunito', system-ui, sans-serif";

/** Praise for a chain of merges, in Smoosh's own words (light gathering in a storybook sky). */
export function praiseFor(comboCount: number, apex: boolean): string | null {
  if (apex) return 'Luminous!';
  if (comboCount >= 6) return 'Dazzling!';
  if (comboCount === 5) return 'Radiant!';
  if (comboCount === 4) return 'Glowing!';
  if (comboCount === 3) return 'Bright!';
  return null;
}

/** The held ball's waiting pulse: a quick stretch, then back, every 720 ms (0..1). */
export function heldPulseEnvelope(clockMs: number): number {
  const t = clockMs % 720;
  if (t < 170) return Math.sin((t / 170) * (Math.PI / 2));
  if (t < 300) return Math.cos(((t - 170) / 130) * (Math.PI / 2));
  return 0;
}

/** Where a ball of radius r dropped at x first comes to rest against the pile (centre y). */
export function landingCenterY(x: number, r: number, balls: readonly BallSnapshot[]): number {
  let y = BOARD_H - r;
  for (const b of balls) {
    const reach = b.radius + r;
    const dx = Math.abs(b.x - x);
    if (dx >= reach) continue;
    const top = b.y - Math.sqrt(reach * reach - dx * dx);
    if (top < y) y = top;
  }
  return y;
}

export class BoardScene {
  readonly root = new Container();
  private readonly boardLayer = new Container();
  private readonly frame = new LandFrame();
  private readonly bg = new Graphics();
  private readonly bgImageHolder = new Container();
  private readonly glass = new Graphics();
  private readonly wallBlocks = new Graphics();
  private readonly frameEdge = new Graphics();
  private readonly dangerLine = new Graphics();
  private readonly ghost = new Graphics();
  private readonly ballLayer = new Container();
  private readonly fxLayer = new Container();
  private readonly fogLayer = new Container();
  private readonly textLayer = new Container();
  private readonly effects: Effect[] = [];
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
      this.glass,
      this.wallBlocks,
      this.ghost,
      this.ballLayer,
      this.fxLayer,
      this.fogLayer,
      this.dangerLine,
      this.textLayer,
    );
    this.boardLayer.addChild(this.frame.container, boardContent, boardMask, this.frameEdge);
    setArtStyle(opts.artStyle ?? 'gummy');
    setTierArtOverrides(opts.tierArt ?? {});
    this.artGen = artGeneration();
    this.applyLook();
    this.drawFrameEdge();
    this.drawGlass();
    this.drawDangerLine(false, 1);
    this.buildFog();
    this.drawWalls();
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
    // Spare height goes mostly above the box, so the merge-order tray sits close under it as in
    // the reference layout.
    const top = (height - fh * this.scale) * 0.72;
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
    // An unrestored land shows its painted art greyed out; restoring it brings the colour back
    // (ART_AND_STORY_DIRECTION.md §4.2).
    this.bgImageHolder.filters = restored ? [] : [dimFilter()];
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
        // cover the board, keeping the painting's proportions
        const k = Math.max(BOARD_W / tex.width, BOARD_H / tex.height);
        s.scale.set(k);
        s.position.set((BOARD_W - tex.width * k) / 2, (BOARD_H - tex.height * k) / 2);
        // a soft wash keeps the motes readable over the painting
        const wash = new Graphics().rect(0, 0, BOARD_W, BOARD_H).fill({
          color: '#fff8ee',
          alpha: 0.32,
        });
        this.bgImageHolder.addChild(s, wash);
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
    if (opts.fog !== undefined) this.fogLayer.visible = !!opts.fog;
    if (opts.walls !== undefined && opts.walls !== prev.walls) this.drawWalls();
    if (opts.showFrame !== undefined && opts.showFrame !== prev.showFrame) {
      const host = this.app.canvas;
      this.resize(host.clientWidth || host.width, host.clientHeight || host.height);
    }
  }

  /** Shaped-box blocks drawn as frosted glass: a pale, mostly opaque pane with a soft violet
   *  edge, so pillars and narrowed sides read clearly against any land's backdrop. */
  private drawWalls(): void {
    const g = this.wallBlocks;
    g.clear();
    for (const w of this.opts.walls ?? []) {
      const rad = Math.min(8, w.width / 2);
      g.roundRect(w.x, w.y, w.width, w.height, rad)
        .fill({ color: 0xf6f3ff, alpha: 0.82 })
        .stroke({ color: 0x8f86b8, alpha: 0.7, width: 2 });
      // a bright highlight down one edge so the block reads as glass, not a hole
      const hw = Math.max(2, Math.min(5, w.width * 0.15));
      g.roundRect(w.x + 4, w.y + 5, hw, Math.max(0, w.height - 10), 2).fill({
        color: 0xffffff,
        alpha: 0.95,
      });
    }
  }

  /** Mist over the hanging zone for fog levels: soft overlapping wisps, thick enough to feel
   *  like a marsh fog but thin enough that the held mote and the rim stay readable. */
  private buildFog(): void {
    const wisps = [
      { x: 60, y: 30, rx: 110, ry: 34 },
      { x: 220, y: 18, rx: 140, ry: 30 },
      { x: 360, y: 40, rx: 120, ry: 36 },
      { x: 140, y: 74, rx: 130, ry: 26 },
      { x: 300, y: 86, rx: 120, ry: 24 },
    ];
    for (const w of wisps) {
      const g = new Graphics();
      // Concentric fills fake a soft edge without a blur filter.
      for (let k = 4; k >= 1; k--) {
        const f = k / 4;
        g.ellipse(0, 0, w.rx * (0.55 + 0.45 * f), w.ry * (0.55 + 0.45 * f)).fill({
          color: 0xe6f0ee,
          alpha: 0.13,
        });
      }
      g.position.set(w.x, w.y);
      this.fogLayer.addChild(g);
    }
    this.fogLayer.visible = !!this.opts.fog;
  }

  private updateFog(): void {
    if (!this.fogLayer.visible || this.opts.reduceMotion) return;
    const t = this.clockMs / 1000;
    this.fogLayer.children.forEach((g, i) => {
      g.x += Math.sin(t * 0.35 + i * 1.7) * 0.12;
      g.alpha = 0.85 + 0.15 * Math.sin(t * 0.5 + i);
    });
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

  /** The glass box: a translucent body below the rim, the back edge of its opening drawn in
   *  perspective above the rim, and soft highlights down the walls. Drawn behind the balls. */
  private drawGlass(): void {
    const g = this.glass;
    g.clear();
    const backY = RIM_Y - RIM_DEPTH;
    // the opening seen from slightly above: back edge, and the two side edges down to the rim
    g.poly([0, RIM_Y, RIM_INSET, backY, BOARD_W - RIM_INSET, backY, BOARD_W, RIM_Y]).fill({
      color: '#ffffff',
      alpha: 0.14,
    });
    g.moveTo(0, RIM_Y)
      .lineTo(RIM_INSET, backY)
      .lineTo(BOARD_W - RIM_INSET, backY)
      .lineTo(BOARD_W, RIM_Y)
      .stroke({ width: 2, color: '#ffffff', alpha: 0.55, join: 'round' });
    // the body of the box
    g.rect(0, RIM_Y, BOARD_W, BOARD_H - RIM_Y).fill({ color: '#ffffff', alpha: 0.16 });
    g.rect(RIM_INSET, RIM_Y, BOARD_W - RIM_INSET * 2, BOARD_H - RIM_Y).fill({
      color: '#ffffff',
      alpha: 0.06,
    });
    // light catching the walls and floor
    g.rect(5, RIM_Y + 8, 5, BOARD_H - RIM_Y - 16).fill({ color: '#ffffff', alpha: 0.35 });
    g.rect(BOARD_W - 10, RIM_Y + 8, 3, BOARD_H - RIM_Y - 16).fill({
      color: '#ffffff',
      alpha: 0.22,
    });
    g.rect(0, BOARD_H - 6, BOARD_W, 6).fill({ color: '#ffffff', alpha: 0.3 });
  }

  /** The front rim of the glass box doubles as the danger line (§7): always visible, and it
   *  pulses red while the pile is over it. */
  private drawDangerLine(warning: boolean, pulse: number): void {
    const g = this.dangerLine;
    g.clear();
    g.moveTo(0, RIM_Y + 2)
      .lineTo(BOARD_W, RIM_Y + 2)
      .stroke({ width: 3, color: '#7a5a48', alpha: 0.12 });
    g.moveTo(0, RIM_Y)
      .lineTo(BOARD_W, RIM_Y)
      .stroke({
        width: warning ? 4 : 3,
        color: warning ? '#e0473f' : '#ffffff',
        alpha: warning ? 0.55 + 0.45 * pulse : 0.85,
        cap: 'round',
      });
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
        const tier = e.type === 'apex' ? APEX_TIER : e.tier;
        this.spawnMergeBurst(e.x, e.y, tier, e.atMs);
        if (e.type === 'merge' && e.comboCount >= 2)
          this.spawnComboBadge(e.resultId, e.x, e.y, e.comboCount);
        const praise = praiseFor(e.type === 'merge' ? e.comboCount : 0, e.type === 'apex');
        if (praise) this.spawnPraise(praise);
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

  /** A puff of the new tier's colour where the pair met, opening into a ring of droplets that
   *  fly out and fade, while the merged ball pops in at its centre. */
  private spawnMergeBurst(x: number, y: number, tier: number, atMs: number): void {
    if (this.opts.reduceMotion) return;
    const color = tierDef(Math.min(tier, APEX_TIER)).rimColor;
    const r = tierRadiusPx(Math.min(tier, APEX_TIER));
    // render-only scatter, seeded so a replay looks the same (never Math.random, §4)
    const rand = mulberry32((Math.round(x * 31 + y * 17) ^ (atMs | 0) ^ (tier << 20)) >>> 0);
    const container = new Container();
    container.position.set(x, y);
    this.fxLayer.addChild(container);
    const puffs: { g: Graphics; angle: number; dist: number; size: number }[] = [];
    const count = 12;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + rand() * 0.5;
      const size = r * (0.28 + rand() * 0.18);
      const g = new Graphics().circle(0, 0, size).fill({ color });
      container.addChild(g);
      puffs.push({ g, angle, dist: r * (0.15 + rand() * 0.3), size });
    }
    const drops: { g: Graphics; angle: number; speed: number }[] = [];
    for (let i = 0; i < 10; i++) {
      const g = new Graphics().circle(0, 0, 2 + rand() * 3).fill({ color });
      container.addChild(g);
      drops.push({ g, angle: rand() * Math.PI * 2, speed: r * (1.6 + rand() * 1.2) });
    }
    const start = this.clockMs;
    const puffMs = 140;
    const totalMs = 620;
    this.effects.push({
      tick: (now) => {
        const t = now - start;
        if (t >= totalMs) {
          container.destroy({ children: true });
          return false;
        }
        const grow = Math.min(1, t / puffMs);
        const open = Math.max(0, (t - puffMs) / (totalMs - puffMs)); // 0..1 after the puff
        const ease = 1 - (1 - open) * (1 - open);
        for (const p of puffs) {
          const d = p.dist + r * 1.1 * ease;
          p.g.position.set(Math.cos(p.angle) * d, Math.sin(p.angle) * d);
          p.g.scale.set((0.4 + 0.6 * grow) * (1 - 0.75 * ease));
          p.g.alpha = 1 - open;
        }
        for (const dr of drops) {
          const d = dr.speed * ease;
          dr.g.position.set(Math.cos(dr.angle) * d, Math.sin(dr.angle) * d);
          dr.g.alpha = open > 0 ? 1 - open : 0;
        }
        return true;
      },
    });
  }

  /** "×n" on the merged ball for a chain of merges; it rides along with the ball, then fades. */
  private spawnComboBadge(resultId: number, x: number, y: number, comboCount: number): void {
    const label = new Text({
      text: `×${comboCount}`,
      style: {
        fontFamily: DISPLAY_FONT,
        fontSize: 32,
        fontWeight: '800',
        fill: '#ffffff',
        stroke: { color: '#5b2433', width: 7, join: 'round' },
      },
    });
    label.anchor.set(0.5);
    label.position.set(x, y);
    this.textLayer.addChild(label);
    const start = this.clockMs;
    const holdMs = 1000;
    const fadeMs = 300;
    const reduce = this.opts.reduceMotion;
    this.effects.push({
      tick: (now) => {
        const t = now - start;
        if (t >= holdMs + fadeMs) {
          label.destroy();
          return false;
        }
        const ball = this.snapshot?.balls.find((b) => b.id === resultId);
        if (ball) label.position.set(ball.x, ball.y);
        const pop = reduce
          ? 1
          : t < 160
            ? 0.6 + 0.6 * Math.sin((t / 160) * Math.PI * 0.5)
            : 1.2 - Math.min(0.2, (t - 160) / 600);
        label.scale.set(pop);
        label.alpha = t > holdMs ? 1 - (t - holdMs) / fadeMs : 1;
        return true;
      },
    });
  }

  /** A praise word that zooms in over the box, overshoots, settles, then fades. */
  private spawnPraise(word: string): void {
    for (const c of [...this.textLayer.children]) if (c.label === 'praise') c.destroy();
    const label = new Text({
      text: word,
      style: {
        fontFamily: DISPLAY_FONT,
        fontSize: 46,
        fontWeight: '800',
        fill: '#ffd166',
        stroke: { color: '#b0413e', width: 8, join: 'round' },
        dropShadow: { color: '#7a2f3a', alpha: 0.35, blur: 2, distance: 3, angle: Math.PI / 2 },
      },
    });
    label.label = 'praise';
    label.anchor.set(0.5);
    label.position.set(BOARD_W / 2, RIM_Y + (BOARD_H - RIM_Y) * 0.22);
    this.textLayer.addChild(label);
    const start = this.clockMs;
    const inMs = 260;
    const holdMs = 900;
    const fadeMs = 280;
    const reduce = this.opts.reduceMotion;
    this.effects.push({
      tick: (now) => {
        const t = now - start;
        if (label.destroyed) return false;
        if (t >= inMs + holdMs + fadeMs) {
          label.destroy();
          return false;
        }
        let k = 1;
        if (!reduce && t < inMs) {
          const u = t / inMs; // 1.9 → 0.92 → 1: zoom in with a small overshoot
          k = u < 0.7 ? 1.9 - (0.98 * u) / 0.7 : 0.92 + (0.08 * (u - 0.7)) / 0.3;
        }
        label.scale.set(k);
        label.alpha = t > inMs + holdMs ? 1 - (t - inMs - holdMs) / fadeMs : Math.min(1, t / 80);
        return true;
      },
    });
  }

  // --- per-frame --------------------------------------------------------------------------

  /** Called from the Pixi ticker. dtMs is render time, never physics time. */
  update(dtMs: number): void {
    this.clockMs += dtMs;
    for (let i = this.effects.length - 1; i >= 0; i--)
      if (!this.effects[i].tick(this.clockMs)) this.effects.splice(i, 1);
    if (artGeneration() !== this.artGen) this.rebuildViews(); // custom art finished loading / style changed
    this.updateFog();
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
    live.view.setDisplayAngle(displayAngle);
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
    const x = clampDropX(this.heldX, r, this.opts.walls);
    // the waiting pulse stretches the held ball downward from its top (reference video)
    const reduce = this.opts.reduceMotion;
    const amp = reduce ? 0 : this.visual.heldPulse * heldPulseEnvelope(this.clockMs);
    this.heldView.setTransform(x, PHYSICS.dropRailYPx + r * amp, 0);
    this.heldView.setSquash(1 - amp * 0.35, 1 + amp);
    this.heldView.container.alpha = snap.canDrop ? 1 : 0.6;
    if (!reduce) {
      const g = computeGaze(
        { x, y: PHYSICS.dropRailYPx, pointer: this.pointer, vxPx: 0, vyPx: 0 },
        this.visual,
      );
      this.heldView.setOrientation(buildRotationMatrix(0, g.yaw, g.pitch));
    }
    if (this.ghostVisible) {
      // dotted guide in the held tier's colour, from under the ball to where it will land
      const color = tierDef(this.heldTier).rimColor;
      const top = PHYSICS.dropRailYPx + r + 10;
      const end = Math.min(landingCenterY(x, r, snap.balls), landingOnWalls(x, r, this.opts.walls));
      const spacing = 13;
      for (let y = top; y < end; y += spacing) {
        const fade = 1 - Math.max(0, (y - (end - 60)) / 60);
        this.ghost.circle(x, y, 2.6).fill({ color, alpha: 0.85 * fade });
      }
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
