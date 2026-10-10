// Screen navigation + toasts (UI_UX_NOTES.md §4: button-driven, no tab bar).

import { create } from 'zustand';
import type { LandId } from '../types';

export type Screen =
  | { name: 'home' }
  | { name: 'classic'; seed: number; runKey: number }
  /** `story` opens the map with a story playing: `true` for the opening (?story=1), or a
   *  land's id for its arrival story (?story=<land id>). */
  | { name: 'journey'; story?: true | LandId }
  | { name: 'level'; levelId: number; runKey: number }
  | { name: 'settings'; from: Screen }
  | { name: 'admin' };

export interface Toast {
  id: number;
  message: string;
  kind: 'info' | 'error';
}

interface UiState {
  screen: Screen;
  toasts: Toast[];
  navigate: (screen: Screen) => void;
  toast: (message: string, kind?: Toast['kind']) => void;
  dismissToast: (id: number) => void;
}

let toastId = 0;

export const useUi = create<UiState>((set) => ({
  screen: { name: 'home' },
  toasts: [],
  navigate: (screen) => set({ screen }),
  toast: (message, kind = 'info') => {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts, { id, message, kind }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3500);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** A fresh Classic seed. Seeds only pick the shuffle-bag sequence; all gameplay randomness
 *  then flows through engine/rng.ts. */
export function newRunSeed(): number {
  const a = new Uint32Array(1);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(a);
    return a[0] >>> 0;
  }
  return (Date.now() >>> 0) ^ 0x5bd1e995;
}
