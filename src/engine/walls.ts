// Shaped boxes (JOURNEY_PLAN.md §2.4): static glass blocks inside the board. Pure geometry
// shared by the simulation (drop clamping) and the renderer (held mote, landing guide), so
// what the player sees always matches where the sim will actually drop.

import { PHYSICS } from '../config/physics';
import type { WallBlock } from '../types';

/** The x range a ball of radius r can be dropped in. Blocks that touch a side wall and reach
 *  up to the drop rail narrow it; pillars standing lower down do not. */
export function dropRange(r: number, walls: readonly WallBlock[] = []): [number, number] {
  let left: number = 0;
  let right: number = PHYSICS.boardWidthPx;
  for (const w of walls) {
    if (w.y > PHYSICS.dropRailYPx + r) continue;
    if (w.x <= 0) left = Math.max(left, w.x + w.width);
    if (w.x + w.width >= PHYSICS.boardWidthPx) right = Math.min(right, w.x);
  }
  return [left + r, right - r];
}

export function clampDropX(x: number, r: number, walls: readonly WallBlock[] = []): number {
  const [lo, hi] = dropRange(r, walls);
  return Math.min(Math.max(x, lo), hi);
}

/** Highest centre y at which a ball of radius r falling straight down at x first touches a
 *  block, or Infinity if it misses them all. */
export function landingOnWalls(x: number, r: number, walls: readonly WallBlock[] = []): number {
  let y = Infinity;
  for (const w of walls) {
    // horizontal distance from the ball's centre line to the block (0 when over it)
    const dx = Math.max(w.x - x, 0, x - (w.x + w.width));
    if (dx >= r) continue;
    const top = w.y - Math.sqrt(r * r - dx * dx);
    if (top < y) y = top;
  }
  return y;
}
