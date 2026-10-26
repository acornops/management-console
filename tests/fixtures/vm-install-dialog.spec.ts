import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { createFixtureState, FIXTURE_CLOCK } from '../../src/fixtures/store';

const catalogPath = '/workspaces/fixture-workspace/virtual-machines';
const fixture = createFixtureState();

declare global {
  interface Window {
    vmInstallProbe: {
      writes: Array<{ path: string; body: string }>;
      commandsCopied: string[];
      connected: boolean;
      clipboardFails: boolean;
      releaseFirst?: () => void;
    };
  }
}

async function prepare(page: Page, options: {
  viewer?: boolean;
  readOnly?: boolean;
  deferFirst?: boolean;
  firstStatus?: number;
  longCommand?: boolean;
} = {}) {
  await page.clock.setFixedTime(FIXTURE_CLOCK);
  await page.addInitScript(({ workspace, baseVm, options }) => {
    const originalFetch = window.fetch.bind(window);
    window.vmInstallProbe = { writes: [], commandsCopied: [], connected: false, clipboardFails: false };
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: async (text: string) => {
        if (window.vmInstallProbe.clipboardFails) throw new Error('Clipboard unavailable');
        window.vmInstallProbe.commandsCopied.push(text);
      }
    } });
    const vms = ['A', 'B'].map((suffix) => ({
      ...baseVm, id: `pending-vm-${suffix.toLowerCase()}`, name: `Pending VM ${suffix}`,
      status: 'unknown', latestSnapshot: null,
      agentAccessMode: options.readOnly ? 'read_only' : 'read_write',
      restartServices: options.readOnly ? [] : ['nginx.service']
    }));
    const permissions = { ...workspace.permissions, manage_agent_keys: false, manage_targets: !options.viewer };
    const scopedWorkspace = { ...workspace, permissions };
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
    let enrollmentCount = 0;
    window.fetch = async (input, init) => {
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.href);
      const method = init?.method || (typeof input === 'object' && 'method' in input ? input.method : 'GET');
      const path = url.pathname;
      if (method === 'GET' && path === '/api/v1/workspaces' && url.searchParams.get('view') !== 'access-state') return json({ items: [scopedWorkspace] });
      if (method === 'GET' && path === '/api/v1/workspaces/fixture-workspace') return json(scopedWorkspace);
      if (method !== 'GET' && path.includes('/virtual-machines')) {
        window.vmInstallProbe.writes.push({ path, body: String(init?.body || '') });
      }
      if (method === 'GET' && path.endsWith('/virtual-machines')) return json({ items: vms });
      const vm = vms.find((item) => path.endsWith(`/virtual-machines/${item.id}`));
      if (method === 'GET' && vm) return json({ ...vm, status: window.vmInstallProbe.connected ? 'online' : 'unknown' });
      if (method === 'POST' && path.endsWith('/agent-enrollments')) {
        const number = ++enrollmentCount;
        const targetId = path.split('/').at(-2);
        if (number === 1 && options.deferFirst) await new Promise<void>((resolve) => { window.vmInstallProbe.releaseFirst = resolve; });
        if (number === 1 && options.firstStatus) return json({ error: { code: options.firstStatus === 403 ? 'FORBIDDEN' : 'CONFLICT', message: 'Enrollment unavailable.' } }, options.firstStatus);
        return json({ targetId, installInstructions: {
          command: `fixture-only ${targetId} setup-${number}${options.longCommand ? ` ${'synthetic-data-'.repeat(100)}` : ''}`,
          releaseVersion: 'fixture', bootstrapUrl: 'https://fixture.invalid/install.sh',
          enrollmentExpiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
          warnings: ['Fixture command only; never run on a real host.']
        } });
      }
      return originalFetch(input, init);
    };
  }, { workspace: fixture.workspaces[0], baseVm: fixture.virtualMachines[0], options });
}

const dialogFor = (page: Page) => page.getByRole('dialog', { name: 'Install Agent', exact: true });
const cardFor = (page: Page, name = 'Pending VM A') => page.locator('[data-vm-card="true"]').filter({ hasText: name });
async function openInstall(page: Page) {
  await cardFor(page).getByRole('button', { name: 'Install Agent', exact: true }).click();
  const dialog = dialogFor(page);
  await expect(dialog).toBeVisible();
  return dialog;
}

