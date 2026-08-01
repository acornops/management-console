import { expect, test } from '@playwright/test';

test('VM catalog mirrors the cluster card hierarchy', async ({ page }) => {
  await page.goto('/workspaces/fixture-workspace/virtual-machines', { waitUntil: 'domcontentloaded' });

  const connectedCard = page.locator('[data-vm-card="true"]').filter({ hasText: 'Payments VM' });
  await expect(connectedCard).toBeVisible();
  await expect(connectedCard.getByRole('term').filter({ hasText: /^CPU$/ })).toBeVisible();
  await expect(connectedCard.getByText('31%', { exact: true })).toBeVisible();
  await expect(connectedCard.getByRole('term').filter({ hasText: /^Memory$/ })).toBeVisible();
  await expect(connectedCard.getByRole('term').filter({ hasText: /^Disk$/ })).toBeVisible();
  await expect(connectedCard.getByText('30%', { exact: true })).toBeVisible();
  const operationalDetails = connectedCard.locator('[data-vm-operational-details="true"]');
  await expect(operationalDetails.getByRole('term')).toHaveCount(2);
  await expect(operationalDetails.getByRole('term').filter({ hasText: /^Host:$/ })).toBeVisible();
  await expect(operationalDetails.getByRole('term').filter({ hasText: /^Logs:$/ })).toBeVisible();
  await expect(operationalDetails.getByText('payments-01.fixture.internal', { exact: true })).toBeVisible();
  await expect(operationalDetails.getByText('3 log sources', { exact: true })).toBeVisible();
  await expect(connectedCard.getByText('8 inventory items', { exact: true })).toHaveCount(0);
  await expect(connectedCard.getByText('24 processes', { exact: true })).toHaveCount(0);
  await expect(connectedCard.getByText('1 issue', { exact: true })).toHaveCount(0);
  await expect(connectedCard.locator('svg[viewBox="0 0 180 108"]')).toHaveAttribute('aria-hidden', 'true');
  await expect(connectedCard.getByText('Relative trend', { exact: true })).toHaveCount(0);
  await expect(connectedCard.getByText(/^Last updated /)).toHaveClass(/text-status-warning-text/);
  await expect(operationalDetails).toBeVisible();

  await page.getByRole('button', { name: 'Connect VM' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('VM name').fill('Tokyo VM');
  await dialog.getByRole('button', { name: 'Continue to Install Agent' }).click();
  await dialog.getByRole('button', { name: 'Close connect VM dialog' }).click();

  const setupCard = page.locator('[data-vm-card="true"]').filter({ hasText: 'Tokyo VM' });
  const setupBody = setupCard.locator('[data-vm-setup-telemetry="true"]');
  const installButton = setupCard.getByRole('button', { name: 'Install Agent', exact: true });
  await expect(setupCard.locator('[aria-label^="Not connected:"]:visible')).toBeVisible();
  await expect(setupCard.getByText('Agent not installed', { exact: true })).toBeVisible();
  await expect(setupCard.getByText('Install the agent to connect this VM and start telemetry.', { exact: true })).toBeVisible();
  await expect(installButton).toBeVisible();
  await expect(setupBody.locator(':scope > div')).toHaveClass(/text-center/);

  const messageBox = await setupCard.getByText('Install the agent to connect this VM and start telemetry.', { exact: true }).boundingBox();
  const buttonBox = await installButton.boundingBox();
  expect(messageBox).not.toBeNull();
  expect(buttonBox).not.toBeNull();
  expect(buttonBox!.y).toBeGreaterThan(messageBox!.y + messageBox!.height);

  await expect(setupCard.getByText('Setup Required', { exact: true })).toHaveCount(0);
  await expect(setupCard.getByText('Unavailable', { exact: true })).toHaveCount(0);
  await expect(setupCard.getByText('Telemetry pending', { exact: true })).toHaveCount(0);
  await expect(setupCard.getByText('Agent required', { exact: true })).toHaveCount(0);
  await expect(setupCard.locator('[data-vm-operational-details="true"]')).toHaveCount(0);
});
