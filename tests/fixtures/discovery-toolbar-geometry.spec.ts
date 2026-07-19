import { expect, test, type Locator, type Page } from '@playwright/test';

test.setTimeout(120_000);
test.describe.configure({ mode: 'serial' });

const clusterRoute = '/workspaces/fixture-workspace/kubernetes-clusters';
const workflowRoute = '/workspaces/fixture-workspace/workflows?q=geometry-no-match';
const mcpCatalogRoute = '/workspaces/fixture-workspace/catalog';

async function expectContainedControls(bar: Locator) {
  const barBox = await bar.boundingBox();
  expect(barBox).not.toBeNull();

  const controls = bar.locator('input, button, [role="status"]');
  for (let index = 0; index < await controls.count(); index += 1) {
    const control = controls.nth(index);
    if (!await control.isVisible()) continue;
    const box = await control.boundingBox();
    expect(box, `discovery control ${index} should have geometry`).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(barBox!.x + 16);
    expect(box!.x + box!.width).toBeLessThanOrEqual(barBox!.x + barBox!.width - 16);
  }
}

async function openDiscoverySurface(page: Page, route: string, searchName: string) {
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  const search = page.getByRole('searchbox', { name: searchName });
  await expect(search).toBeVisible({ timeout: 60_000 });
  const bar = page.locator('[data-discovery-filter-bar="true"]');
  await expect(bar).toBeVisible();
  const result = bar.getByRole('status');
  await expect(result).toBeVisible();
  return { bar, search, result };
}

async function expectRightAlignedResult(bar: Locator, result: Locator) {
  const [barBox, resultBox] = await Promise.all([bar.boundingBox(), result.boundingBox()]);
  expect(barBox).not.toBeNull();
  expect(resultBox).not.toBeNull();
  expect(Math.abs((barBox!.x + barBox!.width - 17) - (resultBox!.x + resultBox!.width))).toBeLessThanOrEqual(1);
}

async function expectFullInnerWidth(bar: Locator, control: Locator) {
  const [barBox, controlBox] = await Promise.all([bar.boundingBox(), control.boundingBox()]);
  expect(barBox).not.toBeNull();
  expect(controlBox).not.toBeNull();
  expect(Math.abs(controlBox!.width - (barBox!.width - 34))).toBeLessThanOrEqual(1);
}

