// Level intro modal (UI_UX_NOTES.md §3): level name, goals in plain language, constraints as
// small chips, star thresholds ghosted, one line of story flavour.

import { landDef } from './lands';
import { goalLabel } from './levelRuntime';
import { tierName } from '../render/coreArt';
import type { LevelDef, StarRule } from '../types';

function ruleText(rule: StarRule): string {
  const parts: string[] = [];
  if (rule.dropsRemainingAtLeast !== undefined)
    parts.push(`${rule.dropsRemainingAtLeast}+ drops left`);
  if (rule.secondsRemainingAtLeast !== undefined)
    parts.push(`${rule.secondsRemainingAtLeast}s+ left`);
  if (rule.scoreAtLeast !== undefined) parts.push(`score ${rule.scoreAtLeast}+`);
  return parts.join(', ') || 'goals met';
}

export interface LevelIntroProps {
  level: LevelDef;
  bestScore: number;
  onStart: () => void;
  onClose: () => void;
}

export function LevelIntro({ level, bestScore, onStart, onClose }: LevelIntroProps) {
  const land = landDef(level.land);
  const rocks = (level.obstacles ?? []).filter((o) => o.type === 'rock').length;
  const ice = (level.obstacles ?? []).filter((o) => o.type === 'ice').length;
  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="card flex w-full max-w-sm flex-col gap-3 px-6 py-5"
        role="dialog"
        aria-modal
        aria-labelledby="level-intro-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <p className="text-xs font-bold tracking-wide text-ink-soft uppercase">{land.name}</p>
          <h2 id="level-intro-title" className="font-display text-2xl font-bold">
            {level.id}. {level.name}
          </h2>
        </div>
        {level.flavor && <p className="text-sm text-ink-soft italic">“{level.flavor}”</p>}
        <ul className="flex flex-col gap-1">
          {level.goals.map((g, i) => (
            <li key={i} className="flex items-center gap-2 font-semibold">
              <span aria-hidden>◎</span> {goalLabel(g, tierName)}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2 text-xs font-semibold text-ink-soft">
          {level.dropLimit !== undefined && (
            <span className="rounded-full bg-ink/5 px-3 py-1">⬇ {level.dropLimit} drops</span>
          )}
          {level.timeLimitSec !== undefined && (
            <span className="rounded-full bg-ink/5 px-3 py-1">⏱ {level.timeLimitSec}s</span>
          )}
          {rocks > 0 && <span className="rounded-full bg-ink/5 px-3 py-1">🪨 {rocks} rocks</span>}
          {ice > 0 && <span className="rounded-full bg-ink/5 px-3 py-1">🧊 {ice} frozen</span>}
          {level.hazards?.wind && <span className="rounded-full bg-ink/5 px-3 py-1">🌬 wind</span>}
        </div>
        <div className="flex flex-col gap-0.5 text-xs text-ink-soft">
          <span>
            <span className="text-gold">★</span> goals met
          </span>
          <span>
            <span className="text-gold">★★</span> {ruleText(level.stars.two)}
          </span>
          <span>
            <span className="text-gold">★★★</span> {ruleText(level.stars.three)}
          </span>
          {bestScore > 0 && <span className="mt-1">Best score {bestScore}</span>}
        </div>
        <button
          type="button"
          className="btn-primary mt-1 w-full"
          onClick={onStart}
          data-testid="start-level"
          autoFocus
        >
          Start level
        </button>
      </div>
    </div>
  );
}
