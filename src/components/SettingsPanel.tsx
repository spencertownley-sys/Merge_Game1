// Settings (UI_UX_NOTES.md §3): single-column toggles grouped under Audio, Motion & Graphics,
// Accessibility. All toggles apply immediately; no save step.

import { useSettings } from '../store/settingsStore';
import type { Settings } from '../types';

interface ToggleProps {
  id: keyof Settings;
  label: string;
  hint?: string;
  disabled?: boolean;
}

function Toggle({ id, label, hint, disabled }: ToggleProps) {
  const value = useSettings((s) => s[id]);
  const set = useSettings((s) => s.set);
  return (
    <label
      className={`flex min-h-14 items-center justify-between gap-4 rounded-2xl px-4 py-2 ${
        disabled ? 'opacity-50' : 'hover:bg-ink/5'
      }`}
    >
      <span className="flex flex-col">
        <span className="font-semibold">{label}</span>
        {hint && <span className="text-xs text-ink-soft">{hint}</span>}
      </span>
      <input
        type="checkbox"
        role="switch"
        aria-checked={value}
        checked={value}
        disabled={disabled}
        onChange={(e) => set(id, e.target.checked)}
        className="h-7 w-12 cursor-pointer appearance-none rounded-full bg-ink/20 transition checked:bg-coral before:block before:h-6 before:w-6 before:translate-x-0.5 before:translate-y-0.5 before:rounded-full before:bg-white before:shadow before:transition checked:before:translate-x-5.5 focus-visible:ring-4 focus-visible:ring-gold/60 focus-visible:outline-none"
      />
    </label>
  );
}

export interface SettingsPanelProps {
  onClose: () => void;
  /** When embedded as an overlay over the board. */
  overlay?: boolean;
}

export function SettingsPanel({ onClose, overlay }: SettingsPanelProps) {
  const body = (
    <div
      className={`card flex w-full max-w-md flex-col gap-2 px-3 py-4 ${overlay ? '' : 'my-6'}`}
      role="dialog"
      aria-modal
    >
      <div className="flex items-center justify-between px-2">
        <h2 className="font-display text-2xl font-bold">Settings</h2>
        <button type="button" className="btn-ghost" onClick={onClose} aria-label="Close settings">
          ✕
        </button>
      </div>
      <h3 className="mt-2 px-4 text-xs font-bold tracking-wide text-ink-soft uppercase">Audio</h3>
      <Toggle id="sound" label="Sound effects" />
      <Toggle id="music" label="Music" />
      <Toggle id="haptics" label="Haptics" hint="Coming to mobile" disabled />
      <h3 className="mt-2 px-4 text-xs font-bold tracking-wide text-ink-soft uppercase">
        Motion & graphics
      </h3>
      <Toggle
        id="reduceMotion"
        label="Reduce motion"
        hint="No gaze wobble or coin-flip; merges crossfade"
      />
      <Toggle id="simpleGraphics" label="Simple graphics" hint="Flat motes for low-end devices" />
      <h3 className="mt-2 px-4 text-xs font-bold tracking-wide text-ink-soft uppercase">
        Accessibility
      </h3>
      <Toggle
        id="showTierNumbers"
        label="Show tier numbers"
        hint="Rim styles always mark tiers without colour"
      />
    </div>
  );
  if (overlay) {
    return (
      <div className="absolute inset-0 z-30 flex items-center justify-center overflow-y-auto bg-ink/40 p-4 backdrop-blur-[2px]">
        {body}
      </div>
    );
  }
  return <div className="flex h-full flex-col items-center overflow-y-auto px-4">{body}</div>;
}
