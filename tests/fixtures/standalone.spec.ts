import { expect, test } from '@playwright/test';

const routes = [
  { path: '/workspaces/fixture-workspace/overview', text: 'AcornOps Fixture Lab' },
  { path: '/workspaces/fixture-workspace/kubernetes-clusters', text: 'Singapore Production' },
  { path: '/kubernetes-clusters/fixture-cluster/overview', text: 'Singapore Production' },
  { path: '/workspaces/fixture-workspace/virtual-machines', text: 'Payments VM' },
  { path: '/workspaces/fixture-workspace/agents', text: 'Workflow Analyst' },
  { path: '/workspaces/fixture-workspace/workflows', text: 'Production health review' },
  { path: '/workspaces/fixture-workspace/triggers', text: 'Weekday morning review' },
  { path: '/workspaces/fixture-workspace/triggers?type=acornops_event', text: 'Triage new issues' },
  { path: '/workspaces/fixture-workspace/triggers?type=webhook', text: 'External production review' },
  { path: '/workspaces/fixture-workspace/approvals', text: 'Restart the payments worker' },
  { path: '/workspaces/fixture-workspace/catalog', text: 'GitHub Observer' },
  { path: '/workspaces/fixture-workspace/catalog?destination=agent%3Afixture-specialist', text: 'Destination: Kubernetes Specialist' },
  { path: '/workspaces/fixture-workspace/catalog?destination=target%3Afixture-cluster', text: 'Destination: Singapore Production' },
  { path: '/workspaces/fixture-workspace/settings?section=mcp-registries', text: 'MCP registries' },
  { path: '/workspaces/fixture-workspace/webhooks', text: 'Mattermost operations' },
  { path: '/workspaces/fixture-workspace/settings', text: 'AcornOps Fixture Lab' }
];

for (const route of routes) {
  test(`standalone mock mode renders ${route.path}`, async ({ page }) => {
    const failures: string[] = [];
    page.on('pageerror', (error) => failures.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') failures.push(message.text());
    });

    await page.goto(route.path, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#root')).not.toContainText('Management console could not start');
    await expect(page.locator('#root')).toContainText(route.text);
    expect(failures.filter((message) =>
      message.includes('FIXTURE_ROUTE_UNMATCHED') ||
      message.includes('unmatched API request') ||
      message.includes('Failed to fetch') ||
      message.includes('ERR_CONNECTION_REFUSED')
    )).toEqual([]);
  });
}

