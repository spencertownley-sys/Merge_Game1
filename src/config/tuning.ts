// Admin-tunable game feel: physics (fall / roll / bounce), the render-only "jiggle" of the
// motes, and the art style. The design-doc numbers in config/physics.ts stay the canonical
// defaults; this layer lets the owner tune by feel from the in-app Admin screen and keeps the
// result in IndexedDB. Everything here is validated/clamped on load so a bad value can never
// break a run.

import { DEFAULT_TUNING, type PhysicsTuning } from './physics';
import type { LandId } from '../types';

export type ArtStyleId = 'storybook' | 'gummy' | 'watercolor' | 'fruit';

export const ART_STYLES: { id: ArtStyleId; name: string; blurb: string }[] = [
  {
    id: 'storybook',
    name: 'Storybook (painted)',
    blurb: 'The painted gummy motes generated with Higgsfield. The default look.',
  },
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
  /** The held mote's periodic "ready" stretch while it waits above the rim (0 = still). */
  heldPulse: number;
}

/** Revised 2026-10-10 to match the reference video: landings show at most a faint squash,
 *  and the waiting mote stretches about 12% taller in a slow pulse. */
export const DEFAULT_VISUAL: VisualTuning = {
  squashAmplitudeX: 0.08,
  squashAmplitudeY: 0.1,
  squashDurationMs: 200,
  jiggleCycles: 1,
  impactThresholdMps: 3,
  idleJiggle: 0,
  visualSpinScale: 0.8,
  wobbleMaxDeg: 6,
  gazeMaxDeg: 20,
  heldPulse: 0.12,
};

/** The September defaults (design doc §9.4 before the 2026-10-10 reference revision). */
const ORIGINAL_VISUAL: VisualTuning = {
  squashAmplitudeX: 0.22,
  squashAmplitudeY: 0.3,
  squashDurationMs: 220,
  jiggleCycles: 1.5,
  impactThresholdMps: 2.5,
  idleJiggle: 0,
  visualSpinScale: 0.6,
  wobbleMaxDeg: 8,
  gazeMaxDeg: 20,
  heldPulse: 0,
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
  /** Bumped when the defaults change shape (TUNING_VERSION); older saved feel is replaced. */
  version: number;
}

/** 2 = the reference-matched defaults (2026-10-10); 3 = the painted Storybook motes become the
 *  default art style. Saved tuning from before version 2 keeps its art overrides but takes the
 *  new physics and visual defaults, because the board and tier sizes changed under it. */
export const TUNING_VERSION = 3;
/** Version 3 only changed the default art style to the painted Storybook motes, so feel saved
 *  under version 2 still applies. */
const FEEL_COMPATIBLE_VERSIONS = new Set([2, 3]);

export const DEFAULT_GAME_TUNING: GameTuning = {
  physics: { ...DEFAULT_TUNING },
  visual: { ...DEFAULT_VISUAL },
  artStyle: 'storybook',
  art: { tierArt: {}, frameArt: {}, backgroundArt: {} },
  presetId: 'reference',
  version: TUNING_VERSION,
};

export interface TuningPreset {
  id: string;
  name: string;
  blurb: string;
  physics: PhysicsTuning;
  visual: VisualTuning;
}

/** Feel presets. "Reference match" is the default: measured frame by frame from the reference
 *  video (fall time, bounce height, rolling decay; see game design §2). */
export const TUNING_PRESETS: readonly TuningPreset[] = [
  {
    id: 'reference',
    name: 'Reference match',
    blurb: 'Measured from the reference video: steady fall, small hop, long roll.',
    physics: { ...DEFAULT_TUNING },
    visual: { ...DEFAULT_VISUAL },
  },
  {
    id: 'original',
    name: 'Original Smoosh',
    blurb: 'The September numbers: quicker fall, softer bounce, jiggly landings.',
    physics: {
      ...DEFAULT_TUNING,
      gravity: 14,
      restitutionBallBall: 0.12,
      restitutionBallWall: 0.12,
      frictionBallBall: 0.35,
      frictionBallWall: 0.2,
      linearDamping: 0.15,
      angularDamping: 0.4,
      maxSpeedClamp: 14,
      dropCooldownMs: 450,
    },
    visual: { ...ORIGINAL_VISUAL },
  },
  {
    id: 'floaty',
    name: 'Floaty',
    blurb: 'Slow, dreamy fall with soft landings.',
    physics: {
      ...DEFAULT_TUNING,
      gravity: 5,
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
      gravity: 12,
      restitutionBallBall: 0.5,
      restitutionBallWall: 0.5,
      angularDamping: 0.3,
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
      {
        key: 'heldPulse',
        label: 'Waiting bounce',
        hint: 'How much the held mote stretches while it waits above the rim.',
        min: 0,
        max: 0.3,
        step: 0.01,
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
  // Feel saved under older defaults was tuned for a different board and tier sizes, so it
  // gives way to the current defaults; art choices carry over either way.
  const current = FEEL_COMPATIBLE_VERSIONS.has(raw.version as number);
  const physics = { ...DEFAULT_TUNING } as PhysicsTuning;
  for (const group of PHYSICS_FIELDS)
    for (const f of group.fields)
      physics[f.key] = clampNum(
        current ? raw.physics?.[f.key] : undefined,
        f.min,
        f.max,
        DEFAULT_TUNING[f.key],
      );
  const visual = { ...DEFAULT_VISUAL } as VisualTuning;
  for (const group of VISUAL_FIELDS)
    for (const f of group.fields)
      visual[f.key] = clampNum(
        current ? raw.visual?.[f.key] : undefined,
        f.min,
        f.max,
        DEFAULT_VISUAL[f.key],
      );
  // Before version 3 everyone was on the code-drawn gummy look by default; move them to the
  // painted art unless they had picked one of the other styles on purpose.
  const legacyDefault = (raw.version ?? 0) < TUNING_VERSION && raw.artStyle === 'gummy';
  const artStyle: ArtStyleId =
    !legacyDefault && ART_STYLES.some((s) => s.id === raw.artStyle)
      ? (raw.artStyle as ArtStyleId)
      : 'storybook';
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
  const presetId = !current
    ? DEFAULT_GAME_TUNING.presetId
    : typeof raw.presetId === 'string'
      ? raw.presetId
      : 'custom';
  return { physics, visual, artStyle, art, presetId, version: TUNING_VERSION };
}

export function applyPreset(tuning: GameTuning, presetId: string): GameTuning {
  const p = TUNING_PRESETS.find((x) => x.id === presetId);
  if (!p) return tuning;
  return { ...tuning, physics: { ...p.physics }, visual: { ...p.visual }, presetId: p.id };
}
