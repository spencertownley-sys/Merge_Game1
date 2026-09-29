// Top strip: score, best, combo; bottom strip: next-ball preview (UI_UX_NOTES.md §3, §7).
// The danger line itself is drawn on the canvas (boardScene.ts).

import type { ReactNode } from 'react';
import { COMBO, comboMultiplier } from '../config/scoring';
import { tierDef } from '../config/tiers';
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

export function HUDTop({ children }: { children?: ReactNode }) {
  const score = useGameStore((s) => s.score);
  const best = useGameStore((s) => s.bestScore);
  const combo = useGameStore((s) => s.comboCount);
  const warning = useGameStore((s) => s.warning);
  const showCombo = combo >= COMBO.showTextAtCount;
  return (
    <div className="flex w-full items-center justify-between gap-3 px-4 pt-3 pb-1">
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="text-xs font-semibold tracking-wide text-ink-soft uppercase">Score</span>
        <span
          className={`font-display text-3xl font-bold tabular-nums transition-colors ${warning ? 'text-coral' : 'text-ink'}`}
          data-testid="score"
        >
          {score}
        </span>
        <span className="text-xs text-ink-soft tabular-nums">Best {Math.max(best, score)}</span>
      </div>
      <div className="flex-1 text-center" aria-live="polite">
        {showCombo && (
          <span
            key={combo}
            className="font-display animate-[pop_240ms_ease-out] text-2xl font-bold text-coral drop-shadow-sm"
            data-testid="combo"
          >
            Combo ×{comboMultiplier(combo).toFixed(1)}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

export function HUDBottom() {
  const next = useGameStore((s) => s.nextTiers);
  const held = useGameStore((s) => s.heldTier);
  return (
    <div className="flex w-full items-center justify-center gap-4 px-4 py-2 text-sm text-ink-soft">
      <span className="flex items-center gap-2">
        <span className="font-semibold">Now</span>
        <TierChip tier={held} />
      </span>
      <span className="flex items-center gap-2">
        <span className="font-semibold">Next</span>
        {next.map((t, i) => (
          <TierChip key={i} tier={t} size={i === 0 ? 32 : 26} />
        ))}
      </span>
    </div>
  );
}

export { TierChip };
