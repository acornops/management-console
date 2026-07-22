import { expect, test } from '@playwright/test';

const workspaceId = 'fixture-workspace';
const clusterId = 'fixture-cluster';

test.beforeEach(async ({ page }) => {
  const response = await page.request.post('http://127.0.0.1:4190/api/v1/__fixtures/reset');
  expect(response.ok(), `fixture reset failed with ${response.status()}`).toBe(true);
});

test('target capability inventories label every AcornOps-provided tool and built-in MCP server', async ({ page }) => {
  await page.goto(`/workspaces/${workspaceId}/kubernetes-clusters/${clusterId}/tools`, {
    waitUntil: 'domcontentloaded'
  });

  const pdfRow = page.locator('[data-target-tool-row="true"]').filter({ hasText: 'Generate PDF report' });
  await expect(pdfRow).toBeVisible();
  await expect(pdfRow.getByText('Provided by AcornOps')).toBeVisible();
  await expect(pdfRow.getByText('No configuration')).toBeVisible();
  await expect(pdfRow.getByRole('switch', { name: 'Disable Generate PDF report' })).toBeChecked();
  await expect(pdfRow.getByRole('button', { name: /Actions for Generate PDF report/ })).toHaveCount(0);

  const webSearchRow = page.locator('[data-target-tool-row="true"]').filter({ hasText: 'Web Search' });
  const insightsRow = page.locator('[data-target-tool-row="true"]').filter({ hasText: 'Insights' });
  await expect(webSearchRow.getByText('Provided by AcornOps')).toBeVisible();
  await expect(insightsRow.getByText('Provided by AcornOps')).toBeVisible();
  await page.screenshot({ path: '/tmp/target-tools-pdf-parity.png', fullPage: true });

  await page.goto(`/workspaces/${workspaceId}/kubernetes-clusters/${clusterId}/mcp-servers`, {
    waitUntil: 'domcontentloaded'
  });
  const builtInServerRow = page.locator('[data-mcp-server-row="true"]').filter({ hasText: 'AcornOps Kubernetes Tools' });
  await expect(builtInServerRow.getByText('Managed by AcornOps')).toBeVisible();
});
