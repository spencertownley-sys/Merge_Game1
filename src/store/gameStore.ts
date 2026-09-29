// HUD-facing game state. The worker posts frames at up to 120 Hz; the Pixi scene consumes
// those directly. This store only receives the handful of values React needs, and only when
// they change, so the HUD re-renders a few times a second at most.

import { create } from 'zustand';
import type { SimEvent, Snapshot } from '../engine/types';
import type { GameMode, MergeEvent } from '../types';

export interface HudState {
  score: number;
  comboCount: number;
  heldTier: number;
  nextTiers: number[];
  dropsMade: number;
  canDrop: boolean;
  warning: boolean;
  gameOver: boolean;
  topTier: number;
  timeMs: number;
  windActive: boolean;
  windDirection: -1 | 0 | 1;
}

export interface RunState extends HudState {
  mode: GameMode;
  seed: number;
  levelId: number | null;
  bestScore: number;
  mergeLog: MergeEvent[];
  lastMergeTier: number;
  lastMergeAtMs: number;
  paused: boolean;
}

interface GameStore extends RunState {
  beginRun: (mode: GameMode, seed: number, levelId: number | null, bestScore: number) => void;
  applyFrame: (snapshot: Snapshot, events: SimEvent[]) => void;
  setPaused: (paused: boolean) => void;
  setBestScore: (best: number) => void;
}

const EMPTY_HUD: HudState = {
  score: 0,
  comboCount: 0,
  heldTier: 0,
  nextTiers: [],
  dropsMade: 0,
  canDrop: false,
  warning: false,
  gameOver: false,
  topTier: 0,
  timeMs: 0,
  windActive: false,
  windDirection: 0,
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...EMPTY_HUD,
  mode: 'classic',
  seed: 0,
  levelId: null,
  bestScore: 0,
  mergeLog: [],
  lastMergeTier: 0,
  lastMergeAtMs: -Infinity,
  paused: false,

  beginRun: (mode, seed, levelId, bestScore) =>
    set({
      ...EMPTY_HUD,
      mode,
      seed,
      levelId,
      bestScore,
      mergeLog: [],
      lastMergeTier: 0,
      lastMergeAtMs: -Infinity,
      paused: false,
    }),

  applyFrame: (s, events) => {
    const cur = get();
    const patch: Partial<GameStore> = {};
    if (s.score !== cur.score) patch.score = s.score;
    if (s.comboCount !== cur.comboCount) patch.comboCount = s.comboCount;
    if (s.heldTier !== cur.heldTier) patch.heldTier = s.heldTier;
    if (
      s.nextTiers.length !== cur.nextTiers.length ||
      s.nextTiers.some((t, i) => t !== cur.nextTiers[i])
    )
      patch.nextTiers = s.nextTiers;
    if (s.dropsMade !== cur.dropsMade) patch.dropsMade = s.dropsMade;
    if (s.canDrop !== cur.canDrop) patch.canDrop = s.canDrop;
    if (s.warning !== cur.warning) patch.warning = s.warning;
    if (s.gameOver !== cur.gameOver) patch.gameOver = s.gameOver;
    if (s.topTier !== cur.topTier) patch.topTier = s.topTier;
    if (s.windActive !== cur.windActive) patch.windActive = s.windActive;
    if (s.windDirection !== cur.windDirection) patch.windDirection = s.windDirection;
    // Time only needs ~4 Hz precision for the HUD timer.
    if (Math.floor(s.timeMs / 250) !== Math.floor(cur.timeMs / 250)) patch.timeMs = s.timeMs;

    let log: MergeEvent[] | null = null;
    for (const e of events) {
      if (e.type === 'merge' || e.type === 'apex') {
        log ??= cur.mergeLog.slice();
        log.push({
          tier: e.type === 'merge' ? e.tier : 11,
          atMs: e.atMs,
          parentIds: e.parentIds,
          resultId: e.type === 'merge' ? e.resultId : -1,
        });
        patch.lastMergeTier = e.type === 'merge' ? e.tier : 11;
        patch.lastMergeAtMs = e.atMs;
      }
    }
    if (log) patch.mergeLog = log;
    if (Object.keys(patch).length) set(patch);
  },

  setPaused: (paused) => set({ paused }),
  setBestScore: (bestScore) => set({ bestScore }),
}));
