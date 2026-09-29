// IndexedDB setup via `idb`. All Phase 1 persistence lives here — no backend, no network.
// Schema (Tech Spec §2.1): runs, journeyProgress, settings. Skin/photo stores are added in
// Phase 1.5, not here.

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { GameMode, LevelProgress, MergeEvent, Settings } from '../types';

export interface RunRecord {
  id: string;
  mode: GameMode;
  levelId: number | null;
  seed: number;
  score: number;
  topTier: number;
  mergeLog: MergeEvent[];
  weights: Record<string, number> | null;
  playedAt: string;
}

export interface GameDB extends DBSchema {
  runs: {
    key: string;
    value: RunRecord;
    indexes: { byPlayedAt: string; byMode: GameMode };
  };
  journeyProgress: {
    key: number;
    value: LevelProgress & { levelId: number };
  };
  settings: {
    key: keyof Settings;
    value: { key: keyof Settings; value: Settings[keyof Settings] };
  };
}

export const DB_NAME = 'merge-game'; // brand-neutral on purpose: renaming the app must not orphan saves
export const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<GameDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<GameDB>> {
  if (!dbPromise) {
    dbPromise = openDB<GameDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const runs = db.createObjectStore('runs', { keyPath: 'id' });
        runs.createIndex('byPlayedAt', 'playedAt');
        runs.createIndex('byMode', 'mode');
        db.createObjectStore('journeyProgress', { keyPath: 'levelId' });
        db.createObjectStore('settings', { keyPath: 'key' });
      },
    });
  }
  return dbPromise;
}

/** Test hook: drop the cached connection so a fresh (fake) IndexedDB can be used. */
export function resetDBForTests(): void {
  dbPromise = null;
}

let idCounter = 0;

/** Storage-only id; never used for gameplay randomness (so no Math.random anywhere). */
export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${(idCounter++).toString(36)}`;
}
