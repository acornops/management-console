import { expect, test } from '@playwright/test';

test('saved workflow responses render as Markdown in the run summary and discussion', async ({ page }) => {
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
            workflowVersion: 2,
            runs: [{
              id: 'fixture-workflow-run',
              workflowRunId: 'fixture-workflow-execution',
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
  await page.getByRole('button', { name: 'Show run details' }).click();

  const discussion = page.getByRole('region', { name: 'Run discussion' });
  await expect(discussion).toContainText('Workflow response');
  await expect(discussion.getByRole('heading', { level: 2, name: 'Findings' })).toBeVisible();
  await expect(discussion.getByRole('list')).toContainText('Retry with the authorized namespace');
  await expect(discussion.locator('code')).toHaveText('default');
});
