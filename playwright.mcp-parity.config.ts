import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/mcp-parity',
  outputDir: './test-results/mcp-parity',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:4187',
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
  webServer: [
    {
      command: 'node tests/fixtures/start-control-plane-stub.mjs',
      url: 'http://127.0.0.1:4190/api/v1/auth/config',
      reuseExistingServer: false,
      timeout: 120_000
    },
    {
      command: 'VITE_APP_DATA_MODE=control-plane VITE_CONTROL_PLANE_API_BASE_URL=http://127.0.0.1:4190 npm run dev -- --host 127.0.0.1 --port 4187 --strictPort',
      url: 'http://127.0.0.1:4187',
      reuseExistingServer: false,
      timeout: 120_000
    }
  ]
});
