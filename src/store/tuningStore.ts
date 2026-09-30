// Active game-feel tuning (admin-editable). Hydrated from IndexedDB at boot; every change is
// saved and pushed live to the running sim/renderer by the screens that subscribe.

import { create } from 'zustand';
import {
  DEFAULT_GAME_TUNING,
  applyPreset,
  normalizeTuning,
  type ArtOverrides,
  type ArtStyleId,
  type GameTuning,
  type VisualTuning,
} from '../config/tuning';
import type { PhysicsTuning } from '../config/physics';
import { tuningRepository } from '../persistence/TuningRepository';

interface TuningState {
  tuning: GameTuning;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setPhysics: (patch: Partial<PhysicsTuning>) => void;
  setVisual: (patch: Partial<VisualTuning>) => void;
  setArtStyle: (style: ArtStyleId) => void;
  setArt: (patch: Partial<ArtOverrides>) => void;
  usePreset: (id: string) => void;
  replaceAll: (t: unknown) => void;
  resetAll: () => void;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function persist(t: GameTuning): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    tuningRepository.save(t).catch((err) => console.warn('Failed to save tuning', err));
  }, 250);
}

export const useTuning = create<TuningState>((set, get) => {
  const update = (next: GameTuning) => {
    set({ tuning: next });
    persist(next);
  };
  return {
    tuning: { ...DEFAULT_GAME_TUNING },
    hydrated: false,
    hydrate: async () => {
      try {
        const t = await tuningRepository.load();
        set({ tuning: t, hydrated: true });
      } catch (err) {
        console.warn('Tuning failed to load; using defaults', err);
        set({ hydrated: true });
      }
    },
    setPhysics: (patch) => {
      const t = get().tuning;
      update(normalizeTuning({ ...t, physics: { ...t.physics, ...patch }, presetId: 'custom' }));
    },
    setVisual: (patch) => {
      const t = get().tuning;
      update(normalizeTuning({ ...t, visual: { ...t.visual, ...patch }, presetId: 'custom' }));
    },
    setArtStyle: (artStyle) => update(normalizeTuning({ ...get().tuning, artStyle })),
    setArt: (patch) => {
      const t = get().tuning;
      update(normalizeTuning({ ...t, art: { ...t.art, ...patch } }));
    },
    usePreset: (id) => update(applyPreset(get().tuning, id)),
    replaceAll: (raw) => update(normalizeTuning(raw)),
    resetAll: () => {
      const next = {
        ...DEFAULT_GAME_TUNING,
        art: { tierArt: {}, frameArt: {}, backgroundArt: {} },
      };
      set({ tuning: next });
      tuningRepository.reset().catch(() => {});
    },
  };
});
