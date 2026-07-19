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

test('system Agents show AcornOps provenance while custom Agents retain their owner', async ({ page }) => {
  await page.goto(`/workspaces/${workspaceId}/agents`);

  const systemRow = page.locator('[data-agent-catalog-row="fixture-workflow-analyst"]');
  await expect(systemRow.getByText('Provided by AcornOps')).toBeVisible();
  const customRow = page.locator('[data-agent-catalog-row="fixture-specialist"]');
  await expect(customRow.getByText('Provided by AcornOps')).toHaveCount(0);

  await page.getByRole('button', { name: /Open Workflow Analyst agent profile/ }).click();
  const systemHeader = page.getByRole('heading', { name: 'Workflow Analyst' }).locator('..');
  await expect(systemHeader.getByText('Provided by AcornOps')).toBeVisible();
  await expect(systemHeader.getByText('v3', { exact: true })).toBeVisible();

  await page.goto(`/workspaces/${workspaceId}/agents?agent=fixture-specialist&panel=profile`);
  const customHeader = page.getByRole('heading', { name: 'Kubernetes Specialist' }).locator('..');
  await expect(customHeader.getByText('Provided by AcornOps')).toHaveCount(0);
  await expect(customHeader.getByText('Ning · v2', { exact: true })).toBeVisible();
});

test('templates show publisher attribution while installed Workflows do not use provider badges', async ({ page }) => {
  const installResponse = await page.request.post(`${fixtureApi}/workspaces/${workspaceId}/automation-templates/target-remediation/install`);
  expect(installResponse.ok(), `template install failed with ${installResponse.status()}`).toBe(true);
  const { workflowId } = await installResponse.json() as { workflowId: string };

  await page.goto(`/workspaces/${workspaceId}/workflows?workflow=${workflowId}`);
  const systemRow = page.getByRole('button', { name: /Select workflow Target remediation/ });
  await expect(systemRow.getByText('Provided by AcornOps')).toHaveCount(0);
  const systemHeader = page.locator('[data-master-detail-pane-header="true"]');
  await expect(systemHeader.getByText('Provided by AcornOps')).toHaveCount(0);
  await expect(systemHeader.getByText('v1', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: /Select workflow Production health review/ }).click();
  const customHeader = page.locator('[data-master-detail-pane-header="true"]');
  await expect(customHeader.getByText('Provided by AcornOps')).toHaveCount(0);
  await expect(customHeader.getByText('Ning · v2', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Install templates' }).click();
  const templateDrawer = page.getByRole('dialog', { name: 'Install workflow templates' });
  await expect(templateDrawer.getByText('By AcornOps').first()).toBeVisible();
});
