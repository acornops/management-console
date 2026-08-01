import { expect, test } from '@playwright/test';

const overviewPath = '/workspaces/fixture-workspace/kubernetes-clusters/fixture-cluster/overview';

test('cluster issue table keeps header and body cell padding aligned at wide widths', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto(overviewPath, { waitUntil: 'domcontentloaded' });

  const issueTable = page.getByRole('table', { name: 'Open Issues' });
  const issueHeader = issueTable.getByRole('columnheader', { name: 'Issue' });
  const issueCell = issueTable.getByRole('cell').first();
  await expect(issueHeader).toBeVisible();
  await expect(issueCell).toBeVisible();
  await expect(issueTable.getByText('Active', { exact: true })).toHaveCount(0);

  const [headerPadding, cellPadding] = await Promise.all([
    issueHeader.evaluate((element) => getComputedStyle(element).paddingInline),
    issueCell.evaluate((element) => getComputedStyle(element).paddingInline)
  ]);
  expect(cellPadding).toBe(headerPadding);
});

test('cluster overview exposes coherent headings and accessible metric data', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(overviewPath, { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { level: 1, name: 'Cluster Overview' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Open Issues' })).toBeVisible();
  await expect(page.locator('h3:visible').filter({ hasText: 'Payments worker is restarting' })).toHaveCount(1);
  await expect(page.getByText('1 issue', { exact: true })).toBeVisible();
  await expect(page.getByText('1 critical issue', { exact: true })).toBeVisible();
  await expect(page.getByText('Review 1 active or recovering issue. Prioritize critical issues before warnings.', { exact: true })).toBeVisible();
  const issueRow = page.getByRole('row').filter({ hasText: 'Payments worker is restarting' });
  await expect(issueRow).toBeHidden();
  const issueCard = page.getByRole('article').filter({ hasText: 'Payments worker is restarting' });
  await expect(issueCard.getByText('Active', { exact: true })).toHaveCount(0);
  await expect(issueCard.getByText('production', { exact: true })).toBeVisible();
  const assistantButton = issueCard.getByRole('button', { name: 'Open assistant' });
  await expect(assistantButton).toBeVisible();
  const assistantButtonBox = await assistantButton.boundingBox();
  expect(assistantButtonBox).not.toBeNull();
  if (!assistantButtonBox) throw new Error('Open assistant button has no layout box');
  expect(assistantButtonBox.x + assistantButtonBox.width).toBeLessThanOrEqual(1280);
  await expect(page.getByRole('heading', { level: 2, name: 'CPU Usage' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Memory' })).toBeVisible();

  const metricTables = page.locator('.sr-only table');
  await expect(metricTables).toHaveCount(2);
  await expect(metricTables.nth(0).locator('caption')).toHaveText('CPU Usage data');
  await expect(metricTables.nth(0).locator('tbody tr')).toHaveCount(2);
  await expect(metricTables.nth(1).locator('caption')).toHaveText('Memory data');
  await expect(page.locator('svg[role="img"][aria-label="CPU Usage"]')).toHaveCount(0);

  await assistantButton.click();
  await expect(page.getByRole('complementary', { name: 'Cluster Assistant' })).toBeVisible();
});

test('cluster resources keep transient Pending visible without adding a durable issue', async ({ page }) => {
  await page.goto(overviewPath, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('1 issue', { exact: true })).toBeVisible();

  await page.goto('/workspaces/fixture-workspace/kubernetes-clusters/fixture-cluster/resources', {
    waitUntil: 'domcontentloaded'
  });

  await expect(page.getByText('checkout-api-6f8c7d9d4c-rollout', { exact: true })).toBeVisible();
  await expect(page.getByText('Pending', { exact: true })).toBeVisible();
});

test('cluster overview reports telemetry history failures with retry', async ({ page }) => {
  await page.goto(`${overviewPath}?fixtureFailurePath=fixture-cluster%2Fmetrics%2Fhistory`, { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { level: 1, name: 'Cluster Overview' })).toBeVisible();
  const alert = page.getByRole('status').filter({ hasText: 'Telemetry history unavailable' });
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
