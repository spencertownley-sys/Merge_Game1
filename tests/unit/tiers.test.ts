import { describe, expect, it } from 'vitest';
import { TIER_COUNT, TIERS, tierDef, tierRadiusPx } from '../../src/config/tiers';

describe('tierRadiusPx — r(n) = 14 * 1.22^(n-1), against the rounded §3 table', () => {
  it.each([
    [1, 14],
    [2, 17],
    [3, 21],
    [4, 25],
    [5, 31],
    [6, 38],
    [7, 46],
    [8, 56],
    [9, 69],
    [10, 84],
    [11, 102],
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
