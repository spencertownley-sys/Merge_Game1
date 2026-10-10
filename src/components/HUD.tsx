// Header (score, best, next) and the merge-order tray (UI_UX_NOTES.md §3, §7), laid out after
// the reference video. The danger line is the glass rim, drawn on the canvas (boardScene.ts).

import type { ReactNode } from 'react';
import { TIER_COUNT, tierDef } from '../config/tiers';
import { tierName } from '../render/coreArt';
import { useGameStore } from '../store/gameStore';

function TierChip({ tier, size = 36 }: { tier: number; size?: number }) {
  if (tier <= 0) return <span style={{ width: size, height: size }} className="inline-block" />;
  const def = tierDef(tier);
  return (
    <span
      aria-label={tierName(tier)}
      title={tierName(tier)}
      className="inline-flex items-center justify-center rounded-full font-display text-sm font-bold text-white shadow-inner"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 35% 30%, #fff8 0%, ${def.rimColor} 55%, ${def.rimColor} 100%)`,
        boxShadow: `0 2px 8px ${def.rimColor}66, inset 0 0 0 2px #ffffff88`,
      }}
    >
      {tier}
    </span>
  );
}

/** Header, in the reference layout: controls on the left, score and best in one pill in the
 *  middle, and the next mote on the right. The held mote itself hangs above the glass rim on
 *  the board, and combos show on the merged mote (boardScene.ts), so neither needs a chip here. */
export function HUDTop({ children }: { children?: ReactNode }) {
  const score = useGameStore((s) => s.score);
  const best = useGameStore((s) => s.bestScore);
  const warning = useGameStore((s) => s.warning);
  const next = useGameStore((s) => s.nextTiers);
  return (
    <div className="flex w-full items-center justify-between gap-2 px-3 pt-3 pb-2">
      <div className="flex min-w-11 items-center gap-1">{children}</div>
      <div
        className="flex min-w-0 items-stretch rounded-2xl bg-ink/85 px-1 py-1 text-white shadow-md"
        aria-live="polite"
      >
        <div className="flex min-w-16 flex-col items-center px-3 leading-tight">
          <span className="text-[10px] font-semibold tracking-widest uppercase opacity-80">
            Score
          </span>
          <span
            className={`font-display text-xl font-bold tabular-nums transition-colors ${warning ? 'text-coral' : 'text-white'}`}
            data-testid="score"
          >
            {score}
          </span>
        </div>
        <span className="my-1 w-px bg-white/25" aria-hidden />
        <div className="flex min-w-16 flex-col items-center px-3 leading-tight">
          <span className="text-[10px] font-semibold tracking-widest text-gold uppercase">
            Best
          </span>
          <span className="font-display text-xl font-bold text-gold tabular-nums">
            {Math.max(best, score)}
          </span>
        </div>
      </div>
      <div
        className="flex items-center gap-1.5 rounded-full bg-white/80 py-1 pr-3 pl-1 shadow-sm"
        data-testid="next-pill"
      >
        <TierChip tier={next[0] ?? 0} size={30} />
        <span className="text-xs font-bold text-ink-soft">Next</span>
      </div>
    </div>
  );
}

/** The "evolution" chart classic fruit-merge games show: every tier in merge order, with the
 *  best tier reached so far highlighted. */
export function EvolutionStrip() {
  const top = useGameStore((s) => s.topTier);
  return (
    <div
      className="mx-3 mb-2 flex items-center justify-center gap-1 rounded-full bg-white/70 px-2 py-1.5 shadow-sm"
      aria-label="Merge order"
    >
      {Array.from({ length: TIER_COUNT }, (_, i) => i + 1).map((t) => (
        <span
          key={t}
          className={`flex items-center transition-opacity ${t <= top ? 'opacity-100' : 'opacity-35'}`}
        >
          <TierChip tier={t} size={14 + t * 1.6} />
          {t < TIER_COUNT && <span className="px-0.5 text-[10px] text-ink-soft">›</span>}
        </span>
      ))}
    </div>
  );
}

export { TierChip };
