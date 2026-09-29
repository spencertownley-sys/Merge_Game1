// Shared worker <-> main message types. Every message crossing the worker boundary MUST be
// one of these (CLAUDE.md conventions) — never post untyped objects.

import type { Obstacle, WindHazard } from '../types';
import type { BallKind } from './mergeResolver';
import type { PhysicsTuning } from '../config/physics';

/** The subset of a LevelDef the simulation itself needs. Goal tracking, star rules, etc.
 *  stay on the main thread (journey/levelRuntime.ts) and only consume sim events. */
export interface SimLevelConfig {
  spawnBag?: [number, number, number, number, number];
  previewCount?: 1 | 2;
  obstacles?: Obstacle[];
  wind?: WindHazard;
  mergeContactMs?: number;
  dropLimit?: number;
}

export interface SimInit {
  seed: number;
  level?: SimLevelConfig;
  /** Dev tuning overrides (DevTuningPanel). Never set in production play. */
  tuning?: Partial<PhysicsTuning>;
}

export interface BallSnapshot {
  id: number;
  tier: number;
  kind: BallKind;
  /** Board px. */
  x: number;
  y: number;
  /** Radians, Pixi convention (y-down, positive = clockwise on screen). */
  angle: number;
  /** Board px/s. */
  vx: number;
  vy: number;
  /** rad/s. */
  angvel: number;
  radius: number;
}

export interface Snapshot {
  stepIndex: number;
  timeMs: number;
  score: number;
  comboCount: number;
  /** The tier the player is currently holding (will be dropped next). */
  heldTier: number;
  /** Preview of what follows the held ball (1 or 2 entries per §4). */
  nextTiers: number[];
  dropsMade: number;
  /** Cooldown / drop limit / game-over gate — the UI greys the rail when false. */
  canDrop: boolean;
  balls: BallSnapshot[];
  overLineMs: number;
  warning: boolean;
  gameOver: boolean;
  topTier: number;
  windActive: boolean;
  /** -1 left, +1 right, 0 none. */
  windDirection: -1 | 0 | 1;
}

export type SimEvent =
  | { type: 'drop'; id: number; tier: number; x: number; atMs: number }
  | {
      type: 'merge';
      atMs: number;
      /** New tier produced. */
      tier: number;
      parentIds: [number, number];
      resultId: number;
      x: number;
      y: number;
      points: number;
      comboCount: number;
    }
  | {
      type: 'apex';
      atMs: number;
      parentIds: [number, number];
      x: number;
      y: number;
      points: number;
      comboCount: number;
    }
  | { type: 'impact'; id: number; speedMps: number; atMs: number }
  | { type: 'thaw'; id: number; tier: number; atMs: number }
  | { type: 'warning'; atMs: number }
  | { type: 'gameOver'; atMs: number; score: number; topTier: number }
  | { type: 'wind'; active: boolean; direction: -1 | 0 | 1; atMs: number };

export type MainToWorkerMessage =
  | { type: 'init'; init: SimInit }
  | { type: 'drop'; x: number }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'tuning'; tuning: Partial<PhysicsTuning> }
  | { type: 'destroy' };

export type WorkerToMainMessage =
  | { type: 'ready' }
  | { type: 'frame'; snapshot: Snapshot; events: SimEvent[] }
  | { type: 'error'; message: string };
