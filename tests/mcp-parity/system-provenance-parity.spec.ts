import { expect, test, type Page } from '@playwright/test';

const workspaceId = 'fixture-workspace';
const fixtureApi = `http://127.0.0.1:${process.env.MCP_PARITY_API_PORT || '4190'}/api/v1`;

async function reset(page: Page) {
  const response = await page.request.post(`${fixtureApi}/__fixtures/reset`);
  expect(response.ok(), `fixture reset failed with ${response.status()}`).toBe(true);
}

test.beforeEach(async ({ page }) => {
  await reset(page);
});

test('default and custom Agents use the same compact resource treatment and settings actions', async ({ page }) => {
  await page.goto(`/workspaces/${workspaceId}/agents`);

  const defaultCard = page.locator('[data-agent-id="fixture-workflow-analyst"]');
  const customCard = page.locator('[data-agent-id="fixture-specialist"]');
  await expect(defaultCard.getByText('Provided by AcornOps')).toHaveCount(0);
  await expect(customCard.getByText('Provided by AcornOps')).toHaveCount(0);
  await expect(defaultCard.getByText('AcornOps Fixture Lab · No capabilities configured')).toBeVisible();
  await expect(customCard.getByText('Test User · 1 skill')).toBeVisible();

  await page.getByRole('button', { name: 'Open details for Workflow Analyst' }).click();
  const defaultHeader = page.getByRole('heading', { level: 1, name: 'Agent chat' }).locator('..');
  await expect(defaultHeader.getByText('Provided by AcornOps')).toHaveCount(0);
  await page.goto(`/workspaces/${workspaceId}/agents/fixture-workflow-analyst/settings`);
  await expect(page.getByRole('button', { name: 'Collapse Agent definition' })).toBeVisible();

  await page.goto(`/workspaces/${workspaceId}/agents/fixture-specialist/settings`);
  const customHeader = page.getByRole('heading', { name: 'Agent Settings' }).locator('..');
  await expect(customHeader.getByText('Provided by AcornOps')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Collapse Agent definition' })).toBeVisible();
});

test('installed and custom workflows use the same workspace-owned treatment', async ({ page }) => {
  const installResponse = await page.request.post(`${fixtureApi}/workspaces/${workspaceId}/automation-templates/infrastructure-remediation/install`);
  expect(installResponse.ok(), `template install failed with ${installResponse.status()}`).toBe(true);
  const { workflowId } = await installResponse.json() as { workflowId: string };

  await page.goto(`/workspaces/${workspaceId}/workflows?workflow=${workflowId}`);
  const addedRow = page.getByRole('button', { name: /Select workflow Infrastructure remediation/ });
  await expect(addedRow.getByText('Provided by AcornOps')).toHaveCount(0);
  await expect(addedRow.getByText('Test User', { exact: true })).toBeVisible();
  const addedHeader = page.locator('[data-master-detail-pane-header="true"]');
  await expect(addedHeader.getByText('Provided by AcornOps')).toHaveCount(0);
  await expect(addedHeader.getByText('Built-in', { exact: true })).toHaveCount(0);

  const customRow = page.getByRole('button', { name: /Select workflow Production health review/ });
  await expect(customRow.getByText('Test User', { exact: true })).toBeVisible();
  await customRow.click();
  const customHeader = page.locator('[data-master-detail-pane-header="true"]');
  await expect(customHeader.getByText('Provided by AcornOps')).toHaveCount(0);
});
