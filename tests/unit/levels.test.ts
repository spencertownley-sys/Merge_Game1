// Validates the authored level content against the §10.4 schema and board constraints.
import { describe, expect, it } from 'vitest';
import { LEVELS } from '../../src/journey/levels';
import { LANDS } from '../../src/journey/lands';
import { PHYSICS } from '../../src/config/physics';
import { DROPPABLE_TIERS, TIER_COUNT, tierRadiusPx } from '../../src/config/tiers';
import { dropRange } from '../../src/engine/walls';

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

  it('covers the first eleven lands, into wave 3 (up to Starlit Harbor)', () => {
    const lands = new Set(LEVELS.map((l) => l.land));
    for (const land of LANDS.slice(0, 11)) expect(lands.has(land.id), land.name).toBe(true);
  });

  it('keeps Starlit Harbor a breather: no level there can be lost on a budget', () => {
    for (const l of LEVELS.filter((x) => x.land === 'starlit-harbor')) {
      expect(l.timeLimitSec, l.name).toBeUndefined();
      expect(l.dropLimit ?? Infinity, l.name).toBeGreaterThanOrEqual(100);
      expect(l.hazards, l.name).toBeUndefined();
      expect(l.walls, l.name).toBeUndefined();
    }
  });

  it('keeps shaped-box walls inside the board, clear of obstacles, with room to drop', () => {
    const W = PHYSICS.boardWidthPx;
    const H = PHYSICS.boardHeightPx;
    for (const l of LEVELS) {
      for (const w of l.walls ?? []) {
        expect(w.x, l.name).toBeGreaterThanOrEqual(0);
        expect(w.y, l.name).toBeGreaterThanOrEqual(0);
        expect(w.x + w.width, l.name).toBeLessThanOrEqual(W);
        expect(w.y + w.height, l.name).toBeLessThanOrEqual(H);
        for (const o of l.obstacles ?? []) {
          const r = o.type === 'rock' ? PHYSICS.rockRadiusPx : tierRadiusPx(o.tier);
          const dx = Math.max(w.x - o.x, 0, o.x - (w.x + w.width));
          const dy = Math.max(w.y - o.y, 0, o.y - (w.y + w.height));
          expect(Math.hypot(dx, dy), `${l.name} obstacle clear of wall`).toBeGreaterThan(r);
        }
      }
      // the biggest mote the bag can hand out must still fit between narrowed sides
      const [lo, hi] = dropRange(tierRadiusPx(Math.max(...DROPPABLE_TIERS)), l.walls);
      expect(hi - lo, `${l.name} drop range`).toBeGreaterThan(40);
    }
  });

  it('keeps every Mistvale Marsh level foggy and fog out of the other lands so far', () => {
    for (const l of LEVELS) expect(l.previewCount === 0, l.name).toBe(l.land === 'mistvale-marsh');
  });

  it('gives every land with levels a closing boss that asks for more than its opener', () => {
    const tierOf = (l: (typeof LEVELS)[number]) =>
      l.goals.find((g) => g.type === 'reachTier')?.tier ?? 0;
    for (const land of [
      'thistledown-hills',
      'copperleaf-orchard',
      'emberpeak',
      'cloudspire-isles',
      'neonoko-city',
    ] as const) {
      const levels = LEVELS.filter((l) => l.land === land);
      expect(levels).toHaveLength(3);
      expect(tierOf(levels[2]!)).toBeGreaterThan(tierOf(levels[0]!));
    }
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
