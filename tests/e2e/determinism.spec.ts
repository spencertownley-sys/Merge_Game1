// CLAUDE.md Step 9: the determinism test green across at least Chromium and WebKit. The
// dev-only ?debug=determinism harness runs the real GameSim twice with the same seed and
// input log inside the browser and reports whether the results are identical.
import { expect, test } from '@playwright/test';

test('the same seed and input log replay identically in this browser', async ({
  page,
  browserName,
}) => {
  test.setTimeout(120_000);
  await page.goto('/?debug=determinism');
  await page.waitForFunction(() => Boolean(window.__determinism), null, { timeout: 90_000 });
  const result = await page.evaluate(() => window.__determinism!);
  expect(result, JSON.stringify(result)).not.toHaveProperty('error');
  if ('error' in result) return;
  console.log(
    `[determinism] ${browserName}: hash ${result.hashA} balls=${result.balls} score=${result.score} merges=${result.merges}`,
  );
  expect(result.equal).toBe(true);
  expect(result.hashA).toBe(result.hashB);
  expect(result.merges).toBeGreaterThan(0);
  expect(result.balls).toBeGreaterThan(0);
});
