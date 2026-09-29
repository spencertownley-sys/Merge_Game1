import { describe, expect, it } from 'vitest';
import {
  LevelRuntime,
  calculateStars,
  starsForDropBudget,
  toSimLevelConfig,
} from '../../src/journey/levelRuntime';
import type { SimEvent, Snapshot } from '../../src/engine/types';
import type { LevelDef } from '../../src/types';

function snap(p: Partial<Snapshot>): Snapshot {
  return {
    stepIndex: 0,
    timeMs: 0,
    score: 0,
    comboCount: 0,
    heldTier: 1,
    nextTiers: [1],
    dropsMade: 0,
    canDrop: true,
    balls: [],
    overLineMs: 0,
    warning: false,
    gameOver: false,
    topTier: 1,
    windActive: false,
    windDirection: 0,
    ...p,
  };
}

const base: LevelDef = {
  id: 99,
  land: 'sunmeadow-hollow',
  name: 'Test',
  seed: 1,
  goals: [{ type: 'reachTier', tier: 4 }],
  stars: { two: { scoreAtLeast: 40 }, three: { scoreAtLeast: 80 } },
};

describe('LevelRuntime goals', () => {
  it('reachTier completes when topTier reaches the target and awards stars by score rule', () => {
    const rt = new LevelRuntime(base);
    let st = rt.applyFrame(snap({ topTier: 3, score: 10 }), []);
    expect(st.outcome).toBe('playing');
    expect(st.goals[0].current).toBe(3);
    st = rt.applyFrame(snap({ topTier: 4, score: 45 }), []);
    expect(st.outcome).toBe('won');
    expect(st.stars).toBe(2);
  });

  it('mergeCount counts merge events of the target tier', () => {
    const rt = new LevelRuntime({ ...base, goals: [{ type: 'mergeCount', tier: 3, count: 2 }] });
    const merge = (tier: number): SimEvent => ({
      type: 'merge',
      atMs: 0,
      tier,
      parentIds: [1, 2],
      resultId: 3,
      x: 0,
      y: 0,
      points: 1,
      comboCount: 1,
    });
    let st = rt.applyFrame(snap({}), [merge(2), merge(3)]);
    expect(st.goals[0].current).toBe(1);
    expect(st.outcome).toBe('playing');
    st = rt.applyFrame(snap({ score: 100 }), [merge(3)]);
    expect(st.outcome).toBe('won');
    expect(st.stars).toBe(3);
  });

  it('clearObstacle(ice) counts thaw events', () => {
    const rt = new LevelRuntime({
      ...base,
      goals: [{ type: 'clearObstacle', obstacle: 'ice', count: 2 }],
    });
    const thaw = (id: number): SimEvent => ({ type: 'thaw', id, tier: 1, atMs: 0 });
    expect(rt.applyFrame(snap({}), [thaw(1)]).outcome).toBe('playing');
    expect(rt.applyFrame(snap({}), [thaw(2)]).outcome).toBe('won');
  });

  it('fails after the drop limit is exhausted and the board settles, with 30%/50% star rules', () => {
    const level: LevelDef = { ...base, dropLimit: 10, stars: starsForDropBudget(10) };
    const rt = new LevelRuntime(level);
    let st = rt.applyFrame(snap({ dropsMade: 10, timeMs: 1000 }), []);
    expect(st.dropsRemaining).toBe(0);
    expect(st.outcome).toBe('playing'); // settle grace
    st = rt.applyFrame(snap({ dropsMade: 10, timeMs: 4500 }), []);
    expect(st.outcome).toBe('failed');
    expect(st.failReason).toBe('drops');
    // Star rules from the §10.5 guidance
    expect(level.stars).toEqual({
      two: { dropsRemainingAtLeast: 3 },
      three: { dropsRemainingAtLeast: 5 },
    });
    expect(calculateStars(level, { dropsRemaining: 5, secondsRemaining: null, score: 0 })).toBe(3);
    expect(calculateStars(level, { dropsRemaining: 3, secondsRemaining: null, score: 0 })).toBe(2);
    expect(calculateStars(level, { dropsRemaining: 1, secondsRemaining: null, score: 0 })).toBe(1);
  });

  it('fails on time limit and on board overflow', () => {
    const timed = new LevelRuntime({ ...base, timeLimitSec: 30 });
    expect(timed.applyFrame(snap({ timeMs: 31_000 }), []).failReason).toBe('time');
    const board = new LevelRuntime(base);
    expect(board.applyFrame(snap({ gameOver: true }), []).failReason).toBe('board');
  });

  it('a win sticks even if the board overflows afterwards', () => {
    const rt = new LevelRuntime(base);
    rt.applyFrame(snap({ topTier: 4 }), []);
    expect(rt.applyFrame(snap({ topTier: 4, gameOver: true }), []).outcome).toBe('won');
  });

  it('toSimLevelConfig passes only what the sim needs', () => {
    const cfg = toSimLevelConfig({
      ...base,
      dropLimit: 12,
      hazards: { wind: { everySec: 5, durationSec: 1, force: 3 } },
      obstacles: [{ type: 'rock', x: 1, y: 2 }],
    });
    expect(cfg).toEqual({
      spawnBag: undefined,
      previewCount: undefined,
      obstacles: [{ type: 'rock', x: 1, y: 2 }],
      wind: { everySec: 5, durationSec: 1, force: 3 },
      mergeContactMs: undefined,
      dropLimit: 12,
    });
  });
});
