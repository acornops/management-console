import { expect, test } from '@playwright/test';

test('mobile approval outcomes stay inside their card when execution status is unknown', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/workspaces/fixture-workspace/approvals');
  const card = page.locator('[data-approval-layout="mobile"] > li').first();
  const outcome = card.getByText('Unknown', { exact: true });
  await expect(outcome).toBeVisible();
  const cardBounds = await card.boundingBox();
  const outcomeBounds = await outcome.boundingBox();
  expect(cardBounds).not.toBeNull();
  expect(outcomeBounds).not.toBeNull();
  expect(outcomeBounds!.x + outcomeBounds!.width).toBeLessThanOrEqual(cardBounds!.x + cardBounds!.width);
});

for (const width of [1680, 390]) {
  test(`approval history separates decision from execution and resolves identities at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => {
      const originalFetch = window.fetch.bind(window);
      const row = {
        approvalId: 'clarity-approval', id: 'clarity-approval', runId: 'clarity-run', workspaceId: 'fixture-workspace',
        source: 'interactive_tool', toolCallId: 'clarity-call', toolName: 'restart_service', summary: 'Restart the web service',
        requestedBy: 'requester-uuid', requestedByUser: { id: 'requester-uuid', displayName: 'Alex Chen' },
        decidedBy: 'decider-uuid', decidedByUser: { id: 'decider-uuid', displayName: 'Sam Lee' },
        targetId: 'vm-uuid', targetType: 'virtual_machine', targetName: 'Production VM', workspaceName: 'Operations',
        status: 'approved', executionStatus: 'failed', arguments: { service: 'web.service' },
        requestedAt: '2026-10-18T08:00:00Z', createdAt: '2026-10-18T08:00:00Z', expiresAt: '2026-10-19T08:00:00Z'
      };
      window.fetch = async (input, init) => {
        const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.href);
        const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });
        if (url.pathname.endsWith('/workspaces/fixture-workspace/approvals')) {
          return json({ items: url.searchParams.get('status') === 'pending' ? [] : [row], pendingCount: 0 });
        }
        if (url.pathname.endsWith('/runs/clarity-run/approvals')) return json([row]);
        return originalFetch(input, init);
      };
    });
    await page.goto('/workspaces/fixture-workspace/approvals');
    await page.getByRole('button', { name: 'Recent', exact: true }).click();
    const history = page.locator('[data-approval-layout]:visible');
    await expect(history.getByText('Alex Chen', { exact: true })).toBeVisible();
    await expect(history.getByText('Production VM', { exact: true })).toBeVisible();
    await expect(history.getByText('Approved', { exact: true })).toBeVisible();
    await expect(history.getByText('Failed', { exact: true })).toBeVisible();
    await expect(history.getByText('requester-uuid', { exact: true })).toHaveCount(0);
    await expect(history.getByText('Execution status', { exact: true })).toBeVisible();
    await expect(history.getByText('approvals.sources.interactive_tool', { exact: true })).toHaveCount(0);
    await page.screenshot({ path: `test-results/approval-history-${width}.png`, fullPage: true });
    await history.getByRole('button', { name: 'Review', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Review approval' });
    for (const name of ['Alex Chen', 'Sam Lee', 'Production VM', 'Operations', 'requester-uuid', 'vm-uuid', 'Failed']) {
      await expect(dialog.getByText(name, { exact: true })).toBeVisible();
    }
    await expect(dialog.getByRole('button', { name: 'Copy Requested by ID' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Approve', exact: true })).toBeDisabled();
    await expect(dialog).toHaveCSS('opacity', '1');
    await expect(dialog.locator('..')).toHaveCSS('opacity', '1');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
    await page.screenshot({ path: `test-results/approval-outcomes-${width}.png`, fullPage: true });
  });
}
