import { describe, expect, it } from 'vitest';
import { isMergeEligible, pairKey, resolveMergePairs } from '../../src/engine/mergeResolver';

describe('isMergeEligible (§5.1)', () => {
  it('requires same tier and both to be plain balls', () => {
    expect(
      isMergeEligible({ id: 1, tier: 3, kind: 'ball' }, { id: 2, tier: 3, kind: 'ball' }),
    ).toBe(true);
    expect(
      isMergeEligible({ id: 1, tier: 3, kind: 'ball' }, { id: 2, tier: 4, kind: 'ball' }),
    ).toBe(false);
    expect(
      isMergeEligible({ id: 1, tier: 3, kind: 'rock' }, { id: 2, tier: 3, kind: 'ball' }),
    ).toBe(false);
    expect(isMergeEligible({ id: 1, tier: 3, kind: 'ice' }, { id: 2, tier: 3, kind: 'ball' })).toBe(
      false,
    );
    expect(
      isMergeEligible({ id: 1, tier: 3, kind: 'ball' }, { id: 1, tier: 3, kind: 'ball' }),
    ).toBe(false);
  });

  it('two tier-11 balls are eligible (apex merge, §5.4)', () => {
    expect(
      isMergeEligible({ id: 1, tier: 11, kind: 'ball' }, { id: 2, tier: 11, kind: 'ball' }),
    ).toBe(true);
  });
});

describe('resolveMergePairs (§5.2 deterministic order)', () => {
  it('sorts by (min id, max id) ascending regardless of input order', () => {
    expect(
      resolveMergePairs([
        [9, 8],
        [3, 2],
        [5, 4],
      ]),
    ).toEqual([
      [2, 3],
      [4, 5],
      [8, 9],
    ]);
  });

  it('lets each ball join at most one merge per step; losers wait', () => {
    // Ball 2 touches both 1 and 3. (1,2) wins because it sorts first; (2,3) is dropped.
    // (3,4) is then free to merge because 3 was not claimed.
    expect(
      resolveMergePairs([
        [2, 3],
        [1, 2],
        [3, 4],
      ]),
    ).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it('is a pure function of its input (same input, same output)', () => {
    const input: [number, number][] = [
      [7, 1],
      [2, 5],
      [5, 9],
      [1, 3],
    ];
    expect(resolveMergePairs(input)).toEqual(resolveMergePairs(input));
    // (1,3) sorts before (1,7), so 1 pairs with 3; 7 is left waiting. (2,5) beats (5,9).
    expect(resolveMergePairs(input)).toEqual([
      [1, 3],
      [2, 5],
    ]);
  });

  it('pairKey is order-independent', () => {
    expect(pairKey(4, 2)).toBe(pairKey(2, 4));
  });
});
