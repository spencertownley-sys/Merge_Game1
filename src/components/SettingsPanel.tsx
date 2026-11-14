// Settings (UI_UX_NOTES.md §3): single-column toggles grouped under Audio, Motion & Graphics,
// Accessibility. All toggles apply immediately; no save step.

import { useSettings } from '../store/settingsStore';
import type { Settings } from '../types';

type BooleanSetting = {
  [K in keyof Settings]: Settings[K] extends boolean ? K : never;
}[keyof Settings];

interface ToggleProps {
  id: BooleanSetting;
  label: string;
  hint?: string;
  disabled?: boolean;
}

const CREDITS: readonly [string, string][] = [
  [
    'Art',
    '[PLACEHOLDER: owner to state the art source and licence for the painted art in public/assets]',
  ],
  ['PixiJS', 'MIT licence'],
  ['Rapier physics', 'Apache-2.0 licence'],
  ['React and Zustand', 'MIT licence'],
  ['Tailwind CSS', 'MIT licence'],
  ['idb', 'ISC licence'],
];

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
        className="h-11 w-[4.5rem] shrink-0 cursor-pointer appearance-none rounded-full bg-ink/20 transition checked:bg-coral before:block before:h-9 before:w-9 before:translate-x-1 before:translate-y-1 before:rounded-full before:bg-white before:shadow before:transition checked:before:translate-x-8 focus-visible:ring-4 focus-visible:ring-gold/60 focus-visible:outline-none"
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
      <h3
        id="privacy"
        className="mt-2 px-4 text-xs font-bold tracking-wide text-ink-soft uppercase"
      >
        Privacy
      </h3>
      <div className="flex flex-col gap-3 px-4 text-sm text-ink-soft">
        <p>
          Smoosh has no accounts and no tracking. Your games, story progress and settings are saved
          only in this browser (IndexedDB) and are never sent anywhere. Clearing this site's data in
          your browser settings deletes them.
        </p>
        <p>
          The game also keeps its own files in this browser so it can play offline. Server logs at
          the host (GitHub Pages) may record your IP address, as for any website.
        </p>
        <p>[PLACEHOLDER: owner legal name and a contact email for privacy requests]</p>
        <button type="button" className="btn-ghost self-start" data-cookie-settings>
          Cookie settings
        </button>
      </div>
      <h3 className="mt-2 px-4 text-xs font-bold tracking-wide text-ink-soft uppercase">Credits</h3>
      <ul className="flex flex-col gap-1 px-4 text-sm text-ink-soft">
        {CREDITS.map(([name, note]) => (
          <li key={name}>
            <span className="font-semibold text-ink">{name}</span>: {note}
          </li>
        ))}
      </ul>
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
