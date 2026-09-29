// The physics simulation: a pure, headless class wrapping Rapier2D. It runs inside the
// physics Web Worker (physics.worker.ts) in the app and directly in Node for the
// determinism tests. Everything here is driven by the fixed timestep (§2) and sim time —
// never Date.now()/performance.now() — so a given (seed, input log) always replays
// identically (CLAUDE.md "Determinism breaks silently").

import type RAPIER_NS from '@dimforge/rapier2d-compat';
import {
  DEFAULT_TUNING,
  MERGE_TIMING,
  PHYSICS,
  PX_PER_METER,
  IMPACT_SQUASH,
  type PhysicsTuning,
} from '../config/physics';
import { APEX_BONUS_POINTS, COMBO, comboMultiplier, scoreForMerge } from '../config/scoring';
import { APEX_TIER, TIER_COUNT, tierRadiusPx } from '../config/tiers';
import { SpawnBag } from './spawnBag';
import {
  isMergeEligible,
  pairKey,
  resolveMergePairs,
  type BallKind,
  type MergePair,
} from './mergeResolver';
import { advanceDangerTimer, createDangerTimer, graceMsFor, isBallOverLine } from './gameOver';
import type { BallSnapshot, SimEvent, SimInit, SimLevelConfig, Snapshot } from './types';

export type RapierModule = typeof RAPIER_NS;

type BallOrigin = 'drop' | 'merge' | 'obstacle';

interface BallRecord {
  id: number;
  tier: number;
  kind: BallKind;
  radiusPx: number;
  body: RAPIER_NS.RigidBody;
  collider: RAPIER_NS.Collider;
  colliderHandle: number;
  graceUntilMs: number;
  /** Velocity captured before the last world.step(), for impact-speed estimation. */
  prevVx: number;
  prevVy: number;
  removable: boolean;
}

const DT_SEC = PHYSICS.fixedTimestepSec;
const DT_MS = DT_SEC * 1000;

export class GameSim {
  private readonly R: RapierModule;
  private readonly world: RAPIER_NS.World;
  private readonly eventQueue: RAPIER_NS.EventQueue;
  private readonly wallColliders: RAPIER_NS.Collider[] = [];
  private readonly balls = new Map<number, BallRecord>();
  private readonly colliderToBall = new Map<number, number>();
  private readonly bag: SpawnBag;
  private readonly level: SimLevelConfig;
  private tuning: PhysicsTuning;

  private nextId = 1; // §5.3: monotonic, never reused
  private stepIndex = 0;
  private timeMs = 0;
  private score = 0;
  private comboCount = 0;
  private lastMergeAtMs = Number.NEGATIVE_INFINITY;
  private lastDropAtMs = Number.NEGATIVE_INFINITY;
  private dropsMade = 0;
  private heldTier: number;
  private topTier = 0;
  private readonly danger = createDangerTimer();
  private warningEmitted = false;
  private gameOverEmitted = false;
  private contactMs = new Map<string, number>();
  private windActive = false;
  private windDirection: -1 | 0 | 1 = 0;
  private pendingEvents: SimEvent[] = [];

  constructor(R: RapierModule, init: SimInit) {
    this.R = R;
    this.level = init.level ?? {};
    this.tuning = { ...DEFAULT_TUNING, ...(init.tuning ?? {}) };

    this.world = new R.World({ x: 0, y: this.tuning.gravity }); // y-down board space
    this.world.timestep = DT_SEC;
    this.world.numSolverIterations = 8; // stacks of 80 balls settle more cleanly than the default 4
    this.eventQueue = new R.EventQueue(true);

    this.buildWalls();
    this.bag = new SpawnBag(init.seed, this.level.spawnBag);
    this.heldTier = this.bag.next();

    for (const obstacle of this.level.obstacles ?? []) {
      if (obstacle.type === 'rock') {
        this.createBall({
          tier: 0,
          kind: 'rock',
          radiusPx: PHYSICS.rockRadiusPx,
          x: obstacle.x,
          y: obstacle.y,
          origin: 'obstacle',
          removable: obstacle.removable ?? false,
        });
      } else {
        this.createBall({
          tier: obstacle.tier,
          kind: 'ice',
          radiusPx: tierRadiusPx(obstacle.tier),
          x: obstacle.x,
          y: obstacle.y,
          origin: 'obstacle',
        });
      }
    }
  }

