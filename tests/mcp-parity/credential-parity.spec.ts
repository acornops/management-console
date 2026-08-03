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

async function selectServerAction(page: Page, serverName: string, actionName: string) {
  await page.getByRole('button', { name: `Actions for ${serverName}` }).click();
  await page.getByRole('menuitem', { name: actionName }).click();
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
  await selectOption(page, 'Auth Type', 'Custom Header');
  const headerName = page.getByLabel('Header Name');
  await headerName.fill('X-API-Key');
  await expect(headerName).toHaveAttribute('aria-describedby', 'mcp-header-name-help');
  await expect(page.getByText('You’ll enter the secret header value in the next step.')).toBeVisible();
  await expect(page.getByText('Add credential', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Continue to add credential' }).click();

  await expect(page.getByRole('heading', { name: 'Connect your credential' })).toBeVisible();
  await expect(page.getByText('fixture_discovered_tool')).toHaveCount(0);
  await submitAndVerifyCredential(page, 'fixture-valid');
  await expect(page.getByText('fixture_discovered_tool')).toBeVisible();
  await expect(page).toHaveURL(/\/mcp-servers$/);
});

test('Agent credential refresh, disconnect/reconnect, and rate limit countdown are safe', async ({ page }) => {
  const agentPath = `/workspaces/${workspaceId}/agents/${agentId}/mcp-servers`;
  await page.goto(agentPath);
  await page.getByRole('button', { name: 'Add MCP server' }).click();
  await page.getByRole('menuitem', { name: /Connect by URL/ }).click();
  await page.getByLabel('Server Name').fill('Agent credential server');
  await page.getByLabel('Server URL').fill('https://mcp.fixture.acornops.dev/agent');
  await selectOption(page, 'Auth Type', 'Bearer Token');
  await page.getByRole('button', { name: 'Continue to add credential' }).click();

  await expect(page.getByRole('heading', { name: 'Connect your credential' })).toBeVisible();
  await submitAndVerifyCredential(page, 'fixture-valid');
  await expect(page.getByRole('heading', { name: 'Review discovered tools' })).toBeVisible();
  await expect(page.getByText('fixture_discovered_tool')).toBeVisible();
  await page.getByRole('button', { name: 'Finish' }).click();
  await expect(page.getByText('fixture_discovered_tool')).toHaveCount(0);
  await expect(page.getByText('Credential connected and MCP tools verified for Agent credential server.')).toBeVisible();

  await selectServerAction(page, 'Agent credential server', 'Disconnect credential');
  await expect(page.getByText('Credential disconnected from Agent credential server.')).toBeVisible();
  await page.getByRole('button', { name: 'Actions for Agent credential server' }).click();
  const connectButton = page.getByRole('menuitem', { name: 'Connect your credential' });
  await expect(connectButton).toBeEnabled();
  await expect(page.getByRole('heading', { name: 'Connect your credential' })).toHaveCount(0);

  await connectButton.click();
  await submitAndVerifyCredential(page, 'fixture-invalid');
  const failedCredentialDialog = page.getByRole('dialog', { name: /^(Connect your credential|Replace your credential for Agent credential server)$/ });
  await expect(failedCredentialDialog).toContainText('verification failed');
  await failedCredentialDialog.getByRole('button', { name: 'Cancel' }).click();
  await selectServerAction(page, 'Agent credential server', 'Verify credential');
  await expect(page.getByText('Agent credential server was verified and its MCP tools were refreshed.')).toBeVisible();
  await page.getByRole('button', { name: 'Actions for Agent credential server' }).click();
  await expect(page.getByRole('menuitem', { name: 'Replace credential' })).toBeEnabled();
  await page.getByRole('button', { name: 'Actions for Agent credential server' }).click();
  await expect(page).not.toHaveURL(/mcpServer=/);

  await selectServerAction(page, 'Agent credential server', 'Disconnect credential');
  await selectServerAction(page, 'Agent credential server', 'Connect your credential');
  await submitAndVerifyCredential(page, 'fixture-rate-limit');
  const credentialDialog = page.getByRole('dialog', { name: 'Connect your credential' });
  await expect(credentialDialog.getByRole('button', { name: /Try again in [12]s/ })).toBeDisabled();
  await expect(credentialDialog.getByRole('button', { name: 'Save and verify' })).toBeEnabled({ timeout: 4_000 });
});

test('Agent OAuth creation stays OAuth and never exposes unauthenticated health checks', async ({ page }) => {
  await page.goto(`/workspaces/${workspaceId}/agents/${agentId}/mcp-servers`);
  await page.getByRole('button', { name: 'Add MCP server' }).click();
  await page.getByRole('menuitem', { name: /Connect by URL/ }).click();
  await page.getByLabel('Server Name').fill('Agent OAuth server');
  await page.getByLabel('Server URL').fill('https://mcp.fixture.acornops.dev/oauth');
  await selectOption(page, 'Auth Type', 'OAuth');
  await page.getByRole('button', { name: 'Continue to authorization' }).click();

  await expect(page.getByRole('heading', { name: 'Authorize Agent OAuth server' })).toBeVisible();
  await page.getByRole('button', { name: 'Close OAuth authorization dialog' }).click();
  await page.getByRole('button', { name: 'Actions for Agent OAuth server' }).click();
  await expect(page.getByRole('menuitem', { name: 'Authorize account' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Check Health' })).toHaveCount(0);
});

test('schedule auto-pause exposes the bounded reason and a manual workflow recovery path', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto(`/workspaces/${workspaceId}/workflows/schedules`);
  const row = page.getByRole('row', { name: /MCP recovery review/ });
  await expect(row.getByText('Auto-paused')).toBeVisible();
  await expect(row.getByText(/MCP_CONNECTION_REQUIRED/)).toBeVisible();
  await expect(row.getByText('Repair MCP before resuming. Resume remains a manual action.')).toBeVisible();
  await expect(row.getByRole('button', { name: 'Resume' })).toBeEnabled();
  await expect(row.getByRole('link', { name: 'Review workflow access' })).toHaveAttribute('href', /workflows\?workflow=fixture-workflow&tab=capabilities/);
});
