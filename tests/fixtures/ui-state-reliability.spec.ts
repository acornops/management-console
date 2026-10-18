import { expect, test } from '@playwright/test';

test('unknown workflow keeps requested identity without transient substitute actions', async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).substituteActionSeen = false;
    new MutationObserver(() => {
      if (document.querySelector('[aria-label="Selected workflow actions"]')) (window as any).substituteActionSeen = true;
    }).observe(document, { childList: true, subtree: true });
  });
  await page.goto('/workspaces/fixture-workspace/workflows?workflow=missing-ui-polish&tab=overview');
  await expect(page.getByText('Workflow unavailable', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/workflow=missing-ui-polish&tab=overview/);
  expect(await page.evaluate(() => (window as any).substituteActionSeen)).toBe(false);
  await page.getByRole('button', { name: 'Back to workflows', exact: true }).click();
  await expect(page).not.toHaveURL(/workflow=/);
  await page.getByRole('button', { name: /Production health review/ }).first().click();
  await expect(page).toHaveURL(/workflow=fixture-workflow/);
});

for (const selection of ['fixture-workflow', 'Production health review']) {
  test(`valid workflow deep link ${selection} keeps its identity`, async ({ page }) => {
    await page.goto(`/workspaces/fixture-workspace/workflows?workflow=${encodeURIComponent(selection)}`);
    await expect(page.locator('[aria-label="Selected workflow actions"]')).toBeVisible();
    await expect(page).toHaveURL(/workflow=fixture-workflow/);
    await expect(page.getByText('Workflow unavailable', { exact: true })).toHaveCount(0);
  });
}

test('RBAC failure is an error while a completed mutation is success', async ({ page }) => {
  await page.goto('/workspaces/fixture-workspace/kubernetes-clusters?fixtureFailurePath=kubernetes-rbac-additions');
  await page.getByRole('button', { name: 'Connect Cluster', exact: true }).click();
  const error = page.getByRole('alert').filter({ hasText: 'The service could not complete the request.' });
  await expect(error.locator('.lucide-circle-alert')).toBeVisible();
  await expect(error.locator('.lucide-circle-check')).toHaveCount(0);
  await page.goto('/workspaces/fixture-workspace/virtual-machines/fixture-vm/settings');
  await page.getByRole('button', { name: 'Permission mode', exact: true }).click();
  await page.getByRole('option', { name: 'Auto-run allowed changes', exact: true }).click();
  const success = page.getByRole('status').filter({ hasText: 'VM run permissions updated.' });
  await expect(success.locator('.lucide-circle-check')).toBeVisible();
  await expect(success.locator('.lucide-circle-alert')).toHaveCount(0);
});

test('integration failures are not empty and retry is truthful', async ({ page }) => {
  await page.goto('/account?fixtureFailurePath=external-integrations/links&fixtureEmptyPath=external-integrations/links');
  await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
  await expect(page.getByText('No external integrations are linked to this account.', { exact: true })).toHaveCount(0);
  await page.evaluate(() => history.replaceState(history.state, '', '/account?fixtureEmptyPath=external-integrations/links'));
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByText('No external integrations are linked to this account.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry', exact: true })).toHaveCount(0);
});

test('integration refresh failure retains prior rows and unsaved grants; successful Retry clears stale feedback', async ({ page }) => {
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    (window as any).integrationReadFails = false;
    const link = {
      id: 'fixture-link', integrationClientId: 'fixture-client', provider: 'fixture',
      clientDisplayName: 'Fixture integration', externalUserId: 'fixture-external-user', externalDisplayName: 'Fixture operator',
      linkedAt: '2026-10-18T08:00:00Z', lastAuthenticatedAt: '2026-10-18T08:00:00Z', expiresAt: '2026-10-20T08:00:00Z',
      grants: [{ workspaceId: 'fixture-workspace', capabilities: ['read_workspace_data'], grantedByUserId: 'fixture-user', createdAt: '2026-10-18T08:00:00Z', updatedAt: '2026-10-18T08:00:00Z' }],
      grantableWorkspaces: [{ workspaceId: 'fixture-workspace', workspaceName: 'Fixture workspace', role: 'owner', grantedCapabilities: ['read_workspace_data'], grantableCapabilities: ['read_workspace_data', 'create_sessions'] }]
    };
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
    window.fetch = (input, init) => {
      const path = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.href).pathname;
      if (path === '/api/v1/auth/external-integrations/links') return Promise.resolve((window as any).integrationReadFails
        ? json({ error: { code: 'UNAVAILABLE', message: 'Refresh unavailable', retryable: true } }, 503)
        : json({ links: [link] }));
      if (path.endsWith('/external-integrations/links/fixture-link/grants')) return Promise.resolve(json({ error: { code: 'UNAVAILABLE', message: 'Save unavailable', retryable: true } }, 503));
      return originalFetch(input, init);
    };
  });
  await page.goto('/account');
  const integrations = page.getByRole('region', { name: 'External Integrations', exact: true });
  await expect(integrations.getByText('Fixture integration', { exact: true })).toBeVisible();
  const sessions = integrations.getByRole('checkbox', { name: 'Create sessions', exact: true });
  await sessions.check();
  await integrations.getByRole('button', { name: 'Save grants', exact: true }).click();
  await expect(integrations.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
  await page.evaluate(() => { (window as any).integrationReadFails = true; });
  await integrations.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(integrations.getByText('Could not refresh integrations. Previously loaded data is shown.')).toBeVisible();
  await expect(integrations.getByText('Fixture integration', { exact: true })).toBeVisible();
  await expect(sessions).toBeChecked();
  await page.evaluate(() => { (window as any).integrationReadFails = false; });
  await integrations.getByRole('button', { name: 'Retry', exact: true }).first().click();
  await expect(integrations.getByRole('button', { name: 'Retry', exact: true })).toHaveCount(0);
  await expect(integrations.getByText('Could not refresh integrations. Previously loaded data is shown.')).toHaveCount(0);
});
