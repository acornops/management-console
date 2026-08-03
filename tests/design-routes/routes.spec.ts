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
  'not-found',
  'workspace-invitation',
  'external-integration-linked',
  'external-integration-expired',
  'external-integration-cancelled',
  'external-integration-unavailable'
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
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '';
  });
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('#root')).not.toContainText('Management console could not start');
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const retryButton = page.getByRole('button', { name: 'Try again' });
    let state: 'ready' | 'retry';
    try {
      state = await Promise.race([
        page.locator(route.ready).first().waitFor({ state: 'visible', timeout: 20_000 }).then(() => 'ready' as const),
        retryButton.waitFor({ state: 'visible', timeout: 20_000 }).then(() => 'retry' as const)
      ]);
    } catch (error) {
      if (attempt === 2) throw error;
      await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      continue;
    }
    if (state === 'ready') break;
    await retryButton.click();
    const restored = await expect(page.locator(route.ready).first())
      .toBeVisible({ timeout: 20_000 })
      .then(() => true)
      .catch(() => false);
    if (restored) break;
    if (attempt === 2) throw new Error(`Session restoration failed repeatedly for ${route.name}.`);
  }
  await expect(page.locator(route.ready).first()).toBeVisible({ timeout: 45_000 });
  await expect(page.locator('html')).toHaveClass(theme === 'dark' ? /dark/ : /^(?!.*dark).*$/);
  const targetChatSurface = page.locator('[data-target-chat-surface="true"]');
  if (await targetChatSurface.isVisible().catch(() => false)) {
    await expect(targetChatSurface.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 45_000 });
    await page.waitForTimeout(200);
    const transcript = targetChatSurface.locator('[data-chat-transcript="true"]');
    if (await transcript.isVisible().catch(() => false)) {
      await transcript.evaluate((node) => {
        node.scrollTop = node.scrollHeight;
      });
      await expect.poll(async () => transcript.evaluate((node) =>
        node.scrollHeight - node.scrollTop - node.clientHeight
      )).toBeLessThanOrEqual(1);
    }
  }
  // Let route scroll effects settle before normalizing routes whose baseline is the origin.
  // A first-load Vite refresh can replace the execution context after the route landmark appears.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.evaluate((preserveScroll) => new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
          window.scrollTo(0, 0);
          if (!preserveScroll) {
            document.querySelectorAll<HTMLElement>('.page-shell').forEach((shell) => {
              shell.scrollTop = 0;
            });
          }
          window.setTimeout(() => {
            window.scrollTo(0, 0);
            if (!preserveScroll) {
              document.querySelectorAll<HTMLElement>('.page-shell').forEach((shell) => {
                shell.scrollTop = 0;
              });
            }
            resolve();
          }, 150);
        }));
      }), route.preserveScroll === true);
      return;
    } catch (error) {
      if (attempt === 2 || !String(error).includes('Execution context was destroyed')) throw error;
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator(route.ready).first()).toBeVisible({ timeout: 45_000 });
    }
  }
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

        try {
          await page.evaluate(() => {
            document.documentElement.style.fontSize = '200%';
          });
          const geometry = await page.evaluate(() => ({
            clientWidth: document.documentElement.clientWidth,
            scrollWidth: document.documentElement.scrollWidth
          }));
          expect.soft(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);
        } finally {
          await page.evaluate(() => {
            document.documentElement.style.fontSize = '';
          });
        }
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