test('cluster discovery stacks below lg and becomes a balanced row from lg', async ({ browser, page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const cluster = await openDiscoverySurface(page, `${clusterRoute}?status=attention`, 'Search clusters');
  const status = cluster.bar.getByRole('button', { name: 'Status' });
  const [narrowSearchBox, narrowStatusBox] = await Promise.all([
    cluster.search.boundingBox(),
    status.boundingBox()
  ]);
  await expectFullInnerWidth(cluster.bar, cluster.search);
  await expectFullInnerWidth(cluster.bar, status);
  expect(narrowStatusBox!.y).toBeGreaterThanOrEqual(narrowSearchBox!.y + narrowSearchBox!.height + 11);
  await expect(status).toContainText('Needs attention');
  await expectRightAlignedResult(cluster.bar, cluster.result);
  await expectContainedControls(cluster.bar);

  const inactivePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const inactiveCluster = await openDiscoverySurface(inactivePage, clusterRoute, 'Search clusters');
  const inactiveSearchBox = await inactiveCluster.search.boundingBox();
  expect(narrowSearchBox).toMatchObject({ x: inactiveSearchBox!.x, width: inactiveSearchBox!.width });
  await inactivePage.close();

  await page.setViewportSize({ width: 768, height: 900 });
  const [mediumSearchBox, mediumStatusBox] = await Promise.all([
    cluster.search.boundingBox(),
    status.boundingBox()
  ]);
  await expectFullInnerWidth(cluster.bar, cluster.search);
  expect(mediumStatusBox!.y).toBeGreaterThanOrEqual(mediumSearchBox!.y + mediumSearchBox!.height + 11);
  expect(mediumStatusBox!.width).toBeLessThan(mediumSearchBox!.width);
  await expectRightAlignedResult(cluster.bar, cluster.result);
  await expectContainedControls(cluster.bar);

  for (const width of [1024, 1279, 1280, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    const [barBox, searchBox, statusBox, resultBox] = await Promise.all([
      cluster.bar.boundingBox(),
      cluster.search.boundingBox(),
      status.boundingBox(),
      cluster.result.boundingBox()
    ]);
    const centers = [searchBox, statusBox, resultBox].map((box) => box!.y + (box!.height / 2));
    expect(Math.max(...centers) - Math.min(...centers)).toBeLessThanOrEqual(2);
    expect(searchBox!.width).toBeGreaterThan(statusBox!.width);
    expect(statusBox!.width).toBeGreaterThanOrEqual(168);
    expect(statusBox!.width).toBeLessThanOrEqual(224);
    expect(barBox!.height).toBeGreaterThanOrEqual(76);
    expect(barBox!.height).toBeLessThanOrEqual(78);
    await expectRightAlignedResult(cluster.bar, cluster.result);
    await expectContainedControls(cluster.bar);
  }
});

test('workflow search-only discovery keeps search dominant without overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const workflow = await openDiscoverySurface(page, workflowRoute, 'Search workflow library');
  await expectFullInnerWidth(workflow.bar, workflow.search);
  await expectRightAlignedResult(workflow.bar, workflow.result);
  await expectContainedControls(workflow.bar);

  await page.setViewportSize({ width: 768, height: 900 });
  await expectFullInnerWidth(workflow.bar, workflow.search);
  await expectRightAlignedResult(workflow.bar, workflow.result);
  await expectContainedControls(workflow.bar);

  for (const width of [1024, 1279, 1280, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    const [searchBox, resultBox] = await Promise.all([
      workflow.search.boundingBox(),
      workflow.result.boundingBox()
    ]);
    expect(searchBox!.width).toBeGreaterThan(resultBox!.width * 2);
    expect(Math.abs((searchBox!.y + searchBox!.height / 2) - (resultBox!.y + resultBox!.height / 2))).toBeLessThanOrEqual(2);
    await expectRightAlignedResult(workflow.bar, workflow.result);
    await expectContainedControls(workflow.bar);
  }
});

test('MCP discovery shares two visible filter columns before settling into one row', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const catalog = await openDiscoverySurface(page, mcpCatalogRoute, 'Search catalog');
  const source = catalog.bar.getByRole('button', { name: 'Catalog source' });
  const compatibility = catalog.bar.getByRole('button', { name: 'Compatibility' });
  await expectFullInnerWidth(catalog.bar, catalog.search);
  await expectFullInnerWidth(catalog.bar, source);
  await expectFullInnerWidth(catalog.bar, compatibility);

  await page.setViewportSize({ width: 768, height: 900 });
  const [searchBox, sourceBox, compatibilityBox] = await Promise.all([
    catalog.search.boundingBox(),
    source.boundingBox(),
    compatibility.boundingBox()
  ]);
  await expectFullInnerWidth(catalog.bar, catalog.search);
  expect(Math.abs(sourceBox!.width - compatibilityBox!.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(sourceBox!.y - compatibilityBox!.y)).toBeLessThanOrEqual(1);
  expect(sourceBox!.y).toBeGreaterThanOrEqual(searchBox!.y + searchBox!.height + 11);

  for (const width of [1024, 1279, 1280, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    const [wideSearchBox, wideSourceBox, wideCompatibilityBox, resultBox] = await Promise.all([
      catalog.search.boundingBox(),
      source.boundingBox(),
      compatibility.boundingBox(),
      catalog.result.boundingBox()
    ]);
    const centers = [wideSearchBox, wideSourceBox, wideCompatibilityBox, resultBox]
      .map((box) => box!.y + (box!.height / 2));
    expect(Math.max(...centers) - Math.min(...centers)).toBeLessThanOrEqual(2);
    expect(wideSearchBox!.width).toBeGreaterThan(wideSourceBox!.width);
    expect(wideSourceBox!.width).toBeGreaterThanOrEqual(168);
    expect(wideSourceBox!.width).toBeLessThanOrEqual(224);
    expect(Math.abs(wideSourceBox!.width - wideCompatibilityBox!.width)).toBeLessThanOrEqual(1);
    await expectRightAlignedResult(catalog.bar, catalog.result);
    await expectContainedControls(catalog.bar);
  }
});
