// API_DESIGN.md §2.3 JourneyRepository, IndexedDB-backed. Keeps the max of stars/score.

import { getDB } from './db';
import type { LevelProgress, Stars } from '../types';

export interface JourneyRepository {
  getProgress(levelId: number): Promise<LevelProgress | null>;
  recordCompletion(levelId: number, result: { stars: Stars; score: number }): Promise<void>;
  getAllProgress(): Promise<Record<number, LevelProgress>>;
}

export const journeyRepository: JourneyRepository = {
  async getProgress(levelId) {
    const db = await getDB();
    const row = await db.get('journeyProgress', levelId);
    return row ? { stars: row.stars, bestScore: row.bestScore } : null;
  },
  async recordCompletion(levelId, result) {
    const db = await getDB();
    const tx = db.transaction('journeyProgress', 'readwrite');
    const existing = await tx.store.get(levelId);
    await tx.store.put({
      levelId,
      stars: Math.max(existing?.stars ?? 0, result.stars) as Stars,
      bestScore: Math.max(existing?.bestScore ?? 0, result.score),
    });
    await tx.done;
  },
  async getAllProgress() {
    const db = await getDB();
    const rows = await db.getAll('journeyProgress');
    const out: Record<number, LevelProgress> = {};
    for (const r of rows) out[r.levelId] = { stars: r.stars, bestScore: r.bestScore };
    return out;
  },
};