test('existing VM setup is explicit, preserves catalog context and needs target permission only', async ({ page }) => {
  await prepare(page);
  const filteredPath = `${catalogPath}?q=Pending%20VM%20A&status=not_installed`;
  await page.goto(filteredPath);
  const trigger = cardFor(page).getByRole('button', { name: 'Install Agent', exact: true });
  const dialog = await openInstall(page);
  await expect(page).toHaveURL(filteredPath);
  expect(await page.evaluate(() => window.vmInstallProbe.writes)).toEqual([]);
  await expect(dialog.getByText(/Read-write for these exact services: nginx.service/)).toBeVisible();
  await expect(dialog.getByRole('radio')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Generate setup command' }).click();
  await expect(dialog.locator('pre')).toHaveText('fixture-only pending-vm-a setup-1');
  await dialog.getByRole('button', { name: 'Generate new command' }).click();
  await expect(dialog.locator('pre')).toHaveText('fixture-only pending-vm-a setup-2');
  expect(await page.evaluate(() => window.vmInstallProbe.writes)).toEqual([1, 2].map(() => ({
    path: '/api/v1/workspaces/fixture-workspace/virtual-machines/pending-vm-a/agent-enrollments', body: '{"purpose":"initial"}'
  })));
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(page).toHaveURL(filteredPath);
  await page.getByRole('button', { name: 'Install the agent for Pending VM A', exact: true }).click();
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('pre')).toHaveCount(0);
  expect(await page.evaluate(() => window.vmInstallProbe.writes.length)).toBe(2);
});

