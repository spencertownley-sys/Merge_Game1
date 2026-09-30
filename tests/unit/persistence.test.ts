import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import { resetDBForTests } from '../../src/persistence/db';
import { runRepository } from '../../src/persistence/RunRepository';
import { settingsRepository } from '../../src/persistence/SettingsRepository';
import { journeyRepository } from '../../src/persistence/JourneyRepository';

beforeEach(() => {
  // Fresh database per test.
  globalThis.indexedDB = new IDBFactory();
  resetDBForTests();
});

describe('RunRepository', () => {
  it('saves runs and reports the best score per mode', async () => {
    await runRepository.saveRun({ mode: 'classic', seed: 1, score: 120, topTier: 5, mergeLog: [] });
    await runRepository.saveRun({ mode: 'classic', seed: 2, score: 340, topTier: 7, mergeLog: [] });
    await runRepository.saveRun({
      mode: 'journey',
      levelId: 1,
      seed: 3,
      score: 999,
      topTier: 4,
      mergeLog: [],
    });
    expect(await runRepository.getBestScore('classic')).toBe(340);
    expect(await runRepository.getBestScore('journey', 1)).toBe(999);
    expect(await runRepository.getBestScore('journey', 2)).toBe(0);
    const recent = await runRepository.listRecentRuns(2);
    expect(recent).toHaveLength(2);
  });
});

describe('SettingsRepository', () => {
  it('falls back to defaults and persists explicit values', async () => {
    expect(await settingsRepository.get('sound')).toBe(true);
    await settingsRepository.set('sound', false);
    await settingsRepository.set('showTierNumbers', true);
    expect(await settingsRepository.get('sound')).toBe(false);
    const all = await settingsRepository.getAll();
    expect(all.sound).toBe(false);
    expect(all.showTierNumbers).toBe(true);
    expect(all.reduceMotion).toBe(false);
  });
});

describe('JourneyRepository', () => {
  it('keeps the max of stars and score across completions', async () => {
    expect(await journeyRepository.getProgress(1)).toBeNull();
    await journeyRepository.recordCompletion(1, { stars: 2, score: 150 });
    await journeyRepository.recordCompletion(1, { stars: 1, score: 400 });
    expect(await journeyRepository.getProgress(1)).toEqual({ stars: 2, bestScore: 400 });
    await journeyRepository.recordCompletion(1, { stars: 3, score: 10 });
    expect((await journeyRepository.getAllProgress())[1]).toEqual({ stars: 3, bestScore: 400 });
  });
});
