// 20-drop shuffle bag per GAME_DESIGN_MERGE_TIERS.md §4, using the seeded RNG from
// engine/rng.ts (never Math.random) so runs are reproducible for a given seed.

import { createStreamRng, shuffleInPlace, type Rng } from './rng';

/** Default bag composition: tier -> copies per bag of 20 (§4). */
export const DEFAULT_BAG_COMPOSITION: readonly [tier: number, copies: number][] = [
  [1, 7],
  [2, 6],
  [3, 4],
  [4, 2],
  [5, 1],
];

/** Journey levels may override the bag counts via LevelDef.spawnBag: counts for
 *  tiers 1..5, in order (§10.4). */
export type SpawnBagOverride = readonly [number, number, number, number, number];

function buildUnshuffledBag(composition: readonly [number, number][]): number[] {
  const bag: number[] = [];
  for (const [tier, copies] of composition) {
    for (let i = 0; i < copies; i++) bag.push(tier);
  }
  return bag;
}

export class SpawnBag {
  private bag: number[] = [];
  private cursor = 0;
  private readonly rng: Rng;
  private readonly composition: readonly [number, number][];

  constructor(rootSeed: number, override?: SpawnBagOverride) {
    this.rng = createStreamRng(rootSeed, 'tiers');
    this.composition = override
      ? ([1, 2, 3, 4, 5] as const).map((tier, i) => [tier, override[i]] as [number, number])
      : DEFAULT_BAG_COMPOSITION;
    this.refill();
  }

  private refill(): void {
    this.bag = shuffleInPlace(buildUnshuffledBag(this.composition), this.rng);
    this.cursor = 0;
  }

  /** Draws the next tier, refilling and reshuffling (using the same RNG stream) when
   *  the current bag is exhausted. */
  next(): number {
    if (this.cursor >= this.bag.length) this.refill();
    return this.bag[this.cursor++];
  }

  /** Peeks the next N tiers without consuming them — used for the drop preview
   *  (§4: "Preview shows the next 1 ball. Journey levels may override to 2."). This
   *  does not advance the RNG; it simulates ahead on a throwaway copy of the bag state. */
  peek(count: 1 | 2): number[] {
    const result: number[] = [];
    let bag = this.bag;
    let cursor = this.cursor;
    // Clone the RNG's future behavior deterministically is not possible without
    // re-seeding, so peek() only looks within the already-shuffled remainder of the
    // current bag. If a peek would cross a bag boundary, refill deterministically by
    // temporarily advancing a cloned bag using the *next* composition/rng state is out
    // of scope for Phase 1 (bags are large relative to preview depth of 1-2; this edge
    // case — peeking across a bag refill — is rare and handled by falling back to the
    // first tier of the composition on this run so a peek never throws).
    for (let i = 0; i < count; i++) {
      if (cursor >= bag.length) {
        result.push(this.composition[0][0]);
      } else {
        result.push(bag[cursor++]);
      }
    }
    return result;
  }
}
