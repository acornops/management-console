import { defineConfig } from '@playwright/test';

const chromiumExecutablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const appPort = Number(process.env.MCP_PARITY_APP_PORT || 4187);
const apiPort = Number(process.env.MCP_PARITY_API_PORT || 4190);

for (const [name, port] of [['MCP_PARITY_APP_PORT', appPort], ['MCP_PARITY_API_PORT', apiPort]] as const) {
  if (!Number.isInteger(port) || port < 1024 || port > 65_535) {
    throw new Error(`${name} must be an integer between 1024 and 65535.`);
  }
}

const appBaseUrl = `http://127.0.0.1:${appPort}`;
const apiBaseUrl = `http://127.0.0.1:${apiPort}`;

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
    baseURL: appBaseUrl,
    browserName: 'chromium',
    headless: true,
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    viewport: { width: 1440, height: 1000 },
    launchOptions: chromiumExecutablePath ? { executablePath: chromiumExecutablePath } : {}
  },
  webServer: [
    {
      command: 'node tests/fixtures/start-control-plane-stub.mjs',
      url: `${apiBaseUrl}/api/v1/auth/config`,
      reuseExistingServer: false,
      timeout: 120_000
    },
    {
      command: `VITE_APP_DATA_MODE=control-plane VITE_UI_SOURCE_MODE=1 VITE_CONTROL_PLANE_API_BASE_URL=${apiBaseUrl} npm run dev -- --host 127.0.0.1 --port ${appPort} --strictPort`,
      url: appBaseUrl,
      reuseExistingServer: false,
      timeout: 120_000
    }
  ]
});
