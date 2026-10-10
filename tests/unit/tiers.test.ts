import { describe, expect, it } from 'vitest';
import { TIER_COUNT, TIERS, tierDef, tierRadiusPx } from '../../src/config/tiers';

describe('tierRadiusPx — 14 × 1.264^(n−1) to tier 7, then × 1.17, against the rounded §3 table', () => {
  it.each([
    [1, 14],
    [2, 18],
    [3, 22],
    [4, 28],
    [5, 36],
    [6, 45],
    [7, 57],
    [8, 67],
    [9, 78],
    [10, 91],
    [11, 107],
  ])('tier %i -> ~%i px', (tier, roundedExpected) => {
    expect(Math.round(tierRadiusPx(tier))).toBe(roundedExpected);
  });

  it('throws for out-of-range tiers', () => {
    expect(() => tierRadiusPx(0)).toThrow();
    expect(() => tierRadiusPx(12)).toThrow();
  });
});

describe('TIERS table', () => {
  it('has exactly TIER_COUNT entries, tier field matching its 1-indexed position', () => {
    expect(TIERS).toHaveLength(TIER_COUNT);
    TIERS.forEach((def, i) => expect(def.tier).toBe(i + 1));
  });

  it('tierDef throws for out-of-range tiers', () => {
    expect(() => tierDef(0)).toThrow();
    expect(() => tierDef(12)).toThrow();
  });
});
