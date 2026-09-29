// Results (UI_UX_NOTES.md §3): centred card over the dimmed board, top ball hero, score vs
// best, Share / Play Again / Menu. Journey variant shows stars and Next Level / Try Again.

import type { ReactNode } from 'react';
import { tierName } from '../render/coreArt';
import { tierDef } from '../config/tiers';
import type { Stars } from '../types';

export interface ResultsScreenProps {
  mode: 'classic' | 'journey';
  score: number;
  bestScore: number;
  topTier: number;
  isNewBest: boolean;
  /** Journey only. */
  passed?: boolean;
  stars?: Stars;
  levelName?: string;
  onPrimary: () => void;
  primaryLabel: string;
  onShare?: () => void;
  onMenu: () => void;
  onRetry?: () => void;
  children?: ReactNode;
}

function StarRow({ stars }: { stars: Stars }) {
  return (
    <div className="flex items-center gap-1 text-3xl" aria-label={`${stars} of 3 stars`}>
      {[1, 2, 3].map((i) => (
        <span key={i} className={i <= stars ? 'text-gold drop-shadow' : 'text-ink/15'} aria-hidden>
          ★
        </span>
      ))}
    </div>
  );
}

export function ResultsScreen(p: ResultsScreenProps) {
  const def = p.topTier > 0 ? tierDef(p.topTier) : null;
  const title =
    p.mode === 'journey'
      ? p.passed
        ? 'Light restored!'
        : 'Not quite yet'
      : p.isNewBest
        ? 'New best!'
        : 'Run over';
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-[2px]">
      <div
        className="card flex w-full max-w-sm flex-col items-center gap-3 px-6 py-6 text-center"
        role="dialog"
        aria-modal
      >
        <h2 className="font-display text-3xl font-bold" data-testid="results-title">
          {title}
        </h2>
        {p.levelName && <p className="-mt-2 text-sm text-ink-soft">{p.levelName}</p>}
        {def && (
          <div className="flex flex-col items-center gap-1">
            <div
              className="h-24 w-24 rounded-full shadow-lg"
              style={{
                background: `radial-gradient(circle at 35% 30%, #ffffffcc 0%, ${def.rimColor} 45%, ${def.rimColor} 100%)`,
                boxShadow: `0 6px 24px ${def.rimColor}88`,
              }}
              aria-hidden
            />
            <span className="text-sm font-semibold text-ink-soft">
              Best mote: {tierName(p.topTier)}
            </span>
          </div>
        )}
        {p.mode === 'journey' && p.stars !== undefined && <StarRow stars={p.stars} />}
        <div className="flex items-baseline gap-3">
          <span className="font-display text-4xl font-bold tabular-nums" data-testid="final-score">
            {p.score}
          </span>
          <span className="text-sm text-ink-soft tabular-nums">
            best {Math.max(p.bestScore, p.score)}
          </span>
        </div>
        {p.children}
        <div className="mt-2 flex w-full flex-col gap-2">
          <button
            type="button"
            className="btn-primary w-full"
            onClick={p.onPrimary}
            data-testid="results-primary"
          >
            {p.primaryLabel}
          </button>
          <div className="flex gap-2">
            {p.onRetry && (
              <button type="button" className="btn-secondary flex-1" onClick={p.onRetry}>
                Try again
              </button>
            )}
            {p.onShare && (
              <button
                type="button"
                className="btn-secondary flex-1"
                onClick={p.onShare}
                data-testid="share"
              >
                Share
              </button>
            )}
            <button type="button" className="btn-ghost flex-1" onClick={p.onMenu}>
              Menu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
