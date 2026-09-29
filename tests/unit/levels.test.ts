// Validates the authored level content against the §10.4 schema and board constraints.
import { describe, expect, it } from 'vitest';
import { LEVELS } from '../../src/journey/levels';
import { LANDS } from '../../src/journey/lands';
import { PHYSICS } from '../../src/config/physics';
import { DROPPABLE_TIERS, TIER_COUNT, tierRadiusPx } from '../../src/config/tiers';

describe('Journey level content', () => {
  it('has unique, ascending ids starting at 1', () => {
    LEVELS.forEach((l, i) => expect(l.id).toBe(i + 1));
  });

  it('only references known lands, in story order', () => {
    const order = LANDS.map((l) => l.id);
    let last = -1;
    for (const l of LEVELS) {
      const idx = order.indexOf(l.land);
      expect(idx, `${l.name} land`).toBeGreaterThanOrEqual(0);
      expect(idx, `${l.name} keeps story order`).toBeGreaterThanOrEqual(last);
      last = idx;
    }
  });

  it('covers the first three lands (Sunmeadow Hollow, Driftmoor Cove, Whisperwood)', () => {
    const lands = new Set(LEVELS.map((l) => l.land));
    expect(lands.has('sunmeadow-hollow')).toBe(true);
    expect(lands.has('driftmoor-cove')).toBe(true);
    expect(lands.has('whisperwood')).toBe(true);
  });

  it('has at least one goal and valid star rules per level', () => {
    for (const l of LEVELS) {
      expect(l.goals.length, l.name).toBeGreaterThan(0);
      expect(l.stars.two, l.name).toBeDefined();
      expect(l.stars.three, l.name).toBeDefined();
      for (const g of l.goals) {
        if (g.type === 'reachTier') expect(g.tier).toBeLessThanOrEqual(TIER_COUNT);
        if (g.type === 'mergeCount') expect(g.tier).toBeLessThanOrEqual(TIER_COUNT);
      }
    }
  });

  it('places obstacles fully inside the board and below the danger line', () => {
    for (const l of LEVELS) {
      for (const o of l.obstacles ?? []) {
        const r = o.type === 'rock' ? PHYSICS.rockRadiusPx : tierRadiusPx(o.tier);
        expect(o.x - r, `${l.name} obstacle left`).toBeGreaterThanOrEqual(0);
        expect(o.x + r, `${l.name} obstacle right`).toBeLessThanOrEqual(PHYSICS.boardWidthPx);
        expect(o.y + r, `${l.name} obstacle bottom`).toBeLessThanOrEqual(PHYSICS.boardHeightPx);
        expect(o.y - r, `${l.name} obstacle above danger line`).toBeGreaterThan(
          PHYSICS.dangerLineYPx,
        );
      }
      if (l.spawnBag) {
        expect(l.spawnBag.length).toBe(DROPPABLE_TIERS.length);
        expect(l.spawnBag.reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
      }
    }
  });

  it('ice-clearing goals never ask for more ice than the level places', () => {
    for (const l of LEVELS) {
      const ice = (l.obstacles ?? []).filter((o) => o.type === 'ice').length;
      for (const g of l.goals) {
        if (g.type === 'clearObstacle' && g.obstacle === 'ice')
          expect(g.count, l.name).toBeLessThanOrEqual(ice);
      }
    }
  });
});
