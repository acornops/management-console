import { expect, test, type Page } from '@playwright/test';

const path = '/workspaces/fixture-workspace/kubernetes-clusters/fixture-cluster/mcp-servers?fixtureMcpTools=200';

interface ToolReadTestState {
  failNextPage: boolean;
  delayPages: boolean;
  pending: Array<() => void>;
  saved: Record<string, boolean>;
  mutations: Array<{ name: string; body: unknown }>;
  cursors: string[];
}

declare global {
  interface Window { toolReadTest: ToolReadTestState; }
}

async function installToolReads(page: Page) {
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    const state: ToolReadTestState = { failNextPage: false, delayPages: false, pending: [], saved: {}, mutations: [], cursors: [] };
    window.toolReadTest = state;
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
    window.fetch = async (input, init) => {
      const request = new Request(input, init);
      const url = new URL(request.url);
      if (/\/mcp\/servers\/[^/]+\/tools\/[^/]+$/.test(url.pathname) && request.method === 'PATCH') {
        const name = decodeURIComponent(url.pathname.split('/').at(-1)!);
        const body = await request.json();
        state.mutations.push({ name, body });
        if (state.mutations.length === 2) return json({ error: { code: 'UNAVAILABLE', message: 'Tool save unavailable.', retryable: true } }, 503);
        state.saved[name] = body.enabled;
        return json({ name, description: `Offline tool ${Number(name.slice(-3))}`, capability: 'write', version: '1.0.0', source: 'mcp', enabledConfigured: body.enabled, enabledEffective: body.enabled, effectiveDisabledReason: null });
      }
      if (/\/mcp\/servers\/[^/]+\/tools$/.test(url.pathname)) {
        if (url.searchParams.has('cursor')) {
          state.cursors.push(url.searchParams.get('cursor')!);
          if (state.delayPages) await new Promise<void>(resolve => state.pending.push(resolve));
          if (state.failNextPage) {
            state.failNextPage = false;
            return json({ error: { code: 'UNAVAILABLE', message: 'Tool page unavailable.', retryable: true } }, 503);
          }
        }
        const response = await originalFetch(input, init);
        const body = await response.json();
        for (const tool of body.items || []) {
          if (tool.name in state.saved) tool.enabledConfigured = tool.enabledEffective = state.saved[tool.name];
        }
        return json(body, response.status);
      }
      return originalFetch(input, init);
    };
  });
}

