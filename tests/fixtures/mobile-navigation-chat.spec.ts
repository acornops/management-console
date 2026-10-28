import { expect, test, type Page } from '@playwright/test';

const targets = [
  { name: 'VM', path: '/workspaces/fixture-workspace/virtual-machines/fixture-vm/chat', first: 'Overview', settings: 'VM Settings' },
  { name: 'Cluster', path: '/kubernetes-clusters/fixture-cluster/chat', first: 'Overview', settings: 'Cluster Settings' },
  { name: 'Agent', path: '/workspaces/fixture-workspace/agents/fixture-specialist/chat', first: 'Agent Assistant', settings: 'Agent Settings' }
];

async function expectOneComposerRow(page: Page, width: number) {
  const controls = page.locator('[data-chat-composer-controls="true"]');
  const buttons = [
    controls.getByRole('button', { name: 'Attach files', exact: true }),
    controls.getByRole('button', { name: /^Assistant capabilities/ }),
    controls.getByRole('button', { name: 'Model and reasoning effort', exact: true }),
    controls.getByRole('button', { name: 'Send', exact: true })
  ];
  const boxes = await Promise.all(buttons.map(button => button.boundingBox()));
  expect(boxes.every(Boolean)).toBe(true);
  for (let index = 0; index < boxes.length; index += 1) {
    const box = boxes[index]!;
    expect(box.y + box.height / 2).toBeCloseTo(boxes[0]!.y + boxes[0]!.height / 2, 0);
    expect(box.width + 0.01).toBeGreaterThanOrEqual(width < 640 ? 44 : 36);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    if (index > 0) expect(box.x).toBeGreaterThanOrEqual(boxes[index - 1]!.x + boxes[index - 1]!.width);
  }
}

test('mobile composer stays on one row with long model names and a two-line title', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 440, height: 956 });
  await page.goto(targets[0].path);
  const input = page.getByRole('combobox', { name: /Message .*assistant/ });
  await expect(input).toBeEditable();
  await input.fill('Draft message');
  const heading = page.getByRole('heading', { level: 1 }).last();
  const model = page.getByRole('button', { name: 'Model and reasoning effort', exact: true });
  // Stress layout with long display text without changing fixture API contracts.
  await heading.evaluate(element => { element.textContent = 'Investigate the production payment gateway and explain the repeated connection failures across all services'; });
  await model.locator('span').first().evaluate(element => { element.textContent = 'a-very-long-model-name-with-an-extended-reasoning-mode'; });
  for (const width of [320, 390, 440, 956, 1199]) {
    await page.setViewportSize({ width, height: 956 });
    await expectOneComposerRow(page, width);
    const titleSize = await heading.evaluate(element => ({ height: element.getBoundingClientRect().height, lineHeight: parseFloat(getComputedStyle(element).lineHeight) }));
    expect(titleSize.height).toBeLessThanOrEqual(titleSize.lineHeight * 2 + 1);
    await expect(heading).toHaveCSS('-webkit-line-clamp', '2');
    const label = model.locator('span').first();
    await expect(label).toHaveCSS('text-overflow', 'ellipsis');
    if (width <= 440) expect(await label.evaluate(element => element.scrollWidth > element.clientWidth)).toBe(true);
  }
  for (const width of [1200, 1440]) {
    await page.setViewportSize({ width, height: 956 });
    await expect(heading).toHaveCSS('-webkit-line-clamp', 'none');
    await expect(page.locator('[data-chat-composer-controls="true"]')).toHaveCSS('display', 'flex');
    await expect(input).toHaveCSS('font-size', '14px');
  }
  await page.setViewportSize({ width: 440, height: 956 });
  await page.screenshot({ path: testInfo.outputPath('mobile-chat-compact.png') });
  for (const [width, height] of [[320, 844], [956, 440]]) {
    await page.setViewportSize({ width, height });
    await model.click();
    const menu = page.locator(`[id="${await model.getAttribute('aria-controls')}"]`);
    const modelList = menu.getByRole('button', { name: 'gpt-5.5', exact: true });
    await modelList.click();
    const submenu = page.locator(`[id="${await modelList.getAttribute('aria-controls')}"]`);
    await expect(submenu).toHaveCSS('opacity', '1');
    for (const popup of [menu, submenu]) {
      const box = await popup.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height).toBeLessThanOrEqual(height);
    }
    await model.press('Escape');
    await model.press('Escape');
    await expect(menu).toBeHidden();
  }
  await page.setViewportSize({ width: 320, height: 844 });
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  const surface = page.locator('[data-target-chat-surface="true"]');
  expect(await surface.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
  const enlargedButtons = await page.locator('[data-chat-composer-controls="true"] button').evaluateAll(buttons => buttons.map(button => {
    const { x, y, width, height } = button.getBoundingClientRect();
    return { x, y, width, height };
  }));
  for (let index = 0; index < enlargedButtons.length; index += 1) {
    const box = enlargedButtons[index];
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(320);
    for (const previous of enlargedButtons.slice(0, index)) {
      const overlapX = Math.min(box.x + box.width, previous.x + previous.width) - Math.max(box.x, previous.x);
      const overlapY = Math.min(box.y + box.height, previous.y + previous.height) - Math.max(box.y, previous.y);
      expect(overlapX < 0.5 || overlapY < 0.5).toBe(true);
    }
  }
});

