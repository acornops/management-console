import { expect, test, type Locator } from '@playwright/test';

const overviewPath = '/workspaces/fixture-workspace/overview';
const sidebarPreferenceKey =
  'acornops_profile_preferences:test-user%40fixture.acornops.dev:sidebar_mode';

async function expectWorkspaceMenuAlignment(workspaceMenu: Locator) {
  await expect.poll(() => workspaceMenu.evaluate((panel) => Math.abs(
    panel.getBoundingClientRect().width - panel.offsetWidth
  ))).toBeLessThan(0.1);
  const workspaceOption = workspaceMenu.locator('[role="listitem"] button').first();
  const newWorkspace = workspaceMenu.getByRole('button', { name: 'New Workspace' });
  const workspaceIconBox = await workspaceOption.locator('[data-workspace-menu-icon="true"]').boundingBox();
  const workspaceTextBox = await workspaceOption.locator('span').last().boundingBox();
  const newIconBox = await newWorkspace.locator('[data-workspace-menu-icon="true"]').boundingBox();
  const newTextBox = await newWorkspace.locator('span').last().boundingBox();

  await expect(newWorkspace).toHaveCSS('justify-content', 'flex-start');
  expect(workspaceIconBox).not.toBeNull();
  expect(workspaceTextBox).not.toBeNull();
  expect(newIconBox).not.toBeNull();
  expect(newTextBox).not.toBeNull();
  if (!workspaceIconBox || !workspaceTextBox || !newIconBox || !newTextBox) {
    throw new Error('Workspace menu icons and labels need layout boxes');
  }

  expect(Math.abs(
    workspaceIconBox.y + workspaceIconBox.height / 2
      - (workspaceTextBox.y + workspaceTextBox.height / 2)
  )).toBeLessThanOrEqual(1);
  expect(Math.abs(
    newIconBox.y + newIconBox.height / 2
      - (newTextBox.y + newTextBox.height / 2)
  )).toBeLessThanOrEqual(1);
  expect(newIconBox.x).toBe(workspaceIconBox.x);
  expect(newTextBox.x).toBe(workspaceTextBox.x);
}

