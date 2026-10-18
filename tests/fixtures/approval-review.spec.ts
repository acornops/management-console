import { expect, test, type Page } from '@playwright/test';

const clock = '2026-10-18T08:30:00.000Z';
const inbox = '/workspaces/fixture-workspace/approvals';

declare global {
  interface Window {
    approvalReviewProbe: { decisions: string[]; reads: number; releaseOlder?: () => void };
  }
}

async function overrideDetail(page: Page, options: {
  failures?: number[];
  override?: Record<string, unknown>;
  decisionStatus?: number;
  twoSelections?: boolean;
  longArguments?: boolean;
} = {}) {
  await page.addInitScript((options) => {
    const originalFetch = window.fetch.bind(window);
    window.approvalReviewProbe = { decisions: [], reads: 0 };
    const rows = [{
      approvalId: 'fixture-workspace-approval', runId: 'fixture-execution-review-run',
      source: 'interactive_tool', summary: 'Review A', toolName: 'scale_workload', requestedBy: 'operator-1',
      status: 'pending', requestedAt: '2026-10-18T08:00:00.000Z', expiresAt: '2026-10-19T08:30:00.000Z'
    }, ...(options.twoSelections ? [{
      approvalId: 'approval-b', runId: 'run-b', source: 'interactive_tool', summary: 'Review B', toolName: 'restart_workload',
      requestedBy: 'operator-2', status: 'pending', requestedAt: '2026-10-18T08:00:00.000Z', expiresAt: '2026-10-19T08:30:00.000Z'
    }] : [])];
    let decided = '';
    let olderReleased = false;
    const olderRequests: Array<() => void> = [];
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
    window.fetch = async (input, init) => {
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.href);
      const method = init?.method || (typeof input === 'object' && 'method' in input ? input.method : 'GET');
      const path = url.pathname;
      if (options.twoSelections && method === 'GET' && path.endsWith('/workflows/fixture-workflow/sessions')) {
        return json({ items: [{ id: 'fixture-workflow-session', workflowId: 'fixture-workflow', workspaceId: 'fixture-workspace', runs: rows.map((row) => ({
          id: row.runId, executionId: `${row.runId}-execution`, status: 'waiting_for_approval', requestedAt: row.requestedAt
        })) }] });
      }
      if (options.twoSelections && method === 'GET' && path.endsWith('/workspaces/fixture-workspace/approvals')) {
        return json({ items: url.searchParams.get('status') === 'decided' ? [] : rows, pendingCount: 2 });
      }
      if (method === 'GET' && /^\/api\/v1\/runs\/[^/]+\/approvals$/.test(path)) {
        const row = rows.find((item) => path.includes(`/runs/${item.runId}/`));
        if (!row) return originalFetch(input, init);
        const reviewing = Boolean(document.querySelector('[role="dialog"]'));
        const read = reviewing ? window.approvalReviewProbe.reads++ : -1;
        const failure = reviewing ? options.failures?.[read] : undefined;
        if (failure) return json({ error: { message: 'private-error-token', code: failure === 403 ? 'FORBIDDEN' : 'NOT_FOUND' } }, failure);
        const detail = {
          id: row.approvalId, runId: row.runId, workspaceId: 'fixture-workspace', toolCallId: `${row.approvalId}-call`,
          targetId: 'fixture-cluster', targetType: 'kubernetes', toolName: row.toolName, summary: row.summary,
          arguments: { namespace: 'payments', name: 'worker', note: options.longArguments ? '<script>警告</script>\u202e'.repeat(150) : 'reviewed action', api_key: 'secret-do-not-render' },
          requestedBy: row.requestedBy, createdAt: row.requestedAt, status: decided || row.status,
          expiresAt: row.expiresAt, executionStatus: 'not_started', toolResult: 'private-result', continuation: 'private-state',
          ...(reviewing ? options.override : {})
        };
        if (reviewing && options.twoSelections && row.approvalId === 'fixture-workspace-approval' && !olderReleased) await new Promise<void>((resolve) => {
          olderRequests.push(resolve);
          window.approvalReviewProbe.releaseOlder = () => { olderReleased = true; olderRequests.forEach((release) => release()); };
        });
        return json([detail]);
      }
      if (method === 'POST' && path.endsWith('/decision')) {
        window.approvalReviewProbe.decisions.push(String(init?.body));
        if (options.decisionStatus) {
          if (options.decisionStatus === 409) decided = 'approved';
          return json({ error: { code: 'APPROVAL_ALREADY_DECIDED', message: 'secret-do-not-render' } }, options.decisionStatus);
        }
      }
      return originalFetch(input, init);
    };
  }, options);
}

