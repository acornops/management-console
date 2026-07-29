import { defineConfig } from '@playwright/test';

const chromiumExecutablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const snapshotDirectory = process.platform === 'linux' ? '__snapshots__/linux' : '__snapshots__';

export default defineConfig({
  testDir: './tests/design-routes',
  outputDir: './test-results/design-routes',
  snapshotPathTemplate: `{testDir}/${snapshotDirectory}/{projectName}/{arg}{ext}`,
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:4188',
    browserName: 'chromium',
    headless: true,
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: chromiumExecutablePath ? { executablePath: chromiumExecutablePath } : {}
  },
  projects: [
    {
      name: 'desktop-light',
      use: { viewport: { width: 1600, height: 1000 }, colorScheme: 'light' }
    },
    {
      name: 'desktop-dark',
      use: { viewport: { width: 1600, height: 1000 }, colorScheme: 'dark' }
    },
    {
      name: 'mobile-light',
      use: {
        viewport: { width: 390, height: 844 },
        colorScheme: 'light',
        isMobile: true,
        hasTouch: true
      }
    },
    {
      name: 'mobile-dark',
      use: {
        viewport: { width: 390, height: 844 },
        colorScheme: 'dark',
        isMobile: true,
        hasTouch: true
      }
    }
  ],
  webServer: {
    command: 'VITE_APP_DATA_MODE=mock VITE_CONTROL_PLANE_API_BASE_URL=http://127.0.0.1:59999 npm run dev -- --host 127.0.0.1 --port 4188 --strictPort',
    url: 'http://127.0.0.1:4188',
    reuseExistingServer: false,
    timeout: 120_000
  }
});