  // --- public API -----------------------------------------------------------------

  get isGameOver(): boolean {
    return this.danger.gameOver;
  }

  get currentTimeMs(): number {
    return this.timeMs;
  }

  canDrop(): boolean {
    if (this.danger.gameOver) return false;
    if (this.timeMs - this.lastDropAtMs < this.tuning.dropCooldownMs) return false;
    if (this.level.dropLimit !== undefined && this.dropsMade >= this.level.dropLimit) return false;
    return true;
  }

  /** Releases the held ball at board x (px). Returns false if the drop was refused
   *  (cooldown, drop limit, game over) — the caller should not consume the input. */
  drop(xPx: number): boolean {
    if (!this.canDrop()) return false;
    const tier = this.heldTier;
    const r = tierRadiusPx(tier);
    const x = Math.min(Math.max(xPx, r), PHYSICS.boardWidthPx - r);
    const ball = this.createBall({
      tier,
      kind: 'ball',
      radiusPx: r,
      x,
      y: PHYSICS.dropRailYPx,
      origin: 'drop',
    });
    this.lastDropAtMs = this.timeMs;
    this.dropsMade++;
    this.heldTier = this.bag.next();
    this.pendingEvents.push({ type: 'drop', id: ball.id, tier, x, atMs: this.timeMs });
    return true;
  }

  /** Advances exactly one fixed 1/120 s step (§2). No-op once the run is over so the board
   *  freezes for the results screen. */
  step(): void {
    if (this.danger.gameOver) return;
    this.stepIndex++;
    this.timeMs = this.stepIndex * DT_MS;

    this.updateWind();
    for (const b of this.balls.values()) {
      const v = b.body.linvel();
      b.prevVx = v.x;
      b.prevVy = v.y;
    }

    this.world.step(this.eventQueue);

    this.clampSpeeds();
    this.collectImpacts();
    this.resolveMerges();
    this.updateDanger();
  }

  /** Drains events produced since the last call. */
  takeEvents(): SimEvent[] {
    const out = this.pendingEvents;
    this.pendingEvents = [];
    return out;
  }

  snapshot(): Snapshot {
    const balls: BallSnapshot[] = [];
    for (const b of this.balls.values()) {
      const t = b.body.translation();
      const v = b.body.linvel();
      balls.push({
        id: b.id,
        tier: b.tier,
        kind: b.kind,
        x: t.x * PX_PER_METER,
        y: t.y * PX_PER_METER,
        angle: b.body.rotation(),
        vx: v.x * PX_PER_METER,
        vy: v.y * PX_PER_METER,
        angvel: b.body.angvel(),
        radius: b.radiusPx,
      });
    }
    balls.sort((a, b) => a.id - b.id);
    return {
      stepIndex: this.stepIndex,
      timeMs: this.timeMs,
      score: this.score,
      comboCount: this.comboCount,
      heldTier: this.heldTier,
      nextTiers: this.bag.peek(this.level.previewCount ?? 1),
      dropsMade: this.dropsMade,
      canDrop: this.canDrop(),
      balls,
      overLineMs: this.danger.overLineMs,
      warning: this.danger.warning,
      gameOver: this.danger.gameOver,
      topTier: this.topTier,
      windActive: this.windActive,
      windDirection: this.windDirection,
    };
  }

  /** Live dev tuning (game design §2 note). Applies to existing bodies too. */
  applyTuning(partial: Partial<PhysicsTuning>): void {
    this.tuning = { ...this.tuning, ...partial };
    this.world.gravity = { x: 0, y: this.tuning.gravity };
    for (const b of this.balls.values()) {
      b.body.setLinearDamping(this.tuning.linearDamping);
      b.body.setAngularDamping(this.tuning.angularDamping);
      b.collider.setRestitution(this.tuning.restitutionBallBall);
      b.collider.setFriction(this.tuning.frictionBallBall);
    }
    for (const w of this.wallColliders) {
      w.setRestitution(this.tuning.restitutionBallWall);
      w.setFriction(this.tuning.frictionBallWall);
    }
  }

  destroy(): void {
    this.eventQueue.free();
    this.world.free();
  }

