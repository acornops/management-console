import { defineConfig } from '@playwright/test';

const chromiumExecutablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const snapshotDirectory = process.platform === 'linux' ? '__snapshots__/linux' : '__snapshots__';

export default defineConfig({
  testDir: './tests/design-system',
  outputDir: './test-results/design-system',
  snapshotPathTemplate: `{testDir}/${snapshotDirectory}/{projectName}/{arg}{ext}`,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.platform === 'darwin' ? 1 : undefined,
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:4177',
    browserName: 'chromium',
    headless: true,
    reducedMotion: 'reduce',
    launchOptions: chromiumExecutablePath ? { executablePath: chromiumExecutablePath } : {}
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } }
  ],
  webServer: {
    command: 'VITE_APP_DATA_MODE=control-plane VITE_UI_SOURCE_MODE=1 npm run dev -- --host 127.0.0.1 --port 4177',
    url: 'http://127.0.0.1:4177/design-system.html',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
