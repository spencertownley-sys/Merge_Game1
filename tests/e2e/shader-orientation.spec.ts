// CLAUDE.md Step 4 acceptance test / game design §9.3 assumption note:
//  1. with uRot = I the core art renders upright and unmirrored (quadrants match a plain
//     Pixi Sprite of the same texture), with the centre the brightest, sharpest part;
//  2. positive yaw moves the "face" toward screen-right;
//  3. positive body angle (Pixi clockwise) rotates the face clockwise.
import { expect, test, type Page } from '@playwright/test';

type Px = [number, number, number, number];

async function read(page: Page, x: number, y: number): Promise<Px> {
  return page.evaluate(([px, py]) => window.__shaderTest!.readPixel(px, py), [x, y]);
}

function dominant([r, g, b]: Px): 'red' | 'green' | 'blue' | 'yellow' | 'white' | 'other' {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max > 140 && max - min < 45) return 'white';
  if (r > g + 40 && r > b + 40) return 'red';
  if (g > r + 40 && g > b + 40) return 'green';
  if (b > r + 40 && b > g + 40) return 'blue';
  if (r > b + 40 && g > b + 40) return 'yellow';
  return 'other';
}

test.describe('gummy ball shader orientation', () => {
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'WebGL readback harness runs on Chromium only',
  );

  test.beforeEach(async ({ page }) => {
    await page.goto('/?debug=shader');
    await page.waitForFunction(() => Boolean(window.__shaderTest));
  });

  test('identity rotation renders upright and unmirrored, matching a plain sprite', async ({
    page,
  }) => {
    const L = await page.evaluate(() => window.__shaderTest!.layout);
    const q = L.ballR * 0.45;
    const s = L.spriteSize * 0.25;
    const pairs: [string, number, number, number, number][] = [
      ['top-left', L.ballCx - q, L.ballCy - q, L.spriteX + s, L.spriteY + s],
      ['top-right', L.ballCx + q, L.ballCy - q, L.spriteX + 3 * s, L.spriteY + s],
      ['bottom-left', L.ballCx - q, L.ballCy + q, L.spriteX + s, L.spriteY + 3 * s],
      ['bottom-right', L.ballCx + q, L.ballCy + q, L.spriteX + 3 * s, L.spriteY + 3 * s],
    ];
    for (const [name, bx, by, sx, sy] of pairs) {
      const ball = dominant(await read(page, bx, by));
      const sprite = dominant(await read(page, sx, sy));
      expect(sprite, `sprite ${name} sanity`).not.toBe('other');
      expect(ball, `ball ${name} quadrant`).toBe(sprite);
    }
    // centre is the white disc: bright and neutral
    const centre = await read(page, L.ballCx, L.ballCy);
    expect(dominant(centre)).toBe('white');
  });

  test('positive yaw moves the face toward screen-right', async ({ page }) => {
    const L = await page.evaluate(() => window.__shaderTest!.layout);
    // Locate the white disc (the face's centre) by scanning the ball's middle row for the
    // brightness-weighted centroid of "white" samples.
    const discCentreX = async () => {
      let sum = 0;
      let weight = 0;
      for (let i = -32; i <= 32; i++) {
        const x = L.ballCx + (i / 40) * L.ballR;
        const p = await read(page, Math.round(x), L.ballCy);
        if (dominant(p) === 'white') {
          const w = p[0] + p[1] + p[2];
          sum += x * w;
          weight += w;
        }
      }
      expect(weight, 'found the white disc').toBeGreaterThan(0);
      return sum / weight;
    };
    const before = await discCentreX();
    expect(Math.abs(before - L.ballCx)).toBeLessThan(L.ballR * 0.08);
    await page.evaluate(() => window.__shaderTest!.setYaw(0.35));
    const after = await discCentreX();
    expect(after - before).toBeGreaterThan(L.ballR * 0.15);
    await page.evaluate(() => window.__shaderTest!.setYaw(0));
  });

  test('positive body angle rotates the face clockwise on screen', async ({ page }) => {
    const L = await page.evaluate(() => window.__shaderTest!.layout);
    const q = L.ballR * 0.45;
    await page.evaluate(() => window.__shaderTest!.setAngle(Math.PI / 2));
    // 90° clockwise: the texture's top-left (red) quadrant lands at screen top-right.
    expect(dominant(await read(page, L.ballCx + q, L.ballCy - q))).toBe('red');
    expect(dominant(await read(page, L.ballCx + q, L.ballCy + q))).toBe('green');
    await page.evaluate(() => window.__shaderTest!.setAngle(0));
  });
});
