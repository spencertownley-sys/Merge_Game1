// CLAUDE.md Step 9 E2E: complete a Journey level (level 1: reach tier 4), see stars, and
// find level 2 unlocked on the map afterwards.
import { expect, test } from '@playwright/test';

test('completing Journey level 1 awards stars and unlocks level 2', async ({ page }) => {
  test.setTimeout(150_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Journey' }).click();
  await expect(page.getByTestId('journey-map')).toBeVisible();
  await expect(page.getByTestId('level-2')).toBeDisabled();
  await page.getByTestId('level-1').click();
  await page.getByTestId('start-level').click();

  const canvas = page.locator('canvas').first();
  await expect(canvas).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('warming-up')).toBeHidden({ timeout: 30_000 });
  await expect(page.getByTestId('goal-strip')).toBeVisible();

  const box = (await canvas.boundingBox())!;
  const deadline = Date.now() + 110_000;
  let i = 0;
  while (Date.now() < deadline) {
    if (await page.getByTestId('results-title').isVisible()) break;
    // Alternate around the centre so same-tier motes meet.
    const x = box.x + box.width * (0.5 + 0.08 * ((i % 3) - 1));
    const y = box.y + box.height * 0.5;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 2, y);
    await page.mouse.up();
    i++;
    await page.waitForTimeout(470);
  }
  await expect(page.getByTestId('results-title')).toHaveText('Light restored!');
  await expect(page.getByTestId('results-primary')).toHaveText('Next level');
  expect(errors, errors.join('\n')).toEqual([]);

  // Back on the map, level 2 is now playable and level 1 shows stars.
  await page.getByRole('button', { name: 'Menu' }).click();
  await expect(page.getByTestId('journey-map')).toBeVisible();
  await expect(page.getByTestId('level-2')).toBeEnabled();
  await expect(page.getByTestId('level-1')).toContainText('★');
});
