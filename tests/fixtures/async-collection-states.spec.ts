import { expect, test } from '@playwright/test';

const cases = [
  {
    name: 'Schedules',
    route: '/workspaces/fixture-workspace/schedules',
    delayPath: '/workflow-schedules',
    boundary: '.collection-state',
    pendingEmptyCopy: 'No workflow schedules',
    resolvedCopy: 'Weekday morning review'
  },
  {
    name: 'Approvals',
    route: '/workspaces/fixture-workspace/approvals',
    delayPath: '/approvals',
    boundary: '.collection-state',
    pendingEmptyCopy: 'No approvals waiting',
    resolvedCopy: 'No approvals waiting'
  },
  {
    name: 'Agents',
    route: '/workspaces/fixture-workspace/agents',
    delayPath: '/agents',
    boundary: '.collection-state',
    pendingEmptyCopy: 'No agents in this workspace',
    resolvedCopy: 'Workflow Analyst'
  },
  {
    name: 'Workflows',
    route: '/workspaces/fixture-workspace/workflows',
    delayPath: '/workflows',
    boundary: '[data-master-detail-layout="true"]',
    pendingEmptyCopy: 'No workflows configured.',
    resolvedCopy: 'Production health review'
  },
  {
    name: 'Catalog',
    route: '/workspaces/fixture-workspace/catalog',
    delayPath: '/catalog/artifacts',
    boundary: '[data-master-detail-layout="true"]',
    pendingEmptyCopy: 'No catalog artifacts found',
    resolvedCopy: 'GitHub Observer'
  }
] as const;

for (const fixtureCase of cases) {
  test(`${fixtureCase.name} retains its collection boundary during delayed initial load`, async ({ page }) => {
    const separator = fixtureCase.route.includes('?') ? '&' : '?';
    const delayedRoute = `${fixtureCase.route}${separator}${new URLSearchParams({
      // Leave enough headroom for a cold, parallel browser worker to inspect the
      // pending state before the fixture request resolves.
      fixtureDelayMs: '3000',
      fixtureDelayPath: fixtureCase.delayPath
    })}`;
    await page.goto(delayedRoute, { waitUntil: 'domcontentloaded' });

    const root = page.locator('#root');
    const boundary = page.locator(fixtureCase.boundary).first();
    await expect(boundary).toBeVisible();
    const initialBoundary = await boundary.elementHandle();
    expect(initialBoundary).not.toBeNull();
    await expect(root).not.toContainText(fixtureCase.pendingEmptyCopy);

    await expect(root).toContainText(fixtureCase.resolvedCopy);
    await expect(boundary).toBeVisible();
    const resolvedBoundary = await boundary.elementHandle();
    expect(resolvedBoundary).not.toBeNull();
    expect(await initialBoundary!.evaluate((node, candidate) => node === candidate, resolvedBoundary)).toBe(true);
  });
}
