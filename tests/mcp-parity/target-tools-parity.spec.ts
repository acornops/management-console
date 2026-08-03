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

  const documentRow = page.locator('[data-target-tool-row="true"]').filter({ hasText: 'Create Document' });
  await expect(documentRow).toBeVisible();
  await expect(documentRow.getByText('Provided by AcornOps')).toBeVisible();
  await expect(documentRow.getByText('No configuration')).toBeVisible();
  await expect(documentRow.getByRole('switch', { name: 'Disable Create Document' })).toBeChecked();
  await expect(documentRow.getByRole('button', { name: /Actions for Create Document/ })).toHaveCount(0);

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

  await builtInServerRow.getByRole('button', { name: 'Actions for AcornOps Kubernetes Tools' }).click();
  await page.getByRole('menuitem', { name: 'Manage Tools' }).click();
  const toolsDialog = page.getByRole('dialog', { name: 'AcornOps Kubernetes Tools' });
  await expect(toolsDialog.getByRole('switch', { name: 'Disable all read-only tools' })).toBeVisible();
  await expect(toolsDialog.getByRole('switch', { name: 'Disable all write-capable tools' })).toBeVisible();
  const readSection = toolsDialog.locator('[data-mcp-tool-capability="read"]');
  const readGroupSwitchBox = await readSection.locator('[data-mcp-tool-group-switch="read"]').boundingBox();
  const firstReadToolSwitchBox = await readSection.getByRole('switch').nth(1).boundingBox();
  expect(readGroupSwitchBox).not.toBeNull();
  expect(firstReadToolSwitchBox).not.toBeNull();
  expect(Math.abs(readGroupSwitchBox!.x - firstReadToolSwitchBox!.x)).toBeLessThanOrEqual(1);

  await toolsDialog.getByRole('switch', { name: 'Disable all read-only tools' }).click();
  await expect(toolsDialog.getByRole('switch', { name: 'Enable all read-only tools' })).toBeVisible();
  await expect(toolsDialog.getByRole('button', { name: 'Save changes' })).toBeEnabled();
  await toolsDialog.getByRole('button', { name: 'Reset changes' }).click();
  await expect(toolsDialog.getByRole('switch', { name: 'Disable all read-only tools' })).toBeVisible();
});
