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
const routeHeaderGeometryExemptions = new Set([
  'login',
  'workspace-invitation',
  'external-integration-linked'
]);

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
  // Let route scroll effects settle before normalizing routes whose baseline is the origin.
  await page.evaluate(() => new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
  }));
  await page.evaluate((preserveScroll) => {
    window.scrollTo(0, 0);
    if (!preserveScroll) {
      document.querySelectorAll<HTMLElement>('.page-shell').forEach((shell) => {
        shell.scrollTop = 0;
      });
    }
  }, route.preserveScroll === true);
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

async function assertRouteHeaderGeometry(page: Page, routeName: string) {
  const geometry = await page.evaluate(() => {
    const isVisible = (element: Element): element is HTMLElement => {
      if (!(element instanceof HTMLElement)) return false;
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    };
    const heading = [...document.querySelectorAll('h1')].find(isVisible);
    const header = heading?.closest('header');
    if (!header) return null;

    const isSharedPageHeader = header.classList.contains('page-header');
    const chatAction = header.querySelector<HTMLElement>('[data-chat-new-chat="true"]');
    const scrollRegion = chatAction && !isSharedPageHeader
      ? header
      : header.closest<HTMLElement>('.page-shell');
    if (!scrollRegion) return null;

    const content = chatAction && !isSharedPageHeader
      ? header.querySelector<HTMLElement>(':scope > div')
      : header;
    const actions = isSharedPageHeader
      ? header.children.item(1)
      : chatAction;
    const controls = actions
      ? [...actions.querySelectorAll<HTMLElement>('button, a[href], [role="button"]')].filter(isVisible)
      : [];
    if (actions instanceof HTMLElement && actions.matches('button, a[href], [role="button"]') && isVisible(actions)) {
      controls.unshift(actions);
    }

    const contentRect = content?.getBoundingClientRect();
    const actionsRect = actions?.getBoundingClientRect();
    return {
      actionRight: actionsRect?.right ?? null,
      contentRight: contentRect?.right ?? null,
      controlHeights: controls.map((control) => control.getBoundingClientRect().height),
      scrollbarGutter: window.getComputedStyle(scrollRegion).scrollbarGutter
    };
  });

  if (!geometry) return false;
  expect.soft(
    geometry.scrollbarGutter,
    `${routeName} route header should reserve the canonical scrollbar gutter`
  ).toBe('stable both-edges');
  if (geometry.actionRight !== null && geometry.contentRight !== null) {
    expect.soft(
      Math.abs(geometry.actionRight - geometry.contentRight),
      `${routeName} route actions should align with the route content edge`
    ).toBeLessThanOrEqual(1);
  }
  for (const controlHeight of geometry.controlHeights) {
    expect.soft(controlHeight, `${routeName} route header controls should use the default 44px size`).toBe(44);
  }
  return true;
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

test('canonical route headers keep the shared gutter, edge, and control-size geometry', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-light', 'Desktop light owns the route-header geometry contract.');
  test.setTimeout(5 * 60_000);
  await page.addInitScript(() => {
    window.localStorage.setItem('app_theme', 'light');
    window.localStorage.setItem('acornops_active_theme_preference', 'light');
  });

  let verifiedHeaderCount = 0;
  for (const route of auditedRoutes) {
    await test.step(route.name, async () => {
      await prepareRoute(page, 'light', route);
      const verified = await assertRouteHeaderGeometry(page, route.name);
      if (verified) {
        verifiedHeaderCount += 1;
      } else {
        expect.soft(
          routeHeaderGeometryExemptions.has(route.name),
          `${route.name} should expose route-header geometry`
        ).toBe(true);
      }
    });
  }

  expect(verifiedHeaderCount).toBe(
    auditedRoutes.filter((route) => !routeHeaderGeometryExemptions.has(route.name)).length
  );
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
