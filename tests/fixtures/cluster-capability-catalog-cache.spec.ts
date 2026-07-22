import { expect, test } from '@playwright/test';

const clusterRoute = '/workspaces/fixture-workspace/kubernetes-clusters/fixture-cluster';

test('cluster capability catalogs remain visible during revisit refreshes', async ({ page }) => {
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    const requestCounts = new Map<string, number>();
    const capabilityCatalogPath = /\/targets\/[^/]+\/(?:mcp\/catalog|skills|tools)$/;

    window.fetch = async (input, init) => {
      const value = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const path = new URL(value, window.location.origin).pathname;
      if (capabilityCatalogPath.test(path)) {
        const requestCount = (requestCounts.get(path) || 0) + 1;
        requestCounts.set(path, requestCount);
        if (requestCount > 1) {
          await new Promise((resolve) => window.setTimeout(resolve, 3_000));
        }
      }
      return originalFetch(input, init);
    };
  });

  await page.goto(`${clusterRoute}/tools`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Tools' })).toBeVisible();
  await expect(page.getByText('Generate PDF report')).toBeVisible();

  await page.getByRole('button', { name: 'Skills', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Skills' })).toBeVisible();
  await expect(page.getByText('Kubernetes triage')).toBeVisible();

  await page.getByRole('button', { name: 'MCP Servers', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'MCP Servers' })).toBeVisible();
  await expect(page.getByText('AcornOps Kubernetes Tools')).toBeVisible();

  await page.getByRole('button', { name: 'Tools', exact: true }).click();
  await expect(page.getByText('Loading tools')).toHaveCount(0);
  await expect(page.getByText('Generate PDF report')).toBeVisible({ timeout: 750 });

  await page.getByRole('button', { name: 'Skills', exact: true }).click();
  await expect(page.getByText('Loading skills')).toHaveCount(0);
  await expect(page.getByText('Kubernetes triage')).toBeVisible({ timeout: 750 });

  await page.getByRole('button', { name: 'MCP Servers', exact: true }).click();
  await expect(page.getByText('Loading MCP server catalog...')).toHaveCount(0);
  await expect(page.getByText('AcornOps Kubernetes Tools')).toBeVisible({ timeout: 750 });
});
