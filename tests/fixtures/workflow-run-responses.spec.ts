import { expect, test } from '@playwright/test';

test('saved workflow responses render as Markdown in the read-only run summary', async ({ page }) => {
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const method = init?.method || (typeof input === 'object' && 'method' in input ? input.method : 'GET');
      if (method === 'GET' && url.includes('/api/v1/workflows/fixture-workflow/sessions?')) {
        return Promise.resolve(new Response(JSON.stringify({
          items: [{
            id: 'fixture-workflow-session',
            workflowId: 'fixture-workflow',
            workspaceId: 'fixture-workspace',
            runs: [{
              id: 'fixture-workflow-run',
              executionId: 'fixture-workflow-execution',
              executorRole: 'specialist',
              status: 'completed',
              requestedAt: '2026-07-19T12:57:45.000Z',
              startedAt: '2026-07-19T12:57:46.000Z',
              endedAt: '2026-07-19T12:58:56.000Z',
              assistantMessage: { content: '## Findings\n\n- Scope mismatch\n- Retry with the authorized namespace\n\n`default`' }
            }]
          }]
        }), { status: 200, headers: { 'content-type': 'application/json' } }));
      }
      return originalFetch(input, init);
    };
  });

  await page.goto('/workspaces/fixture-workspace/workflows?workflow=fixture-workflow&tab=runs', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { level: 2, name: 'Findings' })).toHaveCount(1);
  await expect(page.getByText('Scope mismatch', { exact: true })).toBeVisible();
  const runSummary = page.getByText('Run summary', { exact: true });
  await runSummary.click();
  await expect(page.getByRole('heading', { level: 2, name: 'Findings' })).toBeHidden();
  await runSummary.click();
  await expect(page.getByRole('heading', { level: 2, name: 'Findings' })).toBeVisible();
  const runCard = page.locator('article').filter({ hasText: 'fixture-workflow-run' }).first();
  const disclosure = page.getByRole('button', { name: 'Show run details' });
  await disclosure.click();
  await expect(page.getByRole('button', { name: 'Hide run details' })).toHaveClass(/justify-start/);
  const runCardClass = await runCard.getAttribute('class');
  expect(runCardClass).toMatch(/(?:^|\s)border-ui-border(?:\s|$)/);
  expect(runCardClass).not.toMatch(/(?:^|\s)border-control-boundary(?:\s|$)/);
  const runCardBox = await runCard.boundingBox();
  const disclosureBox = await page.getByRole('button', { name: 'Hide run details' }).boundingBox();
  expect(runCardBox).not.toBeNull();
  expect(disclosureBox).not.toBeNull();
  expect((disclosureBox?.x || 0) - (runCardBox?.x || 0)).toBeCloseTo(17, 0);
  await expect(page.getByRole('region', { name: 'Run discussion' })).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Send instruction' })).toHaveCount(0);
});
