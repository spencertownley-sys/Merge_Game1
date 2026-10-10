import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_GAME_TUNING,
  DEFAULT_VISUAL,
  PHYSICS_FIELDS,
  TUNING_PRESETS,
  TUNING_VERSION,
  VISUAL_FIELDS,
  applyPreset,
  normalizeTuning,
} from '../../src/config/tuning';
import { DEFAULT_TUNING } from '../../src/config/physics';
import { resetDBForTests } from '../../src/persistence/db';
import { tuningRepository } from '../../src/persistence/TuningRepository';

describe('tuning model', () => {
  it('the default preset is the reference match and equals the canonical physics defaults', () => {
    const p = TUNING_PRESETS.find((x) => x.id === 'reference')!;
    expect(DEFAULT_GAME_TUNING.presetId).toBe('reference');
    expect(p.physics).toEqual(DEFAULT_TUNING);
    expect(p.visual).toEqual(DEFAULT_VISUAL);
    expect(DEFAULT_GAME_TUNING.physics).toEqual(DEFAULT_TUNING);
  });

  it('every preset value sits inside its slider range', () => {
    for (const p of TUNING_PRESETS) {
      for (const g of PHYSICS_FIELDS)
        for (const f of g.fields) {
          expect(p.physics[f.key], `${p.id}.${f.key}`).toBeGreaterThanOrEqual(f.min);
          expect(p.physics[f.key], `${p.id}.${f.key}`).toBeLessThanOrEqual(f.max);
        }
      for (const g of VISUAL_FIELDS)
        for (const f of g.fields) {
          expect(p.visual[f.key], `${p.id}.${f.key}`).toBeGreaterThanOrEqual(f.min);
          expect(p.visual[f.key], `${p.id}.${f.key}`).toBeLessThanOrEqual(f.max);
        }
    }
  });

  it('normalizeTuning clamps, fills defaults and drops unsafe art URLs', () => {
    const t = normalizeTuning({
      version: TUNING_VERSION,
      physics: { gravity: 999, frictionBallBall: -1 },
      visual: { squashAmplitudeX: 'nope' },
      artStyle: 'bogus',
      art: {
        tierArt: { 1: 'https://example.com/a.png', 2: 'javascript:alert(1)' },
        frameArt: { whisperwood: 'data:image/png;base64,AAAA' },
      },
    });
    expect(t.physics.gravity).toBe(40);
    expect(t.physics.frictionBallBall).toBe(0);
    expect(t.physics.restitutionBallBall).toBe(DEFAULT_TUNING.restitutionBallBall);
    expect(t.visual.squashAmplitudeX).toBe(DEFAULT_VISUAL.squashAmplitudeX);
    expect(t.artStyle).toBe('gummy');
    expect(t.art.tierArt).toEqual({ 1: 'https://example.com/a.png' });
    expect(t.art.frameArt).toEqual({ whisperwood: 'data:image/png;base64,AAAA' });
  });

  it('applyPreset swaps physics + visual and keeps art', () => {
    const base = {
      ...DEFAULT_GAME_TUNING,
      art: { tierArt: { 3: 'https://x/y.png' }, frameArt: {}, backgroundArt: {} },
    };
    const t = applyPreset(base, 'original');
    expect(t.presetId).toBe('original');
    expect(t.physics.gravity).toBe(14);
    expect(t.art.tierArt[3]).toBe('https://x/y.png');
  });

  it('feel saved under older defaults gives way to the new defaults but keeps art', () => {
    const t = normalizeTuning({
      physics: { gravity: 22 },
      visual: { squashAmplitudeX: 0.3 },
      artStyle: 'watercolor',
      art: { tierArt: { 2: 'https://x/two.png' } },
      presetId: 'fruit-merge',
    });
    expect(t.version).toBe(TUNING_VERSION);
    expect(t.physics).toEqual(DEFAULT_TUNING);
    expect(t.visual).toEqual(DEFAULT_VISUAL);
    expect(t.presetId).toBe('reference');
    expect(t.artStyle).toBe('watercolor');
    expect(t.art.tierArt[2]).toBe('https://x/two.png');
  });
});

describe('TuningRepository', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    resetDBForTests();
  });
  it('round-trips and normalizes', async () => {
    expect(await tuningRepository.load()).toEqual(DEFAULT_GAME_TUNING);
    await tuningRepository.save({
      ...DEFAULT_GAME_TUNING,
      physics: { ...DEFAULT_TUNING, gravity: 20 },
      presetId: 'custom',
    });
    expect((await tuningRepository.load()).physics.gravity).toBe(20);
    await tuningRepository.reset();
    expect(await tuningRepository.load()).toEqual(DEFAULT_GAME_TUNING);
  });
});
