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
