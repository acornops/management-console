import { expect, test } from '@playwright/test';

test('cluster onboarding keeps optional configuration compact until requested', async ({ page }) => {
  await page.goto('/workspaces/fixture-workspace/kubernetes-clusters', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Connect Cluster' }).click();

  const dialog = page.getByRole('dialog');
  const namespaceScope = dialog.getByRole('switch', { name: 'Require namespace scope?' });
  const additionalResources = dialog.getByRole('switch', { name: 'Require additional Kubernetes resources?' });

  await expect(namespaceScope).not.toBeChecked();
  await expect(additionalResources).not.toBeChecked();
  await expect(dialog.getByLabel('Include Namespaces')).toHaveCount(0);
  await expect(dialog.getByText('Optionally enable additional resources for this cluster.')).toHaveCount(0);
  await expect(dialog.getByText('Agent Access')).toBeVisible();
  await expect.poll(() => dialog.evaluate((element) => element.scrollHeight <= element.clientHeight)).toBe(true);

  await namespaceScope.click();
  const includeNamespaces = dialog.getByLabel('Include Namespaces');
  await expect(includeNamespaces).toBeVisible();
  await includeNamespaces.fill('payments');
  await namespaceScope.click();
  await expect(includeNamespaces).toHaveCount(0);
  await namespaceScope.click();
  await expect(dialog.getByLabel('Include Namespaces')).toHaveValue('');

  await additionalResources.click();
  await expect(dialog.getByText('Optionally enable additional resources for this cluster.')).toBeVisible();
  await additionalResources.click();
  await expect(dialog.getByText('Optionally enable additional resources for this cluster.')).toHaveCount(0);
});

test('cluster catalog distinguishes not-connected setup from connected summaries', async ({ page }) => {
  await page.goto('/workspaces/fixture-workspace/kubernetes-clusters', { waitUntil: 'domcontentloaded' });

  const connectedCard = page.locator('[data-cluster-card="true"]').filter({ hasText: 'Singapore Production' });
  await expect(connectedCard).toBeVisible();
  await expect(connectedCard.getByRole('term').filter({ hasText: /^CPU$/ })).toBeVisible();
  await expect(connectedCard.getByRole('term').filter({ hasText: /^Memory$/ })).toBeVisible();
  await expect(connectedCard.locator('svg[viewBox="0 0 180 108"]')).toHaveAttribute('aria-hidden', 'true');
  await expect(connectedCard.getByText('Relative trend', { exact: true })).toHaveCount(0);
  const operationalDetails = connectedCard.locator('[data-cluster-operational-details="true"]');
  await expect(operationalDetails).toBeVisible();
  await expect(operationalDetails.getByRole('term')).toHaveCount(2);
  await expect(operationalDetails.getByRole('term').filter({ hasText: /^Scope:$/ })).toBeVisible();
  await expect(operationalDetails.getByRole('term').filter({ hasText: /^Access:$/ })).toBeVisible();
  await expect(operationalDetails.getByText('All namespaces except 1', { exact: true })).toBeVisible();
  await expect(operationalDetails.getByText('Approval required', { exact: true })).toBeVisible();
  await expect(connectedCard.getByText('13 resources', { exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: 'Connect Cluster' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Cluster Name').fill('Tokyo Staging');
  await dialog.getByRole('button', { name: 'Continue to Install Agent' }).click();
  await dialog.getByRole('button', { name: 'Close connect cluster dialog' }).click();

  const setupCard = page.locator('[data-cluster-card="true"]').filter({ hasText: 'Tokyo Staging' });
  const setupBody = setupCard.locator('[data-cluster-setup-telemetry="true"]');
  const installButton = setupCard.getByRole('button', { name: 'Install Agent', exact: true });
  await expect(setupCard.locator('[aria-label^="Not connected:"]:visible')).toBeVisible();
  await expect(setupCard.getByText('Agent not installed', { exact: true })).toBeVisible();
  await expect(setupCard.getByText('Install the agent to connect this cluster and start telemetry.', { exact: true })).toBeVisible();
  await expect(installButton).toBeVisible();
  await expect(setupBody.locator(':scope > div')).toHaveClass(/text-center/);

  const messageBox = await setupCard.getByText('Install the agent to connect this cluster and start telemetry.', { exact: true }).boundingBox();
  const buttonBox = await installButton.boundingBox();
  expect(messageBox).not.toBeNull();
  expect(buttonBox).not.toBeNull();
  expect(buttonBox!.y).toBeGreaterThan(messageBox!.y + messageBox!.height);

  await expect(setupCard.getByText('Setup Required', { exact: true })).toHaveCount(0);
  await expect(setupCard.getByText('Unavailable', { exact: true })).toHaveCount(0);
  await expect(setupCard.getByText('Telemetry pending', { exact: true })).toHaveCount(0);
  await expect(setupCard.getByText('Agent required', { exact: true })).toHaveCount(0);
  await expect(setupCard.locator('[data-cluster-operational-details="true"]')).toHaveCount(0);
});
