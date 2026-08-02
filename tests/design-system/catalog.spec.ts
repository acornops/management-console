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

test('action menus navigate, dismiss, restore focus, and stay in the nearest dialog layer', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
  await page.goto('/design-system.html');

  const trigger = page.getByRole('button', { name: 'Open example menu' });
  await trigger.focus();
  await trigger.press('ArrowDown');
  const menu = page.getByRole('menu', { name: 'Open example menu' });
  await expect(menu.getByRole('menuitem', { name: 'Selected item' })).toBeFocused();

  await page.keyboard.press('ArrowDown');
  await expect(menu.getByRole('menuitem', { name: 'Linked item' })).toBeFocused();
  await page.keyboard.type('d');
  await expect(menu.getByRole('menuitem', { name: 'Delete item' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
  await expect(trigger).toBeFocused();

  await trigger.click();
  await page.getByRole('heading', { name: 'Fields and selection controls' }).click();
  await expect(menu).toHaveCount(0);
  await trigger.click();
  await expect(menu.getByRole('menuitem', { name: 'Selected item' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(menu).toHaveCount(0);

  await page.getByRole('button', { name: 'Open dialog' }).click();
  const dialog = page.getByRole('dialog', { name: 'Confirm change' });
  await dialog.getByRole('button', { name: 'Dialog actions' }).click();
  const dialogMenu = page.getByRole('menu', { name: 'Dialog actions' });
  await expect(dialogMenu).toBeVisible();
  expect(await dialogMenu.evaluate((element) => Boolean(element.closest('[role="dialog"] [data-floating-layer="true"]')))).toBe(true);
  const menuBox = await dialogMenu.boundingBox();
  const viewport = page.viewportSize();
  expect(menuBox?.x ?? -1).toBeGreaterThanOrEqual(0);
  expect(menuBox?.y ?? -1).toBeGreaterThanOrEqual(0);
  expect((menuBox?.x ?? 0) + (menuBox?.width ?? 0)).toBeLessThanOrEqual(viewport?.width ?? 0);
  expect((menuBox?.y ?? 0) + (menuBox?.height ?? 0)).toBeLessThanOrEqual(viewport?.height ?? 0);
});

test('overlay frames isolate, contain, nest, restore, and reflow accessibly', async ({ browser, page: projectPage }, testInfo) => {
  test.setTimeout(60_000);
  const dark = testInfo.project.name === 'mobile';
  const page = dark
    ? await browser.newPage({
      colorScheme: 'dark',
      reducedMotion: 'reduce',
      viewport: { width: 390, height: 844 }
    })
    : projectPage;
  await page.emulateMedia({
    colorScheme: dark ? 'dark' : 'light',
    reducedMotion: 'reduce'
  });
  await page.goto('/design-system.html');
  await page.evaluate(() => document.fonts.ready);
  if (dark) {
    await page.getByRole('button', { name: 'Dark theme' }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);
  }
  const trigger = page.getByRole('button', { name: 'Open dialog' });
  const initialBodyOverflow = await page.locator('body').evaluate((element) => element.style.overflow);
  await trigger.focus();
  await trigger.evaluate((element: HTMLButtonElement) => element.click());
  const dialog = page.getByRole('dialog', { name: 'Confirm change' });
  const dialogElement = page.locator('[aria-labelledby="catalog-dialog-title"]');
  await expect(dialog).toBeFocused();
  await expect(page.locator('#design-system-root [inert]').first()).toBeAttached();
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
  await expect(dialog).toHaveAttribute('aria-describedby', 'catalog-dialog-title-description');
  if (!dark) {
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });
  }

  const save = dialog.getByRole('button', { name: 'Save' });
  await save.focus();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Close' })).toBeFocused();

  const nestedTrigger = dialog.getByRole('button', { name: 'Open nested confirmation' });
  await nestedTrigger.focus();
  await nestedTrigger.evaluate((element: HTMLButtonElement) => element.click());
  const confirmation = page.getByRole('dialog', { name: 'Delete workspace' });
  await expect(confirmation).toBeFocused();
  expect(await dialogElement.evaluate((element) => Boolean(element.closest('[inert]')))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(confirmation).toHaveCount(0);
  await expect(dialog).toBeVisible();
  await expect(nestedTrigger).toBeFocused();
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');

  const box = await dialog.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(box?.x ?? -1).toBeGreaterThanOrEqual(0);
  expect(box?.width ?? 0).toBeLessThanOrEqual(viewport?.width ?? 0);
  expect(box?.height ?? 0).toBeLessThanOrEqual(viewport?.height ?? 0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.keyboard.press('Escape');
  await expect(dialogElement).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.locator('#design-system-root [inert]')).toHaveCount(0);
  await expect.poll(() => page.locator('body').evaluate((element) => element.style.overflow)).toBe(initialBodyOverflow);
  if (dark) await page.close();
});

test('status pills stay borderless while semantic callouts retain their boundary', async ({ page }) => {
  await page.goto('/design-system.html');
  const section = page.getByRole('heading', { name: 'Status and messages' }).locator('xpath=ancestor::section[1]');
  const warningPill = section.getByText('Pending', { exact: true });
  const warningCallout = section.getByRole('status').filter({ hasText: 'This workflow can write to live systems.' });

  await expect(warningPill).toHaveCSS('border-top-width', '0px');
  await expect(warningCallout).toHaveCSS('border-top-width', '1px');
  await expect(warningCallout.locator('svg')).toHaveCount(1);
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
  await statusSelect.press('Home');
  await statusSelect.press('Enter');
  await expect(statusSelect).toBeFocused();
  await expect(statusSelect).toContainText('All');
  await expect(single.getByRole('status')).toHaveText('12 agents');

  await statusSelect.click();
  await statusSelect.press('End');
  await statusSelect.press('Enter');
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
