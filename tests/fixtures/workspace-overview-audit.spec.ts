import { expect, test } from '@playwright/test';

const overviewPath = '/workspaces/fixture-workspace/overview';

test('workspace overview exposes real links with a coherent heading structure', async ({ page }) => {
  await page.goto(overviewPath, { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { level: 1, name: 'Workspace Overview' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'What needs attention now' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Kubernetes clusters' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Virtual machines' })).toBeVisible();

  const clusterLink = page.locator('[data-connected-targets="true"] a').filter({ hasText: 'Singapore Production' });
  const virtualMachineLink = page.locator('[data-connected-targets="true"] a').filter({ hasText: 'Payments VM' });
  const issueLink = page.getByRole('link', { name: 'View More' }).first();

  await expect(clusterLink).toHaveAttribute('href', '/workspaces/fixture-workspace/kubernetes-clusters/fixture-cluster');
  await expect(virtualMachineLink).toHaveAttribute('href', '/workspaces/fixture-workspace/virtual-machines/fixture-vm');
  await expect(issueLink).toHaveAttribute('href', '/workspaces/fixture-workspace/kubernetes-clusters/fixture-cluster');
  await clusterLink.focus();
  await expect(clusterLink).toBeFocused();
});

test('workspace overview reports collection failures without presenting empty-state success', async ({ page }) => {
  const failurePath = encodeURIComponent('/issues,/virtual-machines');
  await page.goto(`${overviewPath}?fixtureFailurePath=${failurePath}`, { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('alert')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Retry' })).toHaveCount(2);
  await expect(page.getByText('Nothing urgent right now')).toHaveCount(0);
  await expect(page.getByText('No connected virtual machines')).toHaveCount(0);
});

test('workspace overview remains usable in a narrow dark viewport', async ({ browser }) => {
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
  await expect(page.getByRole('heading', { level: 1, name: 'Workspace Overview' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  const undersizedControls = await page.locator(
    '[data-attention-board="true"] a:visible, [data-attention-board="true"] button:visible, [data-connected-targets="true"] a:visible'
  ).evaluateAll((controls) => controls
    .map((control) => {
      const rect = control.getBoundingClientRect();
      return { height: rect.height, text: control.textContent?.trim() || '', width: rect.width };
    })
    .filter((control) => control.height < 44 || control.width < 44));
  expect(undersizedControls).toEqual([]);

  await page.close();
});
