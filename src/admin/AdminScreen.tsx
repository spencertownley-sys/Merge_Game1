// Admin back end (client-side, stored in IndexedDB): tune the game feel by hand — fall, roll,
// bounce, jiggle, face motion — pick an art style, and drop in custom art per tier / per land.
// A live preview board runs the real physics worker with the current values so every slider
// is felt immediately. Reached from Home (tap the title five times) or with ?admin=1.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PixiStage } from '../render/PixiStage';
import { SimClient } from '../hooks/SimClient';
import { useTuning } from '../store/tuningStore';
import { useUi } from '../store/uiStore';
import {
  ART_STYLES,
  PHYSICS_FIELDS,
  TUNING_PRESETS,
  VISUAL_FIELDS,
  type TuningField,
} from '../config/tuning';
import type { PhysicsTuning } from '../config/physics';
import type { VisualTuning } from '../config/tuning';
import { LANDS } from '../journey/lands';
import { TIER_COUNT } from '../config/tiers';
import { tierName } from '../render/coreArt';
import type { LandId } from '../types';

function Slider<K extends string>({
  field,
  value,
  onChange,
}: {
  field: TuningField<K>;
  value: number;
  onChange: (v: number) => void;
}) {
  const id = `tune-${field.key}`;
  return (
    <label htmlFor={id} className="flex flex-col gap-0.5 py-1">
      <span className="flex items-baseline justify-between text-sm">
        <span className="font-semibold">{field.label}</span>
        <span className="tabular-nums text-ink-soft">{Number(value.toFixed(3))}</span>
      </span>
      <input
        id={id}
        type="range"
        min={field.min}
        max={field.max}
        step={field.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-coral"
      />
      <span className="text-xs text-ink-soft">{field.hint}</span>
    </label>
  );
}

/** A self-driving board: drops a mote every ~700 ms so the feel is visible without input. */
function PreviewBoard({ land, showFrame }: { land: LandId; showFrame: boolean }) {
  const tuning = useTuning((s) => s.tuning);
  const clientRef = useRef<SimClient | null>(null);
  const [client, setClient] = useState<SimClient | null>(null);
  const [seedKey, setSeedKey] = useState(0);
  const [auto, setAuto] = useState(true);
  const physics = tuning.physics;

  useEffect(() => {
    const c = new SimClient();
    clientRef.current = c;
    setClient(c);
    c.start({ seed: 4242 + seedKey, tuning: useTuning.getState().tuning.physics });
    return () => {
      c.destroy();
      clientRef.current = null;
    };
  }, [seedKey]);

  // Push physics changes live.
  useEffect(() => {
    clientRef.current?.applyTuning(physics);
  }, [physics]);

  // Auto-drop at pseudo-random columns (render-side randomness only; never in the sim).
  useEffect(() => {
    if (!auto) return;
    let i = 0;
    const t = setInterval(() => {
      const c = clientRef.current;
      const snap = c?.latest;
      if (!c || !snap) return;
      if (snap.gameOver) {
        setSeedKey((k) => k + 1);
        return;
      }
      if (!snap.canDrop) return;
      i++;
      const x = 60 + ((i * 137) % 280);
      c.drop(x);
    }, 700);
    return () => clearInterval(t);
  }, [auto, seedKey]);

  const onDrop = useCallback((x: number) => clientRef.current?.drop(x), []);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative h-[420px] w-full overflow-hidden rounded-2xl bg-ink/5">
        {client && (
          <PixiStage
            client={client}
            onDrop={onDrop}
            interactive
            quality="high"
            reduceMotion={false}
            showTierNumbers={false}
            land={land}
            restored
            visual={tuning.visual}
            artStyle={tuning.artStyle}
            tierArt={tuning.art.tierArt}
            frameArtUrl={tuning.art.frameArt[land]}
            backgroundArtUrl={tuning.art.backgroundArt[land]}
            showFrame={showFrame}
          />
        )}
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <button
          type="button"
          className="btn-secondary min-h-9 px-3 py-1 text-sm"
          onClick={() => setAuto((a) => !a)}
        >
          {auto ? 'Pause auto-drop' : 'Resume auto-drop'}
        </button>
        <button
          type="button"
          className="btn-secondary min-h-9 px-3 py-1 text-sm"
          onClick={() => setSeedKey((k) => k + 1)}
        >
          Reset board
        </button>
        <span className="self-center text-ink-soft">Drag on the board to drop by hand.</span>
      </div>
    </div>
  );
}

