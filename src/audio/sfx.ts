// Sound effects, synthesized with Web Audio (no audio files): a soft tock on drop, a pop whose
// pitch rises with the new tier (UI_UX_NOTES.md §5: "pitch-ramped merge sound per tier"), a
// sparkle on combos, a chime for the apex, and a falling pair of notes at game over. Render-side
// only: driven by worker events on the main thread, so it can never touch determinism.

import type { SimEvent } from '../engine/types';
import { useSettings } from '../store/settingsStore';

type Ctx = AudioContext;

let ctx: Ctx | null = null;
let master: GainNode | null = null;

function audio(): { ctx: Ctx; out: GainNode } | null {
  if (ctx && master) return { ctx, out: master };
  const AC =
    typeof window !== 'undefined'
      ? (window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
      : undefined;
  if (!AC) return null;
  try {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
    return { ctx, out: master };
  } catch {
    return null;
  }
}

/** Browsers start audio suspended until a user gesture; call this from one (the first drop). */
export function unlockAudio(): void {
  const a = audio();
  if (a && a.ctx.state === 'suspended') a.ctx.resume().catch(() => {});
}

function enabled(): boolean {
  return useSettings.getState().sound;
}

/** One enveloped oscillator note. */
function tone(
  freq: number,
  {
    at = 0,
    dur = 0.12,
    type = 'sine' as OscillatorType,
    gain = 0.2,
    glideTo,
  }: { at?: number; dur?: number; type?: OscillatorType; gain?: number; glideTo?: number } = {},
): void {
  const a = audio();
  if (!a || a.ctx.state !== 'running') return;
  const t0 = a.ctx.currentTime + at;
  const osc = a.ctx.createOscillator();
  const env = a.ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(env).connect(a.out);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/** Pitch of a merge into `tier`: a major-pentatonic climb, so chains sound musical. */
export function mergePitchHz(tier: number): number {
  const steps = [0, 2, 4, 7, 9];
  const n = Math.max(0, tier - 2); // tier 2 is the first merge result
  const semis = steps[n % 5] + 12 * Math.floor(n / 5);
  return 392 * Math.pow(2, semis / 12); // G4 upward
}

export function playEvents(events: readonly SimEvent[]): void {
  if (!enabled() || events.length === 0) return;
  let drops = 0;
  for (const e of events) {
    switch (e.type) {
      case 'drop':
        if (drops++ === 0) tone(240, { dur: 0.09, type: 'triangle', gain: 0.12, glideTo: 150 });
        break;
      case 'merge': {
        const f = mergePitchHz(e.tier);
        tone(f, { dur: 0.16, type: 'sine', gain: 0.22, glideTo: f * 1.18 });
        if (e.comboCount >= 2) tone(f * 2, { at: 0.05, dur: 0.12, type: 'triangle', gain: 0.08 });
        break;
      }
      case 'apex':
        [0, 4, 7, 12].forEach((s, i) =>
          tone(523 * Math.pow(2, s / 12), { at: i * 0.09, dur: 0.4, type: 'triangle', gain: 0.18 }),
        );
        break;
      case 'warning':
        tone(660, { dur: 0.08, type: 'square', gain: 0.05 });
        break;
      case 'gameOver':
        tone(392, { dur: 0.25, type: 'triangle', gain: 0.18 });
        tone(262, { at: 0.22, dur: 0.45, type: 'triangle', gain: 0.18 });
        break;
      default:
        break;
    }
  }
}
