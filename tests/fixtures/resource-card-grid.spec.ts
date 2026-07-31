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

async function expectResourceCardsCapped(page: Page, route: string) {
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  const grid = page.locator('[data-resource-card-grid="true"]').last();
  await expect(grid).toBeVisible();
  const widths = await grid.locator(':scope > *').evaluateAll((items) =>
    items.map((item) => item.getBoundingClientRect().width)
  );
  expect(widths.length).toBeGreaterThan(0);
  expect(Math.max(...widths)).toBeLessThanOrEqual(640);
}

test('resource catalogs respond to usable width across browser zoom levels', async ({ page }) => {
  await page.setViewportSize({ width: 1800, height: 1000 });

  for (const route of resourceCatalogRoutes) {
    await expectResourceGridColumns(page, route, 2);
  }

  const sidebar = page.locator('.management-console-desktop-sidebar');
  await expect(sidebar).toHaveAttribute('data-desktop-sidebar-mode', 'expanded');
  await page.setViewportSize({ width: 1850, height: 1000 });

  for (const route of resourceCatalogRoutes) {
    await expectResourceGridColumns(page, route, 3);
  }
  await expect(sidebar).toHaveAttribute('data-desktop-sidebar-mode', 'expanded');

  await page.setViewportSize({ width: 3600, height: 1000 });
  for (const route of resourceCatalogRoutes) {
    await expectResourceCardsCapped(page, route);
  }
});