function UrlField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label htmlFor={id} className="flex flex-col gap-0.5 text-sm">
      <span className="font-semibold">{label}</span>
      <input
        id={id}
        type="url"
        inputMode="url"
        placeholder="https://… or data:image/…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-10 rounded-xl border border-ink/15 bg-white px-3 py-1 text-sm"
      />
    </label>
  );
}

export function AdminScreen() {
  const navigate = useUi((s) => s.navigate);
  const toast = useUi((s) => s.toast);
  const { tuning, setPhysics, setVisual, setArtStyle, setArt, usePreset, replaceAll, resetAll } =
    useTuning();
  const [tab, setTab] = useState<'feel' | 'art'>('feel');
  const [previewLand, setPreviewLand] = useState<LandId>('sunmeadow-hollow');
  const [showFrame, setShowFrame] = useState(true);
  const [importText, setImportText] = useState('');
  const exportJson = useMemo(() => JSON.stringify(tuning, null, 2), [tuning]);

  const copyExport = async () => {
    try {
      await navigator.clipboard.writeText(exportJson);
      toast('Tuning JSON copied.');
    } catch {
      toast('Clipboard blocked — select the text below and copy it.', 'error');
    }
  };
  const doImport = () => {
    try {
      replaceAll(JSON.parse(importText));
      setImportText('');
      toast('Tuning imported.');
    } catch {
      toast('That is not valid tuning JSON.', 'error');
    }
  };

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
        <h1 className="font-display text-2xl font-bold">Admin</h1>
        <span className="text-xs text-ink-soft">saved on this device</span>
      </div>
      <div className="flex gap-2 px-4 pb-2">
        {(['feel', 'art'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`min-h-10 flex-1 rounded-full px-4 font-display text-lg font-semibold ${tab === t ? 'bg-coral-deep text-white' : 'bg-ink/5 text-ink'}`}
            aria-pressed={tab === t}
          >
            {t === 'feel' ? 'Game feel' : 'Art & frames'}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-10">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section className="card sticky top-0 z-10 self-start p-3" aria-label="Live preview">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold">Preview</span>
              <select
                aria-label="Preview land"
                value={previewLand}
                onChange={(e) => setPreviewLand(e.target.value as LandId)}
                className="min-h-9 rounded-xl border border-ink/15 bg-white px-2"
              >
                {LANDS.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={showFrame}
                  onChange={(e) => setShowFrame(e.target.checked)}
                />{' '}
                frame
              </label>
            </div>
            <PreviewBoard land={previewLand} showFrame={showFrame} />
          </section>

          {tab === 'feel' && (
            <section className="flex flex-col gap-4">
              <div className="card p-3">
                <h2 className="font-display text-lg font-bold">Presets</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {TUNING_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      title={p.blurb}
                      onClick={() => usePreset(p.id)}
                      className={`min-h-10 rounded-full px-4 text-sm font-semibold ${tuning.presetId === p.id ? 'bg-coral-deep text-white' : 'bg-ink/5'}`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-ink-soft">
                  “Fruit Merge feel” is the closest to classic fruit-merge handling: quicker drops,
                  livelier rolling and bouncing, jigglier landings. Every slider below applies live
                  and is saved automatically.
                </p>
              </div>
              {PHYSICS_FIELDS.map((g) => (
                <div key={g.group} className="card p-3">
                  <h2 className="font-display text-lg font-bold">{g.group}</h2>
                  {g.fields.map((f) => (
                    <Slider
                      key={f.key}
                      field={f}
                      value={tuning.physics[f.key]}
                      onChange={(v) => setPhysics({ [f.key]: v } as Partial<PhysicsTuning>)}
                    />
                  ))}
                </div>
              ))}
              {VISUAL_FIELDS.map((g) => (
                <div key={g.group} className="card p-3">
                  <h2 className="font-display text-lg font-bold">{g.group}</h2>
                  {g.fields.map((f) => (
                    <Slider
                      key={f.key}
                      field={f}
                      value={tuning.visual[f.key]}
                      onChange={(v) => setVisual({ [f.key]: v } as Partial<VisualTuning>)}
                    />
                  ))}
                </div>
              ))}
            </section>
          )}

          {tab === 'art' && (
            <section className="flex flex-col gap-4">
              <div className="card p-3">
                <h2 className="font-display text-lg font-bold">Mote art style</h2>
                <div className="mt-2 flex flex-col gap-2">
                  {ART_STYLES.map((s) => (
                    <label
                      key={s.id}
                      className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-2xl px-3 py-2 ${tuning.artStyle === s.id ? 'bg-coral/15 ring-2 ring-coral' : 'bg-ink/5'}`}
                    >
                      <input
                        type="radio"
                        name="artStyle"
                        checked={tuning.artStyle === s.id}
                        onChange={() => setArtStyle(s.id)}
                        className="mt-1"
                      />
                      <span>
                        <span className="font-semibold">{s.name}</span>
                        <span className="block text-xs text-ink-soft">{s.blurb}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="card p-3">
                <h2 className="font-display text-lg font-bold">Custom mote art</h2>
                <p className="text-xs text-ink-soft">
                  One square image per tier (transparent background, face centred, soft edge). Leave
                  blank for the built-in art.
                </p>
                <div className="mt-2 flex flex-col gap-2">
                  {Array.from({ length: TIER_COUNT }, (_, i) => i + 1).map((t) => (
                    <UrlField
                      key={t}
                      id={`tier-art-${t}`}
                      label={`Tier ${t} · ${tierName(t)}`}
                      value={tuning.art.tierArt[t] ?? ''}
                      onChange={(v) => setArt({ tierArt: { ...tuning.art.tierArt, [t]: v } })}
                    />
                  ))}
                </div>
              </div>
              <div className="card p-3">
                <h2 className="font-display text-lg font-bold">Land frames & backdrops</h2>
                <p className="text-xs text-ink-soft">
                  Frame images are stretched to the whole framed area (460×674 board px) with the
                  board drawn over the middle 400×600. Backdrops fill the board behind the motes.
                </p>
                <div className="mt-2 flex flex-col gap-3">
                  {LANDS.map((l) => (
                    <div key={l.id} className="rounded-2xl bg-ink/5 p-2">
                      <div className="mb-1 font-semibold">{l.name}</div>
                      <UrlField
                        id={`frame-${l.id}`}
                        label="Frame image"
                        value={tuning.art.frameArt[l.id] ?? ''}
                        onChange={(v) =>
                          setArt({ frameArt: { ...tuning.art.frameArt, [l.id]: v } })
                        }
                      />
                      <UrlField
                        id={`bg-${l.id}`}
                        label="Backdrop image"
                        value={tuning.art.backgroundArt[l.id] ?? ''}
                        onChange={(v) =>
                          setArt({ backgroundArt: { ...tuning.art.backgroundArt, [l.id]: v } })
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>

        <section className="card mt-4 p-3">
          <h2 className="font-display text-lg font-bold">Save, share, reset</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" onClick={copyExport}>
              Copy tuning JSON
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                resetAll();
                toast('Reset to design-doc defaults.');
              }}
            >
              Reset everything
            </button>
          </div>
          <textarea
            readOnly
            value={exportJson}
            aria-label="Tuning JSON"
            className="mt-2 h-32 w-full rounded-xl border border-ink/15 bg-white p-2 font-mono text-xs"
          />
          <label htmlFor="import-json" className="mt-2 block text-sm font-semibold">
            Paste tuning JSON to import
          </label>
          <textarea
            id="import-json"
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            className="h-24 w-full rounded-xl border border-ink/15 bg-white p-2 font-mono text-xs"
          />
          <button
            type="button"
            className="btn-secondary mt-2"
            onClick={doImport}
            disabled={!importText.trim()}
          >
            Import
          </button>
          <p className="mt-2 text-xs text-ink-soft">
            To make a tuning the shipped default, paste the JSON values into{' '}
            <code>src/config/physics.ts</code> / <code>src/config/tuning.ts</code>.
          </p>
        </section>
      </div>
    </div>
  );
}
