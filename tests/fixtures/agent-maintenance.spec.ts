import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const clusterSettings = '/workspaces/fixture-workspace/kubernetes-clusters/fixture-cluster/settings';

test('connected Kubernetes maintenance preserves credentials and replacement is explicit', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    (window as unknown as { maintenanceRequests: string[] }).maintenanceRequests = [];
    window.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (/install-instructions|rotate-agent-key/.test(url)) {
        (window as unknown as { maintenanceRequests: string[] }).maintenanceRequests.push(`${init?.method || 'GET'} ${url}`);
      }
      return originalFetch(input, init);
    };
  });
  await page.goto(clusterSettings);
  await expect(page.getByText('Upgrade or repair AgentK', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Generate repair command' }).click();
  await expect(page.getByRole('region', { name: 'Agent command' })).toContainText('fixture-mode: credential-preserving AgentK repair');
  expect(await page.evaluate(() => (window as unknown as { maintenanceRequests: string[] }).maintenanceRequests)).toEqual([
    expect.stringMatching(/^GET .*\/install-instructions$/)
  ]);
  await page.getByRole('button', { name: 'Replace AgentK credential' }).click();
  const replacement = page.getByRole('dialog', { name: 'Replace AgentK credential' });
  await expect(replacement.getByText(/immediately invalidates the current credential/)).toBeVisible();
  await expect(replacement.getByRole('radio', { name: /Read-write/ })).toBeChecked();
  await replacement.getByRole('button', { name: 'Replace credential and generate command' }).click();
  await expect(replacement.getByRole('region', { name: 'Agent command' })).toContainText('fixture-mode: no agent installation is required');
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(replacement.getByRole('button', { name: 'Replace credential and regenerate command' })).toBeVisible();
  expect(await replacement.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).include('[role="dialog"]').analyze()).violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('replacement-dialog.png') });
});

test('repair failure and clipboard failure are actionable at narrow widths', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    let failed = false;
    window.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.endsWith('/install-instructions') && !failed) {
        failed = true;
        return new Response(JSON.stringify({ error: { code: 'UNAVAILABLE', message: 'Maintenance temporarily unavailable', retryable: true } }), { status: 503, headers: { 'content-type': 'application/json' } });
      }
      return originalFetch(input, init);
    };
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => { throw new Error('Clipboard denied'); } } });
  });
  await page.goto(clusterSettings);
  await page.getByRole('button', { name: 'Generate repair command' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'The service could not complete the request. Try again shortly.' })).toBeVisible();
  await page.getByRole('button', { name: 'Generate repair command' }).click();
  const command = page.getByRole('region', { name: 'Agent command' });
  await expect(command).toHaveAttribute('tabindex', '0');
  await page.getByRole('button', { name: 'Copy', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Copy failed' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).include('section[aria-labelledby]').analyze()).violations).toEqual([]);
});

for (const scenario of [
  { name: 'offline target manager', installed: true, manageTargets: true, manageKeys: false },
  { name: 'offline key manager', installed: true, manageTargets: false, manageKeys: true },
  { name: 'offline viewer', installed: true, manageTargets: false, manageKeys: false },
  { name: 'pending initial install', installed: false, manageTargets: true, manageKeys: true }
]) {
  test(`Kubernetes maintenance permissions: ${scenario.name}`, async ({ page }) => {
    await page.addInitScript((options) => {
      const originalFetch = window.fetch.bind(window);
      window.fetch = async (input, init) => {
        const response = await originalFetch(input, init);
        const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.href);
        if (init?.method && init.method !== 'GET') return response;
        const scopedWorkspace = (workspace: Record<string, unknown>) => ({ ...workspace, permissions: { ...(workspace.permissions as object), manage_targets: options.manageTargets, manage_agent_keys: options.manageKeys } });
        const scopedCluster = (cluster: Record<string, unknown>) => ({ ...cluster, status: 'offline', ...(options.installed ? {} : { latestSnapshot: null, summary: undefined }) });
        let body: unknown;
        if (url.pathname === '/api/v1/workspaces' && url.searchParams.get('view') !== 'access-state') {
          const data = await response.json(); body = { ...data, items: data.items.map(scopedWorkspace) };
        } else if (url.pathname === '/api/v1/workspaces/fixture-workspace') {
          body = scopedWorkspace(await response.json());
        } else if (url.pathname.endsWith('/kubernetes-clusters')) {
          const data = await response.json(); body = { ...data, items: data.items.map(scopedCluster) };
        } else if (url.pathname.endsWith('/kubernetes-clusters/fixture-cluster')) {
          body = scopedCluster(await response.json());
        } else return response;
        return new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });
      };
    }, scenario);
    await page.goto(clusterSettings);
    if (!scenario.installed) {
      await expect(page.getByRole('button', { name: 'Generate repair command' })).toHaveCount(0);
      await page.getByRole('button', { name: 'Install Agent', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Install Agent', exact: true });
      await expect(dialog.getByRole('radio', { name: /Read-only/ })).toBeChecked();
    } else {
      const repair = page.getByRole('button', { name: 'Generate repair command' });
      const replace = page.getByRole('button', { name: 'Replace AgentK credential' });
      await expect(repair).toBeVisible();
      await expect(replace).toBeVisible();
      if (scenario.manageTargets) await expect(repair).toBeEnabled(); else await expect(repair).toBeDisabled();
      if (scenario.manageKeys) await expect(replace).toBeEnabled(); else await expect(replace).toBeDisabled();
    }
  });
}

