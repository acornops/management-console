import { defineConfig } from '@playwright/test';

const chromiumExecutablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const fixtureAppPort = Number(process.env.FIXTURE_APP_PORT || 4186);

if (!Number.isInteger(fixtureAppPort) || fixtureAppPort < 1024 || fixtureAppPort > 65_535) {
  throw new Error('FIXTURE_APP_PORT must be an integer between 1024 and 65535.');
}

const fixtureBaseUrl = `http://127.0.0.1:${fixtureAppPort}`;

export default defineConfig({
  testDir: './tests/fixtures',
  outputDir: './test-results/fixtures',
  fullyParallel: true,
  workers: process.platform === 'darwin' ? 1 : 2,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 20_000 },
  reporter: 'line',
  use: {
    baseURL: fixtureBaseUrl,
    browserName: 'chromium',
    headless: true,
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    viewport: { width: 1440, height: 1000 },
    launchOptions: chromiumExecutablePath ? { executablePath: chromiumExecutablePath } : {}
  },
  webServer: {
    command: `VITE_APP_DATA_MODE=mock VITE_UI_SOURCE_MODE=1 VITE_CONTROL_PLANE_API_BASE_URL=http://127.0.0.1:59999 npm run dev -- --host 127.0.0.1 --port ${fixtureAppPort} --strictPort`,
    url: fixtureBaseUrl,
    reuseExistingServer: process.env.FIXTURE_REUSE_SERVER === '1',
    timeout: 120_000
  }
});
