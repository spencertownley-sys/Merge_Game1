// Admin-tunable game feel: physics (fall / roll / bounce), the render-only "jiggle" of the
// motes, and the art style. The design-doc numbers in config/physics.ts stay the canonical
// defaults; this layer lets the owner tune by feel from the in-app Admin screen and keeps the
// result in IndexedDB. Everything here is validated/clamped on load so a bad value can never
// break a run.

import { DEFAULT_TUNING, type PhysicsTuning } from './physics';
import type { LandId } from '../types';

export type ArtStyleId = 'gummy' | 'watercolor' | 'fruit';

export const ART_STYLES: { id: ArtStyleId; name: string; blurb: string }[] = [
  {
    id: 'gummy',
    name: 'Gummy glow',
    blurb: 'Translucent candy orbs with the face glowing inside (game design §9).',
  },
  {
    id: 'watercolor',
    name: 'Watercolor paper',
    blurb: 'Soft painted discs with a brushed rim, matching the storybook world.',
  },
  {
    id: 'fruit',
    name: 'Bold fruit',
    blurb: 'Flat, bright, outlined motes with big faces, in the classic fruit-merge look.',
  },
];

/** Render-only feel: squash/jiggle on landing, idle wobble, spin and gaze. */
export interface VisualTuning {
  /** Widen on compress (0..0.6). */
  squashAmplitudeX: number;
  /** Flatten on compress (0..0.6). */
  squashAmplitudeY: number;
  /** How long a landing squash rings (ms). */
  squashDurationMs: number;
  /** Extra "jelly" wobble cycles inside the envelope (1 = one rebound, 3 = jiggly). */
  jiggleCycles: number;
  /** m/s approach speed needed to trigger a squash. */
  impactThresholdMps: number;
  /** Continuous idle jiggle amplitude (0 = none, 0.05 = subtle breathing). */
  idleJiggle: number;
  /** Fraction of the physics spin shown on the face (0..1). */
  visualSpinScale: number;
  /** Max lean of the face into its velocity (degrees). */
  wobbleMaxDeg: number;
  /** Max gaze toward the pointer (degrees). */
  gazeMaxDeg: number;
}

export const DEFAULT_VISUAL: VisualTuning = {
  squashAmplitudeX: 0.22,
  squashAmplitudeY: 0.3,
  squashDurationMs: 220,
  jiggleCycles: 1.5,
  impactThresholdMps: 2.5,
  idleJiggle: 0,
  visualSpinScale: 0.6,
  wobbleMaxDeg: 8,
  gazeMaxDeg: 20,
};

export interface ArtOverrides {
  /** Custom core art per tier (1..11): any image URL / data URL. Empty = built-in art. */
  tierArt: Partial<Record<number, string>>;
  /** Custom frame artwork per land (drawn around the board). Empty = procedural frame. */
  frameArt: Partial<Record<LandId, string>>;
  /** Custom in-board backdrop per land. Empty = palette gradient. */
  backgroundArt: Partial<Record<LandId, string>>;
}

export interface GameTuning {
  physics: PhysicsTuning;
  visual: VisualTuning;
  artStyle: ArtStyleId;
  art: ArtOverrides;
  /** Name of the preset this was last reset to, for the admin UI. */
  presetId: string;
}

export const DEFAULT_GAME_TUNING: GameTuning = {
  physics: { ...DEFAULT_TUNING },
  visual: { ...DEFAULT_VISUAL },
  artStyle: 'gummy',
  art: { tierArt: {}, frameArt: {}, backgroundArt: {} },
  presetId: 'design-doc',
};

export interface TuningPreset {
  id: string;
  name: string;
  blurb: string;
  physics: PhysicsTuning;
  visual: VisualTuning;
}

/** Feel presets. "Fruit Merge feel" approximates the snappier, bouncier, jigglier handling of
 *  classic fruit-merge games: faster fall, more roll, a little more bounce, bigger squash. */
