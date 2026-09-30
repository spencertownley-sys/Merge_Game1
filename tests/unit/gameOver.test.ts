import { describe, expect, it } from 'vitest';
import { GAME_OVER_TIMING, PHYSICS } from '../../src/config/physics';
import {
  advanceDangerTimer,
  createDangerTimer,
  graceMsFor,
  isBallOverLine,
} from '../../src/engine/gameOver';

describe('isBallOverLine (§7)', () => {
  const line = PHYSICS.dangerLineYPx;
  it('is over when the top edge is above the line and grace has expired', () => {
    expect(isBallOverLine(line + 5, 10, 0, 5000)).toBe(true);
  });
  it('is not over while grace is still running', () => {
    expect(isBallOverLine(line + 5, 10, 6000, 5000)).toBe(false);
  });
  it('is not over when the whole ball is below the line', () => {
    expect(isBallOverLine(line + 20, 10, 0, 5000)).toBe(false);
  });
  it('grace is 1200ms after a drop and 600ms after a merge', () => {
    expect(graceMsFor('drop')).toBe(1200);
    expect(graceMsFor('merge')).toBe(600);
  });
});

describe('advanceDangerTimer (§7)', () => {
  const dt = 1000 / 120;
  it('warns at 1000ms and ends the run at 2500ms of continuous over-line time', () => {
    const t = createDangerTimer();
    let elapsed = 0;
    while (elapsed < GAME_OVER_TIMING.warningMs - dt) {
      advanceDangerTimer(t, true, dt);
      elapsed += dt;
    }
    expect(t.warning).toBe(false);
    advanceDangerTimer(t, true, dt);
    advanceDangerTimer(t, true, dt);
    expect(t.warning).toBe(true);
    expect(t.gameOver).toBe(false);
    while (!t.gameOver) advanceDangerTimer(t, true, dt);
    expect(t.overLineMs).toBeGreaterThanOrEqual(GAME_OVER_TIMING.gameOverMs);
  });

  it('resets the moment no ball is over the line', () => {
    const t = createDangerTimer();
    for (let i = 0; i < 100; i++) advanceDangerTimer(t, true, dt);
    expect(t.overLineMs).toBeGreaterThan(0);
    advanceDangerTimer(t, false, dt);
    expect(t.overLineMs).toBe(0);
    expect(t.warning).toBe(false);
  });
});
