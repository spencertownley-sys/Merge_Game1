// Home / main menu (UI_UX_NOTES.md §3): get into a run fast. Play Classic is the primary
// CTA; Journey and Settings below. "My Skins" arrives with Phase 1.5, not here.

import { useEffect, useState } from 'react';
import { BRAND_NAME } from '../config/brand';
import { runRepository } from '../persistence/RunRepository';
import { newRunSeed, useUi } from '../store/uiStore';
import { TierChip } from './HUD';

export function HomeScreen() {
  const navigate = useUi((s) => s.navigate);
  const [best, setBest] = useState<number | null>(null);
  const [titleTaps, setTitleTaps] = useState(0);

  useEffect(() => {
    let live = true;
    runRepository
      .getBestScore('classic')
      .then((b) => live && setBest(b))
      .catch(() => live && setBest(0));
    return () => {
      live = false;
    };
  }, []);

  return (
    <div className="flex h-full flex-col items-center justify-between px-6 py-8">
      <div className="flex flex-col items-center gap-3 pt-6 text-center">
        <div className="flex gap-2" aria-hidden>
          {[1, 3, 5, 7, 9].map((t) => (
            <TierChip key={t} tier={t} size={28 + t * 2} />
          ))}
        </div>
        <h1
          className="font-display text-5xl font-bold tracking-tight text-ink select-none"
          onClick={() => {
            // Hidden admin entry: tap the title five times.
            const n = titleTaps + 1;
            setTitleTaps(n);
            if (n >= 5) {
              setTitleTaps(0);
              navigate({ name: 'admin' });
            }
          }}
        >
          {BRAND_NAME}
        </h1>
        <p className="max-w-xs text-sm text-ink-soft">
          Gather the scattered light. Merge motes into brighter ones and bring colour back to the
          lands.
        </p>
        <div
          className="card mt-2 flex min-w-40 flex-col items-center px-5 py-2"
          data-testid="best-score"
          aria-busy={best === null}
        >
          <span className="text-xs font-semibold tracking-wide text-ink-soft uppercase">
            Best score
          </span>
          {best === null ? (
            <span className="mt-1 h-7 w-16 animate-pulse rounded bg-ink/10" />
          ) : (
            <span className="font-display text-2xl font-bold tabular-nums">{best}</span>
          )}
        </div>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <button
          type="button"
          className="btn-primary w-full text-xl"
          onClick={() => navigate({ name: 'classic', seed: newRunSeed(), runKey: Date.now() })}
          data-testid="play-classic"
        >
          Play Classic
        </button>
        <button
          type="button"
          className="btn-secondary w-full"
          onClick={() => navigate({ name: 'journey' })}
        >
          Journey
        </button>
        <button
          type="button"
          className="btn-ghost w-full"
          onClick={() => navigate({ name: 'settings', from: { name: 'home' } })}
        >
          Settings
        </button>
      </div>
    </div>
  );
}
