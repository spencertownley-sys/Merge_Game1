// Dev-only physics tuning panel (game design doc §2 assumption note: "expose them in
// config/physics.ts and a dev-only tuning panel"). Opened with ?debug=tuning in dev builds.
// Values apply live to the running sim via the worker's `tuning` message and never persist.

import { useState } from 'react';
import { DEFAULT_TUNING, type PhysicsTuning } from '../config/physics';

const FIELDS: {
  key: keyof PhysicsTuning;
  label: string;
  min: number;
  max: number;
  step: number;
}[] = [
  { key: 'gravity', label: 'Gravity (m/s²)', min: 4, max: 30, step: 0.5 },
  { key: 'restitutionBallBall', label: 'Restitution ball–ball', min: 0, max: 0.8, step: 0.01 },
  { key: 'restitutionBallWall', label: 'Restitution ball–wall', min: 0, max: 0.8, step: 0.01 },
  { key: 'frictionBallBall', label: 'Friction ball–ball', min: 0, max: 1, step: 0.01 },
  { key: 'frictionBallWall', label: 'Friction ball–wall', min: 0, max: 1, step: 0.01 },
  { key: 'linearDamping', label: 'Linear damping', min: 0, max: 2, step: 0.01 },
  { key: 'angularDamping', label: 'Angular damping', min: 0, max: 3, step: 0.01 },
  { key: 'maxSpeedClamp', label: 'Max speed (m/s)', min: 4, max: 30, step: 0.5 },
  { key: 'dropCooldownMs', label: 'Drop cooldown (ms)', min: 100, max: 1500, step: 10 },
];

export function DevTuningPanel({ onChange }: { onChange: (t: Partial<PhysicsTuning>) => void }) {
  const [values, setValues] = useState<PhysicsTuning>({ ...DEFAULT_TUNING });
  const [open, setOpen] = useState(true);
  return (
    <div className="absolute top-2 left-2 z-40 max-w-[260px] rounded-xl bg-ink/85 p-3 text-xs text-white shadow-xl backdrop-blur">
      <button
        type="button"
        className="mb-1 w-full text-left font-bold"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? '▾' : '▸'} Physics tuning (dev)
      </button>
      {open && (
        <div className="flex flex-col gap-1">
          {FIELDS.map((f) => (
            <label key={f.key} className="flex flex-col">
              <span className="flex justify-between">
                <span>{f.label}</span>
                <span className="tabular-nums">{values[f.key]}</span>
              </span>
              <input
                type="range"
                min={f.min}
                max={f.max}
                step={f.step}
                value={values[f.key]}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  const next = { ...values, [f.key]: v };
                  setValues(next);
                  onChange({ [f.key]: v });
                }}
              />
            </label>
          ))}
          <button
            type="button"
            className="mt-1 rounded bg-white/20 px-2 py-1"
            onClick={() => {
              setValues({ ...DEFAULT_TUNING });
              onChange({ ...DEFAULT_TUNING });
            }}
          >
            Reset to config defaults
          </button>
        </div>
      )}
    </div>
  );
}
