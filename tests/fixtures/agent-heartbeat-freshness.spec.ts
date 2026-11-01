import { expect, test, type Page } from '@playwright/test';

async function installObservation(page: Page, windows = false) {
  await page.clock.install({ time: new Date('2030-01-01T00:00:00Z') });
  await page.addInitScript(({ windows }) => {
    const fetch = window.fetch.bind(window);
    const state = { outage: false };
    (window as unknown as { heartbeatFixture: typeof state }).heartbeatFixture = state;
    window.fetch = async (input, init) => {
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.href);
      const targetRead = /\/(virtual-machines|kubernetes-clusters)(\/fixture-(vm|cluster))?$/.test(url.pathname);
      if (targetRead && state.outage) return new Response('{}', { status: 503 });
      const response = await fetch(input, init);
      if (!targetRead || (init?.method && init.method !== 'GET')) return response;
      const payload = await response.json();
      const transform = (item: Record<string, unknown>) => ({ ...item, status: 'online',
        ...(url.pathname.includes('virtual-machines') ? { osFamily: windows ? 'windows' : 'linux', serviceManager: windows ? 'scm' : 'systemd', agentAccessMode: 'read_only', restartServices: [] } : {}),
        connection: { state: 'connected', lastHeartbeatAt: '2026-11-02T00:00:00Z',
          observedAt: '2026-11-02T00:01:45Z', expiresAt: '2026-11-02T00:02:00Z' }
      });
      return new Response(JSON.stringify(Array.isArray(payload.items) ? { ...payload, items: payload.items.map(transform) } : transform(payload)), { headers: { 'content-type': 'application/json' } });
    };
  }, { windows });
}

async function outage(page: Page) {
  await page.evaluate(() => { (window as unknown as { heartbeatFixture: { outage: boolean } }).heartbeatFixture.outage = true; });
  await page.clock.fastForward(15_001);
}

for (const windows of [false, true]) test(`${windows ? 'Windows' : 'Linux'} VM cache expires during outage and survives navigation`, async ({ page }) => {
  await installObservation(page, windows);
  const root = '/workspaces/fixture-workspace/virtual-machines';
  await page.goto(root);
  const card = page.locator('[data-vm-card="true"]').filter({ hasText: 'Payments VM' });
  await expect(card).toBeVisible();
  await page.waitForLoadState('networkidle');
  await expect(card.locator('[aria-label^="Disconnected:"]:visible')).toHaveCount(0);
  await outage(page);
  await expect(card.locator('[aria-label^="Disconnected:"]:visible')).toBeVisible({ timeout: 1000 });
  await page.evaluate((path) => { history.pushState({}, '', path); dispatchEvent(new PopStateEvent('popstate')); }, `${root}/fixture-vm`);
  await expect(page.getByText('Disconnected', { exact: true }).first()).toBeVisible();
  await page.evaluate((path) => { history.pushState({}, '', path); dispatchEvent(new PopStateEvent('popstate')); }, `${root}?status=healthy`);
  await expect(page.locator('[data-vm-card="true"]')).toHaveCount(0);
});

test('Kubernetes detail reports an expired connection while refreshes fail', async ({ page }) => {
  await installObservation(page);
  await page.goto('/workspaces/fixture-workspace/kubernetes-clusters/fixture-cluster/settings');
  await expect(page.getByText('Connected', { exact: true })).toBeVisible();
  await outage(page);
  await expect(page.getByText('Disconnected', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Setup Required', { exact: true })).toHaveCount(0);
});
