import { expect, test, type Page } from '@playwright/test';

const root = '/workspaces/fixture-workspace/virtual-machines';
// Synthetic HTTP 200 native envelopes: these exercise composition/cache behavior, not Windows permissions.
async function installWindowsCollections(page: Page) {
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    const state = { partial: false, delay: false, pending: [] as (() => void)[], requests: 0 };
    (window as any).windowsCollections = state;
    window.fetch = async (input, init) => {
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.href);
      const isSecond = url.pathname.includes('/fixture-vm-second/');
      if (/\/virtual-machines\/fixture-vm(?:-second)?\/(logs|resources)$/.test(url.pathname)) {
        state.requests++;
        let body;
        if (url.pathname.endsWith('/logs')) {
          const channel = url.searchParams.get('channel');
          const status = isSecond ? 'ok' : state.partial ? 'partial' : channel === 'System' ? 'unavailable' : 'permission_denied';
          const entries = status === 'ok' || status === 'partial' ? [{ channel, timestamp: '2026-10-31T01:00:00.000Z', message: isSecond ? 'Second target event' : 'Retained partial event' }] : [];
          body = { entries, health: { collector: 'windows_events', status, duration_ms: 1, message: '<script>untrusted runtime text</script>' },
            truncated: status !== 'ok', returned_count: entries.length, original_count: entries.length + (status === 'partial' ? 2 : 0), byte_count: 200 };
        } else {
          const snapshotTs = isSecond ? '2026-10-31T02:00:00.000Z' : '2026-10-31T01:00:00.000Z';
          body = { items: [{ name: isSecond ? 'Second target process' : 'Retained partial process', category: 'processes', snapshotTs }],
            collectionStatus: { targetId: isSecond ? 'fixture-vm-second' : 'fixture-vm', workspaceId: 'fixture-workspace', snapshotTs, categories: {
              host: { status: 'ok' }, filesystems: { status: 'permission_denied', omittedCount: 0, findingCoverage: 'incomplete' },
              services: { status: 'timed_out', omittedCount: 0, findingCoverage: 'incomplete' },
              processes: { status: isSecond ? 'ok' : 'partial', omittedCount: isSecond ? 0 : 3 }, network: { status: 'ok', omittedCount: 0 }
            } } };
        }
        const respond = () => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
        if (state.delay) return new Promise<Response>((resolve) => state.pending.push(() => resolve(respond())));
        return respond();
      }
      const response = await originalFetch(input, init);
      if (url.pathname.endsWith('/virtual-machines') && (!init?.method || init.method === 'GET')) {
        const body = await response.json();
        const vm = { ...body.items[0], id: 'fixture-vm', name: 'Windows first', osFamily: 'windows', serviceManager: 'scm', agentAccessMode: 'read_only', restartServices: [] };
        return new Response(JSON.stringify({ ...body, items: [vm, { ...vm, id: 'fixture-vm-second', name: 'Windows second' }] }), { headers: { 'content-type': 'application/json' } });
      }
      return response;
    };
  });
}
async function navigate(page: Page, path: string) {
  await page.evaluate((path) => { history.pushState({}, '', path); dispatchEvent(new PopStateEvent('popstate')); }, path);
}
async function release(page: Page) {
  await page.evaluate(async () => {
    (window as any).windowsCollections.pending.splice(0).forEach((resolve: () => void) => resolve());
    await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame);
  });
}

