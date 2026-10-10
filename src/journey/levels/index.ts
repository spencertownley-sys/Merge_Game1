// Journey levels for the first five lands, authored from the §10.5 design-intent table and
// mapped onto the story beats in ART_AND_STORY_DIRECTION.md §4.3. Further lands are content
// to add over time — nothing here caps the count. Seeds are fixed per level so a level plays
// the same drop sequence every attempt (fair retries).

import { starsForDropBudget, starsForTimeBudget } from '../levelRuntime';
import type { LevelDef } from '../../types';

const sunmeadow: LevelDef[] = [
  {
    id: 1,
    land: 'sunmeadow-hollow',
    name: 'First Light',
    seed: 1101,
    goals: [{ type: 'reachTier', tier: 4 }],
    stars: { two: { scoreAtLeast: 40 }, three: { scoreAtLeast: 80 } },
    flavor: 'A Keeper always starts small. Drop two alike and watch them become one.',
  },
  {
    id: 2,
    land: 'sunmeadow-hollow',
    name: 'The Windmill Path',
    seed: 1102,
    goals: [{ type: 'reachTier', tier: 5 }],
    stars: { two: { scoreAtLeast: 90 }, three: { scoreAtLeast: 160 } },
    flavor: 'Think a drop ahead. Where a mote lands matters as much as what it is.',
  },
  {
    id: 3,
    land: 'sunmeadow-hollow',
    name: 'Wildflower Fields',
    seed: 1103,
    goals: [{ type: 'score', score: 150 }],
    stars: { two: { scoreAtLeast: 220 }, three: { scoreAtLeast: 320 } },
    flavor: 'Chains of merges shine brighter. The village is starting to glow.',
  },
  {
    id: 4,
    land: 'sunmeadow-hollow',
    name: 'Lantern Evening',
    seed: 1104,
    goals: [{ type: 'mergeCount', tier: 3, count: 6 }],
    stars: { two: { scoreAtLeast: 120 }, three: { scoreAtLeast: 200 } },
    flavor: 'Six Glimmer Beads for six cottage windows. The shadow never really reached here.',
  },
];

const driftmoor: LevelDef[] = [
  {
    id: 5,
    land: 'driftmoor-cove',
    name: 'Fog on the Water',
    seed: 1205,
    goals: [{ type: 'reachTier', tier: 6 }],
    dropLimit: 40,
    stars: starsForDropBudget(40),
    flavor: 'The cove is quiet and the fog is thick. Make every drop count.',
  },
  {
    id: 6,
    land: 'driftmoor-cove',
    name: 'Morning Chill',
    seed: 1206,
    goals: [{ type: 'clearObstacle', obstacle: 'ice', count: 4 }],
    dropLimit: 35,
    obstacles: [
      { type: 'ice', x: 60, y: 480, tier: 2 },
      { type: 'ice', x: 150, y: 480, tier: 1 },
      { type: 'ice', x: 250, y: 480, tier: 2 },
      { type: 'ice', x: 340, y: 480, tier: 1 },
    ],
    stars: starsForDropBudget(35),
    flavor: 'Motes caught in the morning chill. A merge beside them will thaw them out.',
  },
  {
    id: 7,
    land: 'driftmoor-cove',
    name: 'Lighthouse Watch',
    seed: 1207,
    goals: [{ type: 'score', score: 400 }],
    timeLimitSec: 60,
    stars: starsForTimeBudget(60),
    flavor: 'The lighthouse keeper is waiting. Be quick, be bright.',
  },
];

const whisperwood: LevelDef[] = [
  {
    id: 8,
    land: 'whisperwood',
    name: 'Fallen Logs',
    seed: 1308,
    goals: [{ type: 'reachTier', tier: 5 }],
    obstacles: [
      { type: 'rock', x: 90, y: 480 },
      { type: 'rock', x: 200, y: 480 },
      { type: 'rock', x: 310, y: 480 },
    ],
    stars: { two: { scoreAtLeast: 120 }, three: { scoreAtLeast: 200 } },
    flavor: 'Stones and logs lie tangled with light. Build around them.',
  },
  {
    id: 9,
    land: 'whisperwood',
    name: 'Between the Trunks',
    seed: 1309,
    goals: [{ type: 'reachTier', tier: 6 }],
    hazards: { wind: { everySec: 8, durationSec: 2, force: 6 } },
    stars: { two: { scoreAtLeast: 260 }, three: { scoreAtLeast: 400 } },
    flavor: 'A breeze moves through the clearing. Watch where the motes drift.',
  },
  {
    id: 10,
    land: 'whisperwood',
    name: 'Heart of the Wood',
    seed: 1310,
    goals: [{ type: 'reachTier', tier: 8 }],
    // Rebalanced 2026-10-10 for the reference-matched board (bigger tiers, shorter box): a
    // simulated decent player reaches tier 8 within 60 drops in ~15% of runs, within ~100 in
    // roughly half, which suits the land's mini-boss. Three stars still asks for ≤ 50 drops.
    dropLimit: 100,
    obstacles: [{ type: 'rock', x: 200, y: 480 }],
    stars: starsForDropBudget(100),
    flavor: 'Deep in the wood, the light is oldest. A Cloud Balloon would wake it.',
  },
];

