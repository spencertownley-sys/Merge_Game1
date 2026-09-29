// Physics/board constants per GAME_DESIGN_MERGE_TIERS.md §2.
// These are starting-point tuning values (see the doc's ⚠️ assumption note) — expose
// them to a dev-only tuning panel (see components/DevTuningPanel.tsx) rather than
// hardcoding any of these numbers elsewhere.

export const PHYSICS = {
  /** Logical board size in px. 100 px = 1 m. */
  boardWidthPx: 400,
  boardHeightPx: 600,

  /** Static wall colliders, outside the board, thick to prevent tunnelling. */
  wallThicknessPx: 40,

  /** Ball spawns here, centered on pointer X. */
  dropRailYPx: 44,

  /** Danger line — dashed, always visible. */
  dangerLineYPx: 110,

  /** m/s^2, downward. Starting value, tune by feel. */
  gravity: 14,

  density: 1.0,

  restitutionBallBall: 0.12,
  restitutionBallWall: 0.12,

  frictionBallBall: 0.35,
  frictionBallWall: 0.2,

  linearDamping: 0.15,
  angularDamping: 0.4,

  /** m/s. Prevents tunnelling; CCD also on. */
  maxSpeedClamp: 14,

  /** Fixed timestep in seconds. Two physics steps per 60fps frame. Required for determinism. */
  fixedTimestepSec: 1 / 120,

  /** ms between drop releases. */
  dropCooldownMs: 450,

  /** Soft budget — board area makes this hard to exceed in practice. */
  maxLiveBallsSoft: 80,
} as const;

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
