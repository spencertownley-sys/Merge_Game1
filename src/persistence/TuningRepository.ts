// Admin tuning persistence (IndexedDB). One active record; export/import is plain JSON.

import { getDB } from './db';
import { DEFAULT_GAME_TUNING, normalizeTuning, type GameTuning } from '../config/tuning';

export interface TuningRepository {
  load(): Promise<GameTuning>;
  save(t: GameTuning): Promise<void>;
  reset(): Promise<void>;
}

export const tuningRepository: TuningRepository = {
  async load() {
    const db = await getDB();
    const row = await db.get('tuning', 'active');
    return row ? normalizeTuning(row.value) : { ...DEFAULT_GAME_TUNING };
  },
  async save(t) {
    const db = await getDB();
    await db.put('tuning', {
      key: 'active',
      value: normalizeTuning(t),
      updatedAt: new Date().toISOString(),
    });
  },
  async reset() {
    const db = await getDB();
    await db.delete('tuning', 'active');
  },
};
