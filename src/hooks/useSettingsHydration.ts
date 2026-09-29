// Loads persisted settings on boot, applies the OS reduce-motion preference on first run, and
// writes changes back to IndexedDB.

import { useEffect } from 'react';
import { settingsRepository } from '../persistence/SettingsRepository';
import { systemPrefersReducedMotion, useSettings } from '../store/settingsStore';
import { useUi } from '../store/uiStore';
import type { Settings } from '../types';

export function useSettingsHydration(): void {
  const hydrate = useSettings((s) => s.hydrate);
  const toast = useUi((s) => s.toast);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const db = await settingsRepository.getAll();
        if (!live) return;
        const patch: Partial<Settings> = { ...db };
        if (systemPrefersReducedMotion() && db.reduceMotion === false) patch.reduceMotion = true;
        hydrate(patch);
      } catch (err) {
        console.warn('Settings failed to load; using defaults', err);
        hydrate({});
        toast('Settings could not be loaded — using defaults.', 'error');
      }
    })();
    return () => {
      live = false;
    };
  }, [hydrate, toast]);

  // Persist on change (after hydration).
  useEffect(() => {
    return useSettings.subscribe((state, prev) => {
      if (!state.hydrated || !prev.hydrated) return;
      const keys: (keyof Settings)[] = [
        'sound',
        'music',
        'haptics',
        'reduceMotion',
        'simpleGraphics',
        'showTierNumbers',
      ];
      for (const k of keys) {
        if (state[k] !== prev[k]) {
          settingsRepository.set(k, state[k]).catch((err) => {
            console.warn('Failed to save setting', k, err);
            toast('Could not save that setting.', 'error');
          });
        }
      }
    });
  }, [toast]);
}
