import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/fixtures',
  outputDir: './test-results/fixtures',
  fullyParallel: true,
  workers: 2,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 20_000 },
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:4186',
    browserName: 'chromium',
    headless: true,
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    viewport: { width: 1440, height: 1000 },
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/usr/bin/google-chrome'
    }
  },
  webServer: {
    command: 'VITE_APP_DATA_MODE=mock VITE_CONTROL_PLANE_API_BASE_URL=http://127.0.0.1:59999 npm run dev -- --host 127.0.0.1 --port 4186 --strictPort',
    url: 'http://127.0.0.1:4186',
    reuseExistingServer: false,
    timeout: 120_000
  }
});