test('replacement regeneration hides the superseded command even if generation fails', async ({ page }) => {
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    let count = 0;
    window.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.endsWith('/rotate-agent-key') && ++count > 1) {
        return new Response(JSON.stringify({ error: { code: 'UNAVAILABLE', message: 'Unknown outcome', retryable: true } }), { status: 503, headers: { 'content-type': 'application/json' } });
      }
      return originalFetch(input, init);
    };
  });
  await page.goto(clusterSettings);
  await page.getByRole('button', { name: 'Replace AgentK credential' }).click();
  const dialog = page.getByRole('dialog', { name: 'Replace AgentK credential' });
  await dialog.getByRole('button', { name: 'Replace credential and generate command' }).click();
  await expect(dialog.getByRole('region', { name: 'Agent command' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Replace credential and regenerate command' }).click();
  await expect(dialog.getByText('The service could not complete the request. Try again shortly.')).toBeVisible();
  await expect(dialog.getByRole('region', { name: 'Agent command' })).toHaveCount(0);
});

for (const outcome of ['success', 'failure'] as const) {
  test(`pending credential replacement cannot be dismissed or duplicated and unlocks after ${outcome}`, async ({ page }) => {
    await page.addInitScript((result) => {
      const originalFetch = window.fetch.bind(window);
      const pending = window as unknown as { rotationRequests: number; finishRotation: () => void };
      pending.rotationRequests = 0;
      window.fetch = async (input, init) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (url.endsWith('/rotate-agent-key')) {
          pending.rotationRequests += 1;
          if (pending.rotationRequests === 1) {
            await new Promise<void>((resolve) => { pending.finishRotation = resolve; });
            if (result === 'failure') {
              return new Response(JSON.stringify({ error: { code: 'UNAVAILABLE', message: 'Unknown outcome', retryable: true } }), { status: 503, headers: { 'content-type': 'application/json' } });
            }
          }
        }
        return originalFetch(input, init);
      };
    }, outcome);
    await page.goto(clusterSettings);
    await page.getByRole('button', { name: 'Replace AgentK credential' }).click();
    const dialog = page.getByRole('dialog', { name: 'Replace AgentK credential' });
    const generate = dialog.locator('button[aria-busy]');
    await generate.click();
    await expect(generate).toHaveAttribute('aria-busy', 'true');
    await expect.poll(() => page.evaluate(() => (window as unknown as { rotationRequests: number }).rotationRequests)).toBe(1);

    await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible({ timeout: 2_000 });
    await page.mouse.click(1, 1);
    await expect(dialog).toBeVisible();
    const close = dialog.getByRole('button', { name: 'Close', exact: true });
    const dismiss = dialog.getByRole('button', { name: 'Close install agent dialog', exact: true });
    for (const button of [close, dismiss]) {
      await expect(button).toBeDisabled();
      await button.click({ force: true });
      await expect(dialog).toBeVisible();
    }
    await generate.click({ force: true });
    expect(await page.evaluate(() => (window as unknown as { rotationRequests: number }).rotationRequests)).toBe(1);

    await page.evaluate(() => (window as unknown as { finishRotation: () => void }).finishRotation());
    if (outcome === 'success') {
      await expect(dialog.getByRole('region', { name: 'Agent command' })).toBeVisible();
    } else {
      await expect(dialog.getByRole('alert')).toContainText('The service could not complete the request. Try again shortly.');
      await expect(dialog.getByRole('region', { name: 'Agent command' })).toHaveCount(0);
    }
    await expect(close).toBeEnabled();
    await expect(dismiss).toBeEnabled();
    await close.click();
    await expect(dialog).toHaveCount(0);
    await page.getByRole('button', { name: 'Replace AgentK credential' }).click();
    await dialog.getByRole('button', { name: 'Replace credential and generate command' }).click();
    await expect(dialog.getByRole('region', { name: 'Agent command' })).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { rotationRequests: number }).rotationRequests)).toBe(2);
  });
}
