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
  const attentionBoard = page.locator('[data-attention-board="true"]');

  await expect(page.getByRole('button', { name: 'Open assistant' }).first()).toBeVisible();
  await expect(attentionBoard.getByText('Active', { exact: true })).toHaveCount(0);
  await expect(attentionBoard.locator('[data-target-type-icon="true"]').first()).toHaveAttribute('title', 'Kubernetes cluster');
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

test('workspace overview keeps the desktop assistant beside the main content', async ({ page }) => {
  await page.goto(overviewPath, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-attention-board="true"] article')).toHaveCount(2);
  await page.getByRole('button', { name: 'Open assistant' }).first().click();

  const main = page.locator('main');
  const assistant = page.getByRole('complementary', { name: 'Cluster Assistant' });
  const assistantChatSurface = assistant.locator('[data-target-chat-surface="true"]');
  const recentActivityDialog = page.getByRole('dialog', { name: 'Choose how to continue' });
  await expect(assistant).toBeVisible();
  await expect(assistantChatSurface).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Workspace Overview', includeHidden: true })).toBeVisible();
  await expect(recentActivityDialog).toBeVisible();

  const [mainBox, assistantBox, assistantChatSurfaceBox, recentActivityDialogBox] = await Promise.all([
    main.boundingBox(),
    assistant.boundingBox(),
    assistantChatSurface.boundingBox(),
    recentActivityDialog.boundingBox()
  ]);
  expect(mainBox).not.toBeNull();
  expect(assistantBox).not.toBeNull();
  expect(assistantChatSurfaceBox).not.toBeNull();
  expect(recentActivityDialogBox).not.toBeNull();
  if (!mainBox || !assistantBox || !assistantChatSurfaceBox || !recentActivityDialogBox) {
    throw new Error('Workspace overview, assistant surfaces, and recent-activity dialog must all have layout boxes');
  }
  expect(mainBox.x + mainBox.width).toBeLessThanOrEqual(assistantBox.x + 1);
  expect(mainBox.width).toBeGreaterThan(assistantBox.width);
  expect(assistantChatSurfaceBox.height).toBeCloseTo(assistantBox.height, 0);
  expect(recentActivityDialogBox.x).toBeGreaterThanOrEqual(assistantBox.x);
  expect(recentActivityDialogBox.x + recentActivityDialogBox.width).toBeLessThanOrEqual(assistantBox.x + assistantBox.width);
  expect(await recentActivityDialog.evaluate((element) => Boolean(element.closest('[data-target-chat-surface="true"]')))).toBe(true);
});

test('desktop assistant keeps the capability preview within the dock', async ({ page }) => {
  await page.goto(overviewPath, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Open assistant' }).first().click();

  const assistant = page.getByRole('complementary', { name: 'Cluster Assistant' });
  await expect(assistant).toBeVisible();
  const recentActivityDialog = page.getByRole('dialog', { name: 'Choose how to continue' });
  await expect(recentActivityDialog).toBeVisible();
  await recentActivityDialog.getByRole('button', { name: 'Open conversation' }).click();
  await expect(recentActivityDialog).toBeHidden();

  const capabilityPreviewButton = assistant.locator('[data-assistant-capability-preview-trigger="true"]');
  await expect(capabilityPreviewButton).toBeVisible();
  await expect(capabilityPreviewButton).toHaveAccessibleName(/Assistant capabilities/);
  await capabilityPreviewButton.click();
  const capabilityPreviewId = await capabilityPreviewButton.getAttribute('aria-controls');
  if (!capabilityPreviewId) throw new Error('The capability preview trigger must identify its popover');
  const capabilityPreview = page.locator(`#${capabilityPreviewId}`);
  await expect(capabilityPreview).toBeVisible();
  const capabilityPreviewBox = await capabilityPreview.boundingBox();
  const assistantBox = await assistant.boundingBox();
  expect(capabilityPreviewBox).not.toBeNull();
  expect(assistantBox).not.toBeNull();
  if (!capabilityPreviewBox || !assistantBox) {
    throw new Error('The capability preview and assistant dock must have layout boxes');
  }
  expect(capabilityPreviewBox.x).toBeGreaterThanOrEqual(assistantBox.x);
  expect(capabilityPreviewBox.x + capabilityPreviewBox.width).toBeLessThanOrEqual(assistantBox.x + assistantBox.width);
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

  await page.getByRole('button', { name: 'Open assistant' }).first().click();
  await expect(page.getByRole('dialog', { name: 'Cluster Assistant' })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Cluster Assistant' })).toHaveCount(0);

  await page.close();
});
