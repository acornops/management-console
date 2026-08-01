import { expect, test, type Page } from '@playwright/test';

const resourceCatalogRoutes = [
  '/workspaces/fixture-workspace/kubernetes-clusters',
  '/workspaces/fixture-workspace/virtual-machines',
  '/workspaces/fixture-workspace/agents'
];

async function expectResourceGridColumns(page: Page, route: string, count: number) {
  try {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes('ERR_ABORTED')) throw error;
    await page.goto(route, { waitUntil: 'domcontentloaded' });
  }
  const grid = page.locator('[data-resource-card-grid="true"]').last();
  await expect(grid).toBeVisible();
  const renderedColumns = await grid.evaluate((element) => {
    const item = element.firstElementChild;
    if (!item) throw new Error('Resource-card grid requires at least one fixture item');
    while (element.childElementCount < 3) {
      const clone = item.cloneNode(true) as HTMLElement;
      clone.setAttribute('aria-hidden', 'true');
      element.append(clone);
    }
    const rows = new Map<number, number>();
    for (const item of Array.from(element.children)) {
      const top = Math.round(item.getBoundingClientRect().top);
      rows.set(top, (rows.get(top) || 0) + 1);
    }
    return Math.max(...rows.values());
  });
  expect(renderedColumns).toBe(count);
}

async function expectUltrawideCatalogExpansion(page: Page, route: string) {
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  const grid = page.locator('[data-resource-card-grid="true"]').last();
  await expect(grid).toBeVisible();
  const geometry = await grid.evaluate((element) => {
    const item = element.firstElementChild;
    if (!item) throw new Error('Resource-card grid requires at least one fixture item');
    while (element.childElementCount < 7) {
      const clone = item.cloneNode(true) as HTMLElement;
      clone.setAttribute('aria-hidden', 'true');
      element.append(clone);
    }
    const cards = Array.from(element.children).map((card) => card.getBoundingClientRect());
    const firstRowTop = Math.round(cards[0].top);
    return {
      columns: cards.filter((card) => Math.round(card.top) === firstRowTop).length,
      widths: cards.map((card) => card.width)
    };
  });

  expect(geometry.columns).toBeGreaterThan(3);
  for (const width of geometry.widths) {
    expect(width).toBeGreaterThanOrEqual(480);
    expect(width).toBeCloseTo(geometry.widths[0], 0);
  }
}

async function expectDistributedCardTracksInFullWidthCatalog(page: Page, route: string) {
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  const shellContent = page.locator('.page-shell > div').first();
  const catalog = page.locator('[data-resource-card-catalog="true"]').last();
  const grid = page.locator('[data-resource-card-grid="true"]').last();
  await expect(grid).toBeVisible();

  const shellBox = await shellContent.boundingBox();
  const catalogBox = await catalog.boundingBox();
  const geometry = await grid.evaluate((element) => {
    const gridWidth = element.getBoundingClientRect().width;
    const widths = Array.from(element.children).map((item) => item.getBoundingClientRect().width);
    const capacity = Math.max(1, Math.floor((gridWidth + 16) / (480 + 16)));
    return {
      expectedCardWidth: (gridWidth - ((capacity - 1) * 16)) / capacity,
      widths
    };
  });

  expect(shellBox).not.toBeNull();
  expect(catalogBox).not.toBeNull();
  expect(catalogBox!.width).toBeCloseTo(shellBox!.width, 0);
  expect(geometry.widths.length).toBeGreaterThan(0);
  for (const width of geometry.widths) expect(width).toBeCloseTo(geometry.expectedCardWidth, 0);
}

async function expectTwoBoundedCardTracks(page: Page, route: string) {
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  const grid = page.locator('[data-resource-card-grid="true"]').last();
  await expect(grid).toBeVisible();

  const geometry = await grid.evaluate((element) => {
    const firstItem = element.firstElementChild;
    if (!firstItem) throw new Error('Resource-card grid requires at least one fixture item');
    while (element.childElementCount < 2) element.append(firstItem.cloneNode(true));
    while (element.childElementCount > 2) element.lastElementChild?.remove();
    const gridBox = element.getBoundingClientRect();
    const cards = Array.from(element.children).map((card) => card.getBoundingClientRect());
    return {
      gridWidth: gridBox.width,
      cardWidths: cards.map((card) => card.width),
      gap: cards[1].left - cards[0].right
    };
  });

  expect(geometry.cardWidths[0]).toBeCloseTo(geometry.cardWidths[1], 0);
  expect(geometry.cardWidths[0]).toBeGreaterThanOrEqual(480);
  expect(geometry.gap).toBeCloseTo(16, 0);
  expect(geometry.cardWidths[0] + geometry.cardWidths[1] + geometry.gap).toBeCloseTo(geometry.gridWidth, 0);
}

