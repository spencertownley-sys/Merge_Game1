// Journey levels for the first nine lands, authored from the §10.5 design-intent table and
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

// Wave 2, part 1 (JOURNEY_PLAN.md): lands 6 and 7. Balanced 2026-10-10 against the same
// simulated player over 40 attempts each. Mistvale's levels are foggy (previewCount 0), which
// the bot ignores because it never reads the preview, so they sit a little above the targets:
// Into the Reeds 100%, Stepping Stones ~80%, Firefly Hollow ~57%. Emberpeak: Cold Forge ~90%,
// Ember Rain ~72% (one drop a second), The Great Bellows ~52%.
const mistvale: LevelDef[] = [
  {
    id: 17,
    land: 'mistvale-marsh',
    name: 'Into the Reeds',
    seed: 1617,
    previewCount: 0,
    goals: [{ type: 'reachTier', tier: 6 }],
    stars: { two: { scoreAtLeast: 85 }, three: { scoreAtLeast: 110 } },
    flavor: "The fog hides what's coming. Keep the pile low and calm, so anything can land safely.",
  },
  {
    id: 18,
    land: 'mistvale-marsh',
    name: 'Stepping Stones',
    seed: 1618,
    previewCount: 0,
    goals: [{ type: 'clearObstacle', obstacle: 'ice', count: 6 }],
    dropLimit: 26,
    obstacles: [
      { type: 'ice', x: 35, y: 490, tier: 1 },
      { type: 'ice', x: 100, y: 490, tier: 2 },
      { type: 'ice', x: 165, y: 490, tier: 1 },
      { type: 'ice', x: 235, y: 490, tier: 2 },
      { type: 'ice', x: 300, y: 490, tier: 1 },
      { type: 'ice', x: 365, y: 490, tier: 2 },
    ],
    stars: starsForDropBudget(26),
    flavor:
      'Six frosted motes lie in a row, like stepping stones across the water. Thaw every one.',
  },
  {
    id: 19,
    land: 'mistvale-marsh',
    name: 'Firefly Hollow',
    seed: 1619,
    previewCount: 0,
    goals: [{ type: 'score', score: 900 }],
    dropLimit: 104,
    obstacles: [
      { type: 'rock', x: 70, y: 480 },
      { type: 'rock', x: 200, y: 480 },
      { type: 'rock', x: 330, y: 480 },
    ],
    stars: starsForDropBudget(104),
    flavor:
      'The fireflies sleep deep in the hollow. A bright, busy glow will wake every one of them.',
  },
];

const emberpeak: LevelDef[] = [
  {
    id: 20,
    land: 'emberpeak',
    name: 'Cold Forge',
    seed: 1720,
    goals: [{ type: 'reachTier', tier: 7 }],
    dropLimit: 60,
    stars: starsForDropBudget(60),
    flavor: 'One forge still holds an ember. Feed it a Snowglobe Charm before your drops run out.',
  },
  {
    id: 21,
    land: 'emberpeak',
    name: 'Ember Rain',
    seed: 1721,
    goals: [{ type: 'score', score: 700 }],
    timeLimitSec: 70,
    // Bigger motes than usual tumble down the slopes (default bag is 7/6/4/2/1).
    spawnBag: [2, 3, 5, 5, 5],
    stars: starsForTimeBudget(70),
    flavor: 'Big motes are tumbling down the slopes. Keep up, merge fast, and beat the clock.',
  },
  {
    id: 22,
    land: 'emberpeak',
    name: 'The Great Bellows',
    seed: 1722,
    goals: [{ type: 'reachTier', tier: 8 }],
    dropLimit: 88,
    stars: starsForDropBudget(88),
    flavor:
      'The great bellows can wake the whole mountain. One Cloud Balloon would set them breathing.',
  },
];

