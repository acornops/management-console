import { expect, test } from '@playwright/test';

for (const target of [
  { name: 'VM', route: '/workspaces/fixture-workspace/virtual-machines/fixture-vm', id: 'fixture-vm' },
  { name: 'Kubernetes', route: '/workspaces/fixture-workspace/kubernetes-clusters/fixture-cluster/overview', id: 'fixture-cluster' }
]) {
  test(`${target.name} loads more than 50 issues and retries without losing loaded rows`, async ({ page }) => {
    await page.goto(target.route);
    await expect(page.getByRole('region', { name: 'Open Issues' })).toBeVisible();
    await page.evaluate(async (targetId) => {
      const original = window.fetch.bind(window);
      const path = `/api/v1/workspaces/fixture-workspace/targets/${targetId}/issues`;
      const response = await original(`http://127.0.0.1:59999${path}`);
      const sample = (await response.json()).items[0];
      let failNext = true;
      window.fetch = async (input, init) => {
        const url = new URL(input instanceof Request ? input.url : String(input), location.origin);
        if (url.pathname !== path) return original(input, init);
        if (url.searchParams.get('cursor') && failNext) {
          failNext = false;
          return new Response(JSON.stringify({ error: 'Temporary page failure' }), { status: 503, headers: { 'content-type': 'application/json' } });
        }
        const offset = url.searchParams.get('cursor') ? 50 : 0;
        return new Response(JSON.stringify({
          items: Array.from({ length: offset ? 10 : 50 }, (_, index) => ({ ...sample, id: `issue-${offset + index}`, title: `Pagination issue ${offset + index}` })),
          ...(offset ? {} : { nextCursor: 'page-2' })
        }), { headers: { 'content-type': 'application/json' } });
      };
      window.dispatchEvent(new Event('focus'));
    }, target.id);
    const issues = page.getByRole('region', { name: 'Open Issues' });
    await expect(issues.getByRole('heading', { name: 'Pagination issue 49', exact: true }).last()).toBeVisible();
    await issues.getByRole('button', { name: 'Load more issues' }).click();
    await expect(issues.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
    await expect(issues.getByRole('heading', { name: 'Pagination issue 49', exact: true }).last()).toBeVisible();
    await issues.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect(issues.getByRole('heading', { name: 'Pagination issue 59', exact: true }).last()).toBeVisible();
    await expect(issues.getByRole('button', { name: 'Load more issues' })).toHaveCount(0);
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(issues.getByRole('heading', { name: 'Pagination issue 59', exact: true }).last()).toBeVisible();
  });
}

test('activity updates retain two loaded pages and the next cursor', async ({ page }) => {
  await page.goto('/workspaces/fixture-workspace/workflows?view=activity');
  await expect(page.getByRole('searchbox', { name: 'Search runs' })).toBeVisible();
  await page.evaluate(async () => {
    const original = window.fetch.bind(window);
    const path = '/api/v1/workspaces/fixture-workspace/workflow-executions';
    const response = await original(`http://127.0.0.1:59999${path}`);
    const sample = (await response.json()).items[0];
    let revision = 0;
    let pageRequests = 0;
    window.fetch = async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input), location.origin);
      if (url.pathname !== path) return original(input, init);
      const poll = url.searchParams.get('limit') === '1';
      if (poll) revision += 1;
      else sessionStorage.setItem('history-page-requests', String(++pageRequests));
      const offset = url.searchParams.get('cursor') === 'page-3' ? 100 : url.searchParams.get('cursor') ? 50 : 0;
      if (offset === 50) await new Promise((resolve) => setTimeout(resolve, 500));
      return new Response(JSON.stringify({
        items: Array.from({ length: poll ? 1 : 50 }, (_, index) => ({
          ...sample, id: `run-${offset + index}`, workflow: { ...sample.workflow, name: `History run ${offset + index}` },
          updatedAt: new Date(Date.UTC(2026, 0, 1, 0, 0, revision)).toISOString()
        })),
        nextCursor: offset === 0 ? 'page-2' : offset === 50 ? 'page-3' : undefined,
        summary: { openCount: 150, attentionCount: revision }
      }), { headers: { 'content-type': 'application/json' } });
    };
  });
  await page.getByRole('button', { name: 'Refresh', exact: true }).first().click();
  await expect(page.getByText('History run 49', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Load more', exact: true }).click();
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByText('History run 99', { exact: true })).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByText('New activity is available. Refresh when you are ready to update this history.', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem('history-page-requests'))).toBe('2');
  await expect(page.getByText('History run 99', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Load more', exact: true }).click();
  await expect(page.getByText('History run 149', { exact: true })).toBeVisible();
});
