import { expect, test, type Locator } from '@playwright/test';

async function withinViewport(locator: Locator, width: number, height: number) {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(width);
  expect(box!.y + box!.height).toBeLessThanOrEqual(height);
}

test('role help and workflow tag have accessible field names', async ({ page }) => {
  await page.goto('/workspaces/fixture-workspace/members');
  await page.getByRole('button', { name: 'Invite Member', exact: true }).click();
  await expect(page.getByLabel('Role', { exact: true })).toHaveAttribute('aria-describedby', /.+/);
  await page.goto('/workspaces/fixture-workspace/workflows?workflow=fixture-workflow&tab=settings');
  await expect(page.getByRole('textbox', { name: 'Add tag', exact: true })).toBeVisible();
});

for (const width of [1024, 1280, 1440]) test(`approval Review and both decision choices are reachable at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 768 });
  await page.goto('/workspaces/fixture-workspace/approvals?fixtureClock=2026-10-18T08:30:00.000Z');
  const review = page.getByRole('button', { name: 'Review', exact: true }).first();
  await review.scrollIntoViewIfNeeded();
  // Vertical scrolling is legitimate; sideways scrolling must not be needed.
  await page.locator('[data-approval-layout="desktop"]').evaluate(node => { node.scrollLeft = 0; });
  await withinViewport(review, width, 768);
  await review.click();
  const dialog = page.getByRole('dialog', { name: 'Review approval' });
  for (const name of ['Approve', 'Reject']) await withinViewport(dialog.getByRole('button', { name, exact: true }), width, 768);
});

for (const width of [320, 390, 768]) test(`capabilities stay bounded at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 568 });
  await page.goto('/kubernetes-clusters/fixture-cluster/chat', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-assistant-capability-preview-trigger]').click();
  const panel = page.getByRole('region', { name: /capabilit/i });
  await expect(panel).toHaveCSS('opacity', '1');
  await withinViewport(panel, width, 568);
});

test('reasoning effort is one named radio choice with keyboard selection', async ({ page }) => {
  await page.goto('/workspaces/fixture-workspace/agents/fixture-specialist/chat', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Model and reasoning effort' }).click();
  const group = page.getByRole('radiogroup', { name: 'Reasoning effort', exact: true });
  await expect(group.getByRole('radio', { checked: true })).toHaveCount(1);
  const radios = group.getByRole('radio');
  await radios.first().focus();
  await page.keyboard.press('End');
  await expect(radios.last()).toBeChecked();
  await expect(radios.last()).toBeFocused();
  await page.keyboard.press('Home');
  await expect(radios.first()).toBeChecked();
  await page.keyboard.press('ArrowDown');
  await expect(radios.nth(1)).toBeChecked();
  await page.keyboard.press('Tab');
  expect(await group.evaluate(node => node.contains(document.activeElement))).toBe(false);
});

test('settings destinations remain links with current-page and history semantics', async ({ page }) => {
  await page.goto('/workspaces/fixture-workspace/settings', { waitUntil: 'domcontentloaded' });
  const navigation = page.getByRole('navigation', { name: 'Workspace Settings', exact: true });
  await expect(navigation.getByRole('link', { name: 'Workspace', exact: true })).toHaveAttribute('aria-current', 'page');
  const members = navigation.getByRole('link', { name: 'Members', exact: true });
  await expect(members).toHaveAttribute('href', '/workspaces/fixture-workspace/members');
  await members.focus(); await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/members$/);
  await expect(members).toHaveAttribute('aria-current', 'page');
  await page.goBack();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(navigation.getByRole('link', { name: 'Workspace', exact: true })).toHaveAttribute('aria-current', 'page');
});

test('settings selection follows history when Back interrupts a tab transition', async ({ page }) => {
  await page.goto('/workspaces/fixture-workspace/settings', { waitUntil: 'domcontentloaded' });
  const navigation = page.getByRole('navigation', { name: 'Workspace Settings', exact: true });
  await expect(navigation.getByRole('link', { name: 'Workspace', exact: true })).toHaveAttribute('aria-current', 'page');
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setCPUThrottlingRate', { rate: 8 });
  // Issue Back immediately, before waiting for the new route to render.
  await navigation.getByRole('link', { name: 'Members', exact: true }).evaluate((link: HTMLAnchorElement) => {
    link.click();
    window.history.back();
  });
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.locator('[data-settings-tab]')).toHaveAttribute('data-settings-tab', 'workspace');
  await expect(navigation.getByRole('link', { name: 'Workspace', exact: true })).toHaveAttribute('aria-current', 'page');
  await page.goForward();
  await expect(page).toHaveURL(/\/members$/);
  await expect(page.locator('[data-settings-tab]')).toHaveAttribute('data-settings-tab', 'members');
});

