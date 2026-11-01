import { expect, test } from '@playwright/test';

for (const osFamily of ['linux', 'windows']) test(`${osFamily} onboarding expires cached connection and rejects stale confirmation`, async ({ page }) => {
  await page.clock.install({ time: new Date('2030-01-01T00:00:00Z') });
  await page.addInitScript(({ osFamily }) => {
    const originalFetch = window.fetch.bind(window);
    const state = { expired: false };
    (window as unknown as { onboardingFreshness: typeof state }).onboardingFreshness = state;
    window.fetch = async (input, init) => {
      const response = await originalFetch(input, init);
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.href);
      if (init?.method && init.method !== 'GET') return response;
      if (url.pathname.endsWith('/virtual-machines/registration-options')) return new Response(JSON.stringify({ platforms: [
        { osFamily: 'linux', serviceManager: 'systemd', accessModes: ['read_only', 'read_write'] },
        { osFamily: 'windows', serviceManager: 'scm', accessModes: ['read_only'] },
      ] }), { headers: { 'content-type': 'application/json' } });
      if (!/\/virtual-machines(?:\/[^/]+)?$/.test(url.pathname)) return response;
      const payload = await response.json();
      const transform = (vm: Record<string, unknown>) => ({ ...vm, status: 'online', osFamily,
        serviceManager: osFamily === 'windows' ? 'scm' : 'systemd', agentAccessMode: 'read_only', restartServices: [],
        connection: { state: state.expired ? 'disconnected' : 'connected', hasConnectionEvidence: true,
          lastHeartbeatAt: '2026-01-01T00:00:00Z', observedAt: state.expired ? '2026-01-01T00:03:00Z' : '2026-01-01T00:01:45Z', expiresAt: '2026-01-01T00:02:00Z' },
      });
      return new Response(JSON.stringify(Array.isArray(payload.items) ? { ...payload, items: payload.items.map(transform) } : transform(payload)), { headers: { 'content-type': 'application/json' } });
    };
  }, { osFamily });
  await page.goto('/workspaces/fixture-workspace/virtual-machines');
  await page.getByRole('button', { name: 'Connect VM' }).click();
  await page.getByRole('textbox', { name: 'VM name' }).fill('Freshness VM');
  if (osFamily === 'windows') {
    await page.getByRole('button', { name: 'Operating system' }).click();
    await page.getByRole('option', { name: 'Windows', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Continue to Install Agent' }).click();
  const dialog = page.getByRole('dialog', { name: 'Connect VM' });
  await expect(dialog.getByRole('region', { name: 'Install command' })).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(dialog.getByRole('status')).toHaveText('Agent connected');
  await page.evaluate(() => { (window as unknown as { onboardingFreshness: { expired: boolean } }).onboardingFreshness.expired = true; });
  await page.clock.fastForward(15_001);
  await expect(dialog.getByRole('status')).not.toHaveText('Agent connected', { timeout: 1000 });
  await dialog.getByRole('button', { name: "I've Installed the Agent" }).click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('alert')).toContainText('not connected');
});