test('close and reopen discard a late command and repeated clicks cannot create duplicate enrollments', async ({ page }) => {
  await prepare(page, { deferFirst: true });
  await page.goto(catalogPath);
  const dialog = await openInstall(page);
  const generate = dialog.getByRole('button', { name: 'Generate setup command' });
  await generate.dblclick();
  await expect(dialog.getByRole('button', { name: 'Generating…' })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Close install agent dialog' }).click();
  await cardFor(page, 'Pending VM B').getByRole('button', { name: 'Install Agent', exact: true }).click();
  await dialog.getByRole('button', { name: 'Generate setup command' }).click();
  await expect(dialog.locator('pre')).toHaveText('fixture-only pending-vm-b setup-2');
  await page.evaluate(async () => {
    window.vmInstallProbe.releaseFirst?.();
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
  await expect(dialog.locator('pre')).toHaveText('fixture-only pending-vm-b setup-2');
  expect(await page.evaluate(() => window.vmInstallProbe.writes.length)).toBe(2);
});

for (const status of [403, 409]) test(`generation ${status} stays in the dialog and permits explicit retry`, async ({ page }) => {
  await prepare(page, { firstStatus: status });
  await page.goto(catalogPath);
  const dialog = await openInstall(page);
  await dialog.getByRole('button', { name: 'Generate setup command' }).click();
  await expect(dialog.getByRole('alert')).toBeVisible();
  await expect(dialog.locator('pre')).toHaveCount(0);
  await expect(page).toHaveURL(catalogPath);
  await dialog.getByRole('button', { name: 'Generate setup command' }).click();
  await expect(dialog.locator('pre')).toHaveText('fixture-only pending-vm-a setup-2');
  await expect(dialog.getByRole('alert')).toHaveCount(0);
});

test('copy feedback and expiry are shared with onboarding; regeneration is explicit', async ({ page }) => {
  await prepare(page, { readOnly: true });
  await page.goto(catalogPath);
  const dialog = await openInstall(page);
  await expect(dialog.getByText('Read-only. AgentV cannot change this VM.')).toBeVisible();
  await dialog.getByRole('button', { name: 'Generate setup command' }).click();
  await page.evaluate(() => { window.vmInstallProbe.clipboardFails = true; });
  await dialog.getByRole('button', { name: 'Copy', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Copy failed.');
  await page.evaluate(() => { window.vmInstallProbe.clipboardFails = false; });
  await dialog.getByRole('button', { name: 'Copy', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Copied', exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.vmInstallProbe.commandsCopied)).toEqual(['fixture-only pending-vm-a setup-1']);
  await page.clock.setFixedTime(new Date(new Date(FIXTURE_CLOCK).getTime() + 16 * 60_000));
  await expect(dialog.getByText('This enrollment command has expired.')).toBeVisible();
  await expect(dialog.getByRole('button', { name: /^(Copy|Copied)$/ })).toBeDisabled();
  expect(await page.evaluate(() => window.vmInstallProbe.writes.length)).toBe(1);
  await dialog.getByRole('button', { name: 'Generate new command' }).click();
  await expect(dialog.locator('pre')).toHaveText('fixture-only pending-vm-a setup-2');
  await expect(dialog.getByRole('button', { name: 'Copy', exact: true })).toBeEnabled();
});

test('connection check reads the same VM, shows pending accurately and stops initial enrollment once connected', async ({ page }) => {
  await prepare(page);
  await page.goto(`${catalogPath}?status=not_installed`);
  const dialog = await openInstall(page);
  await dialog.getByRole('button', { name: 'Generate setup command' }).click();
  await dialog.getByRole('button', { name: "I've Installed the Agent" }).click();
  await expect(dialog.getByRole('alert')).toContainText('The agent has not connected yet.');
  await page.evaluate(() => { window.vmInstallProbe.connected = true; });
  await dialog.getByRole('button', { name: "I've Installed the Agent" }).click();
  await expect(dialog.getByRole('status')).toHaveText('Agent connected');
  await expect(dialog.getByRole('button', { name: 'Done', exact: true })).toBeFocused();
  await expect(dialog.locator('pre')).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: /Generate/ })).toHaveCount(0);
  expect(await page.evaluate(() => window.vmInstallProbe.writes.length)).toBe(1);
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(cardFor(page)).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Virtual machine catalog' })).toBeFocused();
});

test('Settings opens the same non-mutating setup dialog and navigation clears it', async ({ page }) => {
  await prepare(page, { deferFirst: true });
  await page.goto(catalogPath);
  await cardFor(page).getByRole('button', { name: 'VM actions for Pending VM A' }).click();
  await page.getByRole('menuitem', { name: 'VM Settings' }).click();
  await expect(page).toHaveURL(`${catalogPath}/pending-vm-a/settings`);
  await expect(page.getByText('Finish AgentV setup')).toBeVisible();
  await page.getByRole('button', { name: 'Install Agent', exact: true }).click();
  await expect(dialogFor(page)).toBeVisible();
  expect(await page.evaluate(() => window.vmInstallProbe.writes)).toEqual([]);
  await dialogFor(page).getByRole('button', { name: 'Generate setup command' }).click();
  await expect(dialogFor(page).getByRole('button', { name: 'Generating…' })).toBeDisabled();
  await page.goBack();
  await page.evaluate(async () => {
    window.vmInstallProbe.releaseFirst?.();
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
  await expect(dialogFor(page)).toBeHidden();
  await expect(page).toHaveURL(catalogPath);
});

test('users without target-management permission cannot open initial setup', async ({ page }) => {
  await prepare(page, { viewer: true });
  await page.goto(catalogPath);
  await expect(cardFor(page).getByRole('button', { name: 'Install Agent', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Install the agent for Pending VM A', exact: true })).toBeDisabled();
  await page.goto(`${catalogPath}/pending-vm-a/settings`);
  await expect(page.getByRole('button', { name: 'Install Agent', exact: true })).toBeDisabled();
  expect(await page.evaluate(() => window.vmInstallProbe.writes)).toEqual([]);
});

test('Settings restores focus to Agent maintenance after connection removes its setup button', async ({ page }) => {
  await prepare(page);
  await page.goto(`${catalogPath}/pending-vm-a/settings`);
  await page.getByRole('button', { name: 'Install Agent', exact: true }).click();
  const dialog = dialogFor(page);
  await dialog.getByRole('button', { name: 'Generate setup command' }).click();
  await page.evaluate(() => { window.vmInstallProbe.connected = true; });
  await dialog.getByRole('button', { name: "I've Installed the Agent" }).click();
  await expect(dialog.getByRole('status')).toHaveText('Agent connected');
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Agent maintenance', exact: true })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Generate repair command' })).toBeEnabled();
});

for (const theme of ['light', 'dark'] as const) for (const width of [375, 1280]) {
  test(`install dialog is accessible and contained at ${width}px in ${theme}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 720 });
    await page.emulateMedia({ colorScheme: theme });
    await prepare(page, { longCommand: true });
    await page.goto(catalogPath);
    const dialog = await openInstall(page);
    await dialog.getByRole('button', { name: 'Generate setup command' }).click();
    await expect(dialog.locator('pre')).toContainText('fixture-only pending-vm-a');
    await expect(page.locator('html')).toHaveClass(theme === 'dark' ? /dark/ : /^(?!.*dark).*$/);
    const bounds = await dialog.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(720);
    expect(await dialog.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
    const accessibility = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
    expect(accessibility.violations).toEqual([]);
    await dialog.getByRole('button', { name: 'Generate new command' }).focus();
    await page.keyboard.press('Tab');
    await expect(dialog.getByRole('button', { name: 'Close install agent dialog' })).toBeFocused();
    await page.screenshot({ path: testInfo.outputPath(`vm-install-${width}-${theme}.png`) });
    await page.keyboard.press('Escape');
    await expect(cardFor(page).getByRole('button', { name: 'Install Agent', exact: true })).toBeFocused();
  });
}
