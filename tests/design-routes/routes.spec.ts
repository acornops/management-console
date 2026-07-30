import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { routeCoverageManifest } from '../../scripts/route-coverage-manifest.mjs';

const FIXED_NOW = '2026-07-19T08:30:00.000Z';
const requestedRouteNames = new Set(
  (process.env.DESIGN_ROUTE_NAMES || '').split(',').filter(Boolean)
);
const auditedRoutes = requestedRouteNames.size > 0
  ? routeCoverageManifest.filter((route) => requestedRouteNames.has(route.name))
  : routeCoverageManifest;

function isDarkProject(testInfo: TestInfo) {
  return testInfo.project.name.endsWith('-dark');
}

async function prepareRoute(
  page: Page,
  theme: 'dark' | 'light',
  route: (typeof routeCoverageManifest)[number]
) {
  await page.goto(route.path, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('#root')).not.toContainText('Management console could not start');
  await expect(page.locator(route.ready).first()).toBeVisible({ timeout: 45_000 });
  await expect(page.locator('html')).toHaveClass(theme === 'dark' ? /dark/ : /^(?!.*dark).*$/);
}

function formatViolations(violations: Awaited<ReturnType<AxeBuilder['analyze']>>['violations']) {
  return violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    nodes: violation.nodes.map((node) => ({
      target: node.target,
      summary: node.failureSummary
    }))
  }));
}

test('all canonical routes satisfy the design contract', async ({ page }, testInfo) => {
  test.setTimeout(15 * 60_000);
  const theme = isDarkProject(testInfo) ? 'dark' : 'light';
  await page.clock.setFixedTime(new Date(FIXED_NOW));
  await page.addInitScript((preference) => {
    window.localStorage.setItem('app_theme', preference);
    window.localStorage.setItem('acornops_active_theme_preference', preference);
  }, theme);

  for (const route of auditedRoutes) {
    await test.step(route.name, async () => {
      await prepareRoute(page, theme, route);

      await expect.soft(page).toHaveScreenshot(`${route.name}.png`, {
        animations: 'disabled',
        caret: 'hide',
        fullPage: true,
        maxDiffPixelRatio: 0.01
      });
      if (testInfo.project.name === 'desktop-light') {
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .exclude('[data-brand-wordmark]')
          .exclude('[data-design-contrast-exception="activation"]')
          .analyze();
        expect.soft(formatViolations(results.violations)).toEqual([]);

        await page.evaluate(() => {
          document.documentElement.style.fontSize = '200%';
        });
        const geometry = await page.evaluate(() => ({
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth
        }));
        expect.soft(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);
      }
    });
  }
});

test('forced-colors mode preserves visible keyboard focus', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-light', 'One deterministic project owns forced-colors coverage.');
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  const theme = isDarkProject(testInfo) ? 'dark' : 'light';
  await page.clock.setFixedTime(new Date(FIXED_NOW));
  await page.addInitScript((preference) => {
    window.localStorage.setItem('app_theme', preference);
    window.localStorage.setItem('acornops_active_theme_preference', preference);
  }, theme);
  await prepareRoute(page, theme, routeCoverageManifest[1]);

  const firstAction = page.locator('button:visible, a[href]:visible').first();
  await firstAction.focus();
  const focusStyle = await firstAction.evaluate((element) => {
    const style = window.getComputedStyle(element);
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth
    };
  });

  expect(focusStyle.outlineStyle).not.toBe('none');
  expect(Number.parseFloat(focusStyle.outlineWidth)).toBeGreaterThanOrEqual(1);
});
