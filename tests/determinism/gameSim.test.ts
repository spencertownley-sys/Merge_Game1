// Determinism is not optional (CLAUDE.md Step 3): the same seed + the same input log must
// produce the identical final state, step for step.
import RAPIER from '@dimforge/rapier2d-compat';
import { beforeAll, describe, expect, it } from 'vitest';
import { GameSim } from '../../src/engine/gameSim';
import { mulberry32 } from '../../src/engine/rng';
import { PHYSICS } from '../../src/config/physics';
import type { SimEvent, SimInit, Snapshot } from '../../src/engine/types';

beforeAll(async () => {
  await RAPIER.init();
});

interface InputLog {
  /** step index -> x position of a drop */
  drops: Map<number, number>;
  totalSteps: number;
}

/** A scripted play session: drops every ~60 steps (0.5s) at a pseudo-random x. The x
 *  sequence comes from its OWN mulberry32 stream so the log itself is reproducible. */
function makeInputLog(logSeed: number, dropCount: number, stepsBetween = 60): InputLog {
  const rng = mulberry32(logSeed);
  const drops = new Map<number, number>();
  let step = 30;
  for (let i = 0; i < dropCount; i++) {
    drops.set(step, 20 + rng() * (PHYSICS.boardWidthPx - 40));
    step += stepsBetween;
  }
  return { drops, totalSteps: step + 600 };
}

function runSession(
  init: SimInit,
  log: InputLog,
): { final: Snapshot; events: SimEvent[]; dropsAccepted: number } {
  const sim = new GameSim(RAPIER, init);
  const events: SimEvent[] = [];
  let dropsAccepted = 0;
  for (let s = 0; s < log.totalSteps; s++) {
    const x = log.drops.get(s);
    if (x !== undefined && sim.drop(x)) dropsAccepted++;
    sim.step();
    events.push(...sim.takeEvents());
  }
  const final = sim.snapshot();
  sim.destroy();
  return { final, events, dropsAccepted };
}

describe('GameSim determinism', () => {
  it('same seed + same input log => identical final state and event stream', () => {
    const log = makeInputLog(99, 120);
    const a = runSession({ seed: 20260929 }, log);
    const b = runSession({ seed: 20260929 }, log);
    expect(a.dropsAccepted).toBe(b.dropsAccepted);
    expect(a.final).toEqual(b.final);
    expect(a.events).toEqual(b.events);
    // Sanity: the session actually did something.
    expect(a.final.balls.length).toBeGreaterThan(0);
    expect(a.events.some((e) => e.type === 'merge')).toBe(true);
    expect(a.final.score).toBeGreaterThan(0);
  });

  it('different seeds => different tier sequences', () => {
    const log = makeInputLog(99, 30);
    const a = runSession({ seed: 1 }, log);
    const b = runSession({ seed: 2 }, log);
    const tiersA = a.events.filter((e) => e.type === 'drop').map((e) => e.tier);
    const tiersB = b.events.filter((e) => e.type === 'drop').map((e) => e.tier);
    expect(tiersA).not.toEqual(tiersB);
  });
});

