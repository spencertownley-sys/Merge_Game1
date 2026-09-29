// Danger-line + grace-period logic per GAME_DESIGN_MERGE_TIERS.md §7. Pure functions so the
// timer rule is testable without a physics world.

import { GAME_OVER_TIMING, PHYSICS } from '../config/physics';

export interface DangerTimer {
  /** Continuous ms that at least one ball has been over the line. Resets to 0 the moment
   *  no ball is over the line. */
  overLineMs: number;
  warning: boolean;
  gameOver: boolean;
}

export function createDangerTimer(): DangerTimer {
  return { overLineMs: 0, warning: false, gameOver: false };
}

/** A ball is "over the line" if its top edge is above the danger line AND its grace period
 *  has expired (§7). All values in board px / sim ms. */
export function isBallOverLine(
  centerYPx: number,
  radiusPx: number,
  graceUntilMs: number,
  nowMs: number,
  dangerLineYPx: number = PHYSICS.dangerLineYPx,
): boolean {
  return centerYPx - radiusPx < dangerLineYPx && nowMs >= graceUntilMs;
}

/** Grace after creation before a ball can count as over the line (§7). */
export function graceMsFor(origin: 'drop' | 'merge' | 'obstacle'): number {
  switch (origin) {
    case 'drop':
      return GAME_OVER_TIMING.dropGraceMs;
    case 'merge':
      return GAME_OVER_TIMING.mergeGraceMs;
    case 'obstacle':
      // Obstacles are placed at level start; treat them like a drop so a level author
      // placing one near the line gets the same warning behaviour a player would.
      return GAME_OVER_TIMING.dropGraceMs;
  }
}

/** Advances the timer by one fixed step. Once gameOver is set it stays set. */
export function advanceDangerTimer(
  timer: DangerTimer,
  anyBallOverLine: boolean,
  dtMs: number,
): void {
  if (timer.gameOver) return;
  timer.overLineMs = anyBallOverLine ? timer.overLineMs + dtMs : 0;
  timer.warning = timer.overLineMs >= GAME_OVER_TIMING.warningMs;
  if (timer.overLineMs >= GAME_OVER_TIMING.gameOverMs) timer.gameOver = true;
}
