import { describe, expect, it } from 'vitest';
import {
  APEX_BONUS_POINTS,
  comboMultiplier,
  mergePoints,
  scoreForMerge,
} from '../../src/config/scoring';

describe('mergePoints — T(n) = n(n-1)/2 against the exact §6 table', () => {
  it.each([
    [2, 1],
    [3, 3],
    [4, 6],
    [5, 10],
    [6, 15],
    [7, 21],
    [8, 28],
    [9, 36],
    [10, 45],
    [11, 55],
  ])('tier %i -> %i points', (tier, expected) => {
    expect(mergePoints(tier)).toBe(expected);
  });
});

describe('apex bonus', () => {
  it('is 66 points per §5.4/§6', () => {
    expect(APEX_BONUS_POINTS).toBe(66);
  });
});

describe('comboMultiplier — m = min(3.0, 1 + 0.2*(comboCount-1))', () => {
  it.each([
    [1, 1.0],
    [2, 1.2],
    [3, 1.4],
    [11, 3.0], // formula would give 3.0 exactly at count 11
    [20, 3.0], // clamped above that
  ])('comboCount %i -> multiplier %f', (count, expected) => {
    expect(comboMultiplier(count)).toBeCloseTo(expected, 5);
  });
});

describe('scoreForMerge — floor(T(n) * m)', () => {
  it('combo count 1 (no multiplier) matches the raw table', () => {
    expect(scoreForMerge(5, 1)).toBe(10);
  });

  it('applies the combo multiplier and floors the result', () => {
    // T(6) = 15, comboCount 3 -> m = 1.4 -> 21 exactly
    expect(scoreForMerge(6, 3)).toBe(21);
    // T(3) = 3, comboCount 4 -> m = 1.6 -> 4.8 -> floors to 4
    expect(scoreForMerge(3, 4)).toBe(4);
  });
});