describe('GameSim rules', () => {
  it('shaped boxes: walls are solid, deterministic, and narrow the drop range', () => {
    const walls = [
      { x: 0, y: 0, width: 45, height: 520 },
      { x: 355, y: 0, width: 45, height: 520 },
      { x: 188, y: 330, width: 24, height: 190 },
    ];
    const run = () => {
      const sim = new GameSim(RAPIER, { seed: 21, level: { walls } });
      const xs: number[] = [];
      for (let i = 0; i < 25; i++) {
        sim.drop(i % 2 ? 0 : 400); // try to drop outside the narrowed box
        for (let s = 0; s < 72; s++) sim.step();
        for (const e of sim.takeEvents()) if (e.type === 'drop') xs.push(e.x);
      }
      const snap = sim.snapshot();
      sim.destroy();
      return { xs, snap };
    };
    const a = run();
    const b = run();
    expect(a.snap).toEqual(b.snap);
    for (const x of a.xs) {
      expect(x).toBeGreaterThan(45);
      expect(x).toBeLessThan(355);
    }
    // nothing ever ends up inside a wall block
    for (const ball of a.snap.balls) {
      expect(ball.x - ball.radius).toBeGreaterThan(45 - 2);
      expect(ball.x + ball.radius).toBeLessThan(355 + 2);
    }
  });

  it('fog (previewCount 0) hides the preview without changing the tier sequence', () => {
    const clear = new GameSim(RAPIER, { seed: 9 });
    const foggy = new GameSim(RAPIER, { seed: 9, level: { previewCount: 0 } });
    expect(foggy.snapshot().nextTiers).toEqual([]);
    expect(clear.snapshot().nextTiers).toHaveLength(1);
    for (let i = 0; i < 5; i++) {
      expect(foggy.snapshot().heldTier).toBe(clear.snapshot().heldTier);
      clear.drop(200);
      foggy.drop(200);
      for (let s = 0; s < 72; s++) {
        clear.step();
        foggy.step();
      }
    }
    clear.destroy();
    foggy.destroy();
  });

  it('enforces the 450ms drop cooldown in sim time (§2)', () => {
    const sim = new GameSim(RAPIER, { seed: 5 });
    expect(sim.drop(200)).toBe(true);
    expect(sim.drop(200)).toBe(false);
    const stepsFor450ms = Math.ceil(PHYSICS.dropCooldownMs / (PHYSICS.fixedTimestepSec * 1000));
    for (let i = 0; i < stepsFor450ms - 1; i++) sim.step();
    expect(sim.drop(200)).toBe(false);
    sim.step();
    expect(sim.drop(200)).toBe(true);
    sim.destroy();
  });

  it('merges two same-tier balls dropped on top of each other into the next tier (§5.3)', () => {
    // Force an all-tier-1 bag so the first two drops are guaranteed to match.
    const sim = new GameSim(RAPIER, { seed: 5, level: { spawnBag: [20, 0, 0, 0, 0] } });
    sim.drop(200);
    for (let i = 0; i < 120; i++) sim.step(); // let it land (1 s)
    sim.drop(200);
    let merged: SimEvent | undefined;
    for (let i = 0; i < 240 && !merged; i++) {
      sim.step();
      merged = sim.takeEvents().find((e) => e.type === 'merge');
    }
    expect(merged).toBeDefined();
    if (merged?.type === 'merge') {
      expect(merged.tier).toBe(2);
      expect(merged.parentIds).toEqual([1, 2]);
      expect(merged.resultId).toBe(3); // §5.3: next monotonic integer
      expect(merged.points).toBe(1); // T(2) = 1, combo 1
    }
    const snap = sim.snapshot();
    expect(snap.balls.map((b) => b.tier)).toEqual([2]);
    expect(snap.score).toBe(1);
    expect(snap.topTier).toBe(2);
    sim.destroy();
  });

  it('respects a Journey dropLimit', () => {
    const sim = new GameSim(RAPIER, { seed: 5, level: { dropLimit: 2 } });
    const stepsFor450ms = Math.ceil(PHYSICS.dropCooldownMs / (PHYSICS.fixedTimestepSec * 1000));
    expect(sim.drop(100)).toBe(true);
    for (let i = 0; i < stepsFor450ms; i++) sim.step();
    expect(sim.drop(300)).toBe(true);
    for (let i = 0; i < stepsFor450ms; i++) sim.step();
    expect(sim.drop(200)).toBe(false);
    expect(sim.snapshot().canDrop).toBe(false);
    sim.destroy();
  });

  it('ends the run when the pile stays over the danger line (§7)', () => {
    // Drop big tier-5 balls in one column as fast as the cooldown allows until game over.
    const sim = new GameSim(RAPIER, { seed: 5, level: { spawnBag: [0, 0, 0, 0, 20] } });
    let over = false;
    for (let s = 0; s < 120 * 60 && !over; s++) {
      sim.drop(200);
      sim.step();
      if (sim.takeEvents().some((e) => e.type === 'gameOver')) over = true;
    }
    expect(over).toBe(true);
    expect(sim.isGameOver).toBe(true);
    expect(sim.drop(200)).toBe(false);
    sim.destroy();
  });

  it('ice obstacles thaw when a merge happens touching them, and rocks never merge (§10.3)', () => {
    const sim = new GameSim(RAPIER, {
      seed: 5,
      level: {
        spawnBag: [20, 0, 0, 0, 0],
        obstacles: [
          { type: 'ice', x: 200, y: 480, tier: 1 },
          { type: 'rock', x: 60, y: 480 },
        ],
      },
    });
    const kinds = () => sim.snapshot().balls.map((b) => `${b.kind}:${b.tier}`);
    expect(kinds()).toEqual(['ice:1', 'rock:0']); // ids follow obstacle order
    // Two tier-1 drops directly onto the ice ball: they merge, thawing the ice.
    sim.drop(200);
    for (let i = 0; i < 120; i++) sim.step();
    sim.drop(200);
    let thawed = false;
    for (let i = 0; i < 360 && !thawed; i++) {
      sim.step();
      thawed = sim.takeEvents().some((e) => e.type === 'thaw');
    }
    expect(thawed).toBe(true);
    // The thawed tier-1 ball is now a plain ball; the rock is untouched.
    expect(sim.snapshot().balls.some((b) => b.kind === 'rock')).toBe(true);
    expect(sim.snapshot().balls.some((b) => b.kind === 'ice')).toBe(false);
    sim.destroy();
  });
});
