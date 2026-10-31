import { expect, test, type Page } from '@playwright/test';
import { FIXTURE_CLOCK } from '../../src/fixtures/store';

declare global {
  interface Window {
    targetDeleteProbe: {
      deleteCount: number;
      summaryCount: number;
      summaryResponses: number;
      releaseSummary?: () => void;
      releaseDelete?: () => void;
    };
  }
}

type Scenario = 'pending-summary' | 'failed-summary' | 'failed-delete' | 'pending-delete';
const targets = [
  { kind: 'cluster', collection: 'kubernetes-clusters', id: 'fixture-cluster', name: 'Singapore Production', label: 'Delete Cluster', actions: 'Cluster actions for Singapore Production' },
  { kind: 'vm', collection: 'virtual-machines', id: 'fixture-vm', name: 'Payments VM', label: 'Delete VM', actions: 'VM actions for Payments VM' }
] as const;

async function prepare(page: Page, scenario: Scenario) {
  await page.clock.setFixedTime(FIXTURE_CLOCK);
  await page.addInitScript((scenario) => {
    const originalFetch = window.fetch.bind(window);
    window.targetDeleteProbe = { deleteCount: 0, summaryCount: 0, summaryResponses: 0 };
    let deleted = false;
    let deletedQuota = 'kubernetesClusters';
    const unavailable = () => new Response(JSON.stringify({ error: { code: 'UNAVAILABLE', message: 'Service unavailable' } }), {
      status: 503, headers: { 'content-type': 'application/json' }
    });
    window.fetch = async (input, init) => {
      const path = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.href).pathname;
      const method = init?.method || (input instanceof Request ? input.method : 'GET');
      if (method === 'DELETE' && /\/(kubernetes-clusters|virtual-machines)\/[^/]+$/.test(path)) {
        window.targetDeleteProbe.deleteCount += 1;
        if (scenario === 'failed-delete') return unavailable();
        if (scenario === 'pending-delete') await new Promise<void>(resolve => { window.targetDeleteProbe.releaseDelete = resolve; });
        const response = await originalFetch(input, init);
        deleted = response.ok;
        deletedQuota = path.includes('/virtual-machines/') ? 'virtualMachines' : 'kubernetesClusters';
        return response;
      }
      if (deleted && method === 'GET' && path === '/api/v1/workspaces/fixture-workspace') {
        window.targetDeleteProbe.summaryCount += 1;
        if (scenario === 'failed-summary') return unavailable();
        if (scenario === 'pending-summary') await new Promise<void>(resolve => { window.targetDeleteProbe.releaseSummary = resolve; });
        const response = await originalFetch(input, init);
        // Fixture deletion removes the target; emulate the resulting server quota summary too.
        const summary = await response.json();
        summary.quota[deletedQuota].used = 0;
        window.targetDeleteProbe.summaryResponses += 1;
        return Response.json(summary);
      }
      return originalFetch(input, init);
    };
  }, scenario);
}

for (const target of targets) {
  for (const surface of ['catalog', 'settings'] as const) {
    const basePath = `/workspaces/fixture-workspace/${target.collection}`;
    const query = target.kind === 'cluster' ? 'Singapore' : 'Payments';
    const catalogPath = `${basePath}?q=${query}&status=attention`;
    const initialPath = surface === 'settings'
      ? `${basePath}/${target.id}/settings?catalogQ=${query}&catalogStatus=attention`
      : catalogPath;
    async function confirm(page: Page) {
      await page.goto(initialPath);
      if (surface === 'catalog') await page.getByRole('button', { name: target.actions, exact: true }).click();
      await page.getByRole(surface === 'catalog' ? 'menuitem' : 'button', { name: target.label, exact: true }).click();
      const dialog = page.getByRole('dialog', { name: target.label, exact: true });
      await dialog.getByRole('textbox').fill(target.name);
      await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
      return dialog;
    }

    for (const scenario of ['pending-summary', 'failed-summary'] as const) {
      test(`${target.kind} ${surface} completes deletion with ${scenario}`, async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', error => errors.push(error.message));
        await prepare(page, scenario);
        const dialog = await confirm(page);
        await expect.poll(() => page.evaluate(() => window.targetDeleteProbe.summaryCount)).toBe(1);
        await expect(dialog).toBeHidden({ timeout: 2000 });
        await expect(page).toHaveURL(catalogPath, { timeout: 2000 });
        await expect(page.getByRole('button', { name: target.actions, exact: true })).toHaveCount(0);
        if (scenario === 'pending-summary') {
          await page.evaluate(() => window.targetDeleteProbe.releaseSummary?.());
          await expect.poll(() => page.evaluate(() => window.targetDeleteProbe.summaryResponses)).toBe(1);
          await expect(page.getByRole('button', { name: target.actions, exact: true })).toHaveCount(0);
          await page.getByRole('link', { name: 'Workspace Settings', exact: true }).click();
          const quotaLabel = target.kind === 'cluster' ? 'Kubernetes clusters' : 'Virtual machines';
          await expect(page.getByText(quotaLabel, { exact: true }).locator('..').getByText('0 / 10', { exact: true })).toBeVisible();
        }
        expect(errors).toEqual([]);
        expect(await page.evaluate(() => window.targetDeleteProbe.deleteCount)).toBe(1);
      });
    }

    test(`${target.kind} ${surface} keeps failed deletion actionable`, async ({ page }) => {
      await prepare(page, 'failed-delete');
      const dialog = await confirm(page);
      await expect(dialog.getByRole('alert')).toContainText('The service could not complete the request.');
      await expect(dialog.getByRole('button', { name: 'Delete', exact: true })).toBeEnabled();
      await expect(page).toHaveURL(initialPath);
      expect(await page.evaluate(() => window.targetDeleteProbe.summaryCount)).toBe(0);
      await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
      if (surface === 'settings') {
        await expect(page.getByRole('button', { name: target.label, exact: true })).toBeVisible();
      } else {
        await expect(page.getByRole('button', { name: target.actions, exact: true })).toBeVisible();
      }
    });

    test(`${target.kind} ${surface} waits for DELETE and prevents duplicate submission`, async ({ page }) => {
      await prepare(page, 'pending-delete');
      const dialog = await confirm(page);
      await expect(dialog.getByRole('button', { name: 'Deleting…', exact: true })).toBeDisabled();
      await expect(page).toHaveURL(initialPath);
      await expect.poll(() => page.evaluate(() => window.targetDeleteProbe.deleteCount)).toBe(1);
      expect(await page.evaluate(() => window.targetDeleteProbe.summaryCount)).toBe(0);
      await page.evaluate(() => window.targetDeleteProbe.releaseDelete?.());
      await expect(dialog).toBeHidden();
      await expect(page).toHaveURL(catalogPath);
      expect(await page.evaluate(() => window.targetDeleteProbe.deleteCount)).toBe(1);
    });
  }
}
