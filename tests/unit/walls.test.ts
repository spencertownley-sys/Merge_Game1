// Shaped-box geometry shared by the sim and the renderer (JOURNEY_PLAN.md §2.4).
import { describe, expect, it } from 'vitest';
import { clampDropX, dropRange, landingOnWalls } from '../../src/engine/walls';

const narrowed = [
  { x: 0, y: 0, width: 45, height: 520 },
  { x: 355, y: 0, width: 45, height: 520 },
];
const pillar = [{ x: 188, y: 330, width: 24, height: 190 }];

describe('shaped boxes', () => {
  it('narrows the drop range only for blocks that reach the drop rail', () => {
    expect(dropRange(10)).toEqual([10, 390]);
    expect(dropRange(10, narrowed)).toEqual([55, 345]);
    expect(dropRange(10, pillar)).toEqual([10, 390]);
    expect(clampDropX(0, 10, narrowed)).toBe(55);
    expect(clampDropX(999, 10, narrowed)).toBe(345);
  });

  it('lands a falling mote on top of a pillar, or misses it', () => {
    expect(landingOnWalls(200, 20, pillar)).toBe(310);
    expect(landingOnWalls(100, 20, pillar)).toBe(Infinity);
    // grazing the corner rests a little lower than the flat top
    const corner = landingOnWalls(188 - 10, 20, pillar);
    expect(corner).toBeGreaterThan(310);
    expect(corner).toBeLessThan(330);
  });
});