test('resource families retain a single keyboard tab stop and linked panel', async ({ page }) => {
  await page.goto('/workspaces/fixture-workspace/kubernetes-clusters/fixture-cluster/resources');
  const tabs = page.getByRole('tablist', { name: 'Resource families' });
  const first = tabs.getByRole('tab').first();
  await first.focus();
  await page.keyboard.press('End');
  await expect(tabs.getByRole('tab').last()).toBeFocused();
  await expect(tabs.getByRole('tab').last()).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Home');
  await expect(first).toBeFocused();
  await page.keyboard.press('ArrowRight');
  const selected = tabs.getByRole('tab', { selected: true });
  await expect(selected).toHaveAttribute('aria-controls', 'resource-family-panel');
  await expect(tabs.locator('[tabindex="0"]')).toHaveCount(1);
  await expect(page.locator('#resource-family-panel')).toHaveAttribute('aria-labelledby', await selected.getAttribute('id') || '');
});

for (const width of [320, 390, 768]) test(`approval summary stays compact and Review reachable at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 568 });
  await page.goto('/workspaces/fixture-workspace/approvals?fixtureClock=2026-10-18T08:30:00.000Z');
  const summary = page.getByRole('region', { name: 'Approval queue summary' });
  await expect(summary).toBeVisible();
  expect((await summary.boundingBox())!.height).toBeLessThan(180);
  const review = page.getByRole('button', { name: 'Review', exact: true }).first();
  await review.scrollIntoViewIfNeeded();
  await withinViewport(review, width, 568);
  expect((await review.boundingBox())!.height).toBeGreaterThanOrEqual(44);
});

test('keyboard handoff from capabilities lets the focused model own Escape', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/kubernetes-clusters/fixture-cluster/chat');
  const capabilities = page.getByRole('button', { name: 'Assistant capabilities', exact: true });
  const model = page.getByRole('button', { name: 'Model and reasoning effort' });
  await capabilities.focus();
  await page.keyboard.press('Enter');
  await expect(capabilities).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Tab');
  await expect(model).toBeFocused();
  await expect(capabilities).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.press('Enter');
  await expect(model).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(model).toHaveAttribute('aria-expanded', 'false');
  await expect(model).toBeFocused();
  await expect(capabilities).toHaveAttribute('aria-expanded', 'false');
});

test('keyboard departure from the model closes it without dismissing quick chat', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/workspaces/fixture-workspace/agents');
  const opener = page.getByRole('button', { name: 'Chat with Kubernetes Specialist', exact: true });
  await opener.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Chat with Kubernetes Specialist', exact: true });
  const model = dialog.getByRole('button', { name: 'Model and reasoning effort' });
  await model.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('radio', { name: 'Medium', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'gpt-5.5', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  const resize = dialog.getByRole('separator', { name: 'Resize chat panel', exact: true });
  await expect(resize).toBeFocused();
  await expect(model).toHaveAttribute('aria-expanded', 'false');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

test('quick-chat model selection consumes Escape before its dialog', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/workspaces/fixture-workspace/agents', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Chat with Kubernetes Specialist', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Chat with Kubernetes Specialist', exact: true });
  const model = dialog.getByRole('button', { name: 'Model and reasoning effort' });
  await model.click();
  await page.getByRole('radiogroup', { name: 'Reasoning effort' }).getByRole('radio', { checked: true }).focus();
  await page.keyboard.press('Tab');
  const submenu = dialog.getByRole('button', { name: 'gpt-5.5', exact: true });
  await expect(submenu).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'gpt-5.5 OpenAI', exact: true })).toBeFocused();
  await expect(model).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(submenu).toHaveAttribute('aria-expanded', 'false');
  await expect(submenu).toBeFocused();
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  await expect(model).toBeFocused();
  await expect(page.getByRole('radiogroup', { name: 'Reasoning effort' })).toHaveCount(0);
});

const assistants = [
  { name: 'Agent', full: '/workspaces/fixture-workspace/agents/fixture-specialist/chat', quick: '/workspaces/fixture-workspace/agents', target: 'Kubernetes Specialist' },
  { name: 'Kubernetes', full: '/kubernetes-clusters/fixture-cluster/chat', quick: '/workspaces/fixture-workspace/overview', target: 'Singapore Production' },
  { name: 'VM', full: '/workspaces/fixture-workspace/virtual-machines/fixture-vm/chat', quick: '/workspaces/fixture-workspace/overview', target: 'Payments VM' }
];
for (const assistant of assistants) for (const quick of [false, true]) for (const theme of ['light', 'dark']) {
  test(`${assistant.name} ${quick ? 'quick' : 'full'} capabilities stay compact and retain 200 tools in ${theme}`, async ({ page }, testInfo) => {
    await page.emulateMedia({ colorScheme: theme });
    await page.addInitScript(({ isolateVmCapabilities }) => {
      const original = window.fetch.bind(window);
      window.fetch = async (input, init) => {
        const response = await original(input, init);
        const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.href);
        const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
        if (isolateVmCapabilities && method === 'GET' && response.ok && url.pathname === '/api/v1/workspaces/fixture-workspace/targets/fixture-vm/chat-activity') {
          const body = await response.json();
          // Isolate capability geometry from the separate recent-activity gate.
          body.recentActivity = [];
          return new Response(JSON.stringify(body), { status: response.status, headers: response.headers });
        }
        if (!url.pathname.endsWith('/assistant/capabilities-preview')) return response;
        const body = await response.json();
        body.tools = Array.from({ length: 200 }, (_, index) => ({ id: `tool-${index}`, name: `tool-${index}`, label: `${String(index).padStart(3, '0')} translated tool 長いツール名 `.repeat(3), description: 'Read fixture state', capability: 'read', runtimeKind: 'function', source: 'builtin' }));
        body.toolSummary = { totalAllowed: 200, nativeAllowed: 200, readAllowed: 200, writeAllowed: 0 };
        return new Response(JSON.stringify(body), { status: response.status, headers: response.headers });
      };
    }, { isolateVmCapabilities: quick && assistant.name === 'VM' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(quick ? assistant.quick : assistant.full, { waitUntil: 'domcontentloaded' });
    if (quick && assistant.name === 'Agent') await page.getByRole('button', { name: `Chat with ${assistant.target}`, exact: true }).click();
    else if (quick) {
      await page.locator('article').filter({ hasText: assistant.target }).getByRole('button', { name: 'Open assistant', exact: true }).first().click();
      if (assistant.name === 'Kubernetes') {
        const chooser = page.getByRole('dialog', { name: 'Choose how to continue', exact: true });
        await expect(chooser).toBeVisible();
        await chooser.getByRole('button', { name: 'Open conversation', exact: true }).click();
        await expect(chooser).toBeHidden();
      }
    }
    const trigger = page.locator('[data-assistant-capability-preview-trigger]');
    await trigger.click();
    const panel = page.getByRole('region', { name: /capabilit/i });
    await expect(panel).toHaveCSS('opacity', '1');
    await expect(panel.getByText(/^199 translated/)).toHaveCount(1);
    for (const size of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
      // Crossing the quick-chat dock breakpoint remounts its composer. Open
      // the preview at each size instead of expecting it to survive that swap.
      await panel.press('Escape');
      await expect(panel).toBeHidden();
      await page.setViewportSize(size);
      await trigger.click();
      await expect(panel).toHaveCSS('opacity', '1');
      // Viewport containment alone allowed this popup to occupy nearly the
      // whole screen. Long lists must scroll without expanding the preview.
      await expect.poll(async () => (await panel.boundingBox())!.height).toBeLessThan(600);
      await withinViewport(panel, size.width, size.height);
      const list = panel.locator('[tabindex="0"]').filter({ has: page.getByText(/^199 translated/) });
      await expect(list).toBeVisible();
      expect((await list.boundingBox())!.height).toBeLessThanOrEqual(224);
      const heading = panel.getByText('Assistant capabilities', { exact: true });
      const headingTop = (await heading.boundingBox())!.y;
      await list.focus();
      await page.keyboard.press('End');
      await expect.poll(() => list.evaluate(node => node.scrollHeight - node.clientHeight - node.scrollTop)).toBe(0);
      await expect(panel.getByText(/^199 translated/)).toBeInViewport();
      expect((await heading.boundingBox())!.y).toBe(headingTop);
      await page.keyboard.press('Home');
      await expect.poll(() => list.evaluate(node => node.scrollTop)).toBe(0);
      await expect(panel.getByText(/^000 translated/)).toBeInViewport();
    }
    for (const size of [{ width: 320, height: 568 }, { width: 390, height: 360 }, { width: 768, height: 568 }]) {
      await panel.press('Escape');
      await expect(panel).toBeHidden();
      await page.setViewportSize(size);
      await trigger.click();
      await expect(panel).toHaveCSS('opacity', '1');
      await expect.poll(async () => (await panel.boundingBox())!.x).toBeGreaterThanOrEqual(0);
      await withinViewport(panel, size.width, size.height);
      if (size.height === 360) {
        const list = panel.locator('[tabindex="0"]').filter({ has: page.getByText(/^199 translated/) });
        const listBox = (await list.boundingBox())!;
        const panelBox = (await panel.boundingBox())!;
        // Use pointer input, not scrollIntoView, so nested scrolling cannot
        // conceal a clipped footer behind programmatic ancestor scrolling.
        await page.mouse.move(listBox.x + listBox.width / 2, (listBox.y + Math.min(listBox.y + listBox.height, panelBox.y + panelBox.height)) / 2);
        await page.mouse.wheel(0, 20_000);
        await expect.poll(() => list.evaluate(node => node.scrollHeight - node.clientHeight - node.scrollTop)).toBe(0);
        await page.mouse.wheel(0, 1000);
        await expect.poll(() => panel.evaluate(node => node.scrollTop)).toBeGreaterThan(0);
        await expect(panel.getByText('Skills are frozen when you send.', { exact: true })).toBeInViewport({ ratio: 1 });
      }
      await panel.getByText(/^199 translated/).scrollIntoViewIfNeeded();
      await withinViewport(panel.getByText(/^199 translated/), size.width, size.height);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await panel.evaluate(node => { node.scrollTop = 0; });
    await page.screenshot({ path: testInfo.outputPath(`${assistant.name}-${quick ? 'quick' : 'full'}-${theme}.png`) });
    await panel.focus();
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(trigger).toBeFocused();
    if (quick) await expect(page.getByRole('dialog')).toBeVisible();
  });
}