test('mobile quick-chat controls fit one row and their menus stay onscreen', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('/workspaces/fixture-workspace/agents');
  await page.getByRole('button', { name: 'Chat with Kubernetes Specialist', exact: true }).click();
  const input = page.getByRole('combobox', { name: /Message .*assistant/ });
  await expect(input).toBeEditable();
  await input.fill('Draft message');
  await expectOneComposerRow(page, 320);
  const model = page.getByRole('button', { name: 'Model and reasoning effort', exact: true });
  await model.click();
  const menu = page.locator(`[id="${await model.getAttribute('aria-controls')}"]`);
  await expect(menu).toBeVisible();
  const box = await menu.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(320);
  await model.press('Escape');
  await expect(menu).toBeHidden();
  const capabilities = page.getByRole('button', { name: /^Assistant capabilities/ });
  await capabilities.click();
  const preview = page.getByRole('region', { name: /capabilit/i });
  await expect(preview).toBeVisible();
  const previewBox = await preview.boundingBox();
  expect(previewBox!.x).toBeGreaterThanOrEqual(0);
  expect(previewBox!.x + previewBox!.width).toBeLessThanOrEqual(320);
});

for (const target of targets) {
  test(`${target.name}: mobile destination icons and labels share a left edge`, async ({ page }) => {
    await page.setViewportSize({ width: 440, height: 956 });
    await page.goto(target.path);
    // Let global cluster links resolve their workspace before opening the drawer.
    await expect(page).toHaveURL(/\/workspaces\/fixture-workspace\//);
    await expect(page.getByRole('combobox', { name: /Message .*assistant/ })).toBeEditable();
    await page.getByRole('button', { name: 'Open navigation menu' }).click();
    const drawer = page.getByRole('dialog', { name: 'Navigation', exact: true });
    await expect(drawer).toBeVisible();
    const rows = [target.first, 'MCP Servers', 'Skills', 'Tools', target.settings];
    const positions = [];
    for (const name of rows) {
      const row = drawer.getByRole('button').filter({ has: page.getByText(name, { exact: true }) });
      await expect(row).toBeVisible();
      positions.push(await row.evaluate((element) => {
        const icon = element.querySelector('svg')!;
        const label = element.querySelector('span.truncate')!;
        const rowLeft = element.getBoundingClientRect().left;
        return {
          icon: icon.getBoundingClientRect().left - rowLeft,
          label: label.getBoundingClientRect().left - rowLeft
        };
      }));
    }
    for (const position of positions) {
      expect(position.icon).toBeCloseTo(12, 0);
      expect(position.label).toBeCloseTo(positions[0].label, 0);
    }
  });

  test(`${target.name}: chat input is 16px only below the desktop breakpoint`, async ({ page }) => {
    await page.goto(target.path);
    const input = page.getByRole('combobox', { name: /Message .*assistant/ });
    await expect(input).toBeEditable();
    for (const [width, height] of [[390, 844], [440, 956], [956, 440], [1199, 900], [1200, 900], [1440, 900]]) {
      await page.setViewportSize({ width, height });
      await expect(input).toHaveCSS('font-size', width < 1200 ? '16px' : '14px', { timeout: 2000 });
      await input.fill('Check the mobile layout.\nKeep the draft visible.');
      await expect(input).toBeFocused();
      const box = await input.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      await input.press('Tab');
      await expect(input).toHaveValue('Check the mobile layout.\nKeep the draft visible.');
    }
  });
}

test('Agent quick-chat input preserves desktop sizing across the dock breakpoint', async ({ page }) => {
  await page.setViewportSize({ width: 440, height: 956 });
  await page.goto('/workspaces/fixture-workspace/agents');
  await page.getByRole('button', { name: 'Chat with Kubernetes Specialist', exact: true }).click();
  const input = page.getByRole('combobox', { name: 'Message Kubernetes Specialist assistant' });
  await expect(input).toBeEditable();
  await expect(input).toHaveCSS('font-size', '16px');
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(input).toBeEditable();
  await expect(input).toHaveCSS('font-size', '14px');
});
