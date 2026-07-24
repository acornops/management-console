import { expect, test } from '@playwright/test';

const routes = [
  { path: '/workspaces/fixture-workspace/overview', text: 'AcornOps Fixture Lab' },
  { path: '/workspaces/fixture-workspace/kubernetes-clusters', text: 'Singapore Production' },
  { path: '/kubernetes-clusters/fixture-cluster/overview', text: 'Singapore Production' },
  { path: '/workspaces/fixture-workspace/virtual-machines', text: 'Payments VM' },
  { path: '/workspaces/fixture-workspace/agents', text: 'Workflow Analyst' },
  { path: '/workspaces/fixture-workspace/workflows', text: 'Production health review' },
  { path: '/workspaces/fixture-workspace/schedules', text: 'Weekday morning review' },
  { path: '/workspaces/fixture-workspace/approvals', text: 'No approvals waiting' },
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

test('webhook settings expose history, confirmation, and one-time secret flows', async ({ page }) => {
  await page.goto('/workspaces/fixture-workspace/webhooks', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Mattermost operations', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'History' }).click();
  await expect(page.getByText('Delivered', { exact: true })).toBeVisible();
  await expect(page.getByText('Superseded', { exact: true })).toBeVisible();
  await expect(page.getByText('Deliberately not sent because the issue state advanced.', { exact: true })).toBeVisible();
  await expect(page.getByText('run.failed.v1', { exact: true }).last()).toBeVisible();

  await page.getByRole('button', { name: 'Delete' }).click();
  const confirmation = page.getByRole('alert').filter({ hasText: 'Delete Mattermost operations?' });
  await expect(confirmation).toBeFocused();
  await confirmation.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByText('Mattermost operations', { exact: true })).toBeVisible();

  await page.getByLabel('Name').fill('Mattermost incident channel');
  await page.getByLabel('Delivery URL').fill('https://mattermost-bot.fixture.acornops.dev/webhooks/incidents');
  await page.getByRole('button', { name: 'Create webhook' }).click();
  await expect(page.getByText('One-time signing secret for Mattermost incident channel')).toBeVisible();
  await expect(page.getByText('whsec_fixture_local_only')).toBeVisible();
});

test('agent profile scopes lifecycle actions to Settings and icons restore-point refresh', async ({ page }) => {
  await page.goto('/workspaces/fixture-workspace/agents?panel=profile&agent=fixture-specialist&agentTab=overview', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('dialog', { name: 'Kubernetes Specialist' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Disable agent' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Delete agent' })).toHaveCount(0);

  await page.getByRole('tab', { name: 'Settings' }).click();
  await expect(page.getByRole('button', { name: 'Disable agent' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Delete agent' })).toBeVisible();

  await page.getByRole('tab', { name: 'Restore points' }).click();
  await expect(page.getByRole('button', { name: 'Refresh' }).locator('svg')).toBeVisible();
});

test('workflow templates install and activate without entering the library first', async ({ page }) => {
  await page.goto('/workspaces/fixture-workspace/workflows', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Install templates' }).click();

  const drawer = page.getByRole('dialog', { name: 'Install workflow templates' });
  await expect(drawer).toBeVisible();
  await expect(drawer).toBeFocused();
  await expect(drawer.getByRole('button', { name: /Target diagnostics/ })).toBeVisible();
  await expect(drawer.getByRole('button', { name: /Target remediation/ })).toBeVisible();
  await expect(drawer.getByRole('button', { name: /Target remediation/ })).toBeVisible();
  await expect(drawer.getByRole('button', { name: /Incident report/ })).toBeVisible();
  await expect(drawer.getByRole('button', { name: /Incident investigation/ })).toBeVisible();

  await drawer.getByRole('button', { name: /Target remediation/ }).click();
  await expect(drawer.getByRole('button', { name: 'Install workflow' })).toBeEnabled();
  await drawer.getByRole('button', { name: 'Install workflow' }).click();
  await expect(drawer.getByRole('button', { name: 'Activate workflow' })).toBeEnabled();
  await drawer.getByRole('button', { name: 'Activate workflow' }).click();
  await expect(drawer.getByText('active', { exact: true })).toBeVisible();
});

test('workflow template catalog failure is retryable without leaving the page', async ({ page }) => {
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    let rejectTemplateRequests = true;
    Object.defineProperty(window, '__allowFixtureTemplateRequests', {
      value: () => { rejectTemplateRequests = false; }
    });
    window.fetch = (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (rejectTemplateRequests && new URL(url, window.location.href).pathname.endsWith('/automation-templates')) {
        return Promise.resolve(new Response(JSON.stringify({ error: { code: 'FIXTURE_TEMPLATE_FAILURE', message: 'Template catalog is temporarily unavailable.' } }), {
          status: 503,
          headers: { 'content-type': 'application/json' }
        }));
      }
      return originalFetch(input, init);
    };
  });

  await page.goto('/workspaces/fixture-workspace/workflows', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Install templates' }).click();
  const drawer = page.getByRole('dialog', { name: 'Install workflow templates' });
  await expect(drawer.getByRole('alert')).toContainText('Template catalog is temporarily unavailable.');
  await page.evaluate(() => (window as typeof window & { __allowFixtureTemplateRequests: () => void }).__allowFixtureTemplateRequests());
  await drawer.getByRole('button', { name: 'Retry' }).click();
  await expect(drawer.getByRole('button', { name: /Target remediation/ })).toBeVisible();
});