// Wave 1 of JOURNEY_PLAN.md: lands 4 and 5. Balanced 2026-10-10 against a simulated player
// (aims at a matching mote 70% of the time, drops every 0.6 s, or every 1 s on timed levels)
// over 40 attempts each: the intro levels pass ~85-100%, the practice levels ~60-65%,
// the bosses ~45-55%. The bosses' drop budgets are much tighter than the plan's first draft
// because the reference-matched board reaches mid tiers in fewer drops.
const thistledown: LevelDef[] = [
  {
    id: 11,
    land: 'thistledown-hills',
    name: 'Kite Day',
    seed: 1411,
    goals: [{ type: 'reachTier', tier: 6 }],
    hazards: { wind: { everySec: 7, durationSec: 2, force: 5 } },
    stars: { two: { scoreAtLeast: 55 }, three: { scoreAtLeast: 80 } },
    flavor: "Hold on to your glow. It's breezy up here. Let the gusts settle before you drop.",
  },
  {
    id: 12,
    land: 'thistledown-hills',
    name: 'Gusts and Gaps',
    seed: 1412,
    goals: [{ type: 'score', score: 500 }],
    timeLimitSec: 70,
    hazards: { wind: { everySec: 6, durationSec: 2.5, force: 9 } },
    stars: starsForTimeBudget(70),
    flavor: 'The wind comes in waves. Drop in the quiet between them, and drop fast.',
  },
  {
    id: 13,
    land: 'thistledown-hills',
    name: 'The High Meadow',
    seed: 1413,
    goals: [{ type: 'reachTier', tier: 7 }],
    dropLimit: 28,
    hazards: { wind: { everySec: 6, durationSec: 2.5, force: 9 } },
    stars: { two: { dropsRemainingAtLeast: 2 }, three: { dropsRemainingAtLeast: 4 } },
    flavor: 'The kites are tangled in the grey up here. A Snowglobe Charm would shake them loose.',
  },
];

const copperleaf: LevelDef[] = [
  {
    id: 14,
    land: 'copperleaf-orchard',
    name: 'Frost on the Apples',
    seed: 1514,
    goals: [{ type: 'clearObstacle', obstacle: 'ice', count: 3 }],
    dropLimit: 50,
    obstacles: [
      { type: 'ice', x: 50, y: 480, tier: 3 },
      { type: 'rock', x: 128, y: 480 },
      { type: 'ice', x: 200, y: 480, tier: 2 },
      { type: 'rock', x: 272, y: 480 },
      { type: 'ice', x: 350, y: 480, tier: 3 },
    ],
    stars: starsForDropBudget(50),
    flavor: "Ice and stones? Someone's testing us. Thaw the frosted motes between the rocks.",
  },
  {
    id: 15,
    land: 'copperleaf-orchard',
    name: 'Basket by Basket',
    seed: 1515,
    goals: [{ type: 'mergeCount', tier: 4, count: 5 }],
    dropLimit: 31,
    hazards: { wind: { everySec: 7, durationSec: 2, force: 6 } },
    stars: { two: { dropsRemainingAtLeast: 4 }, three: { dropsRemainingAtLeast: 6 } },
    flavor: 'Five baskets for the festival tables. Fill them before the leaves blow away.',
  },
  {
    id: 16,
    land: 'copperleaf-orchard',
    name: 'Festival Eve',
    seed: 1516,
    goals: [{ type: 'reachTier', tier: 8 }],
    dropLimit: 90,
    obstacles: [
      { type: 'ice', x: 60, y: 480, tier: 3 },
      { type: 'rock', x: 200, y: 480 },
      { type: 'ice', x: 340, y: 480, tier: 3 },
    ],
    stars: starsForDropBudget(90),
    flavor:
      'The banners are ready and the lanterns are strung. One bright Cloud Balloon starts the festival.',
  },
];

export const LEVELS: readonly LevelDef[] = [
  ...sunmeadow,
  ...driftmoor,
  ...whisperwood,
  ...thistledown,
  ...copperleaf,
];

export function levelById(id: number): LevelDef | undefined {
  return LEVELS.find((l) => l.id === id);
}

export function levelsForLand(land: LevelDef['land']): LevelDef[] {
  return LEVELS.filter((l) => l.land === land);
}
