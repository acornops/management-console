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