async function openTools(page: Page) {
  await page.goto(path);
  await page.getByRole('button', { name: 'Actions for AcornOps Kubernetes Tools', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Manage Tools', exact: true }).click();
  return page.getByRole('dialog');
}

test('search includes unloaded names and display labels, preserves drafts and resets only edits', async ({ page }) => {
  await installToolReads(page);
  const dialog = await openTools(page);
  await expect(dialog.getByText('Showing 50 of 200 tools', { exact: true })).toBeVisible();
  const search = dialog.getByRole('searchbox', { name: 'Search tools', exact: true });
  await search.fill('fixture_tool_200');
  await expect(dialog.getByText('Showing 1 of 200 tools', { exact: true })).toBeVisible();
  await dialog.getByRole('switch', { name: 'Disable Offline tool 200', exact: true }).click();
  await search.fill('OFFLINE TOOL 199');
  await expect(dialog.getByText('fixture_tool_199', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Configured tool state', exact: true }).click();
  await page.getByRole('option', { name: 'Disabled', exact: true }).click();
  await expect(dialog.getByText('No tools match the current filters.', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await expect(search).toBeFocused();
  await search.fill('fixture_tool_200');
  await expect(dialog.getByRole('switch', { name: 'Enable Offline tool 200', exact: true })).not.toBeChecked();
  await dialog.getByRole('button', { name: 'Configured tool state', exact: true }).click();
  await page.getByRole('option', { name: 'Disabled', exact: true }).click();
  await expect(dialog.getByText('Showing 1 of 200 tools', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Configured tool state', exact: true }).click();
  await page.getByRole('option', { name: 'All tools', exact: true }).click();
  await dialog.getByRole('button', { name: 'Reset changes', exact: true }).click();
  await expect(dialog.getByRole('switch', { name: 'Disable Offline tool 200', exact: true })).toBeChecked();
  await expect(search).toHaveValue('fixture_tool_200');
  await expect(dialog.getByRole('button', { name: 'Save changes', exact: true })).toBeDisabled();
  await search.press('Escape');
  await expect(search).toHaveValue('');
  await expect(search).toBeFocused();
  expect(await page.evaluate(() => window.toolReadTest.cursors.length)).toBe(3);
});

test('incomplete tool reads never claim no matches and can be retried without losing edits', async ({ page }) => {
  await installToolReads(page);
  const dialog = await openTools(page);
  await dialog.getByRole('switch', { name: 'Disable Offline tool 2', exact: true }).click();
  await page.evaluate(() => { window.toolReadTest.failNextPage = true; });
  await dialog.getByRole('searchbox', { name: 'Search tools', exact: true }).fill('fixture_tool_200');
  await expect(dialog.getByText('Results are incomplete. Not all discovered tools have loaded.', { exact: true }).first()).toBeVisible();
  await expect(dialog.getByText('No tools match the current filters.', { exact: true })).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Retry loading tools', exact: true }).click();
  await expect(dialog.getByText('Showing 1 of 200 tools', { exact: true })).toBeVisible();
  await dialog.getByRole('searchbox', { name: 'Search tools', exact: true }).fill('fixture_tool_002');
  await expect(dialog.getByRole('switch', { name: 'Enable Offline tool 2', exact: true })).not.toBeChecked();
});

test('a failed save retains the draft, while reset respects tools already saved successfully', async ({ page }) => {
  await installToolReads(page);
  const dialog = await openTools(page);
  const search = dialog.getByRole('searchbox', { name: 'Search tools', exact: true });
  await search.fill('fixture_tool_200');
  await expect(dialog.getByText('Showing 1 of 200 tools', { exact: true })).toBeVisible();
  for (const number of ['002', '004']) {
    await search.fill(`fixture_tool_${number}`);
    await dialog.getByRole('switch', { name: `Disable Offline tool ${Number(number)}`, exact: true }).click();
  }
  await dialog.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(dialog.getByText('Could not sync MCP settings with the gateway. Try again shortly.', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('switch', { name: 'Enable Offline tool 4', exact: true })).not.toBeChecked();
  await expect(dialog.getByRole('button', { name: 'Save changes', exact: true })).toBeEnabled();
  expect(await page.evaluate(() => window.toolReadTest.mutations)).toEqual([
    { name: 'fixture_tool_002', body: { enabled: false } },
    { name: 'fixture_tool_004', body: { enabled: false } }
  ]);
  await dialog.getByRole('button', { name: 'Reset changes', exact: true }).click();
  await expect(dialog.getByRole('switch', { name: 'Disable Offline tool 4', exact: true })).toBeChecked();
  await search.fill('fixture_tool_002');
  await expect(dialog.getByRole('switch', { name: 'Enable Offline tool 2', exact: true })).not.toBeChecked();
  await search.fill('fixture_tool_004');
  await dialog.getByRole('switch', { name: 'Disable Offline tool 4', exact: true }).click();
  await dialog.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(await page.evaluate(() => window.toolReadTest.mutations.length)).toBe(3);
});

test('closing a delayed filter read cannot restore old search or drafts on reopen', async ({ page }) => {
  await installToolReads(page);
  const dialog = await openTools(page);
  await page.evaluate(() => { window.toolReadTest.delayPages = true; });
  await dialog.getByRole('searchbox', { name: 'Search tools', exact: true }).fill('fixture_tool_200');
  await expect.poll(() => page.evaluate(() => window.toolReadTest.pending.length)).toBe(1);
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.evaluate(() => {
    window.toolReadTest.delayPages = false;
    window.toolReadTest.pending.splice(0).forEach(resolve => resolve());
  });
  await page.getByRole('button', { name: 'Actions for AcornOps Kubernetes Tools', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Manage Tools', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('searchbox', { name: 'Search tools', exact: true })).toHaveValue('');
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Save changes', exact: true })).toBeDisabled();
});

test('filtered group toggles still apply to every tool in that capability', async ({ page }) => {
  const dialog = await openTools(page);
  await dialog.getByRole('searchbox', { name: 'Search tools', exact: true }).fill('fixture_tool_200');
  await expect(dialog.getByText('Showing 1 of 200 tools', { exact: true })).toBeVisible();
  const writes = dialog.locator('[data-mcp-tool-capability="write"]');
  await expect(writes.getByText('All 100 tools', { exact: true })).toBeVisible();
  await writes.getByRole('switch', { name: 'Disable all write-capable tools', exact: true }).click();
  await dialog.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await dialog.getByRole('button', { name: 'Tool capability', exact: true }).click();
  await page.getByRole('option', { name: 'Write-capable tools', exact: true }).click();
  await expect(dialog.locator('[data-mcp-tool-capability="write"]').getByRole('switch', { checked: false })).toHaveCount(101);
  await dialog.getByRole('button', { name: 'Configured tool state', exact: true }).click();
  await page.getByRole('option', { name: 'Enabled', exact: true }).click();
  await expect(dialog.getByText('No tools match the current filters.', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await dialog.getByRole('button', { name: 'Tool capability', exact: true }).click();
  await page.getByRole('option', { name: 'Read-only tools', exact: true }).click();
  const reads = dialog.locator('[data-mcp-tool-capability="read"]');
  await expect(writes).toHaveCount(0);
  await reads.getByRole('switch', { name: 'Disable all read-only tools', exact: true }).click();
  await expect(reads.getByRole('switch', { checked: false })).toHaveCount(101);
  await reads.getByRole('switch', { name: 'Enable all read-only tools', exact: true }).click();
  await expect(reads.getByRole('switch', { checked: true })).toHaveCount(101);
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole('button', { name: 'Actions for AcornOps Kubernetes Tools', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Manage Tools', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('switch', { name: 'Disable all write-capable tools', exact: true })).toBeChecked();
});

for (const [width, height, theme] of [[1440, 900, 'light'], [1440, 900, 'dark'], [390, 568, 'light'], [390, 568, 'dark']] as const) {
  test(`200 tools keep last row, long label, footer and keyboard focus reachable at ${width}px ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.addInitScript(theme => localStorage.setItem('acornops_active_theme_preference', theme), theme);
    const dialog = await openTools(page);
    if (width === 390) {
      const summary = dialog.locator('section').filter({ has: page.getByRole('heading', { name: 'Tool access', exact: true }) });
      expect((await summary.boundingBox())!.height).toBeLessThan(260);
    }
    const search = dialog.getByRole('searchbox', { name: 'Search tools', exact: true });
    await search.fill('fixture_tool_200');
    await expect(dialog.getByText('fixture_tool_200', { exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Clear filters', exact: true }).click();
    const last = dialog.getByRole('switch', { name: 'Disable Offline tool 200', exact: true });
    await last.focus();
    await expect(last).toBeFocused();
    await expect(last).toBeInViewport();
    await search.fill('fixture_tool_001');
    const long = dialog.getByRole('heading', { name: /^Long fixture tool description/ });
    await expect(long).toHaveAttribute('title', /Long fixture tool description/);
    await expect(long).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeInViewport();
    await expect(dialog.getByRole('button', { name: 'Save changes', exact: true })).toBeInViewport();
    expect(await dialog.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
    await search.press('Escape');
    await expect(search).toHaveValue('');
    await search.press('Escape');
    await expect(dialog).toHaveCount(0);
    if (width === 390) expect((await page.locator('[data-mcp-server-access-summary]').boundingBox())!.height).toBeLessThan(230);
  });
}

test('Agent appearance is optional, keyboard-expandable and retains the draft summary', async ({ page }) => {
  await page.goto('/workspaces/fixture-workspace/agents/fixture-specialist/settings');
  const disclosure = page.getByRole('button', { name: 'Agent appearance', exact: true });
  await expect(disclosure).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('button', { name: 'Use 🚀 for this Agent', exact: true })).toHaveCount(0);
  await disclosure.focus();
  await disclosure.press('Enter');
  await page.getByRole('button', { name: 'Use 🚀 for this Agent', exact: true }).click();
  await disclosure.click();
  await expect(disclosure).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByText('Selected appearance: 🚀', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reset changes', exact: true }).click();
  await page.getByRole('button', { name: 'Discard changes', exact: true }).click();
  await expect(page.getByText('Selected appearance: 🚀', { exact: true })).toHaveCount(0);
});
