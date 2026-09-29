// API_DESIGN.md §2.4 SettingsRepository, IndexedDB-backed.

import { getDB } from './db';
import { DEFAULT_SETTINGS } from '../store/settingsStore';
import type { SettingKey, SettingValue, Settings } from '../types';

export interface SettingsRepository {
  get<K extends SettingKey>(key: K): Promise<SettingValue<K>>;
  set<K extends SettingKey>(key: K, value: SettingValue<K>): Promise<void>;
  getAll(): Promise<Settings>;
}

export const settingsRepository: SettingsRepository = {
  async get(key) {
    const db = await getDB();
    const row = await db.get('settings', key);
    return (row?.value ?? DEFAULT_SETTINGS[key]) as SettingValue<typeof key>;
  },
  async set(key, value) {
    const db = await getDB();
    await db.put('settings', { key, value });
  },
  async getAll() {
    const db = await getDB();
    const rows = await db.getAll('settings');
    const out: Settings = { ...DEFAULT_SETTINGS };
    for (const row of rows) (out as unknown as Record<string, unknown>)[row.key] = row.value;
    return out;
  },
};