  // --- world construction ------------------------------------------------------------

  private buildWalls(): void {
    const R = this.R;
    const W = PHYSICS.boardWidthPx / PX_PER_METER;
    const H = PHYSICS.boardHeightPx / PX_PER_METER;
    const T = PHYSICS.wallThicknessPx / PX_PER_METER;
    // Floor, left, right, and a ceiling above the drop rail so nothing can ever escape the
    // board. All static, 40 px thick (§2) to prevent tunnelling.
    const walls: [hx: number, hy: number, cx: number, cy: number][] = [
      [W / 2 + T, T / 2, W / 2, H + T / 2], // floor
      [T / 2, H / 2 + T, -T / 2, H / 2], // left
      [T / 2, H / 2 + T, W + T / 2, H / 2], // right
      [W / 2 + T, T / 2, W / 2, -T / 2], // ceiling
    ];
    for (const [hx, hy, cx, cy] of walls) {
      const desc = R.ColliderDesc.cuboid(hx, hy)
        .setTranslation(cx, cy)
        .setRestitution(this.tuning.restitutionBallWall)
        .setFriction(this.tuning.frictionBallWall)
        // Min rule so ball–wall friction is exactly frictionBallWall (§2), not an average
        // with the ball's own coefficient.
        .setFrictionCombineRule(R.CoefficientCombineRule.Min)
        .setRestitutionCombineRule(R.CoefficientCombineRule.Min);
      this.wallColliders.push(this.world.createCollider(desc));
    }
  }

  private createBall(opts: {
    tier: number;
    kind: BallKind;
    radiusPx: number;
    x: number;
    y: number;
    origin: BallOrigin;
    vx?: number;
    vy?: number;
    angvel?: number;
    removable?: boolean;
  }): BallRecord {
    const R = this.R;
    const id = this.nextId++;
    const bodyDesc = R.RigidBodyDesc.dynamic()
      .setTranslation(opts.x / PX_PER_METER, opts.y / PX_PER_METER)
      .setLinvel(opts.vx ?? 0, opts.vy ?? 0)
      .setAngvel(opts.angvel ?? 0)
      .setLinearDamping(this.tuning.linearDamping)
      .setAngularDamping(this.tuning.angularDamping)
      .setCcdEnabled(true); // §2: CCD on, alongside the speed clamp
    const body = this.world.createRigidBody(bodyDesc);
    const colliderDesc = R.ColliderDesc.ball(opts.radiusPx / PX_PER_METER)
      .setDensity(opts.kind === 'rock' ? PHYSICS.rockDensity : PHYSICS.density)
      .setRestitution(this.tuning.restitutionBallBall)
      .setFriction(this.tuning.frictionBallBall)
      .setActiveEvents(R.ActiveEvents.COLLISION_EVENTS);
    const collider = this.world.createCollider(colliderDesc, body);

    const record: BallRecord = {
      id,
      tier: opts.tier,
      kind: opts.kind,
      radiusPx: opts.radiusPx,
      body,
      collider,
      colliderHandle: collider.handle,
      graceUntilMs: this.timeMs + graceMsFor(opts.origin),
      prevVx: opts.vx ?? 0,
      prevVy: opts.vy ?? 0,
      removable: opts.removable ?? true,
    };
    this.balls.set(id, record);
    this.colliderToBall.set(collider.handle, id);
    if (opts.kind === 'ball' && opts.tier > this.topTier) this.topTier = opts.tier;
    return record;
  }

  private removeBall(b: BallRecord): void {
    this.colliderToBall.delete(b.colliderHandle);
    this.balls.delete(b.id);
    this.world.removeRigidBody(b.body); // also removes its collider
  }

  // --- per-step phases ------------------------------------------------------------------

  private clampSpeeds(): void {
    const max = this.tuning.maxSpeedClamp;
    for (const b of this.balls.values()) {
      const v = b.body.linvel();
      const s = Math.hypot(v.x, v.y);
      if (s > max) {
        const k = max / s;
        b.body.setLinvel({ x: v.x * k, y: v.y * k }, true);
      }
    }
  }