const openInbox = async (page: Page, query = '') => {
  await page.goto(`${inbox}?fixtureClock=${encodeURIComponent(clock)}${query}`);
  await page.getByRole('button', { name: 'Review', exact: true }).first().click();
  return page.getByRole('dialog', { name: 'Review approval' });
};

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(clock));
});

test('inbox opens exact context without deciding, then rejects once and retains history', async ({ page }) => {
  const decisions: string[] = [];
  page.on('request', (request) => { if (request.method() === 'POST' && request.url().endsWith('/decision')) decisions.push(request.postData() || ''); });
  await page.goto(`${inbox}?fixtureClock=${encodeURIComponent(clock)}`);
  await page.getByRole('button', { name: 'Review', exact: true }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Review approval' });
  await expect(dialog.getByText('restart_workload', { exact: true })).toBeVisible();
  await expect(dialog.locator('pre')).toContainText('payments');
  expect(decisions).toEqual([]);
  await dialog.getByRole('button', { name: 'Reject', exact: true }).dblclick();
  await expect(dialog).toBeHidden();
  expect(decisions).toEqual(['{"decision":"rejected"}']);
  await page.getByRole('button', { name: 'Recent', exact: true }).click();
  await expect(page.locator('[data-approval-layout]:visible').getByText('Rejected', { exact: true }).last()).toBeVisible();
});

for (const decision of ['Approve', 'Reject']) test(`workflow gate review records ${decision} once and retains execution history`, async ({ page }) => {
  await page.goto(`/workspaces/fixture-workspace/workflows?workflow=fixture-workflow&tab=runs&fixtureClock=${encodeURIComponent(clock)}`);
  await page.getByRole('button', { name: 'Review', exact: true }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Review approval' });
  await expect(dialog.getByText('Workflow gate', { exact: true })).toBeVisible();
  await expect(dialog.getByText('workflow.approval_gate', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Approve', exact: true })).toBeEnabled();
  await dialog.getByRole('button', { name: decision, exact: true }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole('button', { name: 'Review', exact: true }).first().click();
  await expect(dialog.getByText(decision === 'Approve' ? 'Approved' : 'Rejected', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Not started', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Approve', exact: true })).toBeDisabled();
  await expect(dialog.getByRole('button', { name: 'Reject', exact: true })).toBeDisabled();
});

test('an approval expiring while open cannot submit even before the expiry timer paints', async ({ page }) => {
  await overrideDetail(page, { override: { expiresAt: '2026-10-18T08:30:01.000Z' } });
  const dialog = await openInbox(page);
  const approve = dialog.getByRole('button', { name: 'Approve', exact: true });
  await expect(approve).toBeEnabled();
  await page.clock.setFixedTime(new Date('2026-10-18T08:30:03.000Z'));
  await approve.evaluate((button: HTMLButtonElement) => button.click());
  expect(await page.evaluate(() => window.approvalReviewProbe.decisions)).toEqual([]);
  await expect(approve).toBeDisabled();
});

for (const status of [403, 404, 503]) {
  test(`detail ${status} fails closed and Retry loads context without sending a decision`, async ({ page }) => {
    // React StrictMode intentionally starts and cancels the first mount read.
    await overrideDetail(page, { failures: [status, status] });
    const dialog = await openInbox(page);
    await expect(dialog.getByText(/Approval details could not be loaded/)).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Approve', exact: true })).toHaveCount(0);
    await expect(dialog).not.toContainText('private-error-token');
    await dialog.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect(dialog.getByText('scale_workload', { exact: true })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Approve', exact: true })).toBeEnabled();
    expect(await page.evaluate(() => window.approvalReviewProbe.decisions)).toEqual([]);
  });
}

for (const override of [
  { expiresAt: '2026-10-18T08:29:00.000Z' }, { expiresAt: '' }, { status: 'approved' },
  { workspaceId: 'other-workspace' }, { runId: 'other-run' }, { id: 'other-approval' }, { arguments: null }
]) {
  test(`unknown, expired or decided detail cannot submit ${JSON.stringify(override)}`, async ({ page }) => {
    await overrideDetail(page, { override });
    const dialog = await openInbox(page);
    if ('expiresAt' in override || 'status' in override) {
      await expect(dialog.getByRole('button', { name: 'Approve', exact: true })).toBeDisabled();
      await expect(dialog.getByRole('button', { name: 'Reject', exact: true })).toBeDisabled();
    } else await expect(dialog.getByText(/Approval details could not be loaded/)).toBeVisible();
    expect(await page.evaluate(() => window.approvalReviewProbe.decisions)).toEqual([]);
  });
}

test('a delayed selection A cannot replace B or submit its action after dismissal', async ({ page }) => {
  await overrideDetail(page, { twoSelections: true });
  const first = await openInbox(page);
  await expect.poll(() => page.evaluate(() => Boolean(window.approvalReviewProbe.releaseOlder))).toBe(true);
  await first.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Review', exact: true }).nth(1).click();
  const dialog = page.getByRole('dialog', { name: 'Review approval' });
  await expect(dialog.getByText('restart_workload', { exact: true })).toBeVisible();
  await page.evaluate(() => window.approvalReviewProbe.releaseOlder?.());
  await expect(dialog.getByText('restart_workload', { exact: true })).toBeVisible();
  await expect(dialog.getByText('scale_workload', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => window.approvalReviewProbe.decisions)).toEqual([]);
});

test('server conflict refreshes current state without reporting success', async ({ page }) => {
  await overrideDetail(page, { decisionStatus: 409 });
  const dialog = await openInbox(page);
  await dialog.getByRole('button', { name: 'Reject', exact: true }).click();
  await expect(dialog.getByText(/This approval changed or expired/)).toBeVisible();
  await expect(dialog.getByText('Approved', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Approve', exact: true })).toBeDisabled();
  expect(await page.evaluate(() => window.approvalReviewProbe.decisions)).toEqual(['{"decision":"rejected"}']);
  await expect(dialog).not.toContainText('secret-do-not-render');
});

test('permission loss on submit prevents another decision even after reloading detail', async ({ page }) => {
  await overrideDetail(page, { decisionStatus: 403 });
  const dialog = await openInbox(page);
  await dialog.getByRole('button', { name: 'Approve', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Approve', exact: true })).toBeDisabled();
  await expect(dialog.getByRole('button', { name: 'Reject', exact: true })).toBeDisabled();
  expect(await page.evaluate(() => window.approvalReviewProbe.decisions)).toEqual(['{"decision":"approved"}']);
});

for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
  test(`${width}px ${theme} review contains long Unicode arguments, traps focus and restores the opener`, async ({ page }, testInfo) => {
    const height = width === 390 ? 844 : 1000;
    await page.setViewportSize({ width, height });
    await page.addInitScript((theme) => { localStorage.setItem('app_theme', theme); localStorage.setItem('acornops_active_theme_preference', theme); }, theme);
    await overrideDetail(page, { longArguments: true });
    const dialog = await openInbox(page);
    await expect(page.locator('html')).toHaveClass(theme === 'dark' ? /dark/ : /^(?!.*dark)/);
    await expect(dialog.locator('pre')).toContainText('<script>警告</script>\\u202e');
    await expect(dialog).not.toContainText('secret-do-not-render');
    await expect(dialog).not.toContainText('private-result');
    await expect(dialog).not.toContainText('private-state');
    await expect(dialog.getByRole('button', { name: 'Close', exact: true })).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(dialog.getByRole('button', { name: 'Approve', exact: true })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(dialog.getByRole('button', { name: 'Close', exact: true })).toBeFocused();
    expect(await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
    const bounds = await dialog.boundingBox();
    expect(bounds!.height).toBeLessThanOrEqual(height - 32);
    await expect(dialog).toHaveCSS('opacity', '1');
    await expect(dialog.locator('..')).toHaveCSS('opacity', '1');
    await page.screenshot({ path: testInfo.outputPath(`review-${width}-${theme}.png`) });
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('button', { name: 'Review', exact: true }).first()).toBeFocused();
    const stored = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }));
    expect(stored).not.toContain('secret-do-not-render');
    expect(stored).not.toContain('private-result');
  });
}

async function openRunsTool(page: Page) {
  await page.goto(`/workspaces/fixture-workspace/workflows?workflow=fixture-workflow&tab=runs&fixtureClock=${encodeURIComponent(clock)}`);
  const card = page.locator('article').filter({ hasText: 'Review A' });
  await card.getByRole('button', { name: 'Review', exact: true }).click();
  return page.getByRole('dialog', { name: 'Review approval' });
}

for (const override of [
  { workspaceId: 'other-workspace' }, { runId: 'other-run' }, { id: 'other-approval' },
  { expiresAt: '2026-10-18T08:29:00.000Z' }
]) {
  test(`run entry also fails closed for ${JSON.stringify(override)}`, async ({ page }) => {
    await overrideDetail(page, { override });
    const dialog = await openRunsTool(page);
    if ('expiresAt' in override) {
      await expect(dialog.getByRole('button', { name: 'Approve', exact: true })).toBeDisabled();
      await expect(dialog.getByRole('button', { name: 'Reject', exact: true })).toBeDisabled();
    } else await expect(dialog.getByText(/Approval details could not be loaded/)).toBeVisible();
    expect(await page.evaluate(() => window.approvalReviewProbe.decisions)).toEqual([]);
  });
}

test('run entry isolates delayed A from B after dismissal', async ({ page }) => {
  await overrideDetail(page, { twoSelections: true });
  const first = await openRunsTool(page);
  await expect.poll(() => page.evaluate(() => Boolean(window.approvalReviewProbe.releaseOlder))).toBe(true);
  await first.getByRole('button', { name: 'Close', exact: true }).click();
  await page.locator('article').filter({ hasText: 'Review B' }).getByRole('button', { name: 'Review', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Review approval' });
  await expect(dialog.getByText('restart_workload', { exact: true })).toBeVisible();
  await page.evaluate(() => window.approvalReviewProbe.releaseOlder?.());
  await expect(dialog.getByText('scale_workload', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => window.approvalReviewProbe.decisions)).toEqual([]);
});

test('run entry permission loss and double click issue only one decision', async ({ page }) => {
  await overrideDetail(page, { decisionStatus: 403 });
  const dialog = await openRunsTool(page);
  await dialog.getByRole('button', { name: 'Reject', exact: true }).dblclick();
  await expect(dialog.getByRole('button', { name: 'Reject', exact: true })).toBeDisabled();
  await expect(dialog.getByRole('button', { name: 'Approve', exact: true })).toBeDisabled();
  expect(await page.evaluate(() => window.approvalReviewProbe.decisions)).toEqual(['{"decision":"rejected"}']);
});

test('viewer can inspect the action but neither entry point enables decisions', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('acornops-fixture-role', 'viewer'));
  let decisions = 0;
  page.on('request', (request) => { if (request.method() === 'POST' && request.url().endsWith('/decision')) decisions++; });
  const dialog = await openInbox(page);
  await expect(dialog.getByText('restart_workload', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Approve', exact: true })).toBeDisabled();
  await expect(dialog.getByRole('button', { name: 'Reject', exact: true })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await page.goto(`/workspaces/fixture-workspace/workflows?workflow=fixture-workflow&tab=runs&fixtureClock=${encodeURIComponent(clock)}`);
  await page.getByRole('button', { name: 'Review', exact: true }).first().click();
  await expect(dialog.getByText('workflow.approval_gate', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Approve', exact: true })).toBeDisabled();
  await expect(dialog.getByRole('button', { name: 'Reject', exact: true })).toBeDisabled();
  expect(decisions).toBe(0);
});
