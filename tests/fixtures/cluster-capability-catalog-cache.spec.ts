import { expect, test, type Page } from '@playwright/test';
import type { AgentSkillApi } from '../../src/services/control-plane/agentApi';

const clusterRoute = '/workspaces/fixture-workspace/kubernetes-clusters/fixture-cluster';
const virtualMachineRoute = '/workspaces/fixture-workspace/virtual-machines/fixture-vm';
const agentRoute = '/workspaces/fixture-workspace/agents/fixture-specialist';

const agentCacheSkill: AgentSkillApi = {
  id: 'fixture-agent-cache-skill',
  name: 'Agent cache sentinel',
  description: 'Agent-owned instructions for populated catalog cache coverage.',
  enabled: true,
  revision: 1,
  contentDigest: 'sha256:fixture-agent-cache-skill',
  source: { type: 'manual' },
  files: [{
    path: 'SKILL.md',
    content: '# Agent cache sentinel\nInspect only this Agent-owned instruction bundle.',
    contentDigest: 'sha256:fixture-agent-cache-skill-file'
  }]
};

async function delayCapabilityRefreshes(page: Page, agentSkill?: AgentSkillApi) {
  await page.addInitScript((agentSkill) => {
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
      const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
      if (agentSkill && method === 'GET' && path === '/api/v1/workspaces/fixture-workspace/agents/fixture-specialist/skills') {
        return new Response(JSON.stringify({ items: [agentSkill] }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        });
      }
      return originalFetch(input, init);
    };
  }, agentSkill || null);
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
  await delayCapabilityRefreshes(page, agentCacheSkill);

  await page.goto(`${agentRoute}/tools`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('No built-in tools are available.')).toBeVisible();

  await page.getByRole('link', { name: 'Skills', exact: true }).click();
  await expect(page.getByText('Agent cache sentinel', { exact: true })).toBeVisible();
  await expect(page.getByText('Kubernetes triage', { exact: true })).toHaveCount(0);

  await page.getByRole('link', { name: 'MCP Servers', exact: true }).click();
  await expect(page.getByText('No MCP servers have been registered.')).toBeVisible();

  await page.getByRole('link', { name: 'Tools', exact: true }).click();
  await expect(page.getByText('Loading tools')).toHaveCount(0);
  await expect(page.getByText('No built-in tools are available.')).toBeVisible({ timeout: 750 });

  await page.getByRole('link', { name: 'Skills', exact: true }).click();
  await expect(page.getByText('Loading skills')).toHaveCount(0);
  await expect(page.getByText('Agent cache sentinel', { exact: true })).toBeVisible({ timeout: 750 });
  await expect(page.getByText('Kubernetes triage', { exact: true })).toHaveCount(0);

  await page.getByRole('link', { name: 'MCP Servers', exact: true }).click();
  await expect(page.getByText('Loading MCP server catalog...')).toHaveCount(0);
  await expect(page.getByText('No MCP servers have been registered.')).toBeVisible({ timeout: 750 });
});
