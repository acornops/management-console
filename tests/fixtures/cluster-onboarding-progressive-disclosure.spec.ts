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
