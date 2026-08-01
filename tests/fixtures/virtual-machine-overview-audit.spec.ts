import { expect, test } from '@playwright/test';

const overviewPath = '/workspaces/fixture-workspace/virtual-machines/fixture-vm';

test('VM issue table keeps header and body cell padding aligned at wide widths', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto(overviewPath, { waitUntil: 'domcontentloaded' });

  const issueTable = page.getByRole('table', { name: 'Open Issues' });
  const issueHeader = issueTable.getByRole('columnheader', { name: 'Issue' });
  const issueCell = issueTable.getByRole('cell').first();
  await expect(issueHeader).toBeVisible();
  await expect(issueCell).toBeVisible();

  const [headerPadding, cellPadding] = await Promise.all([
    issueHeader.evaluate((element) => getComputedStyle(element).paddingInline),
    issueCell.evaluate((element) => getComputedStyle(element).paddingInline)
  ]);
  expect(cellPadding).toBe(headerPadding);
});

test('VM issue actions stay distinct from related workflow activity at operator widths', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(overviewPath, { waitUntil: 'domcontentloaded' });

  const issueSection = page.getByRole('region', { name: 'Open Issues' });
  await expect(issueSection).toBeVisible();
  await expect(issueSection.getByText('1 issue', { exact: true })).toBeVisible();
  await expect(issueSection.getByText('1 warning issue', { exact: true })).toBeVisible();

  const issueCard = issueSection.getByRole('article').filter({
    hasText: 'Payment gateway service is degraded'
  });
  await expect(issueCard.getByText('Active', { exact: true })).toHaveCount(0);
  await expect(issueCard.getByText('payment-gateway.service', { exact: true })).toBeVisible();
  const firstSeen = issueCard.locator('time[aria-label^="First seen:"]');
  await expect(firstSeen).toHaveText(/^\d+ minutes ago$/);
  await expect(firstSeen).toHaveAttribute('title', /GMT|UTC/);
  const assistantButton = issueCard.getByRole('button', { name: 'Open assistant' });
  await expect(assistantButton).toBeVisible();

  const assistantButtonBox = await assistantButton.boundingBox();
  expect(assistantButtonBox).not.toBeNull();
  if (!assistantButtonBox) throw new Error('Open assistant button has no layout box');
  expect(assistantButtonBox.x + assistantButtonBox.width).toBeLessThanOrEqual(1280);
});
