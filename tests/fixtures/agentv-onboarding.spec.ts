import { expect, test } from '@playwright/test';

const virtualMachinesPath = '/workspaces/fixture-workspace/virtual-machines';

test('AgentV onboarding separates first install from repair and credential replacement', async ({ page }) => {
  await page.goto(virtualMachinesPath, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Connect VM' }).click();
  await page.getByRole('textbox', { name: 'VM name' }).fill('AgentV onboarding VM');
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

  await page.goto(`${virtualMachinesPath}/fixture-vm/settings`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'Generate setup command' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Generate repair command' }).click();
  await expect(page.getByText('Sensitive until used')).toHaveCount(0);
  await expect(page.getByText('fixture-mode: no agent installation is required', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Replace AgentV credential' }).click();
  await expect(page.getByText('Sensitive until used')).toBeVisible();
  await expect(page.getByText(/expires in 15:/)).toBeVisible();
  await expect(page.getByText('fixture-mode: no agent installation is required --replace-credential', { exact: true })).toBeVisible();
});
