import { expect, test } from '@playwright/test';

const overviewPath = '/workspaces/fixture-workspace/kubernetes-clusters/fixture-cluster/overview';

test('cluster overview exposes coherent headings and accessible metric data', async ({ page }) => {
  await page.goto(overviewPath, { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { level: 1, name: 'Cluster Overview' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Current Issues' })).toBeVisible();
  await expect(page.locator('h3:visible').filter({ hasText: 'Payments worker is restarting' })).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 2, name: 'CPU Usage' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Memory' })).toBeVisible();

  const metricTables = page.locator('table.sr-only');
  await expect(metricTables).toHaveCount(2);
  await expect(metricTables.nth(0).locator('caption')).toHaveText('CPU Usage data');
  await expect(metricTables.nth(0).locator('tbody tr')).toHaveCount(2);
  await expect(metricTables.nth(1).locator('caption')).toHaveText('Memory data');
  await expect(page.locator('svg[role="img"][aria-label="CPU Usage"]')).toHaveCount(0);
});

test('cluster overview reports telemetry history failures with retry', async ({ page }) => {
  await page.goto(`${overviewPath}?fixtureFailurePath=fixture-cluster%2Fmetrics%2Fhistory`, { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { level: 1, name: 'Cluster Overview' })).toBeVisible();
  const alert = page.getByRole('alert').filter({ hasText: 'Telemetry history unavailable' });
  await expect(alert).toBeVisible();
  await expect(alert.getByRole('button', { name: 'Retry' })).toBeVisible();
  await expect(page.getByText('No telemetry history')).toHaveCount(0);
});

test('cluster overview announces issue-detail failures with retry', async ({ page }) => {
  await page.goto(`${overviewPath}?fixtureFailurePath=targets%2Ffixture-cluster%2Fissues`, { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { level: 1, name: 'Cluster Overview' })).toBeVisible();
  const alert = page.getByRole('alert').filter({ hasText: 'Issue details unavailable' });
  await expect(alert).toBeVisible();
  await expect(alert.getByRole('button', { name: 'Retry' })).toBeVisible();
  await expect(page.getByText('No current issues')).toHaveCount(0);
});

test('cluster overview remains usable in a narrow dark viewport', async ({ browser }) => {
  const page = await browser.newPage({
    colorScheme: 'dark',
    reducedMotion: 'reduce',
    viewport: { width: 390, height: 844 }
  });
  await page.addInitScript(() => {
    window.localStorage.setItem('acornops_active_theme_preference', 'dark');
  });
  await page.goto(overviewPath, { waitUntil: 'domcontentloaded' });

  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.getByRole('heading', { level: 1, name: 'Cluster Overview' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  const undersizedControls = await page.locator('a:visible, button:visible').evaluateAll((controls) => controls
    .map((control) => {
      const rect = control.getBoundingClientRect();
      return { height: rect.height, text: control.textContent?.trim() || '', width: rect.width };
    })
    .filter((control) => control.height < 44 || control.width < 44));
  expect(undersizedControls).toEqual([]);

  await page.close();
});
