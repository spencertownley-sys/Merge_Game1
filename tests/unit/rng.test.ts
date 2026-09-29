import { describe, expect, it } from 'vitest';
import {
  createStreamRng,
  deriveStreamSeed,
  mulberry32,
  shuffleInPlace,
} from '../../src/engine/rng';

describe('mulberry32', () => {
  it('produces the same sequence for the same seed', () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    const seqA = Array.from({ length: 20 }, () => a());
    const seqB = Array.from({ length: 20 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('produces a different sequence for a different seed', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    const seqA = Array.from({ length: 20 }, () => a());
    const seqB = Array.from({ length: 20 }, () => b());
    expect(seqA).not.toEqual(seqB);
  });

  it('always returns a float in [0, 1)', () => {
    const rng = mulberry32(999);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('deriveStreamSeed / createStreamRng', () => {
  it('gives the tiers and facePick streams independent sequences from the same root seed', () => {
    const rootSeed = 20260929;
    const tiersRng = createStreamRng(rootSeed, 'tiers');
    const facePickRng = createStreamRng(rootSeed, 'facePick');
    const tierSeq = Array.from({ length: 10 }, () => tiersRng());
    const faceSeq = Array.from({ length: 10 }, () => facePickRng());
    expect(tierSeq).not.toEqual(faceSeq);
  });

  it('the tiers stream is identical for the same root seed regardless of whether facePick is ever consumed', () => {
    const rootSeed = 42;

    const tiersOnly = createStreamRng(rootSeed, 'tiers');
    const tiersOnlySeq = Array.from({ length: 10 }, () => tiersOnly());

    const tiersAlongsideFacePick = createStreamRng(rootSeed, 'tiers');
    const facePick = createStreamRng(rootSeed, 'facePick');
    // Interleave draws from facePick to prove it never perturbs the tiers stream.
    const tiersWithFacePickSeq: number[] = [];
    for (let i = 0; i < 10; i++) {
      facePick();
      tiersWithFacePickSeq.push(tiersAlongsideFacePick());
    }

    expect(tiersWithFacePickSeq).toEqual(tiersOnlySeq);
  });

  it('deriveStreamSeed is a pure function of (rootSeed, stream)', () => {
    expect(deriveStreamSeed(7, 'tiers')).toBe(deriveStreamSeed(7, 'tiers'));
    expect(deriveStreamSeed(7, 'tiers')).not.toBe(deriveStreamSeed(7, 'facePick'));
  });
});

describe('shuffleInPlace (Fisher-Yates)', () => {
  it('is a deterministic permutation for a given seeded rng', () => {
    const arrA = [1, 2, 3, 4, 5, 6, 7, 8];
    const arrB = [1, 2, 3, 4, 5, 6, 7, 8];
    shuffleInPlace(arrA, mulberry32(555));
    shuffleInPlace(arrB, mulberry32(555));
    expect(arrA).toEqual(arrB);
  });

  it('preserves the multiset of elements', () => {
    const arr = [1, 1, 2, 2, 3];
    const shuffled = shuffleInPlace([...arr], mulberry32(1));
    expect(shuffled.slice().sort()).toEqual(arr.slice().sort());
  });
});