test('mobile approvals and Assistant controls remain complete at supported narrow widths', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-light', 'Mobile light owns narrow task-completion geometry.');
  test.setTimeout(3 * 60_000);
  await page.setViewportSize({ width: 320, height: 844 });
  await page.addInitScript(() => {
    window.localStorage.setItem('app_theme', 'light');
    window.localStorage.setItem('acornops_active_theme_preference', 'light');
  });

  const approvalsRoute = routeCoverageManifest.find((route) => route.name === 'workspace-approvals');
  expect(approvalsRoute).toBeDefined();
  await prepareRoute(page, 'light', approvalsRoute!);
  const mobileApprovals = page.locator('[data-approval-layout="mobile"]');
  await expect(mobileApprovals).toBeVisible();
  await expect(page.locator('[data-approval-layout="desktop"]')).toBeHidden();
  const approveButton = mobileApprovals.getByRole('button', { name: /Approve/i }).first();
  await expect(approveButton).toBeVisible();
  await expect(mobileApprovals.getByRole('button', { name: /Reject/i }).first()).toBeVisible();
  await approveButton.focus();
  await expect(approveButton).toBeFocused();
  const approvalsGeometry = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));
  expect(approvalsGeometry.scrollWidth).toBeLessThanOrEqual(approvalsGeometry.clientWidth + 1);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  const approvalsReflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));
  expect(approvalsReflow.scrollWidth).toBeLessThanOrEqual(approvalsReflow.clientWidth + 1);

  for (const routeName of ['agent-chat', 'cluster-chat', 'vm-chat']) {
    const route = routeCoverageManifest.find((candidate) => candidate.name === routeName);
    expect(route).toBeDefined();
    await test.step(routeName, async () => {
      await prepareRoute(page, 'light', route!);
      const surface = page.locator('[data-target-chat-surface="true"]');
      const controls = page.locator('[data-chat-composer-controls="true"]');
      await expect(surface).toBeVisible();
      await expect(controls).toBeVisible();
      const firstComposerControl = controls.locator('button').first();
      await firstComposerControl.focus();
      await expect(firstComposerControl).toBeFocused();
      const geometry = await page.evaluate(() => {
        const surfaceElement = document.querySelector<HTMLElement>('[data-target-chat-surface="true"]');
        const controlsElement = document.querySelector<HTMLElement>('[data-chat-composer-controls="true"]');
        const nav = surfaceElement?.querySelector<HTMLElement>('nav[aria-label]');
        const sendButton = controlsElement?.querySelector<HTMLElement>('button[type="submit"]');
        if (!surfaceElement || !controlsElement || !nav || !sendButton) return null;
        const surfaceRect = surfaceElement.getBoundingClientRect();
        const controlsRect = controlsElement.getBoundingClientRect();
        const navRect = nav.getBoundingClientRect();
        const sendRect = sendButton.getBoundingClientRect();
        const touchTargets = [
          ...controlsElement.querySelectorAll<HTMLElement>('button'),
          ...surfaceElement.querySelectorAll<HTMLElement>('textarea[aria-label], [data-chat-trace-disclosure="true"]')
        ].filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        }).map((element) => {
          const rect = element.getBoundingClientRect();
          return { width: rect.width, height: rect.height };
        });
        return {
          surfaceClientWidth: surfaceElement.clientWidth,
          surfaceScrollWidth: surfaceElement.scrollWidth,
          controlsLeft: controlsRect.left,
          controlsRight: controlsRect.right,
          surfaceLeft: surfaceRect.left,
          surfaceRight: surfaceRect.right,
          sendRight: sendRect.right,
          touchTargets,
          navWidth: navRect.width,
          surfaceWidth: surfaceRect.width
        };
      });
      expect(geometry).not.toBeNull();
      expect(geometry!.surfaceScrollWidth).toBeLessThanOrEqual(geometry!.surfaceClientWidth + 1);
      expect(geometry!.controlsLeft).toBeGreaterThanOrEqual(geometry!.surfaceLeft - 1);
      expect(geometry!.controlsRight).toBeLessThanOrEqual(geometry!.surfaceRight + 1);
      expect(Math.abs(geometry!.sendRight - geometry!.controlsRight)).toBeLessThanOrEqual(9);
      expect(Math.abs(geometry!.navWidth - geometry!.surfaceWidth)).toBeLessThanOrEqual(1);
      geometry!.touchTargets.forEach((target) => {
        expect(target.width).toBeGreaterThanOrEqual(44);
        expect(target.height).toBeGreaterThanOrEqual(44);
      });
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '200%';
      });
      const reflow = await page.evaluate(() => {
        const surfaceElement = document.querySelector<HTMLElement>('[data-target-chat-surface="true"]');
        return surfaceElement ? {
          documentClientWidth: document.documentElement.clientWidth,
          documentScrollWidth: document.documentElement.scrollWidth,
          surfaceClientWidth: surfaceElement.clientWidth,
          surfaceScrollWidth: surfaceElement.scrollWidth
        } : null;
      });
      expect(reflow).not.toBeNull();
      expect(reflow!.documentScrollWidth).toBeLessThanOrEqual(reflow!.documentClientWidth + 1);
      expect(reflow!.surfaceScrollWidth).toBeLessThanOrEqual(reflow!.surfaceClientWidth + 1);
    });
  }
});

test('entry and integration terminal states expose a viable next action', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-light', 'Desktop light owns terminal-state interaction coverage.');
  await page.addInitScript(() => {
    window.localStorage.setItem('app_theme', 'light');
    window.localStorage.setItem('acornops_active_theme_preference', 'light');
  });

  const invitationRoute = routeCoverageManifest.find((route) => route.name === 'workspace-invitation');
  expect(invitationRoute).toBeDefined();
  await prepareRoute(page, 'light', invitationRoute!);
  const switchAccount = page.getByRole('button', { name: 'Sign out and switch account' });
  await expect(switchAccount).toBeVisible();
  await switchAccount.click();
  await expect(page).toHaveURL(/\/invites\/fixture-invitation-token$/);
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.sessionStorage.getItem('acornops_post_logout_invitation_path')))
    .toBe('/invites/fixture-invitation-token');

  const terminalStates = [
    { name: 'external-integration-linked', primary: 'Close this tab' },
    { name: 'external-integration-expired', primary: 'Retry in external client' },
    { name: 'external-integration-cancelled', primary: 'Close this tab' },
    { name: 'external-integration-unavailable', primary: null }
  ] as const;
  for (const state of terminalStates) {
    const route = routeCoverageManifest.find((candidate) => candidate.name === state.name);
    expect(route).toBeDefined();
    await test.step(state.name, async () => {
      await prepareRoute(page, 'light', route!);
      if (state.primary) await expect(page.getByRole('button', { name: state.primary })).toBeEnabled();
      const returnAction = page.getByRole('button', { name: 'Return to AcornOps' });
      await expect(returnAction).toBeEnabled();
      await returnAction.click();
      await expect(page).toHaveURL(/\/workspaces$/);
    });
  }

  await page.goto('/?fixtureAnonymous=1');
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  const retryAuthConfig = page.getByRole('button', { name: 'Check sign-in options again' });
  await expect(retryAuthConfig).toBeEnabled();
  await retryAuthConfig.click();
  await expect(retryAuthConfig).toBeEnabled();
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
