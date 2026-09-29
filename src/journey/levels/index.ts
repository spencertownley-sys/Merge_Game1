// Journey levels for the first three lands, authored from the §10.5 design-intent table and
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
      { type: 'ice', x: 60, y: 560, tier: 2 },
      { type: 'ice', x: 150, y: 560, tier: 1 },
      { type: 'ice', x: 250, y: 560, tier: 2 },
      { type: 'ice', x: 340, y: 560, tier: 1 },
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
      { type: 'rock', x: 90, y: 560 },
      { type: 'rock', x: 200, y: 560 },
      { type: 'rock', x: 310, y: 560 },
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
    dropLimit: 60,
    obstacles: [{ type: 'rock', x: 200, y: 560 }],
    stars: starsForDropBudget(60),
    flavor: 'Deep in the wood, the light is oldest. A Cloud Balloon would wake it.',
  },
];

export const LEVELS: readonly LevelDef[] = [...sunmeadow, ...driftmoor, ...whisperwood];

export function levelById(id: number): LevelDef | undefined {
  return LEVELS.find((l) => l.id === id);
}

export function levelsForLand(land: LevelDef['land']): LevelDef[] {
  return LEVELS.filter((l) => l.land === land);
}
