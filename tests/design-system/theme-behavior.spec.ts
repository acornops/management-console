import { expect, test, type Page } from '@playwright/test';

async function stubAnonymousControlPlane(page: Page) {
  await page.route('http://localhost:8081/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const corsHeaders = {
      'access-control-allow-credentials': 'true',
      'access-control-allow-origin': 'http://127.0.0.1:4177',
      'content-type': 'application/json'
    };
    if (path === '/api/v1/auth/config') {
      await route.fulfill({
        status: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          oidcEnabled: true,
          oidcProviderName: 'OIDC',
          passwordAuthEnabled: true,
          passwordSignupEnabled: true,
          passwordEmailVerificationRequired: true,
          passwordResetEnabled: true
        })
      });
      return;
    }
    await route.fulfill({ status: 401, headers: corsHeaders, body: JSON.stringify({ error: 'UNAUTHORIZED' }) });
  });
}

for (const colorScheme of ['light', 'dark'] as const) {
  test(`System resolves ${colorScheme} before the login surface paints`, async ({ page }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    await page.addInitScript(() => window.localStorage.setItem('app_theme', 'system'));
    await stubAnonymousControlPlane(page);
    await page.goto('/');

    await expect(page.locator('html')).toHaveAttribute('data-theme-preference', 'system');
    await expect(page.locator('html')).toHaveAttribute('data-resolved-theme', colorScheme);
    if (colorScheme === 'dark') {
      await expect(page.locator('html')).toHaveClass(/dark/);
    } else {
      await expect(page.locator('html')).not.toHaveClass(/dark/);
    }
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
      'content',
      colorScheme === 'dark' ? '#121110' : '#fcfaf6'
    );
  });
}

test('theme menu supports radio semantics, keyboard navigation, persistence, and focus restoration', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await page.addInitScript(() => window.localStorage.setItem('app_theme', 'system'));
  await stubAnonymousControlPlane(page);
  await page.goto('/');

  const trigger = page.getByRole('button', { name: 'Choose theme. Current preference: System' });
  await trigger.click();
  const menu = page.getByRole('menu', { name: 'Theme preference' });
  const options = menu.getByRole('menuitemradio');
  await expect(options).toHaveCount(3);
  await expect(options.nth(0)).toHaveAttribute('aria-checked', 'true');
  await expect(options.nth(0)).toBeFocused();

  await page.keyboard.press('ArrowDown');
  await expect(options.nth(1)).toBeFocused();
  await page.keyboard.press('End');
  await expect(options.nth(2)).toBeFocused();
  await page.keyboard.press('Home');
  await expect(options.nth(0)).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await menu.getByRole('menuitemradio', { name: 'Dark' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem('app_theme'))).toBe('dark');
  await expect(page.getByRole('button', { name: 'Choose theme. Current preference: Dark' })).toBeFocused();
});

test('System follows a live OS change without a click-origin reveal', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' });
  await page.addInitScript(() => window.localStorage.setItem('app_theme', 'light'));
  await stubAnonymousControlPlane(page);
  await page.goto('/');

  await page.getByRole('button', { name: 'Choose theme. Current preference: Light' }).click();
  await page.getByRole('menuitemradio', { name: 'System' }).click();
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem('app_theme'))).toBe('system');
  await expect(page.locator('.theme-reveal-ripple')).toHaveCount(0);

  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'no-preference' });
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.locator('html')).toHaveAttribute('data-resolved-theme', 'dark');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#121110');
  await expect(page.locator('.theme-reveal-ripple')).toHaveCount(0);
});