test('outbound webhooks expose history, confirmation, and one-time secret flows', async ({ page }) => {
  await page.goto('/workspaces/fixture-workspace/webhooks', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Outbound webhooks' })).toBeVisible();
  await expect(page.getByText('Mattermost operations', { exact: true })).toBeVisible();

  const webhookArticle = page.getByRole('article').filter({ hasText: 'Mattermost operations' });
  const webhookActions = webhookArticle.getByRole('button', { name: 'Webhook actions for Mattermost operations' });
  await webhookActions.click();
  await page.getByRole('menuitem', { name: 'Delivery history' }).click();
  await expect(page.getByText('Delivered', { exact: true })).toBeVisible();
  await expect(page.getByText('Superseded', { exact: true })).toBeVisible();
  await expect(page.getByText('Deliberately not sent because the issue state advanced.', { exact: true })).toBeVisible();
  await expect(page.getByText('run.failed.v1', { exact: true }).last()).toBeVisible();

  await webhookActions.click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  const confirmation = page.getByRole('dialog', { name: 'Delete Mattermost operations?' });
  await expect(confirmation).toBeFocused();
  await confirmation.getByRole('button', { name: 'Cancel' }).click();
  await expect(webhookActions).toBeFocused();
  await expect(page.getByText('Mattermost operations', { exact: true })).toBeVisible();

  const createWebhook = page.getByRole('button', { name: 'Create webhook' }).first();
  await createWebhook.click();
  let drawer = page.getByRole('dialog', { name: 'Create webhook' });
  await expect(drawer).toBeVisible();
  await drawer.getByRole('button', { name: 'Cancel' }).click();
  await expect(createWebhook).toBeFocused();

  await createWebhook.click();
  drawer = page.getByRole('dialog', { name: 'Create webhook' });
  await drawer.press('Escape');
  await expect(createWebhook).toBeFocused();

  await createWebhook.click();
  drawer = page.getByRole('dialog', { name: 'Create webhook' });
  const issueAlerts = drawer.getByRole('button', { name: 'Issue alerts' });
  const eventList = drawer.locator('[data-event-scroll-region]');
  const eventScrollbar = drawer.locator('[data-event-scrollbar]');
  const eventScrollThumb = drawer.locator('[data-event-scroll-thumb]');
  const issueEvents = [
    drawer.getByRole('checkbox', { name: 'issue / created' }),
    drawer.getByRole('checkbox', { name: 'issue / reopened' }),
    drawer.getByRole('checkbox', { name: 'issue / resolved' })
  ];
  await expect(issueAlerts).toHaveAttribute('aria-pressed', 'true');
  await expect(eventList).toHaveCSS('overflow-y', 'scroll');
  await expect(eventScrollbar).toBeVisible();
  await issueAlerts.click();
  await expect(issueAlerts).toHaveAttribute('aria-pressed', 'false');
  for (const eventCheckbox of issueEvents) await expect(eventCheckbox).not.toBeChecked();
  await issueAlerts.click();
  await expect(issueAlerts).toHaveAttribute('aria-pressed', 'true');
  for (const eventCheckbox of issueEvents) await expect(eventCheckbox).toBeChecked();
  await expect.poll(() => eventList.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await expect(eventScrollThumb).not.toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');

  await drawer.getByLabel('Name').fill('Mattermost incident channel');
  await drawer.getByLabel('Delivery URL').fill('https://mattermost-bot.fixture.acornops.dev/webhooks/incidents');
  await drawer.getByRole('button', { name: 'Create webhook' }).click();
  await expect(page.getByText('One-time signing secret for Mattermost incident channel')).toBeVisible();
  await expect(page.getByText('whsec_fixture_local_only')).toBeVisible();
});

test('outbound webhooks remain usable from compact navigation', async ({ browser }) => {
  const context = await browser.newContext({
    reducedMotion: 'reduce',
    viewport: { width: 390, height: 844 }
  });
  const page = await context.newPage();

  await page.goto('/workspaces/fixture-workspace/webhooks', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Outbound webhooks' })).toBeVisible();
  await page.getByRole('button', { name: 'Open navigation' }).click();
  const navigation = page.getByRole('dialog', { name: 'Navigation' });
  await expect(navigation.getByRole('link', { name: 'Outbound Webhook' })).toHaveAttribute('aria-current', 'page');
  await navigation.getByRole('button', { name: 'Close navigation' }).click();

  await page.getByRole('button', { name: 'Create webhook' }).click();
  await expect(page.getByRole('dialog', { name: 'Create webhook' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await context.close();
});

test('genuinely empty outbound webhooks omit inactive discovery controls', async ({ page }) => {
  await page.goto('/workspaces/fixture-workspace/webhooks', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Mattermost operations', { exact: true })).toBeVisible();
  try {
    await page.evaluate(async () => {
      const response = await fetch('/api/v1/workspaces/fixture-workspace/webhooks');
      const body = await response.json() as { items: Array<{ id: string }> };
      await Promise.all(body.items.map((webhook) => fetch(
        `/api/v1/workspaces/fixture-workspace/webhooks/${encodeURIComponent(webhook.id)}`,
        { method: 'DELETE' }
      )));
    });
    await page.getByRole('button', { name: 'Refresh' }).click();

    await expect(page.getByRole('heading', { name: 'No webhooks configured' })).toBeVisible();
    await expect(page.getByRole('searchbox', { name: 'Search outbound webhooks' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Create webhook' })).toBeVisible();
  } finally {
    await page.evaluate(() => fetch('/api/v1/__fixtures/reset', { method: 'POST' }));
  }
});

test('automation collection search is clear and usable on compact layouts', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto('/workspaces/fixture-workspace/triggers?type=acornops_event', { waitUntil: 'domcontentloaded' });
  const triggerArticle = page.getByRole('article').filter({ hasText: 'Triage new issues' });
  const triggerAction = triggerArticle.getByRole('button', { name: 'Trigger actions for Triage new issues' });
  await expect(triggerAction).toBeVisible();
  const [triggerArticleBox, triggerActionBox] = await Promise.all([
    triggerArticle.boundingBox(),
    triggerAction.boundingBox()
  ]);
  expect(triggerActionBox?.x).toBeGreaterThanOrEqual(triggerArticleBox?.x || 0);
  expect((triggerActionBox?.x || 0) + (triggerActionBox?.width || 0))
    .toBeLessThanOrEqual((triggerArticleBox?.x || 0) + (triggerArticleBox?.width || 0));
  const eventSearch = page.getByRole('searchbox', { name: 'Search AcornOps event triggers' });
  await expect(eventSearch).toBeVisible();
  await eventSearch.fill('production health');
  await expect(page.getByText('Triage new issues', { exact: true })).toBeVisible();
  await eventSearch.fill('not configured');
  await expect(page.getByText('No event triggers match these filters', { exact: true })).toBeVisible();

  await page.goto('/workspaces/fixture-workspace/webhooks', { waitUntil: 'domcontentloaded' });
  const webhookArticle = page.getByRole('article').filter({ hasText: 'Mattermost operations' });
  const webhookAction = webhookArticle.getByRole('button', { name: 'Webhook actions for Mattermost operations' });
  await expect(webhookAction).toBeVisible();
  const [webhookArticleBox, webhookActionBox] = await Promise.all([
    webhookArticle.boundingBox(),
    webhookAction.boundingBox()
  ]);
  expect(webhookActionBox?.x).toBeGreaterThanOrEqual(webhookArticleBox?.x || 0);
  expect((webhookActionBox?.x || 0) + (webhookActionBox?.width || 0))
    .toBeLessThanOrEqual((webhookArticleBox?.x || 0) + (webhookArticleBox?.width || 0));
  const webhookSearch = page.getByRole('searchbox', { name: 'Search outbound webhooks' });
  await expect(webhookSearch).toBeVisible();
  await webhookSearch.fill('run.failed.v1');
  await expect(page.getByText('Mattermost operations', { exact: true })).toBeVisible();
  await webhookSearch.fill('not configured');
  await expect(page.getByText('No webhooks match these filters', { exact: true })).toBeVisible();

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('mobile VM resource routes reveal the URL-selected category tab', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(
    '/workspaces/fixture-workspace/virtual-machines/fixture-vm/network',
    { waitUntil: 'domcontentloaded' }
  );

  const tabList = page.getByRole('tablist', { name: 'VM resource categories' });
  const networkTab = tabList.getByRole('tab', { name: /Network/ });
  await expect(networkTab).toHaveAttribute('aria-selected', 'true');
  const [tabListBox, networkTabBox] = await Promise.all([
    tabList.boundingBox(),
    networkTab.boundingBox()
  ]);
  expect(networkTabBox?.x).toBeGreaterThanOrEqual(tabListBox?.x || 0);
  expect((networkTabBox?.x || 0) + (networkTabBox?.width || 0))
    .toBeLessThanOrEqual((tabListBox?.x || 0) + (tabListBox?.width || 0));
});

test('automation ledgers replace column headings with filtered-empty states', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });

  await page.goto('/workspaces/fixture-workspace/triggers', { waitUntil: 'domcontentloaded' });
  const scheduleLedger = page.getByRole('region', { name: 'Workflow schedules' });
  await expect(scheduleLedger.getByRole('columnheader')).toHaveText([
    'Schedule',
    'Workflow',
    'Cadence',
    'Next run',
    'Inputs & access',
    'Activity',
    'Actions'
  ]);
  const scheduleRow = scheduleLedger.getByRole('row').filter({ hasText: 'Weekday morning review' });
  const scheduleActions = scheduleRow.getByRole('button', { name: 'Schedule actions for Weekday morning review' });
  await scheduleActions.click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  const scheduleDeleteDialog = page.getByRole('dialog', { name: 'Delete “Weekday morning review”?' });
  await expect(scheduleDeleteDialog).toBeVisible();
  await scheduleDeleteDialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(scheduleDeleteDialog).toHaveCount(0);
  await expect(scheduleActions).toBeFocused();
  await page.getByRole('searchbox', { name: 'Search schedules' }).fill('not configured');
  await expect(page.getByRole('heading', { name: 'No schedules match these filters' })).toBeVisible();
  await expect(scheduleLedger.getByRole('columnheader')).toHaveCount(0);

  await page.goto('/workspaces/fixture-workspace/triggers?type=acornops_event', { waitUntil: 'domcontentloaded' });
  const triggerLedger = page.getByRole('region', { name: 'Workflow event triggers' });
  await expect(triggerLedger.locator('span').filter({ hasText: /^Trigger$/ })).toBeVisible();
  await expect(triggerLedger.locator('span').filter({ hasText: /^Workflow$/ })).toBeVisible();
  await expect(triggerLedger.locator('span').filter({ hasText: /^Configuration$/ })).toBeVisible();
  await expect(triggerLedger.locator('span').filter({ hasText: /^Activity$/ })).toBeVisible();
  await expect(triggerLedger.locator('span').filter({ hasText: /^Actions$/ })).toBeVisible();
  const eventTriggerArticle = triggerLedger.getByRole('article').filter({ hasText: 'Triage new issues' });
  const eventTriggerActions = eventTriggerArticle.getByRole('button', { name: 'Trigger actions for Triage new issues' });
  await eventTriggerActions.click();
  await expect(page.getByRole('menuitem', { name: 'Edit' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Pause' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(eventTriggerActions).toBeFocused();
  await page.getByRole('searchbox', { name: 'Search AcornOps event triggers' }).fill('not configured');
  await expect(page.getByText('No event triggers match these filters', { exact: true })).toBeVisible();
  await expect(triggerLedger.locator('span').filter({ hasText: /^Trigger$/ })).toHaveCount(0);

  await page.goto('/workspaces/fixture-workspace/webhooks', { waitUntil: 'domcontentloaded' });
  const webhookLedger = page.getByRole('region', { name: 'Configured webhooks' });
  await expect(webhookLedger.locator('span').filter({ hasText: /^Webhook$/ })).toBeVisible();
  await expect(webhookLedger.locator('span').filter({ hasText: /^Destination$/ })).toBeVisible();
  await expect(webhookLedger.locator('span').filter({ hasText: /^Events$/ })).toBeVisible();
  await expect(webhookLedger.locator('span').filter({ hasText: /^Modified$/ })).toBeVisible();
  await expect(webhookLedger.locator('span').filter({ hasText: /^Actions$/ })).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search outbound webhooks' }).fill('not configured');
  await expect(page.getByText('No webhooks match these filters', { exact: true })).toBeVisible();
  await expect(webhookLedger.locator('span').filter({ hasText: /^Webhook$/ })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('workspace run links focus the exact execution in workflow history', async ({ page }) => {
  await page.goto('/workspaces/fixture-workspace/runs', { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: /Waiting for approval.*Review run/ }).click();

  await expect(page).toHaveURL(/workflow=fixture-workflow.*tab=runs.*execution=fixture-execution-issue-approval/);
  const execution = page.locator('#workflow-execution-fixture-execution-issue-approval');
  await expect(execution).toBeVisible();
  await expect(execution).toBeFocused();
  await expect(execution.getByText('Waiting for approval', { exact: true }).first()).toBeVisible();
});

test('Agent detail scopes lifecycle and version actions to Settings', async ({ page }) => {
  await page.goto('/workspaces/fixture-workspace/agents/fixture-specialist/chat', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { level: 1, name: 'Agent chat' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit agent' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Delete', exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: 'Agent Settings' }).click();
  await expect(page).toHaveURL('/workspaces/fixture-workspace/agents/fixture-specialist/settings');
  await expect(page.getByRole('button', { name: 'Edit agent' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Disable', exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Delete', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Configuration versions' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Refresh' }).locator('svg')).toBeVisible();
});

test('recommended workflows can be added and activated without entering the library first', async ({ page }) => {
  await page.goto('/workspaces/fixture-workspace/workflows', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Add workflows' }).click();
  await expect(page).toHaveURL(/panel=recommendations/);

  const drawer = page.getByRole('dialog', { name: 'Add recommended workflows' });
  await expect(drawer).toBeVisible();
  await expect(drawer).toBeFocused();
  await expect(drawer.getByRole('button', { name: /Target diagnostics/ })).toBeVisible();
  await expect(drawer.getByRole('button', { name: /Target remediation/ })).toBeVisible();
  await expect(drawer.getByRole('button', { name: /Incident report/ })).toBeVisible();
  await expect(drawer.getByRole('button', { name: /Incident investigation/ })).toBeVisible();

  await drawer.getByRole('button', { name: /Target remediation/ }).click();
  await expect(drawer.getByRole('button', { name: 'Add workflow' })).toBeEnabled();
  await drawer.getByRole('button', { name: 'Add workflow' }).click();
  await expect(drawer.getByRole('button', { name: 'Activate workflow' })).toBeEnabled();
  await drawer.getByRole('button', { name: 'Activate workflow' }).click();
  await expect(drawer.getByText('Active', { exact: true })).toBeVisible();
});

test('recommended workflow catalog failure is retryable without leaving the page', async ({ page }) => {
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    let rejectTemplateRequests = true;
    Object.defineProperty(window, '__allowFixtureTemplateRequests', {
      value: () => { rejectTemplateRequests = false; }
    });
    window.fetch = (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (rejectTemplateRequests && new URL(url, window.location.href).pathname.endsWith('/automation-templates')) {
        return Promise.resolve(new Response(JSON.stringify({ error: { code: 'FIXTURE_TEMPLATE_FAILURE', message: 'Recommendation catalog is temporarily unavailable.' } }), {
          status: 503,
          headers: { 'content-type': 'application/json' }
        }));
      }
      return originalFetch(input, init);
    };
  });

  await page.goto('/workspaces/fixture-workspace/workflows', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Add workflows' }).click();
  const drawer = page.getByRole('dialog', { name: 'Add recommended workflows' });
  await expect(drawer.getByRole('alert')).toContainText('Recommendation catalog is temporarily unavailable.');
  await page.evaluate(() => (window as typeof window & { __allowFixtureTemplateRequests: () => void }).__allowFixtureTemplateRequests());
  await drawer.getByRole('button', { name: 'Retry' }).click();
  await expect(drawer.getByRole('button', { name: /Target remediation/ })).toBeVisible();
});