test('desktop sidebar collapse persists and keeps rail navigation accessible', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto(overviewPath, { waitUntil: 'domcontentloaded' });

  const sidebar = page.locator('.management-console-desktop-sidebar');
  const collapse = page.getByRole('button', { name: 'Collapse sidebar' });
  await expect(sidebar).toHaveAttribute('data-desktop-sidebar-mode', 'expanded');
  await expect(sidebar).toHaveCSS('width', '256px');
  await collapse.focus();
  await collapse.click();

  await expect(sidebar).toHaveAttribute('data-desktop-sidebar-mode', 'collapsed');
  await expect(sidebar).toHaveCSS('width', '64px');
  await expect(page.getByRole('button', { name: 'Expand sidebar' })).toBeFocused();
  await expect(page.getByRole('tooltip', { name: 'Expand sidebar' })).toBeVisible();
  const railIconCenters = await sidebar.locator(
    '[data-rail-align="true"], [data-rail-icon-slot="true"] svg'
  ).evaluateAll(
    (icons) => icons.map((icon) => {
      const box = icon.getBoundingClientRect();
      return Math.round((box.left + box.width / 2) * 100) / 100;
    })
  );
  expect(railIconCenters).toEqual(railIconCenters.map(() => railIconCenters[0]));
  await expect.poll(() => page.evaluate(
    (key) => window.localStorage.getItem(key),
    sidebarPreferenceKey
  )).toBe('collapsed');

  const overviewLink = sidebar.getByRole('link', { name: 'Overview' });
  await expect(overviewLink).toHaveAttribute('href', overviewPath);
  await overviewLink.focus();
  await expect(page.getByRole('tooltip', { name: 'Overview' })).toBeVisible();

  const workspaceSwitcher = sidebar.getByRole('button', { name: 'Select workspace' });
  await workspaceSwitcher.click();
  const workspaceMenu = page.locator('[data-sidebar-workspace-menu="true"]');
  await expect(workspaceMenu).toBeVisible();
  await expect(workspaceMenu).toHaveCSS('position', 'fixed');
  await expect(workspaceMenu).toHaveCSS('width', '288px');
  const sidebarBox = await sidebar.boundingBox();
  expect(sidebarBox).not.toBeNull();
  if (!sidebarBox) throw new Error('The sidebar needs a layout box');
  await expect.poll(async () => (await workspaceMenu.boundingBox())?.x)
    .toBeGreaterThanOrEqual(sidebarBox.x + sidebarBox.width + 7);
  const workspaceMenuBox = await workspaceMenu.boundingBox();
  expect(workspaceMenuBox).not.toBeNull();
  if (!workspaceMenuBox) throw new Error('The workspace menu needs a layout box');
  expect(workspaceMenuBox.x + workspaceMenuBox.width).toBeLessThanOrEqual(1592);
  expect(await page.evaluate(({ x, y }) => {
    const panel = document.querySelector('[data-sidebar-workspace-menu="true"]');
    const hit = document.elementFromPoint(x, y);
    return Boolean(panel && hit && panel.contains(hit));
  }, {
    x: workspaceMenuBox.x + workspaceMenuBox.width - 8,
    y: workspaceMenuBox.y + 16
  })).toBe(true);
  await expectWorkspaceMenuAlignment(workspaceMenu);
  await workspaceMenu.locator('[role="listitem"] button').first().click();
  await expect(workspaceMenu).toBeHidden();
  await expect(workspaceSwitcher).toBeFocused();

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(sidebar).toHaveAttribute('data-desktop-sidebar-mode', 'collapsed');
  await page.getByRole('button', { name: 'Expand sidebar' }).click();
  await expect(sidebar).toHaveCSS('width', '256px');
  await sidebar.getByRole('button', { name: 'Select workspace' }).click();
  await expect(workspaceMenu).toBeVisible();
  await expectWorkspaceMenuAlignment(workspaceMenu);
  await page.keyboard.press('Escape');
  await expect(workspaceMenu).toBeHidden();
});

test('the 1200px boundary switches between persistent and overlay navigation', async ({ page }) => {
  await page.setViewportSize({ width: 1199, height: 800 });
  await page.goto(overviewPath, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'Open navigation menu' })).toBeVisible();
  await expect(page.locator('.management-console-desktop-sidebar')).toBeHidden();

  await page.setViewportSize({ width: 1200, height: 800 });
  await expect(page.getByRole('button', { name: 'Open navigation menu' })).toBeHidden();
  await expect(page.locator('.management-console-desktop-sidebar')).toBeVisible();
});

