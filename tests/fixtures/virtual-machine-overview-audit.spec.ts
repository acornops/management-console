import { expect, test } from '@playwright/test';
import { FIXTURE_CLOCK } from '../../src/fixtures/store';

test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(FIXTURE_CLOCK); });

for (const [language, theme] of [['en', 'light'], ['zh', 'dark']]) {
  test(`VM guidance stays target-specific and contained at 390px ${language} ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(({ language, theme }) => {
      localStorage.setItem('app_language', language);
      localStorage.setItem('acornops_profile_preferences:test-user%40fixture.acornops.dev:language', language);
      localStorage.setItem('app_theme', theme);
      localStorage.setItem('acornops_active_theme_preference', theme);
    }, { language, theme });
    await page.goto(`${overviewPath}/settings`);
    await expect(page.getByText(language === 'en'
      ? 'The host service allowlist is always enforced. Run permissions on this page separately control approval.'
      : '始终执行主机服务允许列表。本页的运行权限单独控制审批要求。', { exact: true })).toBeVisible();
    const instructions = page.getByPlaceholder(language === 'en'
      ? 'Check the payments runbook before restarting payment.service. Review related processes and listening ports'
      : '重启 payment.service 前检查支付运行手册。查看相关进程和监听端口');
    await expect(instructions).toBeVisible();
    await instructions.scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `/tmp/phase06-mc-vm-guidance-${language}-${theme}.png`, fullPage: true });
  });
}

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