test('resource catalogs respond to usable width across browser zoom levels', async ({ page }) => {
  await page.setViewportSize({ width: 1800, height: 1000 });

  for (const route of resourceCatalogRoutes) {
    await expectResourceGridColumns(page, route, 2);
    await expectTwoBoundedCardTracks(page, route);
  }

  const sidebar = page.locator('.management-console-desktop-sidebar');
  await expect(sidebar).toHaveAttribute('data-desktop-sidebar-mode', 'expanded');
  await page.setViewportSize({ width: 1850, height: 1000 });

  for (const route of resourceCatalogRoutes) {
    await expectResourceGridColumns(page, route, 3);
    await expectDistributedCardTracksInFullWidthCatalog(page, route);
  }
  await expect(sidebar).toHaveAttribute('data-desktop-sidebar-mode', 'expanded');

  await page.setViewportSize({ width: 3600, height: 1000 });
  for (const route of resourceCatalogRoutes) {
    await expectUltrawideCatalogExpansion(page, route);
  }
});

test('resource catalog route shells reclaim collapsed sidebar width', async ({ page }) => {
  await page.setViewportSize({ width: 1850, height: 1000 });

  for (const route of resourceCatalogRoutes) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    const sidebar = page.locator('.management-console-desktop-sidebar');
    await expect(sidebar).toHaveAttribute('data-desktop-sidebar-mode', /^(expanded|collapsed)$/);
    if (await sidebar.getAttribute('data-desktop-sidebar-mode') === 'collapsed') {
      await page.getByRole('button', { name: 'Expand sidebar' }).click();
    }
    await expect(sidebar).toHaveAttribute('data-desktop-sidebar-mode', 'expanded');
    await expect(sidebar).toHaveCSS('width', '256px');

    const shellContent = page.locator('.page-shell > div').first();
    const catalog = page.locator('[data-resource-card-catalog="true"]').last();
    const expandedShellBox = await shellContent.boundingBox();
    const expandedCatalogBox = await catalog.boundingBox();

    await page.getByRole('button', { name: 'Collapse sidebar' }).click();
    await expect(sidebar).toHaveAttribute('data-desktop-sidebar-mode', 'collapsed');
    await expect(sidebar).toHaveCSS('width', '64px');
    const collapsedShellBox = await shellContent.boundingBox();
    const collapsedCatalogBox = await catalog.boundingBox();

    expect(expandedShellBox).not.toBeNull();
    expect(expandedCatalogBox).not.toBeNull();
    expect(collapsedShellBox).not.toBeNull();
    expect(collapsedCatalogBox).not.toBeNull();
    expect(collapsedShellBox!.width - expandedShellBox!.width).toBeCloseTo(192, 0);
    expect(expandedCatalogBox!.width).toBeCloseTo(expandedShellBox!.width, 0);
    expect(collapsedCatalogBox!.width).toBeCloseTo(collapsedShellBox!.width, 0);
    expect(collapsedCatalogBox!.width - expandedCatalogBox!.width).toBeCloseTo(192, 0);
  }
});

test('a docked assistant preserves the sparse resource-card track width', async ({ page }) => {
  await page.setViewportSize({ width: 1850, height: 1000 });
  await page.goto('/workspaces/fixture-workspace/overview', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Open assistant' }).first().click();

  const assistant = page.getByRole('complementary', { name: 'Cluster Assistant' });
  await expect(assistant).toBeVisible();
  const recentActivityDialog = page.getByRole('dialog', { name: 'Choose how to continue' });
  await expect(recentActivityDialog).toBeVisible();
  await recentActivityDialog.getByRole('button', { name: 'Open conversation' }).click();

  await page.locator('a[href="/workspaces/fixture-workspace/kubernetes-clusters"]').first().click();
  await expect(page).toHaveURL('/workspaces/fixture-workspace/kubernetes-clusters');
  await expect(assistant).toBeVisible();

  const card = page.locator('[data-cluster-card-grid="true"] > *').first();
  await expect(card).toBeVisible();
  const dockedCardBox = await card.boundingBox();

  await assistant.getByRole('button', { name: 'Close' }).click();
  await expect(assistant).toHaveCount(0);
  const fullCardBox = await card.boundingBox();

  expect(dockedCardBox).not.toBeNull();
  expect(fullCardBox).not.toBeNull();
  expect(dockedCardBox!.width).toBeCloseTo(fullCardBox!.width, 0);
  expect(dockedCardBox!.width).toBeGreaterThanOrEqual(480);
});