test('synthetic Windows HTTP 200 failures and partial logs stay visible across channel and target changes', async ({ page }) => {
  await installWindowsCollections(page);
  await page.goto(`${root}/fixture-vm/logs`);
  await expect(page.getByText('Application: Permission denied', { exact: true })).toBeVisible();
  await expect(page.getByText('No logs returned for this VM.', { exact: true })).toHaveCount(0);
  await expect(page.getByText('untrusted runtime text', { exact: false })).toHaveCount(0);
  await page.getByRole('button', { name: 'Event channel', exact: true }).click();
  await page.getByRole('option', { name: 'System', exact: true }).click();
  await expect(page.getByText('System: Collection unavailable', { exact: true })).toBeVisible();
  await expect(page.getByText('Application: Permission denied', { exact: true })).toHaveCount(0);
  await page.evaluate(() => { (window as any).windowsCollections.partial = true; });
  await page.getByRole('button', { name: 'Refresh logs', exact: true }).click();
  await expect(page.getByText('Retained partial event', { exact: true })).toBeVisible();
  await expect(page.getByText('Results truncated; additional events may be missing.', { exact: true })).toBeVisible();
  await expect(page.getByText('1 event returned; 3 observed before the response limit.', { exact: true })).toBeVisible();
  await page.evaluate(() => { (window as any).windowsCollections.delay = true; });
  await page.getByRole('button', { name: 'Refresh logs', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).windowsCollections.pending.length)).toBe(2);
  await page.evaluate(() => { (window as any).windowsCollections.delay = false; });
  await navigate(page, `${root}/fixture-vm-second/logs`);
  await expect(page.getByText('Second target event', { exact: true })).toBeVisible();
  await release(page);
  await expect(page.getByText('Retained partial event', { exact: true })).toHaveCount(0);
  await expect(page.getByText('System: Collection incomplete', { exact: true })).toHaveCount(0);
  await page.evaluate(() => { (window as any).windowsCollections.delay = true; });
  await navigate(page, `${root}/fixture-vm/logs`);
  await expect(page.getByText('Retained partial event', { exact: true })).toBeVisible();
  await expect(page.getByText('System: Collection incomplete', { exact: true })).toBeVisible();
});

test('synthetic snapshot health follows its category and timestamp and rejects an earlier target response', async ({ page }) => {
  await installWindowsCollections(page);
  await page.goto(`${root}/fixture-vm/resources`);
  await expect(page.getByText('Volumes: Permission denied', { exact: true })).toBeVisible();
  await expect(page.getByText('Services: Collection timed out', { exact: true })).toBeVisible();
  await expect(page.getByText('Processes: Collection incomplete', { exact: true })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('snapshot-collection-health.png') });
  await expect(page.locator('time[datetime="2026-10-31T01:00:00.000Z"]').first()).toBeVisible();
  await page.getByRole('tab', { name: /^Processes/ }).click();
  await expect(page.getByText('3 records omitted.', { exact: true })).toBeVisible();
  await expect(page.getByText('Volumes: Permission denied', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Retained partial process', { exact: true }).first()).toBeVisible();
  await page.evaluate(() => { (window as any).windowsCollections.delay = true; });
  await page.getByRole('tab', { name: /^Services/ }).click();
  await expect.poll(() => page.evaluate(() => (window as any).windowsCollections.pending.length)).toBe(1);
  await page.evaluate(() => { (window as any).windowsCollections.delay = false; });
  await navigate(page, `${root}/fixture-vm-second/processes`);
  await expect(page.getByText('Second target process', { exact: true }).first()).toBeVisible();
  await release(page);
  await expect(page.getByText('Retained partial process', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Processes: Collection incomplete', { exact: true })).toHaveCount(0);
});


test('synthetic denied HTTP200 metadata cannot overwrite a newer channel at narrow width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installWindowsCollections(page);
  await page.goto(`${root}/fixture-vm/logs`);
  await expect(page.getByText('Application: Permission denied', { exact: true })).toBeVisible();
  await page.evaluate(() => { (window as any).windowsCollections.delay = true; });
  await page.getByRole('button', { name: 'Refresh logs', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).windowsCollections.pending.length)).toBe(2);
  await page.evaluate(() => { (window as any).windowsCollections.delay = false; });
  await page.getByRole('button', { name: 'Event channel', exact: true }).click();
  await page.getByRole('option', { name: 'System', exact: true }).click();
  await expect(page.getByText('System: Collection unavailable', { exact: true })).toBeVisible();
  await release(page);
  await expect(page.getByText('Application: Permission denied', { exact: true })).toHaveCount(0);
  await expect(page.getByText('System: Collection unavailable', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath('log-collection-health-mobile.png') });
});
