import { expect, test, type Page } from '@playwright/test';

const ACTIVE_THEME_STORAGE_KEY = 'acornops_active_theme_preference';
const PROFILE_THEME_STORAGE_KEY = 'acornops_profile_preferences:operator%40example.com:theme';

const corsHeaders = {
  'access-control-allow-credentials': 'true',
  'access-control-allow-headers': 'content-type,x-csrf-token',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-allow-origin': 'http://127.0.0.1:4177',
  'content-type': 'application/json'
};

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

async function expectResolvedTheme(page: Page, theme: 'light' | 'dark') {
  const root = page.locator('html');
  await expect(root).toHaveAttribute('data-resolved-theme', theme);
  if (theme === 'dark') {
    await expect(root).toHaveClass(/dark/);
  } else {
    await expect(root).not.toHaveClass(/dark/);
  }
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    'content',
    theme === 'dark' ? '#121110' : '#fcfaf6'
  );
}

async function stubAnonymousControlPlane(page: Page) {
  await page.route('http://localhost:8081/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }
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

async function stubAuthenticatedControlPlane(page: Page) {
  const restorationStarted = deferred();
  const releaseRestoration = deferred();

  await page.route('http://localhost:8081/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }
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
    if (path === '/api/v1/me') {
      restorationStarted.resolve();
      await releaseRestoration.promise;
      await route.fulfill({
        status: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          id: 'operator-1',
          email: 'operator@example.com',
          displayName: 'Console Operator'
        })
      });
      return;
    }
    if (path === '/api/v1/workspaces') {
      await route.fulfill({
        status: 200,
        headers: corsHeaders,
        body: JSON.stringify({ items: [], nextCursor: null })
      });
      return;
    }
    if (path === '/api/v1/auth/csrf') {
      await route.fulfill({
        status: 200,
        headers: corsHeaders,
        body: JSON.stringify({ csrfToken: 'theme-test-csrf' })
      });
      return;
    }
    if (path === '/api/v1/auth/logout') {
      await route.fulfill({
        status: 200,
        headers: corsHeaders,
        body: JSON.stringify({ status: 'signed_out' })
      });
      return;
    }
    await route.fulfill({ status: 404, headers: corsHeaders, body: JSON.stringify({ error: 'NOT_FOUND' }) });
  });

  return {
    restorationStarted: restorationStarted.promise,
    releaseRestoration: releaseRestoration.resolve
  };
}

async function stubFailedRestoration(page: Page) {
  const restorationStarted = deferred();
  const releaseRestoration = deferred();

  await page.route('http://localhost:8081/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }
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
    if (path === '/api/v1/me') {
      restorationStarted.resolve();
      await releaseRestoration.promise;
    }
    await route.fulfill({ status: 401, headers: corsHeaders, body: JSON.stringify({ error: 'UNAUTHORIZED' }) });
  });

  return {
    restorationStarted: restorationStarted.promise,
    releaseRestoration: releaseRestoration.resolve
  };
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
  await page.waitForLoadState('networkidle');

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

test('an authenticated Light profile stays light across restoration and returns to global Dark on logout', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Desktop account navigation exercises the logout transition.');
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.addInitScript(({ activeKey, profileKey }) => {
    window.localStorage.setItem('app_theme', 'dark');
    window.localStorage.setItem(profileKey, 'light');
    window.localStorage.setItem(activeKey, 'light');
  }, { activeKey: ACTIVE_THEME_STORAGE_KEY, profileKey: PROFILE_THEME_STORAGE_KEY });
  const session = await stubAuthenticatedControlPlane(page);

  await page.goto('/');
  await session.restorationStarted;

  await expect(page.locator('html')).toHaveAttribute('data-theme-preference', 'light');
  await expectResolvedTheme(page, 'light');

  session.releaseRestoration();
  await expect(page.getByRole('button', { name: 'Account settings' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme-preference', 'light');
  await expectResolvedTheme(page, 'light');
  await expect.poll(() => page.evaluate((key) => window.localStorage.getItem(key), ACTIVE_THEME_STORAGE_KEY)).toBe('light');

  await page.getByRole('button', { name: 'Account settings' }).click();
  await page.getByRole('button', { name: 'Logout' }).click();

  await expectResolvedTheme(page, 'dark');
  await expect.poll(() => page.evaluate((key) => window.localStorage.getItem(key), ACTIVE_THEME_STORAGE_KEY)).toBeNull();
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem('app_theme'))).toBe('dark');
  await expect.poll(() => page.evaluate((key) => window.localStorage.getItem(key), PROFILE_THEME_STORAGE_KEY)).toBe('light');
});

test('failed restoration clears the active hint and restores the global preference', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await page.addInitScript((activeKey) => {
    window.localStorage.setItem('app_theme', 'dark');
    window.localStorage.setItem(activeKey, 'light');
  }, ACTIVE_THEME_STORAGE_KEY);
  const session = await stubFailedRestoration(page);

  await page.goto('/');
  await session.restorationStarted;
  await expectResolvedTheme(page, 'light');

  session.releaseRestoration();
  await expect(page.getByRole('button', { name: 'Choose theme. Current preference: Dark' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme-preference', 'dark');
  await expectResolvedTheme(page, 'dark');
  await expect.poll(() => page.evaluate((key) => window.localStorage.getItem(key), ACTIVE_THEME_STORAGE_KEY)).toBeNull();
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem('app_theme'))).toBe('dark');
});
