// Journey progress (stars per level) mirrored from IndexedDB, plus unlock/restoration rules.

import { create } from 'zustand';
import { journeyRepository } from '../persistence/JourneyRepository';
import { LEVELS, levelsForLand } from '../journey/levels';
import type { LandId, LevelProgress, Stars } from '../types';

interface JourneyState {
  loaded: boolean;
  progress: Record<number, LevelProgress>;
  load: () => Promise<void>;
  record: (levelId: number, result: { stars: Stars; score: number }) => Promise<void>;
}

export const useJourney = create<JourneyState>((set, get) => ({
  loaded: false,
  progress: {},
  load: async () => {
    try {
      const progress = await journeyRepository.getAllProgress();
      set({ progress, loaded: true });
    } catch (err) {
      console.warn('Journey progress failed to load', err);
      set({ loaded: true });
    }
  },
  record: async (levelId, result) => {
    const prev = get().progress[levelId];
    const merged: LevelProgress = {
      stars: Math.max(prev?.stars ?? 0, result.stars) as Stars,
      bestScore: Math.max(prev?.bestScore ?? 0, result.score),
    };
    set({ progress: { ...get().progress, [levelId]: merged } });
    await journeyRepository.recordCompletion(levelId, result);
  },
}));

/** A level is unlocked when it is the first, or the previous level has at least one star. */
export function isLevelUnlocked(levelId: number, progress: Record<number, LevelProgress>): boolean {
  if (levelId <= 1) return true;
  return (progress[levelId - 1]?.stars ?? 0) >= 1;
}

/** A land is restored (palette shift, §4.2) once every one of its levels has ≥1 star. */
export function isLandRestored(land: LandId, progress: Record<number, LevelProgress>): boolean {
  const levels = levelsForLand(land);
  return levels.length > 0 && levels.every((l) => (progress[l.id]?.stars ?? 0) >= 1);
}

export function nextPlayableLevelId(progress: Record<number, LevelProgress>): number | null {
  for (const l of LEVELS) if (!progress[l.id] || progress[l.id].stars === 0) return l.id;
  return null;
}
