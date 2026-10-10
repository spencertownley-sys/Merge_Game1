// The Journey's opening story (JOURNEY_PLAN.md, Act I "Waking"): six painted panels that set up
// the Skylight, its scattering, the Keeper and Wick. Plays the first time the map opens and
// again from the map's "Watch the story" button. Tap or press a key to go on; panels
// also move on by themselves. Reduce motion turns off the drift and cross-fades.

import { useCallback, useEffect, useRef, useState } from 'react';
import { introPanelUrl, wickUrl } from '../render/assetUrls';

export interface StoryPanel {
  /** Painted panel number, public/assets/story/intro-N.webp. */
  art: number;
  text: string;
  /** Lines Wick says aloud get his portrait beside the caption. */
  speaker?: 'wick';
}

export const INTRO_PANELS: readonly StoryPanel[] = [
  {
    art: 1,
    text: 'High above every land hung the Skylight. Its glow kept the whole world in colour.',
  },
  { art: 2, text: 'Then, one still night, the Skylight cracked.' },
  {
    art: 3,
    text: 'Its light scattered into countless tiny motes, and one by one the lands went grey.',
  },
  {
    art: 4,
    text: 'In a quiet field in Sunmeadow Hollow, one small glow stirred. That glow is you: a Keeper.',
  },
  {
    art: 5,
    speaker: 'wick',
    text: "Oh! You're awake! I'm Wick. I've kept this map safe for ever so long, waiting for someone who can gather light.",
  },
  {
    art: 6,
    speaker: 'wick',
    text: 'Bring two alike together and they become something brighter. Shall we wake the lands, one at a time?',
  },
];

/** How long a panel stays before moving on by itself. */
const AUTO_ADVANCE_MS = 7000;

export interface IntroCutsceneProps {
  reduceMotion: boolean;
  /** Called once, whether the story finished or was skipped. */
  onDone: () => void;
  panels?: readonly StoryPanel[];
  /** Tests pass 0 to switch the timer off. */
  autoAdvanceMs?: number;
}

export function IntroCutscene({
  reduceMotion,
  onDone,
  panels = INTRO_PANELS,
  autoAdvanceMs = AUTO_ADVANCE_MS,
}: IntroCutsceneProps) {
  const [index, setIndex] = useState(0);
  const doneRef = useRef(false);
  const last = index === panels.length - 1;
  const panel = panels[index]!;

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  }, [onDone]);

  const next = useCallback(() => {
    if (index >= panels.length - 1) finish();
    else setIndex(index + 1);
  }, [index, panels.length, finish]);

  const back = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  // The last panel waits for the player, so nobody is dropped onto the map mid-sentence.
  useEffect(() => {
    if (autoAdvanceMs <= 0 || last) return;
    const t = window.setTimeout(next, autoAdvanceMs);
    return () => window.clearTimeout(t);
  }, [autoAdvanceMs, last, next]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
      else if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft') back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finish, next, back]);

  // Warm the next panel so the cross-fade never shows a blank frame.
  useEffect(() => {
    const following = panels[index + 1];
    if (following) new Image().src = introPanelUrl(following.art);
  }, [index, panels]);

  return (
    <div
      className="absolute inset-0 z-40 flex flex-col overflow-hidden bg-ink text-white"
      role="dialog"
      aria-modal
      aria-label="The story so far"
      data-testid="intro-cutscene"
    >
      {/* Painted panels, cross-faded; only the current one drifts. */}
      {panels.map((p, i) => (
        <img
          key={p.art}
          src={introPanelUrl(p.art)}
          alt=""
          aria-hidden
          draggable={false}
          loading={i <= 1 ? 'eager' : 'lazy'}
          className={`absolute inset-0 h-full w-full object-cover ${
            reduceMotion ? '' : 'transition-opacity duration-700'
          } ${i === index ? 'opacity-100' : 'opacity-0'} ${
            i === index && !reduceMotion ? 'story-drift' : ''
          }`}
        />
      ))}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink/80 via-ink/35 to-transparent"
        aria-hidden
      />

      <div className="relative flex items-center justify-between px-4 pt-3">
        <div className="flex gap-1.5" aria-hidden>
          {panels.map((p, i) => (
            <span
              key={p.art}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? 'w-6 bg-white' : i < index ? 'w-1.5 bg-white/80' : 'w-1.5 bg-white/35'
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          className="btn min-h-11 bg-ink/40 px-4 text-base text-white backdrop-blur hover:bg-ink/55"
          onClick={finish}
          data-testid="intro-skip"
        >
          Skip
        </button>
      </div>

      {/* The whole lower area is one big "next" target, roomy for thumbs. */}
      <button
        type="button"
        className="relative mt-auto flex w-full items-end gap-3 px-4 pt-24 pb-6 text-left focus-visible:outline-none"
        onClick={next}
        aria-label={last ? 'Begin the journey' : 'Next'}
        data-testid="intro-next"
      >
        {panel.speaker === 'wick' && (
          <img
            src={wickUrl()}
            alt="Wick"
            draggable={false}
            className={`h-20 w-20 shrink-0 drop-shadow-[0_0_14px_rgba(255,214,140,0.8)] ${
              reduceMotion ? '' : 'wick-bob'
            }`}
          />
        )}
        <div
          key={index}
          className={`card flex-1 px-4 py-3 text-ink ${reduceMotion ? '' : 'story-rise'}`}
        >
          {panel.speaker === 'wick' && (
            <p className="font-display text-sm font-bold text-coral-deep">Wick</p>
          )}
          <p className="text-base leading-snug" aria-live="polite" data-testid="intro-text">
            {panel.text}
          </p>
          <p className="mt-2 text-right font-display text-sm font-semibold text-ink-soft">
            {last ? 'Begin the journey ›' : 'Tap to continue ›'}
          </p>
        </div>
      </button>
    </div>
  );
}
