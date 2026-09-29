// CLAUDE.md Step 5 smoke test: play a full Classic run start to game-over with no console
// errors, then land on the results screen.
import { expect, test } from '@playwright/test';

test('a full Classic run reaches the results screen with no console errors', async ({ page }) => {
  test.setTimeout(150_000);
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

  // ?debug=fill drops only tier-5 motes so the board overflows within a minute.
  await page.goto('/?debug=fill');
  await expect(page.getByTestId('best-score')).toBeVisible();
  await page.getByTestId('play-classic').click();
  const canvas = page.locator('canvas').first();
  await expect(canvas).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('warming-up')).toBeHidden({ timeout: 30_000 });

  const box = (await canvas.boundingBox())!;
  // One centre column: the all-tier-5 bag consolidates into a tower that overflows in ~1 min.
  const columns = [0.5];
  let i = 0;
  const deadline = Date.now() + 110_000;
  while (Date.now() < deadline) {
    if (await page.getByTestId('results-title').isVisible()) break;
    const x = box.x + box.width * columns[i % columns.length];
    const y = box.y + box.height * 0.5;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 2, y);
    await page.mouse.up();
    i++;
    await page.waitForTimeout(470);
  }
  await expect(page.getByTestId('results-title')).toBeVisible();
  const score = Number(await page.getByTestId('final-score').textContent());
  expect(score).toBeGreaterThan(0);
  expect(errors, errors.join('\n')).toEqual([]);

  // Share falls back to a PNG download where the Web Share API is unavailable.
  const download = page.waitForEvent('download', { timeout: 20_000 });
  await page.getByTestId('share').click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/\.png$/);

  // Play again starts a fresh run.
  await page.getByTestId('results-primary').click();
  await expect(page.getByTestId('results-title')).toBeHidden();
  await expect(page.locator('canvas').first()).toBeVisible();
});
