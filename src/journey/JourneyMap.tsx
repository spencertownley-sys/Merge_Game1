// Journey map (UI_UX_NOTES.md §3): a vertically scrolling trail grouped into lands, each
// level a node showing lock state and stars; tapping an unlocked node opens the Level Intro.
// Lands shift from their dim palette to full colour once restored (§4.2).

import { useEffect, useState } from 'react';
import { LANDS, landDef } from './lands';
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
import type { LandId, LevelDef } from '../types';
import { landBackdropUrl } from '../render/assetUrls';
import { useSettings } from '../store/settingsStore';
import { IntroCutscene } from './IntroCutscene';
import { LAND_STORIES } from './stories';

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

export interface JourneyMapProps {
  /** Open with a story playing, seen or not: `true` for the opening, or a land's id for that
   *  land's arrival story (the ?story= share link). */
  playStory?: true | LandId;
}

/** Removes ?story= so a reload after a story lands on the map, not the story again. */
function clearStoryParam(): void {
  if (!new URLSearchParams(location.search).has('story')) return;
  const url = new URL(location.href);
  url.searchParams.delete('story');
  history.replaceState(history.state, '', url);
}

export function JourneyMap({ playStory }: JourneyMapProps) {
  const navigate = useUi((s) => s.navigate);
  const { loaded, progress, load } = useJourney();
  const [intro, setIntro] = useState<LevelDef | null>(null);
  const settingsReady = useSettings((s) => s.hydrated);
  const introSeen = useSettings((s) => s.introSeen);
  const reduceMotion = useSettings((s) => s.reduceMotion);
  const setSetting = useSettings((s) => s.set);
  const landStoriesSeen = useSettings((s) => s.landStoriesSeen);
  const [replaying, setReplaying] = useState(playStory === true);
  // A land's arrival story, then (when it was opened by tapping a level) that level's card.
  const [landStory, setLandStory] = useState<{ land: LandId; then?: LevelDef } | null>(
    playStory && playStory !== true ? { land: playStory } : null,
  );
  // The story plays by itself on the first visit only; the map button replays it.
  const showStory = replaying || (settingsReady && !introSeen);

  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);

  // A land with an arrival story tells it before the first level card the player opens there.
  const openLevel = (level: LevelDef) => {
    if (LAND_STORIES[level.land] && !landStoriesSeen.includes(level.land))
      setLandStory({ land: level.land, then: level });
    else setIntro(level);
  };

  const nextId = nextPlayableLevelId(progress);
  const totalStars = LEVELS.reduce((sum, l) => sum + (progress[l.id]?.stars ?? 0), 0);

  return (
    <div className="relative flex h-full flex-col">
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
        <button
          type="button"
          className="btn-ghost mt-1 w-full text-base"
          onClick={() => setReplaying(true)}
          data-testid="watch-story"
        >
          ▶ Watch the story
        </button>
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
                  className="card relative overflow-hidden"
                  style={{ background: `linear-gradient(180deg, ${sky[0]} 0%, ${sky[1]} 100%)` }}
                >
                  {/* the land's painted backdrop, greyed out until the land is restored */}
                  <img
                    src={landBackdropUrl(land.id)}
                    alt=""
                    aria-hidden
                    loading="lazy"
                    draggable={false}
                    className="absolute inset-0 h-full w-full object-cover"
                    style={{
                      objectPosition: 'center 62%',
                      filter: restored ? 'none' : 'grayscale(1) brightness(1.05)',
                    }}
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-b from-white/80 via-white/45 to-white/15"
                    aria-hidden
                  />
                  <div className="relative px-4 pt-3 pb-2">
                    <div className="flex items-baseline justify-between">
                      <h2
                        id={`land-${land.id}`}
                        className="font-display text-xl font-bold text-ink"
                      >
                        {landIdx + 1}. {land.name}
                      </h2>
                      <span className="flex items-baseline gap-2">
                        {restored && (
                          <span className="text-xs font-bold text-ink-soft uppercase">
                            Restored
                          </span>
                        )}
                        {LAND_STORIES[land.id] &&
                          levels[0] &&
                          isLevelUnlocked(levels[0].id, progress) && (
                            <button
                              type="button"
                              className="btn min-h-11 bg-white/70 px-3 py-1 text-sm text-ink-soft hover:bg-white"
                              onClick={() => setLandStory({ land: land.id })}
                              data-testid={`land-story-${land.id}`}
                            >
                              ▶ Story
                            </button>
                          )}
                      </span>
                    </div>
                    <p className="text-xs text-ink-soft">{restored ? land.restored : land.blurb}</p>
                  </div>
                  <div className="relative flex flex-wrap gap-3 px-4 pb-4">
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
                          onClick={() => openLevel(level)}
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
      {showStory && (
        <IntroCutscene
          reduceMotion={reduceMotion}
          onDone={() => {
            setReplaying(false);
            clearStoryParam();
            if (!introSeen) setSetting('introSeen', true);
          }}
        />
      )}
      {!showStory && landStory && LAND_STORIES[landStory.land] && (
        <IntroCutscene
          key={landStory.land}
          reduceMotion={reduceMotion}
          panels={LAND_STORIES[landStory.land]!.panels}
          finishLabel={LAND_STORIES[landStory.land]!.finishLabel}
          label={`Arriving in ${landDef(landStory.land).name}`}
          onDone={() => {
            const { land, then } = landStory;
            setLandStory(null);
            clearStoryParam();
            if (!landStoriesSeen.includes(land))
              setSetting('landStoriesSeen', [...landStoriesSeen, land]);
            if (then) setIntro(then);
          }}
        />
      )}
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
