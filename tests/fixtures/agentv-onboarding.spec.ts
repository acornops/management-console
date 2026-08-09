import { expect, test } from '@playwright/test';

const virtualMachinesPath = '/workspaces/fixture-workspace/virtual-machines';

test('AgentV onboarding separates first install from repair and credential replacement', async ({ page }) => {
  await page.goto(virtualMachinesPath, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Connect VM' }).click();
  await page.getByRole('textbox', { name: 'VM name' }).fill('AgentV onboarding VM');
  await page.getByRole('radio', { name: /Read-write/ }).check();
  await page.getByRole('textbox', { name: 'Restartable systemd services' }).fill('nginx.service');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByText('nginx.service', { exact: true })).toBeVisible();
  await expect(page.getByText('The local allowlist is always enforced. Approval behavior is configured later in VM Settings.')).toBeVisible();
  await page.getByRole('button', { name: 'Continue to Install Agent' }).click();

  const onboarding = page.getByRole('dialog', { name: 'Connect VM' });
  await expect(onboarding.getByText('Sensitive until used')).toBeVisible();
  await expect(onboarding.getByText(/expires in 15:/)).toBeVisible();
  await expect(onboarding.getByText('This command is illustrative and cannot connect an external VM.')).toBeVisible();

  await onboarding.getByRole('button', { name: 'Close connect VM dialog' }).click();
  await page.getByRole('button', { name: 'Install Agent' }).click();

  await expect(page.getByRole('heading', { name: 'VM Settings' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Generate setup command' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Generate repair command' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Replace AgentV credential' })).toHaveCount(0);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByText(/Read-write for these exact services: nginx.service/)).toBeVisible();

  await page.goto(`${virtualMachinesPath}/fixture-vm/settings`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'Generate setup command' })).toHaveCount(0);
  const permissionMode = page.getByRole('button', { name: 'Permission mode' });
  await expect(permissionMode).toContainText('Ask before changes');
  await permissionMode.click();
  await page.getByRole('option', { name: 'Auto-run allowed changes' }).click();
  await expect(permissionMode).toContainText('Auto-run allowed changes');
  await expect(page.getByText('VM run permissions updated.')).toBeVisible();
  await expect(page.getByText('The root-owned service allowlist remains enforced in every mode.')).toBeVisible();
  await page.getByRole('button', { name: 'Generate repair command' }).click();
  await expect(page.getByText('Sensitive until used')).toHaveCount(0);
  await expect(page.getByText('fixture-mode: no agent installation is required', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Replace AgentV credential' }).click();
  await expect(page.getByText('Sensitive until used')).toBeVisible();
  await expect(page.getByText(/expires in 15:/)).toBeVisible();
  await expect(page.getByText('fixture-mode: no agent installation is required --replace-credential', { exact: true })).toBeVisible();
});

test('AgentV onboarding defaults to read-only and requires a scoped service for write access', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(virtualMachinesPath, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Connect VM' }).click();
  await page.getByRole('textbox', { name: 'VM name' }).fill('Read-only VM');
  await expect(page.getByRole('radio', { name: /Read-only/ })).toBeChecked();
  await expect(page.getByRole('button', { name: 'Continue to Install Agent' })).toBeEnabled();

  await page.getByRole('radio', { name: /Read-write/ }).check();
  await expect(page.getByRole('button', { name: 'Continue to Install Agent' })).toBeDisabled();
  await page.getByRole('textbox', { name: 'Restartable systemd services' }).fill('*.service');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Enter an exact .service unit name that is not an AgentV service.');
});

test('VM settings stages host allowlist changes and returns one apply command', async ({ page }) => {
  await page.goto(`${virtualMachinesPath}/fixture-vm/settings`, { waitUntil: 'domcontentloaded' });

  await expect(page.getByText('Applied on VM')).toBeVisible();
  await expect(page.getByText('Read-write for these exact services: payments-api.service. Run permissions control approval behavior.')).toBeVisible();
  await page.getByRole('button', { name: 'Remove payments-api.service' }).click();
  await page.getByRole('textbox', { name: 'Restartable systemd services' }).fill('payments-worker.service');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('button', { name: 'Generate apply command' }).click();

  await expect(page.getByText('Pending host update')).toBeVisible();
  await expect(page.getByText('Read-write for these exact services: payments-worker.service. Run permissions control approval behavior.')).toBeVisible();
  await expect(page.getByText(/Writes are paused until the pending policy is applied/)).toBeVisible();
  await expect(page.getByText('fixture-mode: no agent installation is required --replace-credential', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Generate new apply command' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Replace AgentV credential' })).toBeDisabled();
});