test('short desktop viewports preserve navigation rhythm and scroll destinations independently', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto(overviewPath, { waitUntil: 'domcontentloaded' });

  const sidebar = page.locator('.management-console-desktop-sidebar');
  const navigation = sidebar.getByRole('navigation', { name: 'Workspace navigation' });
  const clusters = sidebar.getByRole('link', { name: 'Kubernetes Clusters' });
  const virtualMachines = sidebar.getByRole('link', { name: 'Virtual Machines' });
  const webhooks = sidebar.getByRole('link', { name: 'Webhooks' });
  const governanceTitle = sidebar.getByText('Governance', { exact: true });
  const approvals = sidebar.getByRole('link', { name: 'Approvals' });
  const workspaceSettings = sidebar.getByRole('link', { name: 'Workspace Settings' });
  const rowCadence = async () => {
    const clusterTop = await clusters.evaluate((element) => element.getBoundingClientRect().top);
    const virtualMachineTop = await virtualMachines.evaluate((element) => element.getBoundingClientRect().top);
    return Math.round((virtualMachineTop - clusterTop) * 100) / 100;
  };

  await expect(clusters).toBeVisible();
  await expect(virtualMachines).toBeVisible();
  await expect(approvals).toBeVisible();
  await expect(workspaceSettings).toBeVisible();
  expect(await rowCadence()).toBe(44);

  await page.setViewportSize({ width: 1600, height: 700 });
  await expect(clusters).toBeVisible();
  await expect(virtualMachines).toBeVisible();
  await expect(approvals).toBeVisible();
  await expect(approvals.locator('[data-nav-count-badge="default"]')).toHaveAttribute('aria-label', '1');
  expect(await rowCadence()).toBe(44);
  const webhooksBox = await webhooks.boundingBox();
  const governanceTitleBox = await governanceTitle.boundingBox();
  const approvalsBox = await approvals.boundingBox();
  expect(webhooksBox).not.toBeNull();
  expect(governanceTitleBox).not.toBeNull();
  expect(approvalsBox).not.toBeNull();
  if (!webhooksBox || !governanceTitleBox || !approvalsBox) {
    throw new Error('Short-viewport group title spacing needs layout boxes');
  }
  expect(governanceTitleBox.y - (webhooksBox.y + webhooksBox.height)).toBe(22);
  expect(approvalsBox.y - (governanceTitleBox.y + governanceTitleBox.height)).toBe(8);
  await expect.poll(() => navigation.evaluate((element) => element.scrollHeight - element.clientHeight))
    .toBeGreaterThan(1);

  await workspaceSettings.scrollIntoViewIfNeeded();
  await expect(workspaceSettings).toBeInViewport();

  await expect(approvals).toHaveAttribute('href', '/workspaces/fixture-workspace/approvals');
  await expect(workspaceSettings).toHaveAttribute('href', '/workspaces/fixture-workspace/settings');

  await page.getByRole('button', { name: 'Collapse sidebar' }).click();
  await expect(approvals.locator('[data-nav-count-badge="compact"]')).toHaveAttribute('aria-label', '1');
  expect(await rowCadence()).toBe(42);
});

test('collapsed rail controls and identities share one centerline', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.addInitScript(([key, value]) => window.localStorage.setItem(key, value), [
    sidebarPreferenceKey,
    'collapsed'
  ]);
  await page.goto('/workspaces/fixture-workspace/agents/fixture-specialist/chat', {
    waitUntil: 'domcontentloaded'
  });

  const sidebar = page.locator('.management-console-desktop-sidebar');
  const identity = sidebar.locator('[data-desktop-sidebar-active-identity="agent"]');
  await expect(sidebar).toHaveCSS('width', '64px');
  await expect(identity).toBeVisible();
  await expect(identity).not.toContainText('…');
  expect((await identity.textContent())?.trim().length).toBeLessThanOrEqual(2);

  const centers = await sidebar.locator(
    '[data-rail-align="true"], [data-rail-icon-slot="true"] svg'
  ).evaluateAll((elements) => elements.map((element) => {
    const box = element.getBoundingClientRect();
    return Math.round((box.left + box.width / 2) * 100) / 100;
  }));
  expect(centers).toEqual(centers.map(() => centers[0]));

  await identity.hover();
  await expect(page.getByRole('tooltip')).toBeVisible();
});

