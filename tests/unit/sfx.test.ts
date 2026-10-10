import { describe, expect, it } from 'vitest';
import { mergePitchHz, playEvents } from '../../src/audio/sfx';
import { useSettings } from '../../src/store/settingsStore';

describe('sound effects', () => {
  it('merge pitch rises with every tier, so chains climb', () => {
    for (let t = 3; t <= 11; t++) expect(mergePitchHz(t)).toBeGreaterThan(mergePitchHz(t - 1));
  });

  it('playing events is a harmless no-op where Web Audio is missing or sound is off', () => {
    const events = [
      { type: 'drop', id: 1, tier: 1, x: 100, atMs: 0 },
      {
        type: 'merge',
        atMs: 10,
        tier: 3,
        parentIds: [1, 2],
        resultId: 3,
        x: 100,
        y: 400,
        points: 3,
        comboCount: 2,
      },
      { type: 'gameOver', atMs: 20, score: 3, topTier: 3 },
    ] as const;
    expect(() => playEvents(events)).not.toThrow(); // jsdom has no AudioContext
    useSettings.getState().set('sound', false);
    expect(() => playEvents(events)).not.toThrow();
    useSettings.getState().set('sound', true);
  });
});
