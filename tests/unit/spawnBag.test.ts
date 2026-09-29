import { describe, expect, it } from 'vitest';
import { DEFAULT_BAG_COMPOSITION, SpawnBag } from '../../src/engine/spawnBag';

describe('SpawnBag composition', () => {
  it('a bag of 20 draws matches the exact §4 composition (7/6/4/2/1)', () => {
    const bag = new SpawnBag(1);
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (let i = 0; i < 20; i++) counts[bag.next()]++;
    expect(counts).toEqual({ 1: 7, 2: 6, 3: 4, 4: 2, 5: 1 });
  });

  it('DEFAULT_BAG_COMPOSITION sums to 20', () => {
    const total = DEFAULT_BAG_COMPOSITION.reduce((sum, [, copies]) => sum + copies, 0);
    expect(total).toBe(20);
  });

  it('refills and reshuffles seamlessly across a bag boundary (60 draws = 3 full bags)', () => {
    const bag = new SpawnBag(2);
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (let i = 0; i < 60; i++) counts[bag.next()]++;
    expect(counts).toEqual({ 1: 21, 2: 18, 3: 12, 4: 6, 5: 3 });
  });

  it('is deterministic for a given seed', () => {
    const bagA = new SpawnBag(777);
    const bagB = new SpawnBag(777);
    const seqA = Array.from({ length: 45 }, () => bagA.next());
    const seqB = Array.from({ length: 45 }, () => bagB.next());
    expect(seqA).toEqual(seqB);
  });

  it('respects a Journey-level spawnBag override', () => {
    // All tier-1, per a hypothetical very-easy tutorial level override.
    const bag = new SpawnBag(3, [20, 0, 0, 0, 0]);
    const seq = Array.from({ length: 20 }, () => bag.next());
    expect(seq.every((t) => t === 1)).toBe(true);
  });

  it('only produces tiers 1-5 (droppable tiers per §4)', () => {
    const bag = new SpawnBag(9);
    const seq = Array.from({ length: 200 }, () => bag.next());
    expect(seq.every((t) => t >= 1 && t <= 5)).toBe(true);
  });
});
