// Journey map (UI_UX_NOTES.md §3): a vertically scrolling trail grouped into lands, each
// level a node showing lock state and stars; tapping an unlocked node opens the Level Intro.
// Lands shift from their dim palette to full colour once restored (§4.2).

import { useEffect, useState } from 'react';
import { LANDS } from './lands';
import { LEVELS, levelsForLand } from './levels';
import { LAND_PALETTES } from '../render/palette';
import {
  isLandRestored,
  isLevelUnlocked,
  nextPlayableLevelId,
  useJourney,
} from '../store/journeyStore';
import { useUi } from '../store/uiStore';
import { LevelIntro } from './LevelIntro';
import type { LevelDef } from '../types';

function StarsSmall({ stars }: { stars: number }) {
  return (
    <span className="text-xs tracking-tight" aria-label={`${stars} stars`}>
      {[1, 2, 3].map((i) => (
        <span key={i} className={i <= stars ? 'text-gold' : 'text-ink/20'}>
          ★
        </span>
      ))}
    </span>
  );
}

export function JourneyMap() {
  const navigate = useUi((s) => s.navigate);
  const { loaded, progress, load } = useJourney();
  const [intro, setIntro] = useState<LevelDef | null>(null);

  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);

  const nextId = nextPlayableLevelId(progress);
  const totalStars = LEVELS.reduce((sum, l) => sum + (progress[l.id]?.stars ?? 0), 0);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <button
          type="button"
          className="btn-ghost px-3"
          onClick={() => navigate({ name: 'home' })}
          aria-label="Back to menu"
        >
          ← Menu
        </button>
        <h1 className="font-display text-2xl font-bold">Journey</h1>
        <span
          className="text-sm font-semibold text-ink-soft"
          aria-label={`${totalStars} stars earned`}
        >
          ★ {totalStars}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8" data-testid="journey-map">
        {!loaded && <div className="card mt-4 h-40 animate-pulse" aria-busy />}
        {loaded &&
          LANDS.map((land, landIdx) => {
            const levels = levelsForLand(land.id);
            const restored = isLandRestored(land.id, progress);
            const pal = LAND_PALETTES[land.id];
            const sky = restored
              ? [pal.skyTop, pal.skyBottom]
              : [pal.dim.skyTop, pal.dim.skyBottom];
            const comingSoon = levels.length === 0;
            return (
              <section key={land.id} className="mt-4" aria-labelledby={`land-${land.id}`}>
                <div
                  className="card overflow-hidden"
                  style={{ background: `linear-gradient(180deg, ${sky[0]} 0%, ${sky[1]} 100%)` }}
                >
                  <div className="px-4 pt-3 pb-2">
                    <div className="flex items-baseline justify-between">
                      <h2
                        id={`land-${land.id}`}
                        className="font-display text-xl font-bold text-ink"
                      >
                        {landIdx + 1}. {land.name}
                      </h2>
                      {restored && (
                        <span className="text-xs font-bold text-ink-soft uppercase">Restored</span>
                      )}
                    </div>
                    <p className="text-xs text-ink-soft">{restored ? land.restored : land.blurb}</p>
                  </div>
                  <div className="flex flex-wrap gap-3 px-4 pb-4">
                    {comingSoon && (
                      <span className="text-sm text-ink-soft italic">
                        More light to gather soon.
                      </span>
                    )}
                    {levels.map((level, i) => {
                      const unlocked = isLevelUnlocked(level.id, progress);
                      const stars = progress[level.id]?.stars ?? 0;
                      const isNext = level.id === nextId;
                      return (
                        <button
                          key={level.id}
                          type="button"
                          disabled={!unlocked}
                          onClick={() => setIntro(level)}
                          data-testid={`level-${level.id}`}
                          aria-label={`${level.name}${unlocked ? '' : ' (locked)'}`}
                          className={`flex min-h-16 min-w-16 flex-col items-center justify-center rounded-2xl px-2 py-1 font-display text-lg font-bold shadow transition ${
                            unlocked
                              ? `bg-white/90 text-ink hover:bg-white active:scale-95 ${isNext ? 'ring-4 ring-gold/70 animate-pulse' : ''}`
                              : 'bg-ink/10 text-ink/40'
                          } ${i % 2 === 1 ? 'translate-y-2' : ''}`}
                        >
                          <span>{unlocked ? level.id : '🔒'}</span>
                          {unlocked && <StarsSmall stars={stars} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>
            );
          })}
      </div>
      {intro && (
        <LevelIntro
          level={intro}
          bestScore={progress[intro.id]?.bestScore ?? 0}
          onClose={() => setIntro(null)}
          onStart={() => {
            setIntro(null);
            navigate({ name: 'level', levelId: intro.id, runKey: Date.now() });
          }}
        />
      )}
    </div>
  );
}
