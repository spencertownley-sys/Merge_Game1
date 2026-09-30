// Merge eligibility (§5.1) and deterministic resolution order (§5.2).
// This module is pure — no Rapier, no randomness — so it can be unit-tested directly and
// so the ordering rule lives in exactly one place.

import { APEX_TIER } from '../config/tiers';

export type BallKind = 'ball' | 'rock' | 'ice';

/** The minimum a ball needs to expose for eligibility checks. */
export interface MergeCandidateBall {
  id: number;
  tier: number;
  kind: BallKind;
}

/** §5.1 rules 1 and 4 (same tier, no obstacles). Rule 2 (contact) is checked by the caller
 *  with the physics world, rule 3 (not already merging this step) by resolveMergePairs.
 *  Two tier-11 balls ARE eligible — that is the apex merge (§5.4), handled by the caller. */
export function isMergeEligible(a: MergeCandidateBall, b: MergeCandidateBall): boolean {
  if (a.id === b.id) return false;
  if (a.kind !== 'ball' || b.kind !== 'ball') return false; // rock never merges; ice only after thaw
  if (a.tier !== b.tier) return false;
  return a.tier <= APEX_TIER;
}

export type MergePair = [idA: number, idB: number];

/** Canonical key for a pair regardless of argument order. */
export function pairKey(idA: number, idB: number): string {
  return idA < idB ? `${idA}:${idB}` : `${idB}:${idA}`;
}

/**
 * Merge resolution order per game design §5.2 — must stay deterministic:
 * sort eligible pairs by (min(idA, idB), max(idA, idB)) ascending, then walk them in order,
 * letting each ball join at most one merge this step. Losers of a conflict simply wait for
 * the next step (they'll still be in contact).
 */
export function resolveMergePairs(candidates: readonly MergePair[]): MergePair[] {
  const normalized: MergePair[] = candidates.map(([a, b]) => (a < b ? [a, b] : [b, a]));
  normalized.sort((p, q) => p[0] - q[0] || p[1] - q[1]);

  const claimed = new Set<number>();
  const result: MergePair[] = [];
  for (const [a, b] of normalized) {
    if (a === b) continue;
    if (claimed.has(a) || claimed.has(b)) continue;
    claimed.add(a);
    claimed.add(b);
    result.push([a, b]);
  }
  return result;
}