export const TUNING_PRESETS: readonly TuningPreset[] = [
  {
    id: 'design-doc',
    name: 'Design doc defaults',
    blurb: 'The canonical §2 / §9.4 numbers.',
    physics: { ...DEFAULT_TUNING },
    visual: { ...DEFAULT_VISUAL },
  },
  {
    id: 'fruit-merge',
    name: 'Fruit Merge feel',
    blurb: 'Faster fall, livelier roll and bounce, jiggly landings.',
    physics: {
      ...DEFAULT_TUNING,
      gravity: 22,
      restitutionBallBall: 0.22,
      restitutionBallWall: 0.18,
      frictionBallBall: 0.45,
      frictionBallWall: 0.3,
      linearDamping: 0.05,
      angularDamping: 0.15,
      maxSpeedClamp: 18,
      dropCooldownMs: 350,
    },
    visual: {
      ...DEFAULT_VISUAL,
      squashAmplitudeX: 0.3,
      squashAmplitudeY: 0.38,
      squashDurationMs: 320,
      jiggleCycles: 2.5,
      impactThresholdMps: 1.8,
      idleJiggle: 0.015,
      visualSpinScale: 0.8,
      wobbleMaxDeg: 10,
    },
  },
  {
    id: 'floaty',
    name: 'Floaty',
    blurb: 'Slow, dreamy fall with soft landings.',
    physics: {
      ...DEFAULT_TUNING,
      gravity: 8,
      linearDamping: 0.3,
      angularDamping: 0.6,
      restitutionBallBall: 0.08,
      restitutionBallWall: 0.08,
    },
    visual: { ...DEFAULT_VISUAL, squashAmplitudeX: 0.15, squashAmplitudeY: 0.2, idleJiggle: 0.01 },
  },
  {
    id: 'bouncy',
    name: 'Bouncy',
    blurb: 'Rubbery motes that spring off each other.',
    physics: {
      ...DEFAULT_TUNING,
      gravity: 18,
      restitutionBallBall: 0.45,
      restitutionBallWall: 0.4,
      angularDamping: 0.2,
    },
    visual: {
      ...DEFAULT_VISUAL,
      squashAmplitudeX: 0.35,
      squashAmplitudeY: 0.42,
      squashDurationMs: 380,
      jiggleCycles: 3,
    },
  },
];

export interface TuningField<K extends string> {
  key: K;
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
}

/** Slider metadata for the admin screen, grouped the way the owner thinks about feel. */
export const PHYSICS_FIELDS: { group: string; fields: TuningField<keyof PhysicsTuning>[] }[] = [
  {
    group: 'Fall',
    fields: [
      {
        key: 'gravity',
        label: 'Fall speed (gravity)',
        hint: 'm/s². Higher = motes drop faster.',
        min: 3,
        max: 40,
        step: 0.5,
      },
      {
        key: 'maxSpeedClamp',
        label: 'Top speed',
        hint: 'm/s cap. Keeps fast drops from tunnelling.',
        min: 4,
        max: 40,
        step: 0.5,
      },
      {
        key: 'linearDamping',
        label: 'Air drag',
        hint: 'Higher = motes slow down sooner.',
        min: 0,
        max: 2,
        step: 0.01,
      },
      {
        key: 'dropCooldownMs',
        label: 'Drop cooldown',
        hint: 'ms between releases.',
        min: 100,
        max: 1500,
        step: 10,
      },
    ],
  },
  {
    group: 'Roll',
    fields: [
      {
        key: 'frictionBallBall',
        label: 'Grip between motes',
        hint: 'Lower = motes slide and roll over each other more.',
        min: 0,
        max: 1.5,
        step: 0.01,
      },
      {
        key: 'frictionBallWall',
        label: 'Grip on walls',
        hint: 'Lower = motes slide down the walls.',
        min: 0,
        max: 1.5,
        step: 0.01,
      },
      {
        key: 'angularDamping',
        label: 'Roll decay',
        hint: 'Lower = motes keep rolling longer.',
        min: 0,
        max: 3,
        step: 0.01,
      },
    ],
  },
  {
    group: 'Bounce',
    fields: [
      {
        key: 'restitutionBallBall',
        label: 'Bounce between motes',
        hint: '0 = thud, 1 = rubber ball.',
        min: 0,
        max: 0.9,
        step: 0.01,
      },
      {
        key: 'restitutionBallWall',
        label: 'Bounce off walls',
        hint: '0 = thud, 1 = rubber ball.',
        min: 0,
        max: 0.9,
        step: 0.01,
      },
    ],
  },
];