  /** Impact events for the render-side squash (§9.2b). Approach speed is estimated from the
   *  velocities captured before the step, so a hard landing reads as hard even though the
   *  solver has already absorbed it by the time we look. */
  private collectImpacts(): void {
    this.eventQueue.drainCollisionEvents((h1, h2, started) => {
      if (!started) return;
      const idA = this.colliderToBall.get(h1);
      const idB = this.colliderToBall.get(h2);
      const a = idA !== undefined ? this.balls.get(idA) : undefined;
      const b = idB !== undefined ? this.balls.get(idB) : undefined;
      if (a && b) {
        const ta = a.body.translation();
        const tb = b.body.translation();
        let nx = tb.x - ta.x;
        let ny = tb.y - ta.y;
        const len = Math.hypot(nx, ny) || 1;
        nx /= len;
        ny /= len;
        const approach = Math.abs((a.prevVx - b.prevVx) * nx + (a.prevVy - b.prevVy) * ny);
        this.emitImpact(a, approach);
        this.emitImpact(b, approach);
      } else if (a || b) {
        const ball = (a ?? b)!;
        this.emitImpact(ball, Math.hypot(ball.prevVx, ball.prevVy));
      }
    });
  }

  private emitImpact(b: BallRecord, speedMps: number): void {
    if (speedMps < IMPACT_SQUASH.impactThresholdMps) return;
    this.pendingEvents.push({ type: 'impact', id: b.id, speedMps, atMs: this.timeMs });
  }

  private surfacesTouching(a: BallRecord, b: BallRecord): boolean {
    const ta = a.body.translation();
    const tb = b.body.translation();
    const dist = Math.hypot(tb.x - ta.x, tb.y - ta.y) * PX_PER_METER;
    return dist <= a.radiusPx + b.radiusPx + PHYSICS.mergeContactEpsilonPx;
  }

  private resolveMerges(): void {
    // §5.1: candidates come from Rapier's narrow-phase contact pairs, re-checked for actual
    // surface overlap every step (so pairs that became eligible after contact began — e.g.
    // a thawed ice ball — are still caught).
    const candidates: MergePair[] = [];
    const nextContactMs = new Map<string, number>();
    const mergeContactMs = this.level.mergeContactMs ?? MERGE_TIMING.mergeContactMs;
    const ids = [...this.balls.keys()].sort((x, y) => x - y);
    for (const id of ids) {
      const a = this.balls.get(id)!;
      if (a.kind !== 'ball') continue;
      this.world.contactPairsWith(a.collider, (other) => {
        const otherId = this.colliderToBall.get(other.handle);
        if (otherId === undefined || otherId <= a.id) return;
        const b = this.balls.get(otherId)!;
        if (!isMergeEligible(a, b) || !this.surfacesTouching(a, b)) return;
        const key = pairKey(a.id, b.id);
        const ms = (this.contactMs.get(key) ?? 0) + DT_MS;
        nextContactMs.set(key, ms);
        // mergeContactMs 0 => merge on first contact (§5.1 default)
        if (mergeContactMs <= 0 || ms >= mergeContactMs) candidates.push([a.id, b.id]);
      });
    }
    this.contactMs = nextContactMs;

    // §5.2 ordering + one-merge-per-ball-per-step
    for (const [idA, idB] of resolveMergePairs(candidates)) {
      const a = this.balls.get(idA);
      const b = this.balls.get(idB);
      if (!a || !b) continue;
      this.merge(a, b);
    }
  }