test('collapsed rail count badges stay small, circular, and inside the rail', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.addInitScript(([key, value]) => window.localStorage.setItem(key, value), [
    sidebarPreferenceKey,
    'collapsed'
  ]);
  await page.goto('/kubernetes-clusters/fixture-cluster/overview', {
    waitUntil: 'domcontentloaded'
  });

  const sidebar = page.locator('.management-console-desktop-sidebar');
  const badge = sidebar.locator('[data-nav-count-badge="compact"]').first();
  const backControl = sidebar.locator('[data-rail-context-control="back"]');
  const identity = sidebar.locator('[data-desktop-sidebar-active-identity="cluster"]');
  await expect(badge).toBeVisible();
  await expect(backControl).toHaveCSS('width', '32px');
  await expect(backControl).toHaveCSS('height', '32px');
  await expect(identity).toHaveCSS('width', '32px');
  await expect(identity).toHaveCSS('height', '32px');
  await expect(badge).toHaveCSS('width', '20px');
  await expect(badge).toHaveCSS('height', '20px');
  await expect(badge).toHaveCSS('border-radius', '9999px');

  const sidebarBox = await sidebar.boundingBox();
  const badgeBox = await badge.boundingBox();
  const backControlBox = await backControl.boundingBox();
  const identityBox = await identity.boundingBox();
  const row = badge.locator('xpath=ancestor::a[1]');
  const rowBox = await row.boundingBox();
  const iconBox = await row.locator('[data-rail-icon-slot="true"] svg').boundingBox();
  expect(sidebarBox).not.toBeNull();
  expect(badgeBox).not.toBeNull();
  expect(backControlBox).not.toBeNull();
  expect(identityBox).not.toBeNull();
  expect(rowBox).not.toBeNull();
  expect(iconBox).not.toBeNull();
  if (!sidebarBox || !badgeBox || !backControlBox || !identityBox || !rowBox || !iconBox) {
    throw new Error('The compact rail controls need layout boxes');
  }
  expect(backControlBox.x).toBe(identityBox.x);
  expect(badgeBox.x).toBeGreaterThanOrEqual(sidebarBox.x);
  expect(badgeBox.x + badgeBox.width).toBeLessThanOrEqual(sidebarBox.x + sidebarBox.width);
  expect(badgeBox.x).toBeGreaterThanOrEqual(rowBox.x);
  expect(badgeBox.y).toBeGreaterThanOrEqual(rowBox.y);
  expect(badgeBox.x + badgeBox.width).toBeLessThanOrEqual(rowBox.x + rowBox.width);
  expect(badgeBox.y + badgeBox.height).toBeLessThanOrEqual(rowBox.y + rowBox.height);
  expect(badgeBox.x + badgeBox.width / 2).toBeGreaterThan(iconBox.x + iconBox.width / 2);
  expect(badgeBox.y + badgeBox.height / 2).toBeLessThan(iconBox.y + iconBox.height / 2);

  const navigationRowTops = await sidebar.locator(
    'nav a:has([data-rail-icon-slot="true"])'
  ).evaluateAll((rows) => rows.slice(0, 6).map((rowElement) => rowElement.getBoundingClientRect().top));
  const rowDeltas = navigationRowTops.slice(1).map(
    (top, index) => Math.round((top - navigationRowTops[index]) * 100) / 100
  );
  expect(rowDeltas).toEqual(rowDeltas.map(() => 42));
});

test('mobile drawer is left anchored, dismissible, and cleaned up on desktop resize', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(overviewPath, { waitUntil: 'domcontentloaded' });
  const trigger = page.locator('button[aria-label="Open navigation menu"]');
  await trigger.click();

  const drawer = page.getByRole('dialog', { name: 'Navigation' });
  await expect(drawer).toBeVisible();
  await expect.poll(async () => Math.abs((await drawer.boundingBox())?.x ?? Number.POSITIVE_INFINITY))
    .toBeLessThan(0.5);
  const phoneBox = await drawer.boundingBox();
  expect(phoneBox?.width).toBeLessThanOrEqual(312.1);
  expect(await page.locator('body').evaluate((body) => body.style.overflow)).toBe('hidden');

  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
  await expect(trigger).toBeFocused();

  await page.setViewportSize({ width: 768, height: 900 });
  await trigger.click();
  await expect(drawer).toBeVisible();
  await expect.poll(async () => Math.abs((await drawer.boundingBox())?.x ?? Number.POSITIVE_INFINITY))
    .toBeLessThan(0.5);
  const tabletBox = await drawer.boundingBox();
  expect(tabletBox?.width).toBeLessThanOrEqual(320.1);

  await page.setViewportSize({ width: 1200, height: 900 });
  await expect(drawer).toBeHidden();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(await page.locator('body').evaluate((body) => body.style.overflow)).toBe('');
  await expect(page.locator('.management-console-desktop-sidebar')).toBeVisible();
});
