import { expect, test, type Page } from '@playwright/test';

const clusterRoute = '/workspaces/fixture-workspace/kubernetes-clusters/fixture-cluster';
const virtualMachineRoute = '/workspaces/fixture-workspace/virtual-machines/fixture-vm';
const agentRoute = '/workspaces/fixture-workspace/agents/fixture-specialist';

async function delayCapabilityRefreshes(page: Page) {
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    const requestCounts = new Map<string, number>();
    const capabilityCatalogPath = /\/(?:targets\/[^/]+\/(?:mcp\/catalog|skills|tools)|agents\/[^/]+\/(?:mcp\/servers|skills)|catalog\/native-tools)$/;

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
}

test('cluster capability catalogs remain visible during revisit refreshes', async ({ page }) => {
  await delayCapabilityRefreshes(page);

  await page.goto(`${clusterRoute}/tools`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Tools' })).toBeVisible();
  await expect(page.getByText('Create Document')).toBeVisible();

  await page.getByRole('link', { name: 'Skills', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Skills' })).toBeVisible();
  await expect(page.getByText('Kubernetes triage')).toBeVisible();

  await page.getByRole('link', { name: 'MCP Servers', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'MCP Servers' })).toBeVisible();
  await expect(page.getByText('AcornOps Kubernetes Tools')).toBeVisible();

  await page.getByRole('link', { name: 'Tools', exact: true }).click();
  await expect(page.getByText('Loading tools')).toHaveCount(0);
  await expect(page.getByText('Create Document')).toBeVisible({ timeout: 750 });

  await page.getByRole('link', { name: 'Skills', exact: true }).click();
  await expect(page.getByText('Loading skills')).toHaveCount(0);
  await expect(page.getByText('Kubernetes triage')).toBeVisible({ timeout: 750 });

  await page.getByRole('link', { name: 'MCP Servers', exact: true }).click();
  await expect(page.getByText('Loading MCP server catalog...')).toHaveCount(0);
  await expect(page.getByText('AcornOps Kubernetes Tools')).toBeVisible({ timeout: 750 });
});

test('virtual machine capability catalogs remain visible during revisit refreshes', async ({ page }) => {
  await delayCapabilityRefreshes(page);

  await page.goto(`${virtualMachineRoute}/tools`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Create Document')).toBeVisible();

  await page.getByRole('link', { name: 'Skills', exact: true }).click();
  await expect(page.getByText('VM diagnostics')).toBeVisible();

  await page.getByRole('link', { name: 'MCP Servers', exact: true }).click();
  await expect(page.getByText('AcornOps VM Tools')).toBeVisible();

  await page.getByRole('link', { name: 'Tools', exact: true }).click();
  await expect(page.getByText('Loading tools')).toHaveCount(0);
  await expect(page.getByText('Create Document')).toBeVisible({ timeout: 750 });

  await page.getByRole('link', { name: 'Skills', exact: true }).click();
  await expect(page.getByText('Loading skills')).toHaveCount(0);
  await expect(page.getByText('VM diagnostics')).toBeVisible({ timeout: 750 });

  await page.getByRole('link', { name: 'MCP Servers', exact: true }).click();
  await expect(page.getByText('Loading MCP server catalog...')).toHaveCount(0);
  await expect(page.getByText('AcornOps VM Tools')).toBeVisible({ timeout: 750 });
});

test('Agent capability catalogs remain visible during revisit refreshes', async ({ page }) => {
  await delayCapabilityRefreshes(page);

  await page.goto(`${agentRoute}/tools`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('No built-in tools are available.')).toBeVisible();

  await page.getByRole('link', { name: 'Skills', exact: true }).click();
  await expect(page.getByText('Kubernetes triage')).toBeVisible();

  await page.getByRole('link', { name: 'MCP Servers', exact: true }).click();
  await expect(page.getByText('No MCP servers have been registered.')).toBeVisible();

  await page.getByRole('link', { name: 'Tools', exact: true }).click();
  await expect(page.getByText('Loading tools')).toHaveCount(0);
  await expect(page.getByText('No built-in tools are available.')).toBeVisible({ timeout: 750 });

  await page.getByRole('link', { name: 'Skills', exact: true }).click();
  await expect(page.getByText('Loading skills')).toHaveCount(0);
  await expect(page.getByText('Kubernetes triage')).toBeVisible({ timeout: 750 });

  await page.getByRole('link', { name: 'MCP Servers', exact: true }).click();
  await expect(page.getByText('Loading MCP server catalog...')).toHaveCount(0);
  await expect(page.getByText('No MCP servers have been registered.')).toBeVisible({ timeout: 750 });
});