export const VISUAL_FIELDS: { group: string; fields: TuningField<keyof VisualTuning>[] }[] = [
  {
    group: 'Jiggle on landing',
    fields: [
      {
        key: 'squashAmplitudeX',
        label: 'Squash width',
        hint: 'How much a mote widens when it lands.',
        min: 0,
        max: 0.6,
        step: 0.01,
      },
      {
        key: 'squashAmplitudeY',
        label: 'Squash height',
        hint: 'How much a mote flattens when it lands.',
        min: 0,
        max: 0.6,
        step: 0.01,
      },
      {
        key: 'squashDurationMs',
        label: 'Jiggle length',
        hint: 'ms the wobble rings for.',
        min: 80,
        max: 800,
        step: 10,
      },
      {
        key: 'jiggleCycles',
        label: 'Jiggle wobbles',
        hint: 'Rebounds inside that time. Higher = jellier.',
        min: 0.5,
        max: 5,
        step: 0.1,
      },
      {
        key: 'impactThresholdMps',
        label: 'Squash trigger speed',
        hint: 'm/s. Lower = even gentle landings jiggle.',
        min: 0.2,
        max: 8,
        step: 0.1,
      },
      {
        key: 'idleJiggle',
        label: 'Idle jelly',
        hint: 'Constant soft breathing wobble at rest.',
        min: 0,
        max: 0.08,
        step: 0.001,
      },
    ],
  },
  {
    group: 'Face motion',
    fields: [
      {
        key: 'visualSpinScale',
        label: 'Visible roll',
        hint: 'How much of the physics spin shows on the face.',
        min: 0,
        max: 1.5,
        step: 0.01,
      },
      {
        key: 'wobbleMaxDeg',
        label: 'Lean into motion',
        hint: 'Degrees the face leans while moving.',
        min: 0,
        max: 30,
        step: 0.5,
      },
      {
        key: 'gazeMaxDeg',
        label: 'Gaze toward finger',
        hint: 'Degrees the face turns toward the pointer.',
        min: 0,
        max: 35,
        step: 0.5,
      },
    ],
  },
];

function clampNum(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : fallback;
  return Math.min(max, Math.max(min, n));
}

function sanitizeUrl(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const s = v.trim();
  if (!s) return undefined;
  if (/^(https?:\/\/|data:image\/|\.?\/)/i.test(s)) return s;
  return undefined;
}

/** Accepts anything (e.g. an old or hand-edited record) and returns a valid GameTuning. */
export function normalizeTuning(input: unknown): GameTuning {
  const raw = (input ?? {}) as Partial<GameTuning> & {
    physics?: Partial<PhysicsTuning>;
    visual?: Partial<VisualTuning>;
  };
  const physics = { ...DEFAULT_TUNING } as PhysicsTuning;
  for (const group of PHYSICS_FIELDS)
    for (const f of group.fields)
      physics[f.key] = clampNum(raw.physics?.[f.key], f.min, f.max, DEFAULT_TUNING[f.key]);
  const visual = { ...DEFAULT_VISUAL } as VisualTuning;
  for (const group of VISUAL_FIELDS)
    for (const f of group.fields)
      visual[f.key] = clampNum(raw.visual?.[f.key], f.min, f.max, DEFAULT_VISUAL[f.key]);
  const artStyle: ArtStyleId = ART_STYLES.some((s) => s.id === raw.artStyle)
    ? (raw.artStyle as ArtStyleId)
    : 'gummy';
  const art: ArtOverrides = { tierArt: {}, frameArt: {}, backgroundArt: {} };
  const rawArt = (raw.art ?? {}) as Partial<ArtOverrides>;
  for (let t = 1; t <= 11; t++) {
    const u = sanitizeUrl((rawArt.tierArt as Record<number, unknown> | undefined)?.[t]);
    if (u) art.tierArt[t] = u;
  }
  for (const [k, v] of Object.entries(rawArt.frameArt ?? {})) {
    const u = sanitizeUrl(v);
    if (u) art.frameArt[k as LandId] = u;
  }
  for (const [k, v] of Object.entries(rawArt.backgroundArt ?? {})) {
    const u = sanitizeUrl(v);
    if (u) art.backgroundArt[k as LandId] = u;
  }
  const presetId = typeof raw.presetId === 'string' ? raw.presetId : 'custom';
  return { physics, visual, artStyle, art, presetId };
}

export function applyPreset(tuning: GameTuning, presetId: string): GameTuning {
  const p = TUNING_PRESETS.find((x) => x.id === presetId);
  if (!p) return tuning;
  return { ...tuning, physics: { ...p.physics }, visual: { ...p.visual }, presetId: p.id };
}
