import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type TestInfo } from '@playwright/test';

const FIXED_NOW = '2026-07-19T08:30:00.000Z';

const auditedRoutes = [
  {
    name: 'workspace-overview',
    path: '/workspaces/fixture-workspace/overview'
  },
  {
    name: 'workspace-approvals',
    path: '/workspaces/fixture-workspace/approvals'
  },
  {
    name: 'workspace-agents',
    path: '/workspaces/fixture-workspace/agents'
  },
  {
    name: 'agent-chat',
    path: '/workspaces/fixture-workspace/agents/fixture-specialist/chat'
  },
  {
    name: 'agent-settings',
    path: '/workspaces/fixture-workspace/agents/fixture-specialist/settings'
  },
  {
    name: 'cluster-overview',
    path: '/kubernetes-clusters/fixture-cluster/overview'
  },
  {
    name: 'cluster-resources',
    path: '/kubernetes-clusters/fixture-cluster/resources'
  },
  {
    name: 'vm-resources',
    path: '/workspaces/fixture-workspace/virtual-machines/fixture-vm/resources'
  },
  {
    name: 'workspace-settings',
    path: '/workspaces/fixture-workspace/settings?section=mcp-registries'
  }
] as const;

function isDarkProject(testInfo: TestInfo) {
  return testInfo.project.name.endsWith('-dark');
}

async function prepareRoute(page: Page, testInfo: TestInfo, path: string) {
  const theme = isDarkProject(testInfo) ? 'dark' : 'light';
  await page.clock.setFixedTime(new Date(FIXED_NOW));
  await page.addInitScript((preference) => {
    window.localStorage.setItem('app_theme', preference);
    window.localStorage.setItem('acornops_active_theme_preference', preference);
  }, theme);
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('#root')).not.toContainText('Management console could not start');
  await expect(page.locator('h1').first()).toBeVisible();
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

for (const route of auditedRoutes) {
  test(`${route.name} matches its route-level visual contract`, async ({ page }, testInfo) => {
    await prepareRoute(page, testInfo, route.path);

    await expect(page).toHaveScreenshot(`${route.name}.png`, {
      animations: 'disabled',
      caret: 'hide',
      fullPage: true,
      maxDiffPixelRatio: 0.01
    });
  });

  test(`${route.name} meets automated WCAG 2.1 AA checks`, async ({ page }, testInfo) => {
    await prepareRoute(page, testInfo, route.path);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .exclude('[data-brand-wordmark]')
      .analyze();

    expect(formatViolations(results.violations)).toEqual([]);
  });
}

for (const route of auditedRoutes) {
  test(`${route.name} reflows at 200 percent text size`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-light', 'One deterministic project owns text reflow coverage.');
    await prepareRoute(page, testInfo, route.path);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });

    await expect.poll(() => page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth
    }))).toEqual(expect.objectContaining({
      clientWidth: expect.any(Number),
      scrollWidth: expect.any(Number)
    }));
    const geometry = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth
    }));
    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);
    await expect(page.locator('h1').first()).toBeVisible();
  });
}

test('forced-colors mode preserves visible keyboard focus', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-light', 'One deterministic project owns forced-colors coverage.');
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  await prepareRoute(page, testInfo, auditedRoutes[0].path);

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
