import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const clusterPath = '/workspaces/fixture-workspace/kubernetes-clusters/fixture-cluster/resources';
const vmPath = '/workspaces/fixture-workspace/virtual-machines/fixture-vm/resources';
const logText = Array.from({ length: 90 }, (_, i) => `2026-07-15T08:29:58Z line ${i} ${i === 30 ? 'Error [x]\ncontinuation ' + 'z'.repeat(400) : 'worker output'}`).join('\n');

async function installLogs(page: Page, options: { empty?: boolean; fail?: boolean; notStarted?: boolean; missingTime?: boolean; sourceTimes?: boolean } = {}) {
  await page.addInitScript(({ options, logText }) => {
    const originalFetch = window.fetch.bind(window);
    const state = { requests: 0, fail: Boolean(options.fail), empty: Boolean(options.empty), delayed: false, pending: [] as Array<() => void> };
    Object.assign(window, { logTest: state });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (value: string) => {
      if ((window as any).clipboardFails) throw new Error('denied');
      (window as any).copiedLogs = value;
    } } });
    window.fetch = (input, init) => {
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.href);
      if (url.pathname.endsWith('/logs')) {
        state.requests++;
        const isPod = url.pathname.includes('/pods/');
        const container = url.searchParams.get('container') || 'worker';
        const body = state.fail ? { error: options.notStarted
          ? { code: 'POD_LOGS_UNAVAILABLE', message: 'No logs yet; this container has not started.', retryable: false }
          : { code: 'UNAVAILABLE', message: 'Unavailable', retryable: true } } : isPod
          ? { name: 'payments-worker-7c5b9f-demo', namespace: 'production', container, logs: state.empty ? '' : `${container} request ${state.requests}\n${logText}`, tailLines: Number(url.searchParams.get('tailLines')), previous: url.searchParams.get('previous') === 'true', fetchedAt: options.missingTime ? '' : '2026-07-15T08:30:00Z' }
          : { entries: state.empty ? [] : [{ entryId: 'one', timestamp: options.missingTime ? '' : options.sourceTimes ? '2026-07-15T08:30:00.123456Z' : '2026-07-15T08:30:00Z', source: 'system', message: `VM Error [x] request ${state.requests}\n${'long'.repeat(100)}` }, { entryId: 'two', timestamp: options.sourceTimes ? '2026-07-15T10:20:00.654321+02:00' : '2026-07-15T08:20:00Z', source: 'journald', message: 'Unmatched loaded entry' }] };
        const response = () => new Response(JSON.stringify(body), { status: state.fail ? options.notStarted ? 409 : 503 : 200, headers: { 'content-type': 'application/json' } });
        if (state.delayed) return new Promise<Response>(resolve => { state.pending.push(() => resolve(response())); });
        return Promise.resolve(response());
      }
      if (url.pathname.endsWith('/fixture-cluster/resources')) {
        return originalFetch(input, init).then(async response => {
          const body = await response.json();
          for (const row of body.items || []) {
            if (row.name === 'payments-worker-7c5b9f-demo') {
              row.item.containerStatuses.push({ name: 'sidecar', ready: true, restartCount: 0 });
            }
          }
          return new Response(JSON.stringify(body), { status: response.status, headers: response.headers });
        });
      }
      return originalFetch(input, init);
    };
  }, { options, logText });
}

async function openPod(page: Page) {
  await page.goto(clusterPath);
  await page.getByRole('button', { name: 'Details: payments-worker-7c5b9f-demo' }).click();
  await page.getByRole('button', { name: 'Logs', exact: true }).click();
}

test('VM exports distinguish Singapore display time from original timestamp offsets and precision', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, timezoneId: 'Asia/Singapore' });
  const page = await context.newPage();
  try {
    await installLogs(page, { sourceTimes: true });
    await page.goto(vmPath);
    await page.getByRole('tab', { name: /^Logs/ }).click();
    const scope = 'Displayed entry times: Asia/Singapore. Exports preserve original timestamp offsets and precision.';
    await expect(page.getByText(scope, { exact: false })).toBeVisible();
    await page.getByRole('button', { name: 'Copy loaded logs', exact: true }).click();
    const copied = await page.evaluate(() => (window as any).copiedLogs);
    expect(copied).toContain(scope);
    expect(copied).toContain('2026-07-15T08:30:00.123456Z');
    expect(copied).toContain('2026-07-15T10:20:00.654321+02:00');
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download loaded logs', exact: true }).click();
    const path = await (await downloadPromise).path();
    expect(await readFile(path!, 'utf8')).toBe(copied);
  } finally { await context.close(); }
});

