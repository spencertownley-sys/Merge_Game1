import { describe, expect, it } from 'vitest';
import { buildAncestry } from '../../src/share/shareCard';
import type { MergeEvent } from '../../src/types';

const m = (tier: number, parents: [number, number], result: number): MergeEvent => ({
  tier,
  atMs: 0,
  parentIds: parents,
  resultId: result,
});

describe('buildAncestry (share card §11.3)', () => {
  it('rebuilds the top three levels of the top ball from the merge log', () => {
    // 1+2 -> 5 (t2), 3+4 -> 6 (t2), 5+6 -> 7 (t3), 7+8 -> 9 (t4)
    const log = [m(2, [1, 2], 5), m(2, [3, 4], 6), m(3, [5, 6], 7), m(4, [7, 8], 9)];
    const tree = buildAncestry(log, 4, 3);
    expect(tree?.tier).toBe(4);
    expect(tree?.children?.[0].tier).toBe(3);
    expect(tree?.children?.[1].tier).toBe(3);
    expect(tree?.children?.[1].children).toBeNull(); // ball 8 was dropped, not merged
    expect(tree?.children?.[0].children?.[0].tier).toBe(2);
    // three ancestor levels: tier-2 nodes expand to their dropped tier-1 parents (leaves)
    expect(tree?.children?.[0].children?.[0].children?.[0]).toEqual({ tier: 1, children: null });
    // a depth of 1 stops right below the root
    expect(buildAncestry(log, 4, 1)?.children?.[0].children).toBeNull();
  });

  it('returns a leaf when the top ball was never produced by a merge', () => {
    expect(buildAncestry([], 5)).toEqual({ tier: 5, children: null });
    expect(buildAncestry([], 0)).toBeNull();
  });
});
