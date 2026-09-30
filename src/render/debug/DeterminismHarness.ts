// Dev-only harness for the Step 9 cross-browser determinism check: runs the real GameSim
// twice in this browser with the same seed and a scripted input log, then exposes whether
// the two final states (and event streams) are byte-identical, plus a hash so runs can be
// compared across browsers from the Playwright output. Opened with ?debug=determinism.

import RAPIER from '@dimforge/rapier2d-compat';
import { GameSim } from '../../engine/gameSim';
import { mulberry32 } from '../../engine/rng';
import { PHYSICS } from '../../config/physics';
import type { SimEvent } from '../../engine/types';

export interface DeterminismResult {
  equal: boolean;
  hashA: string;
  hashB: string;
  balls: number;
  score: number;
  merges: number;
  steps: number;
}

declare global {
  interface Window {
    __determinism?: DeterminismResult | { error: string };
  }
}

function fnv1a(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

function runSession(seed: number, logSeed: number, dropCount: number) {
  const rng = mulberry32(logSeed);
  const drops = new Map<number, number>();
  let step = 30;
  for (let i = 0; i < dropCount; i++) {
    drops.set(step, 20 + rng() * (PHYSICS.boardWidthPx - 40));
    step += 60;
  }
  const total = step + 600;
  const sim = new GameSim(RAPIER, { seed });
  const events: SimEvent[] = [];
  for (let s = 0; s < total; s++) {
    const x = drops.get(s);
    if (x !== undefined) sim.drop(x);
    sim.step();
    events.push(...sim.takeEvents());
  }
  const final = sim.snapshot();
  sim.destroy();
  return { final, events, steps: total };
}

export async function runDeterminismCheck(): Promise<DeterminismResult> {
  await RAPIER.init();
  const a = runSession(20260929, 99, 120);
  const b = runSession(20260929, 99, 120);
  const serA = JSON.stringify([a.final, a.events]);
  const serB = JSON.stringify([b.final, b.events]);
  return {
    equal: serA === serB,
    hashA: fnv1a(serA),
    hashB: fnv1a(serB),
    balls: a.final.balls.length,
    score: a.final.score,
    merges: a.events.filter((e) => e.type === 'merge').length,
    steps: a.steps,
  };
}
