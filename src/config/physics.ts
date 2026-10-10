// Physics/board constants per GAME_DESIGN_MERGE_TIERS.md §2.
// These are starting-point tuning values (see the doc's ⚠️ assumption note) — expose
// them to a dev-only tuning panel (see components/DevTuningPanel.tsx) rather than
// hardcoding any of these numbers elsewhere.

export const PHYSICS = {
  /** Logical board size in px. 100 px = 1 m. Revised 2026-10-10 (game design §2): the
   *  play box under the rim is 400 × 442 (aspect ≈ 0.9, measured from the reference video),
   *  plus the 78 px hanging zone above the rim where the held ball waits. */
  boardWidthPx: 400,
  boardHeightPx: 520,

  /** Static wall colliders, outside the board, thick to prevent tunnelling. */
  wallThicknessPx: 40,

  /** Ball spawns here, centered on pointer X. Low enough that the largest droppable tier
   *  (tier 5) hangs fully inside the board, clear of the ceiling collider. */
  dropRailYPx: 40,

  /** Danger line: the rim of the glass box. The held ball hangs just above it, and a pile that
   *  rises over it for too long ends the run (§7). Always visible as the rim itself. */
  dangerLineYPx: 78,

  /** m/s^2, downward. Revised 2026-10-10: measured from the reference video (constant
   *  acceleration of 1.94 box-widths/s², no visible drag), so a drop falls the full box in
   *  about 1.08 s. */
  gravity: 7.8,

  density: 1.0,

  /** A landing hops about 8% of its drop height, as in the reference. Walls use the Min
   *  combine rule, so both values must move together for the wall bounce to change. */
  restitutionBallBall: 0.3,
  restitutionBallWall: 0.3,

  frictionBallBall: 0.45,
  frictionBallWall: 0.4,

  /** Next to no drag in the air (the reference falls at constant acceleration); rolling
   *  speed fades mostly through spin damping, about 30% per second on a flat floor. */
  linearDamping: 0.02,
  angularDamping: 0.9,

  /** m/s. Above the natural top speed of a full-height fall (~8.5 m/s). Prevents
   *  tunnelling; CCD also on. */
  maxSpeedClamp: 12,

  /** Fixed timestep in seconds. Two physics steps per 60fps frame. Required for determinism. */
  fixedTimestepSec: 1 / 120,

  /** ms between drop releases. The reference has the next ball in hand ~0.25 s after a drop. */
  dropCooldownMs: 300,

  /** Soft budget — board area makes this hard to exceed in practice. */
  maxLiveBallsSoft: 80,

  /** Journey `rock` obstacle (§10.3): heavy non-merging ball with a fixed radius. */
  rockRadiusPx: 30,
  rockDensity: 4.0,

  /** Two balls count as "in contact" for merge purposes when their surfaces are within
   *  this many px (§5.1 overlap re-check). Small, so resting neighbours merge reliably
   *  while balls merely passing nearby do not. */
  mergeContactEpsilonPx: 1.0,
} as const;

/** The live-tunable subset of PHYSICS (dev tuning panel, game design doc §2 note). */
export type PhysicsTuning = {
  gravity: number;
  restitutionBallBall: number;
  restitutionBallWall: number;
  frictionBallBall: number;
  frictionBallWall: number;
  linearDamping: number;
  angularDamping: number;
  maxSpeedClamp: number;
  dropCooldownMs: number;
};

export const DEFAULT_TUNING: PhysicsTuning = {
  gravity: PHYSICS.gravity,
  restitutionBallBall: PHYSICS.restitutionBallBall,
  restitutionBallWall: PHYSICS.restitutionBallWall,
  frictionBallBall: PHYSICS.frictionBallBall,
  frictionBallWall: PHYSICS.frictionBallWall,
  linearDamping: PHYSICS.linearDamping,
  angularDamping: PHYSICS.angularDamping,
  maxSpeedClamp: PHYSICS.maxSpeedClamp,
  dropCooldownMs: PHYSICS.dropCooldownMs,
};

/** 100 px = 1 m (§2). */
export const PX_PER_METER = 100;

// --- Merge & game-over timing (§5, §7) ---

export const MERGE_TIMING = {
  /** Merge on first contact by default; Journey levels may override. */
  mergeContactMs: 0,
  /** Grace period before a merge result can trigger the danger line. */
  mergeGraceMs: 600,
} as const;

export const GAME_OVER_TIMING = {
  /** Grace after a ball is dropped before it can count as "over the line". */
  dropGraceMs: 1200,
  /** Grace after a ball is created by a merge before it can count as "over the line". */
  mergeGraceMs: 600,
  /** Continuous time over the line before the warning flash/pulse. */
  warningMs: 1000,
  /** Continuous time over the line before the run ends. */
  gameOverMs: 2500,
} as const;

// --- Impact squash-and-stretch (§9.2b) — render-only, never affects the collider ---

export const IMPACT_SQUASH = {
  /** m/s approach speed required to trigger the squash. */
  impactThresholdMps: 2.5,
  durationMs: 220,
  /** Widen on compress. */
  amplitudeX: 0.22,
  /** Flatten on compress. */
  amplitudeY: 0.3,
} as const;
