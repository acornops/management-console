import { expect, test, type Page } from '@playwright/test';

const workspaceId = 'fixture-workspace';
const fixtureApi = 'http://127.0.0.1:4190/api/v1';

async function reset(page: Page) {
  const response = await page.request.post(`${fixtureApi}/__fixtures/reset`);
  expect(response.ok(), `fixture reset failed with ${response.status()}`).toBe(true);
}

test.beforeEach(async ({ page }) => {
  await reset(page);
});

test('default and custom Agents are presented as workspace-owned and editable', async ({ page }) => {
  await page.goto(`/workspaces/${workspaceId}/agents`);

  const defaultRow = page.locator('[data-agent-catalog-row="fixture-workflow-analyst"]');
  await expect(defaultRow.getByText('Provided by AcornOps')).toHaveCount(0);
  await expect(defaultRow.getByText('AcornOps Fixture Lab', { exact: true })).toBeVisible();
  const customRow = page.locator('[data-agent-catalog-row="fixture-specialist"]');
  await expect(customRow.getByText('Provided by AcornOps')).toHaveCount(0);

  await page.getByRole('button', { name: /Open Workflow Analyst agent profile/ }).click();
  const defaultHeader = page.getByRole('heading', { name: 'Workflow Analyst' }).locator('..');
  await expect(defaultHeader.getByText('Provided by AcornOps')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Edit agent' })).toBeVisible();
  const defaultOverview = page.getByRole('tabpanel', { name: 'Overview' });
  await expect(defaultOverview.getByText('Workspace-owned', { exact: true })).toBeVisible();

  await page.goto(`/workspaces/${workspaceId}/agents?agent=fixture-specialist&panel=profile`);
  const customHeader = page.getByRole('heading', { name: 'Kubernetes Specialist' }).locator('..');
  await expect(customHeader.getByText('Provided by AcornOps')).toHaveCount(0);
  await expect(customHeader.getByText('Ning', { exact: true })).toBeVisible();
});

test('recommendations retain attribution while added workflows become workspace-owned', async ({ page }) => {
  const installResponse = await page.request.post(`${fixtureApi}/workspaces/${workspaceId}/automation-templates/target-remediation/install`);
  expect(installResponse.ok(), `template install failed with ${installResponse.status()}`).toBe(true);
  const { workflowId } = await installResponse.json() as { workflowId: string };

  await page.goto(`/workspaces/${workspaceId}/workflows?workflow=${workflowId}`);
  const addedRow = page.getByRole('button', { name: /Select workflow Target remediation/ });
  await expect(addedRow.getByText('Provided by AcornOps')).toHaveCount(0);
  const addedHeader = page.locator('[data-master-detail-pane-header="true"]');
  await expect(addedHeader.getByText('Provided by AcornOps')).toHaveCount(0);
  await expect(addedHeader.getByText('Built-in', { exact: true })).toHaveCount(0);
  await expect(addedHeader.getByText('Ning', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: /Select workflow Production health review/ }).click();
  const customHeader = page.locator('[data-master-detail-pane-header="true"]');
  await expect(customHeader.getByText('Provided by AcornOps')).toHaveCount(0);
  await expect(customHeader.getByText('Ning', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Add workflows' }).click();
  const recommendationDrawer = page.getByRole('dialog', { name: 'Add recommended workflows' });
  await expect(recommendationDrawer.getByText('Recommended by AcornOps').first()).toBeVisible();
});
