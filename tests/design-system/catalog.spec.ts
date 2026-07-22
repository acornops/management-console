import { expect, test } from '@playwright/test';

const themes = ['light', 'dark'] as const;

for (const theme of themes) {
  test(`${theme} catalog`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: theme });
    await page.goto('/design-system.html');
    await page.evaluate(() => document.fonts.ready);

    if (theme === 'dark') {
      await page.getByRole('button', { name: 'Dark theme' }).click();
      await expect(page.locator('html')).toHaveClass(/dark/);
    }

    await page.getByRole('button', { name: 'Secondary' }).hover();
    await page.locator('#catalog-name').focus();

    await expect(page).toHaveScreenshot(`${theme}-catalog.png`, {
      animations: 'disabled',
      fullPage: true,
      maxDiffPixelRatio: 0.01
    });
  });
}

test('catalog controls meet responsive target minimums', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
  await page.goto('/design-system.html');
  await page.evaluate(() => document.fonts.ready);

  const minimum = testInfo.project.name === 'mobile' ? 44 : 36;
  const controls = page.locator('[data-catalog-control]');
  await expect(controls).toHaveCount(5);

  for (let index = 0; index < await controls.count(); index += 1) {
    const box = await controls.nth(index).boundingBox();
    expect(box, `catalog control ${index} should be visible`).not.toBeNull();
    expect(box?.height ?? 0, `catalog control ${index} height`).toBeGreaterThanOrEqual(minimum);
    expect(box?.width ?? 0, `catalog control ${index} width`).toBeGreaterThanOrEqual(minimum);
  }
});

test('collection discovery supports responsive layouts, keyboard filters, and no-match recovery', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
  await page.goto('/design-system.html');
  await page.evaluate(() => document.fonts.ready);

  const examples = page.locator('[data-catalog-discovery]');
  await expect(examples).toHaveCount(3);
  await expect(page.locator('[data-catalog-discovery="search-only"] [data-discovery-filter-bar]')).toBeVisible();
  await expect(page.locator('[data-catalog-discovery="single-filter"] [data-discovery-filter-bar]')).toBeVisible();
  await expect(page.locator('[data-catalog-discovery="multi-filter"] [data-discovery-filter-bar]')).toBeVisible();

  const searchOnly = page.locator('[data-catalog-discovery="search-only"]');
  const workflowSearch = searchOnly.getByRole('searchbox', { name: 'Search workflows' });
  await searchOnly.getByRole('button', { name: 'Clear search' }).click();
  await expect(workflowSearch).toBeFocused();
  await expect(workflowSearch).toHaveValue('');

  for (let exampleIndex = 0; exampleIndex < await examples.count(); exampleIndex += 1) {
    const targets = examples.nth(exampleIndex).locator('input, button');
    const minimum = 44;
    for (let targetIndex = 0; targetIndex < await targets.count(); targetIndex += 1) {
      const box = await targets.nth(targetIndex).boundingBox();
      expect(box, `discovery target ${exampleIndex}:${targetIndex} should be visible`).not.toBeNull();
      expect(box?.height ?? 0, `discovery target ${exampleIndex}:${targetIndex} height`).toBeGreaterThanOrEqual(minimum);
      expect(box?.width ?? 0, `discovery target ${exampleIndex}:${targetIndex} width`).toBeGreaterThanOrEqual(minimum);
    }
  }

  const multi = page.locator('[data-catalog-discovery="multi-filter"]');
  const searchBox = await multi.getByRole('searchbox', { name: 'Search MCP catalog' }).boundingBox();
  const sourceBox = await multi.getByRole('button', { name: 'Catalog source' }).boundingBox();
  const compatibilityBox = await multi.getByRole('button', { name: 'Compatibility' }).boundingBox();

  if (testInfo.project.name === 'mobile') {
    expect((sourceBox?.y ?? 0) > (searchBox?.y ?? 0) + 40).toBe(true);
    expect((compatibilityBox?.y ?? 0) > (sourceBox?.y ?? 0) + 40).toBe(true);
  } else {
    expect(searchBox?.width ?? 0).toBeGreaterThan(sourceBox?.width ?? 0);
    const centers = [searchBox, sourceBox, compatibilityBox].map((box) => (box?.y ?? 0) + (box?.height ?? 0) / 2);
    expect(Math.max(...centers) - Math.min(...centers)).toBeLessThanOrEqual(2);
  }

  const single = page.locator('[data-catalog-discovery="single-filter"]');
  const singleSearch = single.getByRole('searchbox', { name: 'Search agents' });
  const singleBarBox = await single.locator('[data-search-filter-frame]').boundingBox();
  const searchBeforeFilter = await singleSearch.boundingBox();
  if (testInfo.project.name === 'mobile') {
    expect(Math.abs((searchBeforeFilter?.width ?? 0) - ((singleBarBox?.width ?? 0) - 34))).toBeLessThanOrEqual(1);
  } else {
    const statusBox = await single.getByRole('button', { name: 'Agent status' }).boundingBox();
    expect(searchBeforeFilter?.width ?? 0).toBeGreaterThan(statusBox?.width ?? 0);
  }

  const statusSelect = single.getByRole('button', { name: 'Agent status' });
  await expect(statusSelect).toContainText('Needs attention');
  await expect(statusSelect).toContainText('2');
  await expect(single.getByRole('status')).toHaveText('2 of 12 agents');

  await statusSelect.click();
  const statusListbox = page.getByRole('listbox', { name: 'Agent status' });
  await expect(statusListbox).toBeVisible();
  await statusListbox.getByRole('option', { name: /All 12/ }).click();
  await expect(statusSelect).toBeFocused();
  await expect(statusSelect).toContainText('All');
  await expect(single.getByRole('status')).toHaveText('12 agents');

  await statusSelect.click();
  await page.getByRole('listbox', { name: 'Agent status' }).getByRole('option', { name: /Needs attention 2/ }).click();
  await expect(statusSelect).toBeFocused();
  await singleSearch.fill('agent');
  await expect(single.getByRole('button', { name: 'Clear all' })).toBeVisible();
  await single.getByRole('button', { name: 'Clear all' }).click();
  await expect(singleSearch).toBeFocused();
  await expect(singleSearch).toHaveValue('');
  await expect(statusSelect).toContainText('All');
  await expect(single.getByRole('button', { name: 'Clear all' })).toHaveCount(0);
  await expect(single.getByRole('status')).toHaveText('12 agents');

  await singleSearch.fill('agent');
  await singleSearch.press('Escape');
  await expect(singleSearch).toBeFocused();
  await expect(singleSearch).toHaveValue('');

  await expect(multi.getByRole('status')).toHaveText('0 of 12 servers');
  await expect(multi.getByRole('button', { name: 'Catalog source' })).toContainText('Community');
  await expect(multi.getByRole('button', { name: 'Compatibility' })).toContainText('Incompatible');
  await multi.getByRole('button', { name: 'Clear all' }).click();
  await expect(multi.getByRole('searchbox', { name: 'Search MCP catalog' })).toBeFocused();
  await expect(multi.getByRole('button', { name: 'Catalog source' })).toContainText('All sources');
  await expect(multi.getByRole('button', { name: 'Compatibility' })).toContainText('All compatibility');
  await expect(multi.getByRole('status')).toHaveText('12 servers');
  await expect(multi.getByRole('button', { name: 'Clear all' })).toHaveCount(0);
});
