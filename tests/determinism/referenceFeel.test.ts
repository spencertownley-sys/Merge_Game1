// The default physics must keep matching the reference video (game design §2, revised
// 2026-10-10). Measured there in box widths: a full-height fall takes ~1.0-1.1 s at constant
// acceleration, a landing hops ~8% of its drop height, and rolling speed on a flat floor
// fades to ~27% over 4 s.
import RAPIER from '@dimforge/rapier2d-compat';
import { beforeAll, describe, expect, it } from 'vitest';
import { GameSim } from '../../src/engine/gameSim';
import { PHYSICS, PX_PER_METER } from '../../src/config/physics';
import { tierRadiusPx } from '../../src/config/tiers';

beforeAll(async () => {
  await RAPIER.init();
});

const STEP_SEC = PHYSICS.fixedTimestepSec;

/** Drops one tier-3 ball mid-board on an empty floor; returns fall time and hop ratio. */
function fallAndHop(): { fallSec: number; hop: number } {
  const sim = new GameSim(RAPIER, { seed: 1, level: { spawnBag: [0, 0, 1, 0, 0] } });
  sim.drop(PHYSICS.boardWidthPx / 2);
  const r = tierRadiusPx(3);
  const restY = PHYSICS.boardHeightPx - r;
  let landStep = -1;
  let highestAfter = Infinity;
  for (let i = 0; i < 600; i++) {
    sim.step();
    const b = sim.snapshot().balls[0];
    if (landStep < 0 && b.y + b.radius >= PHYSICS.boardHeightPx - 0.5) landStep = i;
    if (landStep >= 0 && i > landStep + 2) highestAfter = Math.min(highestAfter, b.y);
  }
  sim.destroy();
  return {
    fallSec: landStep * STEP_SEC,
    hop: (restY - highestAfter) / (restY - PHYSICS.dropRailYPx),
  };
}

/** Rolls a tier-3 ball along the floor and returns its speed after 4 s relative to after 1 s. */
function rollFade(): number {
  const sim = new GameSim(RAPIER, { seed: 1 });
  const r = tierRadiusPx(3);
  const vPx = 34.5; // the reference's rolling speed, scaled to this board
  // createBall is private: reach it here only to start a ball already rolling.
  (sim as unknown as { createBall(o: object): unknown }).createBall({
    tier: 3,
    kind: 'ball',
    radiusPx: r,
    x: 60,
    y: PHYSICS.boardHeightPx - r,
    origin: 'drop',
    vx: vPx / PX_PER_METER,
    angvel: vPx / r,
  });
  let v1 = 0;
  let v5 = 0;
  for (let i = 1; i <= 600; i++) {
    sim.step();
    if (i === 120) v1 = Math.abs(sim.snapshot().balls[0].vx);
    if (i === 600) v5 = Math.abs(sim.snapshot().balls[0].vx);
  }
  sim.destroy();
  return v5 / v1;
}

describe('default physics match the reference feel', () => {
  it('a full-height fall takes about as long as in the reference', () => {
    const { fallSec } = fallAndHop();
    expect(fallSec).toBeGreaterThan(0.95);
    expect(fallSec).toBeLessThan(1.2);
  });

  it('a landing makes a small hop, not a thud or a bounce', () => {
    const { hop } = fallAndHop();
    expect(hop).toBeGreaterThan(0.05);
    expect(hop).toBeLessThan(0.12);
  });

  it('a mote keeps rolling for seconds, fading about as fast as in the reference', () => {
    const fade = rollFade();
    expect(fade).toBeGreaterThan(0.18);
    expect(fade).toBeLessThan(0.4);
  });
});
