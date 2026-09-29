import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

// Use a preinstalled Chromium when one is provided (e.g. the remote dev container exposes
// /opt/pw-browsers/chromium); otherwise Playwright's own download is used.
const chromiumPath = process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/opt/pw-browsers/chromium';
const executablePath = existsSync(chromiumPath) ? chromiumPath : undefined;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          executablePath,
          args: [
            '--use-angle=swiftshader',
            '--enable-unsafe-swiftshader',
            '--ignore-gpu-blocklist',
          ],
        },
      },
    },
    // WebKit needs `npx playwright install webkit`; opt in with E2E_WEBKIT=1 (Step 9 asks for
    // the determinism/E2E pass on both Chromium and WebKit).
    ...(process.env.E2E_WEBKIT
      ? [
          {
            name: 'mobile-webkit',
            use: { ...devices['iPhone 13'] },
          },
        ]
      : []),
  ],
});
