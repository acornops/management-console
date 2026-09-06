import { expect, test } from '@playwright/test';

const workspaceId = 'fixture-workspace';
const workload = (url: string) => /\/api\/v1\/(?:runs|sessions|targets)\b/.test(url) || /\/api\/v1\/workspaces\/[^/]+\/(?!access-state(?:[?]|$))/.test(url);

for (const route of ['overview', 'kubernetes-clusters/fixture-cluster/overview', 'agents/fixture-workflow-analyst']) {
  test(`suspended deep link ${route} makes zero workload requests`, async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('acornops-fixture-suspended-workspace', 'fixture-workspace'));
    const requests: string[] = [];
    page.on('request', request => { if (workload(request.url())) requests.push(request.url()); });
    await page.goto(`/workspaces/${workspaceId}/${route}`);
    await expect(page.getByRole('alertdialog')).toContainText('AcornOps Fixture Lab is suspended');
    await expect(page.getByRole('alertdialog')).toContainText('Workspace access is temporarily suspended.');
    await expect(page.getByText('Singapore Production', { exact: true })).toHaveCount(0);
    await page.waitForTimeout(500);
    expect(requests).toEqual([]);
    await page.getByRole('button', { name: 'Back to workspace directory' }).click();
    await expect(page.getByRole('heading', { name: 'AcornOps Fixture Lab · Suspended' })).toBeVisible();
  });
}

test('idle current tab clears workload UI on suspension and restoration loads a fresh overview', async ({ page }) => {
  await page.goto(`/workspaces/${workspaceId}/kubernetes-clusters`);
  await expect(page.getByText('Singapore Production', { exact: true }).first()).toBeVisible();
  await page.evaluate(() => localStorage.setItem('acornops-fixture-suspended-workspace', 'fixture-workspace'));
  await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: 20000 });
  await expect(page.getByText('Singapore Production', { exact: true })).toHaveCount(0);
  const requests: string[] = [];
  page.on('request', request => { if (workload(request.url())) requests.push(request.url()); });
  await page.evaluate(() => localStorage.removeItem('acornops-fixture-suspended-workspace'));
  await page.waitForTimeout(500);
  expect(requests).toEqual([]);
  await page.getByRole('button', { name: 'Refresh access' }).click();
  await expect(page).toHaveURL(/\/overview$/);
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect(page.locator('#root')).toContainText('AcornOps Fixture Lab');
});

test('password login preserves a suspended deep link without workload requests', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('acornops-fixture-suspended-workspace', 'fixture-workspace');
    const original = window.fetch.bind(window);
    let signedIn = false;
    window.fetch = async (input, init) => {
      const url = String(input instanceof Request ? input.url : input);
      if (url.endsWith('/api/v1/auth/config')) return Response.json({ oidcEnabled: false, passwordAuthEnabled: true, passwordSignupEnabled: false });
      if (url.endsWith('/api/v1/me') && !signedIn) return Response.json({ error: { code: 'UNAUTHORIZED', message: 'Sign in' } }, { status: 401 });
      if (url.endsWith('/api/v1/auth/password/login')) { signedIn = true; return Response.json({ user: { id: 'fixture-user', email: 'operator@example.com', displayName: 'Operator' } }); }
      return original(input, init);
    };
  });
  const requests: string[] = [];
  page.on('request', request => { if (workload(request.url())) requests.push(request.url()); });
  await page.goto(`/workspaces/${workspaceId}/kubernetes-clusters`);
  await page.locator('#auth-identifier').fill('operator@example.com');
  await page.locator('#auth-password').fill('test-password');
  await page.locator('form button[type="submit"]').click();
  await expect(page.getByRole('alertdialog')).toContainText('AcornOps Fixture Lab is suspended');
  expect(requests).toEqual([]);
});