  private merge(a: BallRecord, b: BallRecord): void {
    // Combo (§6): reset if the window has lapsed, then count this merge.
    if (this.timeMs - this.lastMergeAtMs > COMBO.windowMs) this.comboCount = 0;
    this.comboCount++;
    this.lastMergeAtMs = this.timeMs;

    const ta = a.body.translation();
    const tb = b.body.translation();
    const va = a.body.linvel();
    const vb = b.body.linvel();
    // Read everything off the parents BEFORE removing them — their Rapier handles are
    // invalid afterwards.
    const avgAngvel = (a.body.angvel() + b.body.angvel()) / 2;
    const x = ((ta.x + tb.x) / 2) * PX_PER_METER;
    const y = ((ta.y + tb.y) / 2) * PX_PER_METER;

    // §10.3 ice: thaws when any merge happens touching it.
    const thawIds = new Set<number>();
    for (const parent of [a, b]) {
      this.world.contactPairsWith(parent.collider, (other) => {
        const id = this.colliderToBall.get(other.handle);
        if (id === undefined) return;
        const ice = this.balls.get(id)!;
        if (ice.kind === 'ice' && this.surfacesTouching(parent, ice)) thawIds.add(id);
      });
    }

    if (a.tier >= APEX_TIER) {
      // §5.4 apex merge: both vanish, no tier-12, bonus × combo.
      const points = Math.floor(APEX_BONUS_POINTS * comboMultiplier(this.comboCount));
      this.score += points;
      this.removeBall(a);
      this.removeBall(b);
      this.pendingEvents.push({
        type: 'apex',
        atMs: this.timeMs,
        parentIds: [a.id, b.id],
        x,
        y,
        points,
        comboCount: this.comboCount,
      });
    } else {
      // §5.3 result ball: next tier, midpoint, averaged velocities, new monotonic id,
      // created at full radius immediately so physics shoves neighbours (chain reactions).
      const newTier = a.tier + 1;
      const points = scoreForMerge(newTier, this.comboCount);
      this.score += points;
      this.removeBall(a);
      this.removeBall(b);
      const result = this.createBall({
        tier: newTier,
        kind: 'ball',
        radiusPx: tierRadiusPx(newTier),
        x,
        y,
        origin: 'merge',
        vx: (va.x + vb.x) / 2,
        vy: (va.y + vb.y) / 2,
        angvel: avgAngvel,
      });
      this.pendingEvents.push({
        type: 'merge',
        atMs: this.timeMs,
        tier: newTier,
        parentIds: [a.id, b.id],
        resultId: result.id,
        x,
        y,
        points,
        comboCount: this.comboCount,
      });
    }

    for (const id of thawIds) {
      const ice = this.balls.get(id);
      if (!ice || ice.kind !== 'ice') continue;
      ice.kind = 'ball';
      if (ice.tier > this.topTier) this.topTier = ice.tier;
      this.pendingEvents.push({ type: 'thaw', id: ice.id, tier: ice.tier, atMs: this.timeMs });
    }
  }

  private updateDanger(): void {
    let anyOver = false;
    for (const b of this.balls.values()) {
      const y = b.body.translation().y * PX_PER_METER;
      if (isBallOverLine(y, b.radiusPx, b.graceUntilMs, this.timeMs)) {
        anyOver = true;
        break;
      }
    }
    advanceDangerTimer(this.danger, anyOver, DT_MS);
    if (this.danger.warning && !this.warningEmitted) {
      this.warningEmitted = true;
      this.pendingEvents.push({ type: 'warning', atMs: this.timeMs });
    }
    if (!this.danger.warning) this.warningEmitted = false;
    if (this.danger.gameOver && !this.gameOverEmitted) {
      this.gameOverEmitted = true;
      this.pendingEvents.push({
        type: 'gameOver',
        atMs: this.timeMs,
        score: this.score,
        topTier: this.topTier,
      });
    }
  }

  /** §10.3 wind: periodic lateral force on all balls. Gust k (k ≥ 1) starts at
   *  k × everySec and lasts durationSec; direction alternates, starting rightward. */
  private updateWind(): void {
    const wind = this.level.wind;
    if (!wind || wind.everySec <= 0) return;
    const tSec = this.timeMs / 1000;
    const gustIndex = Math.floor(tSec / wind.everySec);
    const phase = tSec - gustIndex * wind.everySec;
    const active = gustIndex >= 1 && phase < wind.durationSec;
    const direction: -1 | 0 | 1 = active ? (gustIndex % 2 === 1 ? 1 : -1) : 0;

    if (active) {
      for (const b of this.balls.values()) {
        b.body.resetForces(false);
        b.body.addForce({ x: direction * wind.force * b.body.mass(), y: 0 }, true);
      }
    } else if (this.windActive) {
      for (const b of this.balls.values()) b.body.resetForces(true);
    }
    if (active !== this.windActive || direction !== this.windDirection) {
      this.pendingEvents.push({ type: 'wind', active, direction, atMs: this.timeMs });
    }
    this.windActive = active;
    this.windDirection = direction;
  }
}

export { TIER_COUNT };