test('pod find preserves loaded output, scroll and paused state; copy/download use only loaded data', async ({ page }) => {
  await installLogs(page);
  await openPod(page);
  const viewport = page.getByRole('region', { name: 'Loaded logs', exact: true });
  await expect(viewport).toContainText('line 89');
  await viewport.evaluate(element => { element.scrollTop = 300; });
  const before = await viewport.evaluate(element => element.scrollTop);
  const beforeHeight = await viewport.evaluate(element => element.scrollHeight);
  await page.getByRole('searchbox', { name: 'Search logs', exact: true }).fill('[X]');
  await expect(page.getByRole('status').filter({ hasText: '1 match in loaded logs' })).toBeVisible();
  await expect(viewport.locator('mark')).toHaveText('[x]');
  expect(await viewport.evaluate(element => element.scrollHeight)).toBe(beforeHeight);
  expect(await viewport.evaluate(element => element.scrollTop)).toBe(before);
  await expect(page.getByText('Paused', { exact: true })).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search logs', exact: true }).fill('not-present');
  await expect(page.getByRole('status').filter({ hasText: /^No matches in loaded logs$/ })).toBeVisible();
  await expect(viewport).toContainText('line 89');
  await page.getByRole('button', { name: 'Copy loaded logs', exact: true }).click();
  expect(await page.evaluate(() => (window as any).copiedLogs)).toContain('line 89');
  expect(await page.evaluate(() => (window as any).copiedLogs)).toContain('production/payments-worker-7c5b9f-demo/worker');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download loaded logs', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^[\w-]+-loaded-logs\.txt$/);
  expect(await readFile((await download.path())!, 'utf8')).toContain('line 89');
  await page.evaluate(() => { (window as any).clipboardFails = true; });
  await page.getByRole('button', { name: 'Copy loaded logs', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Could not copy' })).toBeVisible();
  expect(await page.evaluate(() => (window as any).logTest.requests)).toBe(1);
});

test('pod waiting to start explains unavailable logs and can load them after startup', async ({ page }) => {
  await installLogs(page, { fail: true, notStarted: true });
  await openPod(page);
  await expect(page.getByRole('alert')).toContainText('No logs yet; this container has not started.');
  await expect(page.getByRole('button', { name: 'Copy loaded logs', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Download loaded logs', exact: true })).toBeDisabled();
  await page.evaluate(() => { (window as any).logTest.fail = false; });
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Loaded logs', exact: true })).toContainText('line 89');
  await expect(page.getByText('No logs yet; this container has not started.', { exact: true })).toHaveCount(0);
});

test('pod initial failure is not empty and failed refresh retains stale lines and fetched time', async ({ page }) => {
  await installLogs(page, { fail: true });
  await openPod(page);
  await expect(page.getByText('The service could not complete the request.')).toBeVisible();
  await expect(page.getByText('No logs returned for this pod.', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Copy loaded logs' })).toBeDisabled();
  await page.evaluate(() => { (window as any).logTest.fail = false; });
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Loaded logs' })).toContainText('line 89');
  const fetched = await page.getByText(/^Fetched /).textContent();
  await page.evaluate(() => { (window as any).logTest.fail = true; });
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.getByText('Refresh failed. Previously loaded logs are stale.', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Loaded logs' })).toContainText('line 89');
  await expect(page.getByText(fetched!, { exact: true })).toBeVisible();
});

test('pod empty response and missing fetch timestamp are distinct', async ({ page }) => {
  await installLogs(page, { empty: true, missingTime: true });
  await openPod(page);
  await expect(page.getByText('No logs returned for this pod.', { exact: true })).toBeVisible();
  await expect(page.getByText('Fetch time unknown', { exact: true })).toBeVisible();
  await expect(page.getByText('Not loaded', { exact: true })).toHaveCount(0);
});

test('following refresh keeps find and reader position; pausing ignores an in-flight reply', async ({ page }) => {
  await page.clock.install();
  await installLogs(page);
  await openPod(page);
  await expect(page.getByRole('region', { name: 'Loaded logs' })).toContainText('line 89');
  const search = page.getByRole('searchbox', { name: 'Search logs' });
  await search.fill('[x]');
  await page.getByRole('button', { name: 'Follow', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Following', exact: true })).toBeVisible();
  await expect(search).toHaveValue('[x]');
  const viewport = page.getByRole('region', { name: 'Loaded logs' });
  await viewport.evaluate(element => { element.scrollTop = 200; });
  await page.clock.fastForward(7000);
  await expect(viewport).toContainText('worker request 3');
  expect(await viewport.evaluate(element => element.scrollTop)).toBe(200);
  await page.evaluate(() => { (window as any).logTest.delayed = true; });
  await page.clock.fastForward(7000);
  await expect.poll(() => page.evaluate(() => (window as any).logTest.pending.length)).toBe(1);
  await page.getByRole('button', { name: 'Following', exact: true }).click();
  await expect(page.getByText('Paused', { exact: true })).toBeVisible();
  await page.evaluate(() => { (window as any).logTest.pending.splice(0).forEach((resolve: () => void) => resolve()); });
  await expect(search).toHaveValue('[x]');
  await expect(viewport).toContainText('worker request 3');
  await expect(viewport).not.toContainText('worker request 4');
});

test('source changes ignore an older reply and keep previous-container and tail controls', async ({ page }) => {
  await installLogs(page);
  await openPod(page);
  await expect(page.getByRole('region', { name: 'Loaded logs' })).toContainText('line 89');
  await page.evaluate(() => { (window as any).logTest.delayed = true; });
  await page.getByRole('button', { name: 'Follow', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).logTest.pending.length)).toBe(1);
  await page.evaluate(() => { (window as any).logTest.delayed = false; });
  await page.getByRole('button', { name: 'Container', exact: true }).click();
  await page.getByRole('option', { name: 'sidecar', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Loaded logs' })).toContainText('sidecar request 3');
  await page.getByRole('checkbox', { name: 'Previous container' }).check();
  await expect(page.getByText(/Source:.*previous container/)).toBeVisible();
  await page.getByRole('button', { name: 'Tail', exact: true }).click();
  await page.getByRole('option', { name: '100 lines', exact: true }).click();
  await expect(page.getByText(/Loaded tail: up to 100 lines/)).toBeVisible();
  await expect(page.getByRole('region', { name: 'Loaded logs' })).toContainText('sidecar request');
  await page.evaluate(() => { (window as any).logTest.pending.splice(0).forEach((resolve: () => void) => resolve()); });
  await expect(page.getByText(/Source:.*previous container/)).toBeVisible();
  await expect(page.getByText(/Loaded tail: up to 100 lines/)).toBeVisible();
});

test('pod overlap: following waits for a pending manual refresh', async ({ page }) => {
  await page.clock.install();
  await installLogs(page);
  await openPod(page);
  const viewport = page.getByRole('region', { name: 'Loaded logs' });
  await expect(viewport).toContainText('worker request 1');
  await page.getByRole('button', { name: 'Follow', exact: true }).click();
  await expect(viewport).toContainText('worker request 2');
  await page.evaluate(() => { (window as any).logTest.delayed = true; });
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).logTest.pending.length)).toBe(1);
  await page.clock.fastForward(7000);
  expect(await page.evaluate(() => (window as any).logTest.pending.length)).toBe(1);
  await page.evaluate(() => { (window as any).logTest.pending.splice(0).forEach((resolve: () => void) => resolve()); });
  await expect(viewport).toContainText('worker request 3');
  await expect(page.getByRole('button', { name: 'Refresh', exact: true })).toBeEnabled();
});

test('pod overlap: manual refresh supersedes a pending follow and later polling resumes', async ({ page }) => {
  await page.clock.install();
  await installLogs(page);
  await openPod(page);
  const viewport = page.getByRole('region', { name: 'Loaded logs' });
  await expect(viewport).toContainText('worker request 1');
  await page.getByRole('button', { name: 'Follow', exact: true }).click();
  await expect(viewport).toContainText('worker request 2');
  await page.evaluate(() => { (window as any).logTest.delayed = true; });
  await page.clock.fastForward(7000);
  await expect.poll(() => page.evaluate(() => (window as any).logTest.pending.length)).toBe(1);
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).logTest.pending.length)).toBe(2);
  await page.evaluate(() => {
    (window as any).logTest.pending.splice(0).forEach((resolve: () => void) => resolve());
    (window as any).logTest.delayed = false;
  });
  await expect(viewport).toContainText('worker request 4');
  await page.clock.fastForward(7000);
  await expect(viewport).toContainText('worker request 5');
});

for (const fail of [false, true]) {
  test(`VM initial ${fail ? 'failure is not empty' : 'empty snapshot disables exports'}`, async ({ page }) => {
    await installLogs(page, { empty: true, fail });
    await page.goto(vmPath);
    await page.getByRole('tab', { name: /^Logs/ }).click();
    if (fail) {
      await expect(page.getByText('The service could not complete the request.')).toBeVisible();
      await expect(page.getByText('No logs returned for this VM.', { exact: true })).toHaveCount(0);
    } else {
      await expect(page.getByText('No logs returned for this VM.', { exact: true })).toBeVisible();
    }
    await expect(page.getByRole('button', { name: 'Copy loaded logs', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Download loaded logs', exact: true })).toBeDisabled();
  });
}

test('VM snapshot find, unknown times and failed refresh stay bounded and honest at narrow widths', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installLogs(page, { missingTime: true });
  await page.goto(vmPath);
  await page.getByRole('tab', { name: /^Logs/ }).click();
  await expect(page.getByText('VM Error [x]', { exact: false })).toBeVisible();
  await expect(page.getByText('Timestamp unknown', { exact: true })).toBeVisible();
  await expect(page.getByText(/Snapshot logs.*not live/)).toBeVisible();
  const search = page.getByRole('searchbox', { name: 'Search logs' });
  await search.fill('missing');
  await expect(page.getByRole('status').filter({ hasText: /^No matches in loaded logs$/ })).toBeVisible();
  await search.fill('Error');
  await page.getByRole('button', { name: 'Copy loaded logs', exact: true }).click();
  expect(await page.evaluate(() => (window as any).copiedLogs)).toContain('system');
  expect(await page.evaluate(() => (window as any).copiedLogs)).toContain('Timestamp unknown');
  expect(await page.evaluate(() => (window as any).copiedLogs)).toContain('Unmatched loaded entry');
  await page.evaluate(() => { (window as any).logTest.fail = true; });
  await page.getByRole('button', { name: 'Refresh logs', exact: true }).click();
  await expect(page.getByText('Refresh failed. Previously loaded logs are stale.', { exact: true })).toBeVisible();
  await expect(page.getByText('VM Error [x]', { exact: false })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('VM cached refresh retains rows while loading and disables repeated refresh', async ({ page }) => {
  await installLogs(page);
  await page.goto(vmPath);
  await page.getByRole('tab', { name: /^Logs/ }).click();
  await expect(page.getByText(/VM Error.*request 1/)).toBeVisible();
  await page.evaluate(() => { (window as any).logTest.delayed = true; });
  await page.getByRole('button', { name: 'Refresh logs', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).logTest.pending.length)).toBe(1);
  await expect(page.getByText(/VM Error.*request 1/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Refresh logs', exact: true })).toBeDisabled();
});

test('VM refresh ignores a reply from a previous category visit', async ({ page }) => {
  await installLogs(page);
  await page.goto(vmPath);
  await page.getByRole('tab', { name: /^Logs/ }).click();
  await expect(page.getByText(/VM Error.*request 1/)).toBeVisible();
  await page.evaluate(() => { (window as any).logTest.delayed = true; });
  await page.getByRole('button', { name: 'Refresh logs', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).logTest.pending.length)).toBe(1);
  await expect(page.getByText(/VM Error.*request 1/)).toBeVisible();
  await page.getByRole('tab', { name: /^Services/ }).click();
  await page.evaluate(() => { (window as any).logTest.delayed = false; });
  await page.getByRole('tab', { name: /^Logs/ }).click();
  await expect(page.getByText(/VM Error.*request 3/)).toBeVisible();
  await page.evaluate(async () => {
    (window as any).logTest.pending.splice(0).forEach((resolve: () => void) => resolve());
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
  });
  await expect(page.getByText(/VM Error.*request 3/)).toBeVisible();
  await expect(page.getByText(/VM Error.*request 2/)).toHaveCount(0);
});

for (const [language, theme] of [['en', 'light'], ['zh', 'dark']]) {
  test(`loaded log controls remain labelled and contained at 390px ${language} ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(({ language, theme }) => {
      localStorage.setItem('app_language', language);
      localStorage.setItem('acornops_profile_preferences:test-user%40fixture.acornops.dev:language', language);
      localStorage.setItem('app_theme', theme);
      localStorage.setItem('acornops_active_theme_preference', theme);
    }, { language, theme });
    await installLogs(page, { missingTime: true });
    await page.goto(clusterPath);
    await page.getByRole('button', { name: /payments-worker-7c5b9f-demo/ }).first().click();
    await page.getByRole('button', { name: language === 'en' ? 'Logs' : '日志', exact: true }).click();
    const findLabel = language === 'en' ? 'Search logs' : '搜索日志';
    const copyLabel = language === 'en' ? 'Copy loaded logs' : '复制已加载日志';
    const find = page.getByRole('searchbox', { name: findLabel });
    await expect(find).toBeVisible();
    await find.fill('[x]');
    await find.press('Tab');
    await expect(page.getByRole('button', { name: copyLabel, exact: true })).toBeFocused();
    await expect(page.getByText(language === 'en' ? 'Fetch time unknown' : '获取时间未知', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.goto(vmPath);
    await page.getByRole('tab', { name: language === 'en' ? /^Logs/ : /^日志/ }).click();
    await expect(page.getByRole('searchbox', { name: findLabel })).toBeVisible();
    await expect(page.getByText(language === 'en' ? 'Timestamp unknown' : '时间戳未知', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator('html')).toHaveClass(theme === 'dark' ? /dark/ : /^(?!.*\bdark\b)/);
  });
}
