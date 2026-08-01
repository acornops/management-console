import { expect, test } from '@playwright/test';

const overviewPath = '/workspaces/fixture-workspace/virtual-machines/fixture-vm';

test('VM issue actions remain usable at operator widths', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(overviewPath, { waitUntil: 'domcontentloaded' });

  const issueSection = page.getByRole('region', { name: 'Active Issues' });
  await expect(issueSection).toBeVisible();
  await expect(issueSection.getByText('1 issue', { exact: true })).toBeVisible();
  await expect(issueSection.getByText('1 warning issue', { exact: true })).toBeVisible();

  const issueCard = issueSection.getByRole('article').filter({
    hasText: 'Payment gateway service is degraded'
  });
  await expect(issueCard.getByText('payment-gateway.service', { exact: true })).toBeVisible();
  const assistantButton = issueCard.getByRole('button', { name: 'Open assistant' });
  await expect(assistantButton).toBeVisible();

  const assistantButtonBox = await assistantButton.boundingBox();
  expect(assistantButtonBox).not.toBeNull();
  if (!assistantButtonBox) throw new Error('Open assistant button has no layout box');
  expect(assistantButtonBox.x + assistantButtonBox.width).toBeLessThanOrEqual(1280);
});
