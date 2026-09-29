// Seeded RNG: mulberry32 PRNG + Fisher-Yates shuffle. This is the ONLY file allowed to
// call Math.random (and even this file doesn't, on purpose — see below). Determinism
// (GAME_DESIGN_MERGE_TIERS.md §4, and the CLAUDE.md "Gotchas" note) depends on every
// physics/spawn-path random decision routing through here with an explicit seed.
//
// Fusion mode needs the tier sequence to stay identical whether or not a player uses
// photos, so the face-pick draw must be a SEPARATE stream from the tier stream (§4).
// deriveStreamSeed() gives every named stream its own independent mulberry32 instance
// from one root seed, so "same root seed" still means "same tier sequence" even when
// a second, independent stream is also being consumed for face picks.

export type Rng = () => number; // returns a float in [0, 1)

/** mulberry32: fast, small, good-enough statistical quality for gameplay RNG. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return function rng(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Named stream ids currently in use — keep this list in sync with every call site
 *  that needs an independent stream (§4: tier sequence vs. face-pick). */
export type RngStreamName = 'tiers' | 'facePick';

const STREAM_OFFSETS: Record<RngStreamName, number> = {
  tiers: 0x00000000,
  facePick: 0x9e3779b9, // arbitrary odd constant (golden-ratio-ish) to decorrelate streams
};

/** Derives an independent-enough seed for a named stream from one root seed, so a
 *  Daily Seed / async-challenge seed still reproduces the same tier sequence
 *  regardless of what (if anything) draws from the facePick stream. */
export function deriveStreamSeed(rootSeed: number, stream: RngStreamName): number {
  return (rootSeed ^ STREAM_OFFSETS[stream]) >>> 0;
}

export function createStreamRng(rootSeed: number, stream: RngStreamName): Rng {
  return mulberry32(deriveStreamSeed(rootSeed, stream));
}

/** In-place Fisher-Yates shuffle using a seeded Rng. Returns the same array reference
 *  for convenience; callers that need the original order preserved should pass a copy. */
export function shuffleInPlace<T>(arr: T[], rng: Rng): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
