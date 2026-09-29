// API_DESIGN.md §2.2 RunRepository, IndexedDB-backed.

import { getDB, newId, type RunRecord } from './db';
import type { GameMode, MergeEvent, Run } from '../types';

export interface SaveRunInput {
  mode: GameMode;
  levelId?: number;
  seed: number;
  score: number;
  topTier: number;
  mergeLog: MergeEvent[];
  weights?: Record<string, number>;
}

export interface RunRepository {
  saveRun(run: SaveRunInput): Promise<Run>;
  getBestScore(mode: GameMode, levelId?: number): Promise<number>;
  listRecentRuns(limit?: number): Promise<Run[]>;
}

export const runRepository: RunRepository = {
  async saveRun(input) {
    const db = await getDB();
    const record: RunRecord = {
      id: newId(),
      mode: input.mode,
      levelId: input.levelId ?? null,
      seed: input.seed,
      score: input.score,
      topTier: input.topTier,
      mergeLog: input.mergeLog,
      weights: input.weights ?? null,
      playedAt: new Date().toISOString(),
    };
    await db.put('runs', record);
    return record;
  },

  async getBestScore(mode, levelId) {
    const db = await getDB();
    const runs = await db.getAllFromIndex('runs', 'byMode', mode);
    let best = 0;
    for (const r of runs) {
      if (levelId !== undefined && r.levelId !== levelId) continue;
      if (r.score > best) best = r.score;
    }
    return best;
  },

  async listRecentRuns(limit = 20) {
    const db = await getDB();
    const out: Run[] = [];
    let cursor = await db.transaction('runs').store.index('byPlayedAt').openCursor(null, 'prev');
    while (cursor && out.length < limit) {
      out.push(cursor.value);
      cursor = await cursor.continue();
    }
    return out;
  },
};
