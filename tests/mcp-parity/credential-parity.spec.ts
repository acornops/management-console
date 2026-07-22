import { expect, test, type Page } from '@playwright/test';

const workspaceId = 'fixture-workspace';
const agentId = 'fixture-specialist';
const clusterId = 'fixture-cluster';

async function reset(page: Page) {
  const response = await page.request.post('http://127.0.0.1:4190/api/v1/__fixtures/reset');
  expect(response.ok(), `fixture reset failed with ${response.status()}`).toBe(true);
}

async function selectOption(page: Page, label: string, option: string) {
  await page.getByRole('button', { name: label }).click();
  await page.getByRole('option', { name: option }).click();
}

async function submitAndVerifyCredential(page: Page, credential: string) {
  const dialog = page.getByRole('dialog', { name: /credential/i });
  await dialog.getByRole('textbox', { name: 'Credential', exact: true }).fill(credential);
  await dialog.getByRole('checkbox', { name: /I understand this credential/ }).check();
  await dialog.getByRole('button', { name: 'Save and verify' }).click();
}

test.beforeEach(async ({ page }) => {
  await reset(page);
});

test('authenticated target creation enters credential verification before pending-tool review', async ({ page }) => {
  await page.goto(`/workspaces/${workspaceId}/kubernetes-clusters/${clusterId}/mcp-servers`);
  await page.getByRole('button', { name: 'Add MCP server' }).click();
  await page.getByRole('menuitem', { name: /Connect by URL/ }).click();
  await page.getByLabel('Server Name').fill('Target credential server');
  await page.getByLabel('Server URL').fill('https://mcp.fixture.acornops.dev/target');
  await selectOption(page, 'Auth Type', 'Bearer Token');
  await page.getByRole('button', { name: 'Review tools' }).click();

  await expect(page.getByRole('heading', { name: 'Connect your credential' })).toBeVisible();
  await expect(page.getByText('fixture_discovered_tool')).toHaveCount(0);
  await submitAndVerifyCredential(page, 'fixture-valid');
  await expect(page.getByText('fixture_discovered_tool')).toBeVisible();
  await expect(page).toHaveURL(/\/mcp-servers$/);
});

test('Agent credential refresh, disconnect/reconnect, exact recovery focus, and rate limit countdown are safe', async ({ page }) => {
  const agentPath = `/workspaces/${workspaceId}/agents?agent=${agentId}&panel=profile&agentTab=capabilities&capabilityTab=mcp`;
  await page.goto(agentPath);
  await page.getByRole('button', { name: 'Add MCP server' }).click();
  await page.getByRole('menuitem', { name: /Connect by URL/ }).click();
  await page.getByLabel('Name').fill('Agent credential server');
  await page.getByLabel('HTTPS endpoint').fill('https://mcp.fixture.acornops.dev/agent');
  await selectOption(page, 'Authentication', 'Bearer token');
  await page.getByRole('button', { name: 'Add server' }).click();

  await expect(page.getByRole('heading', { name: 'Connect your credential' })).toBeVisible();
  await submitAndVerifyCredential(page, 'fixture-valid');
  await expect(page.getByText(/1 discovered tools/)).toBeVisible();
  await expect(page.getByText('fixture_discovered_tool')).toHaveCount(0);

  await page.getByRole('button', { name: 'Disconnect' }).click();
  await expect(page.getByRole('button', { name: 'Connect your credential' })).toBeEnabled();
  await page.getByRole('tab', { name: 'Activity' }).click();
  await page.getByRole('button', { name: 'Run agent' }).click();
  const recovery = page.getByRole('link', { name: 'Connect the required MCP server' });
  await expect(recovery).toBeVisible();
  await recovery.click();
  const connectButton = page.getByRole('button', { name: 'Connect your credential' });
  await expect(connectButton).toBeFocused();
  await expect(page.getByRole('heading', { name: 'Connect your credential' })).toHaveCount(0);

  await connectButton.click();
  await submitAndVerifyCredential(page, 'fixture-invalid');
  const failedCredentialDialog = page.getByRole('dialog', { name: /^(Connect your credential|Replace your credential for Agent credential server)$/ });
  await expect(failedCredentialDialog).toContainText('verification failed');
  await failedCredentialDialog.getByRole('button', { name: 'Cancel' }).click();
  await page.getByRole('button', { name: 'Verify credential' }).click();
  await expect(page.getByRole('button', { name: 'Replace credential' })).toBeEnabled();
  await expect(page).not.toHaveURL(/mcpServer=/);

  await page.getByRole('button', { name: 'Disconnect' }).click();
  await page.getByRole('button', { name: 'Connect your credential' }).click();
  await submitAndVerifyCredential(page, 'fixture-rate-limit');
  const credentialDialog = page.getByRole('dialog', { name: 'Connect your credential' });
  await expect(credentialDialog.getByRole('button', { name: /Try again in [12]s/ })).toBeDisabled();
  await expect(credentialDialog.getByRole('button', { name: 'Save and verify' })).toBeEnabled({ timeout: 4_000 });
});

test('schedule auto-pause exposes the bounded reason and a manual workflow recovery path', async ({ page }) => {
  await page.goto(`/workspaces/${workspaceId}/schedules`);
  const row = page.getByRole('row', { name: /MCP recovery review/ });
  await expect(row.getByText('Auto-paused')).toBeVisible();
  await expect(row.getByText(/MCP_CONNECTION_REQUIRED/)).toBeVisible();
  await expect(row.getByText('Repair MCP before resuming. Resume remains a manual action.')).toBeVisible();
  await expect(row.getByRole('button', { name: 'Resume' })).toBeEnabled();
  await expect(row.getByRole('link', { name: 'Review workflow access' })).toHaveAttribute('href', /workflows\?workflow=fixture-workflow&tab=capabilities/);
});