// Wave 2, part 2: lands 8 and 9. Cloudspire Isles brings shaped boxes (glass pillars and a
// narrowed box, JOURNEY_PLAN.md §2.4); Frostglass Tundra is all ice. Balanced 2026-10-10 with
// the simulated player over 40 attempts each: Two Islands 100%, Narrow Bridge ~75%, Sky
// Harbour ~47%, Ice Field ~90%, Glacier Gate ~80%, The Frozen Heart ~42%.
const cloudspire: LevelDef[] = [
  {
    id: 23,
    land: 'cloudspire-isles',
    name: 'Two Islands',
    seed: 1823,
    goals: [{ type: 'reachTier', tier: 6 }],
    walls: [{ x: 188, y: 330, width: 24, height: 190 }],
    stars: { two: { scoreAtLeast: 85 }, three: { scoreAtLeast: 100 } },
    flavor: 'A glass pillar splits the island in two. Build on both sides and let them meet.',
  },
  {
    id: 24,
    land: 'cloudspire-isles',
    name: 'Narrow Bridge',
    seed: 1824,
    goals: [{ type: 'mergeCount', tier: 5, count: 4 }],
    dropLimit: 34,
    walls: [
      { x: 0, y: 0, width: 45, height: 520 },
      { x: 355, y: 0, width: 45, height: 520 },
    ],
    stars: starsForDropBudget(34),
    flavor:
      'Not much room up here. Mind the edges, and make four Lantern Wisps to light the bridge.',
  },
  {
    id: 25,
    land: 'cloudspire-isles',
    name: 'Sky Harbour',
    seed: 1825,
    goals: [{ type: 'reachTier', tier: 8 }],
    dropLimit: 108,
    walls: [
      { x: 120, y: 380, width: 20, height: 140 },
      { x: 260, y: 380, width: 20, height: 140 },
    ],
    hazards: { wind: { everySec: 7, durationSec: 2, force: 6 } },
    stars: starsForDropBudget(108),
    flavor: 'Mooring posts, sky winds and a long way down. Raise a Cloud Balloon over the harbour.',
  },
];

const frostglass: LevelDef[] = [
  {
    id: 26,
    land: 'frostglass-tundra',
    name: 'Ice Field',
    seed: 1926,
    goals: [{ type: 'clearObstacle', obstacle: 'ice', count: 8 }],
    obstacles: [
      { type: 'ice', x: 26, y: 500, tier: 1 },
      { type: 'ice', x: 74, y: 500, tier: 2 },
      { type: 'ice', x: 122, y: 500, tier: 1 },
      { type: 'ice', x: 170, y: 500, tier: 2 },
      { type: 'ice', x: 230, y: 500, tier: 1 },
      { type: 'ice', x: 278, y: 500, tier: 2 },
      { type: 'ice', x: 326, y: 500, tier: 1 },
      { type: 'ice', x: 374, y: 500, tier: 2 },
    ],
    stars: { two: { scoreAtLeast: 130 }, three: { scoreAtLeast: 240 } },
    flavor: 'A whole field of frozen motes. One warm merge beside a row can free several at once.',
  },
  {
    id: 27,
    land: 'frostglass-tundra',
    name: 'Glacier Gate',
    seed: 1927,
    goals: [{ type: 'reachTier', tier: 7 }],
    dropLimit: 32,
    obstacles: [
      { type: 'ice', x: 33, y: 495, tier: 3 },
      { type: 'ice', x: 99, y: 490, tier: 4 },
      { type: 'ice', x: 167, y: 495, tier: 3 },
      { type: 'ice', x: 233, y: 495, tier: 3 },
      { type: 'ice', x: 301, y: 490, tier: 4 },
      { type: 'ice', x: 367, y: 495, tier: 3 },
    ],
    stars: starsForDropBudget(32),
    flavor: 'The ice makes a floor to build on, and every thawed mote is a head start.',
  },
  {
    id: 28,
    land: 'frostglass-tundra',
    name: 'The Frozen Heart',
    seed: 1928,
    goals: [{ type: 'clearObstacle', obstacle: 'ice', count: 10 }],
    dropLimit: 26,
    obstacles: [
      { type: 'ice', x: 40, y: 482, tier: 5 },
      { type: 'ice', x: 102, y: 500, tier: 2 },
      { type: 'ice', x: 200, y: 472, tier: 6 },
      { type: 'ice', x: 298, y: 500, tier: 2 },
      { type: 'ice', x: 360, y: 482, tier: 5 },
      { type: 'ice', x: 40, y: 420, tier: 1 },
      { type: 'ice', x: 120, y: 440, tier: 3 },
      { type: 'ice', x: 200, y: 400, tier: 2 },
      { type: 'ice', x: 280, y: 440, tier: 3 },
      { type: 'ice', x: 360, y: 420, tier: 1 },
    ],
    stars: starsForDropBudget(26),
    flavor:
      'At the heart of the tundra, ten motes sleep in the ice, some of them huge. Wake them all.',
  },
];

export const LEVELS: readonly LevelDef[] = [
  ...sunmeadow,
  ...driftmoor,
  ...whisperwood,
  ...thistledown,
  ...copperleaf,
  ...mistvale,
  ...emberpeak,
  ...cloudspire,
  ...frostglass,
];

export function levelById(id: number): LevelDef | undefined {
  return LEVELS.find((l) => l.id === id);
}

export function levelsForLand(land: LevelDef['land']): LevelDef[] {
  return LEVELS.filter((l) => l.land === land);
}
