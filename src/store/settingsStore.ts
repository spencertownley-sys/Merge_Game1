// UI settings (API_DESIGN.md §2.4) in Zustand, hydrated from / persisted to IndexedDB via
// persistence/SettingsRepository.ts. Physics state never lives here (CLAUDE.md stack notes).

import { create } from 'zustand';
import type { Settings } from '../types';

export const DEFAULT_SETTINGS: Settings = {
  sound: true,
  music: true,
  haptics: false,
  reduceMotion: false,
  simpleGraphics: false,
  showTierNumbers: false,
};

interface SettingsState extends Settings {
  hydrated: boolean;
  hydrate: (s: Partial<Settings>) => void;
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

export const useSettings = create<SettingsState>((set) => ({
  ...DEFAULT_SETTINGS,
  hydrated: false,
  hydrate: (s) => set({ ...s, hydrated: true }),
  set: (key, value) => set({ [key]: value } as Partial<Settings>),
}));

/** Honour the OS-level preference on first run unless the player set it explicitly. */
export function systemPrefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
}
