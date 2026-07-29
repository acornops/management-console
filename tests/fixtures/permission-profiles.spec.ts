import { expect, test, type Page } from '@playwright/test';

async function selectFixtureRole(page: Page, role: 'owner' | 'admin' | 'viewer') {
  await page.evaluate(async (nextRole) => {
    await fetch('/api/v1/__fixtures/role', {
      method: 'POST',
      body: JSON.stringify({ role: nextRole })
    });
  }, role);
  await page.reload({ waitUntil: 'domcontentloaded' });
}

test('owner, admin, and viewer fixtures expose the expected management boundaries', async ({ page }) => {
  await page.goto('/workspaces/fixture-workspace/agents', { waitUntil: 'domcontentloaded' });

  try {
    const newAgent = page.getByRole('button', { name: 'New agent' });
    await expect(newAgent).toBeEnabled();

    await selectFixtureRole(page, 'viewer');
    await expect(newAgent).toBeDisabled();
    await expect(page.getByRole('button', { name: /^Actions for / })).toHaveCount(0);

    await selectFixtureRole(page, 'admin');
    await expect(newAgent).toBeEnabled();
    await expect(page.getByRole('button', { name: /^Actions for / }).first()).toBeVisible();

    await page.goto('/workspaces/fixture-workspace/settings', { waitUntil: 'domcontentloaded' });
    const deleteWorkspace = page.getByRole('button').filter({ hasText: 'Delete workspace' });
    await expect(deleteWorkspace).toBeDisabled();

    await selectFixtureRole(page, 'owner');
    await expect(deleteWorkspace).toBeEnabled();
  } finally {
    await page.evaluate(() => fetch('/api/v1/__fixtures/reset', { method: 'POST' }));
  }
});
