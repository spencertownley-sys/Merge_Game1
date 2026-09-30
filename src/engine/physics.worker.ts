// Physics Web Worker: owns the GameSim and a fixed-timestep loop, posts a typed frame
// (snapshot + events) to the main thread after each batch of steps. Wall-clock time only
// decides HOW MANY fixed steps to run per tick; nothing inside a step reads it.

import RAPIER from '@dimforge/rapier2d-compat';
import { PHYSICS } from '../config/physics';
import { GameSim } from './gameSim';
import type { MainToWorkerMessage, WorkerToMainMessage } from './types';

const STEP_MS = PHYSICS.fixedTimestepSec * 1000;
/** Cap on catch-up steps per tick so a backgrounded tab doesn't spiral. */
const MAX_STEPS_PER_TICK = 8;
const TICK_INTERVAL_MS = 4;

let sim: GameSim | null = null;
let paused = false;
let accumulatorMs = 0;
let lastTickMs = 0;
let timer: ReturnType<typeof setInterval> | null = null;

const post = (msg: WorkerToMainMessage) => self.postMessage(msg);

function tick(): void {
  if (!sim || paused) return;
  const now = performance.now();
  accumulatorMs += Math.min(now - lastTickMs, STEP_MS * MAX_STEPS_PER_TICK);
  lastTickMs = now;

  let steps = 0;
  while (accumulatorMs >= STEP_MS && steps < MAX_STEPS_PER_TICK) {
    sim.step();
    accumulatorMs -= STEP_MS;
    steps++;
  }
  if (steps > 0) {
    post({ type: 'frame', snapshot: sim.snapshot(), events: sim.takeEvents() });
  }
}

function startLoop(): void {
  if (timer !== null) clearInterval(timer);
  lastTickMs = performance.now();
  accumulatorMs = 0;
  timer = setInterval(tick, TICK_INTERVAL_MS);
}

const ready = RAPIER.init()
  .then(() => post({ type: 'ready' }))
  .catch((err: unknown) => post({ type: 'error', message: String(err) }));

self.onmessage = async (ev: MessageEvent<MainToWorkerMessage>) => {
  const msg = ev.data;
  try {
    switch (msg.type) {
      case 'init': {
        await ready;
        sim?.destroy();
        sim = new GameSim(RAPIER, msg.init);
        paused = false;
        startLoop();
        // Immediate first frame so the HUD has the held/next tiers before any step runs.
        post({ type: 'frame', snapshot: sim.snapshot(), events: sim.takeEvents() });
        break;
      }
      case 'drop':
        if (sim && !paused) {
          sim.drop(msg.x);
          post({ type: 'frame', snapshot: sim.snapshot(), events: sim.takeEvents() });
        }
        break;
      case 'pause':
        paused = true;
        break;
      case 'resume':
        if (paused) {
          paused = false;
          lastTickMs = performance.now();
          accumulatorMs = 0;
        }
        break;
      case 'tuning':
        sim?.applyTuning(msg.tuning);
        break;
      case 'destroy':
        if (timer !== null) clearInterval(timer);
        timer = null;
        sim?.destroy();
        sim = null;
        break;
    }
  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};
