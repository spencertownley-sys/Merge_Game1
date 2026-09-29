// Scoring & combo rules per GAME_DESIGN_MERGE_TIERS.md §6.

/** T(n) = n(n-1)/2, where n is the NEW tier produced by a merge. */
export function mergePoints(newTier: number): number {
  return (newTier * (newTier - 1)) / 2;
}

/** Awarded when two tier-11 balls merge (§5.4). Multiplied by the combo the same as any merge. */
export const APEX_BONUS_POINTS = 66;

export const COMBO = {
  /** If more than this many ms pass since the last merge, comboCount resets to 0
   *  before counting the new merge. */
  windowMs: 1200,
  /** Combo text is shown once comboCount reaches this value. */
  showTextAtCount: 3,
  maxMultiplier: 3.0,
  multiplierStep: 0.2,
} as const;

/** m = min(3.0, 1 + 0.2 * (comboCount - 1)) */
export function comboMultiplier(comboCount: number): number {
  return Math.min(COMBO.maxMultiplier, 1 + COMBO.multiplierStep * (comboCount - 1));
}

/** floor(T(n) * m) — the points actually awarded for a merge into `newTier` at `comboCount`. */
export function scoreForMerge(newTier: number, comboCount: number): number {
  return Math.floor(mergePoints(newTier) * comboMultiplier(comboCount));
}

/** Dropping a ball always scores 0 (§6) — kept as a named constant so it's never a bare
 *  magic number at a call site. */
export const DROP_SCORE = 0;
