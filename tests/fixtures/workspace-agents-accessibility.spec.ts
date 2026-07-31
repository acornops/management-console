import { expect, test } from '@playwright/test';

const agentDetailPath = (tab = 'chat') =>
  `/workspaces/fixture-workspace/agents/fixture-specialist/${tab}`;

const renderedResourceCardColumns = (element: Element) => {
  const rows = new Map<number, number>();
  for (const item of Array.from(element.children)) {
    const top = Math.round(item.getBoundingClientRect().top);
    rows.set(top, (rows.get(top) || 0) + 1);
  }
  return Math.max(...rows.values());
};

test('mobile Agent detail exposes contextual route-backed destinations', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(agentDetailPath('chat'), { waitUntil: 'domcontentloaded' });

  await page.getByRole('button', { name: 'Open navigation' }).click();
  const navigation = page.getByRole('dialog', { name: 'Navigation' });
  await expect(navigation.getByText('Agent Destinations')).toBeVisible();
  await expect(navigation.getByRole('button', { name: 'Agent Assistant' })).toBeVisible();
  await expect(navigation.getByRole('button', { name: 'MCP Servers' })).toBeVisible();
  await expect(navigation.getByRole('button', { name: 'Skills' })).toBeVisible();
  await expect(navigation.getByRole('button', { name: 'Tools' })).toBeVisible();
  const settings = navigation.getByRole('button', { name: 'Agent Settings' });
  await settings.click();
  await expect(page).toHaveURL(agentDetailPath('settings'));
});

test('the base Agent URL opens Chat and browser history restores it', async ({ page }) => {
  await page.goto('/workspaces/fixture-workspace/agents/fixture-specialist', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('header [data-agent-avatar="true"]')).toHaveText('☸️');
  await expect(page.getByRole('heading', { level: 1, name: 'Agent chat' })).toBeVisible();
  await page.getByRole('button', { name: 'Agent Settings' }).click();
  await expect(page).toHaveURL(agentDetailPath('settings'));
  await page.goBack();
  await expect(page.getByRole('heading', { level: 1, name: 'Agent chat' })).toBeVisible();
});

test('Agent cards open route-backed Quick chat and can maximize to full Chat', async ({ page }) => {
  await page.goto('/workspaces/fixture-workspace/agents', { waitUntil: 'domcontentloaded' });

  const cardGrid = page.locator('[data-agent-card-grid="true"]');
  await expect.poll(() => cardGrid.evaluate(renderedResourceCardColumns)).toBe(2);
  const fullLayoutCardBox = await page.locator('[data-agent-card="true"]').first().boundingBox();
  expect(fullLayoutCardBox).not.toBeNull();

  const card = page.locator('[data-agent-id="fixture-specialist"]');
  await expect(card.locator('[data-agent-avatar="true"]')).toHaveText('☸️');
  await card.getByRole('button', { name: 'Quick chat' }).click();
  await expect(page).toHaveURL(/panel=chat.*agent=fixture-specialist|agent=fixture-specialist.*panel=chat/);
  const main = page.getByRole('main');
  const panel = page.getByRole('complementary', { name: 'Quick chat with Kubernetes Specialist' });
  await expect(panel).toBeVisible();
  await expect(panel.locator('header [data-agent-avatar="true"]')).toHaveText('☸️');
  await expect(panel.getByRole('heading', { name: 'Agent chat' })).toBeVisible();
  await expect.poll(() => cardGrid.evaluate(renderedResourceCardColumns)).toBe(1);
  const dockedLayoutCardBox = await page.locator('[data-agent-card="true"]').first().boundingBox();
  expect(dockedLayoutCardBox).not.toBeNull();
  if (!fullLayoutCardBox || !dockedLayoutCardBox) {
    throw new Error('The Agent cards must have layout boxes before and after Quick chat opens');
  }
  expect(Math.abs(dockedLayoutCardBox.width - fullLayoutCardBox.width)).toBeLessThanOrEqual(1);

  const [mainBox, panelBox] = await Promise.all([main.boundingBox(), panel.boundingBox()]);
  expect(mainBox).not.toBeNull();
  expect(panelBox).not.toBeNull();
  if (!mainBox || !panelBox) throw new Error('The Agents catalog and Quick chat dock must both have layout boxes');
  expect(mainBox.x + mainBox.width).toBeLessThanOrEqual(panelBox.x + 1);
  expect(mainBox.width).toBeGreaterThan(panelBox.width);
  expect(panelBox.height).toBeCloseTo(1000, 0);

  const modelSelector = panel.getByRole('button', { name: 'Model and reasoning effort' });
  await modelSelector.click();
  const modelMenuId = await modelSelector.getAttribute('aria-controls');
  if (!modelMenuId) throw new Error('The model selector must identify its menu');
  const modelMenu = page.locator(`#${modelMenuId}`);
  const modelSubmenuButton = modelMenu.locator('button[aria-controls]').last();
  await modelSubmenuButton.hover();
  const modelSubmenuId = await modelSubmenuButton.getAttribute('aria-controls');
  if (!modelSubmenuId) throw new Error('The model menu must identify its submenu');
  const modelSubmenuBox = await page.locator(`#${modelSubmenuId}`).boundingBox();
  expect(modelSubmenuBox).not.toBeNull();
  if (!modelSubmenuBox) throw new Error('The model submenu must have a layout box');
  expect(modelSubmenuBox.x).toBeGreaterThanOrEqual(panelBox.x);
  expect(modelSubmenuBox.x + modelSubmenuBox.width).toBeLessThanOrEqual(panelBox.x + panelBox.width);
  await page.keyboard.press('Escape');

  await panel.getByRole('button', { name: 'Close' }).click();
  await expect(panel).toHaveCount(0);
  await expect.poll(() => cardGrid.evaluate(renderedResourceCardColumns)).toBe(2);

  await card.getByRole('button', { name: 'Quick chat' }).click();
  await expect(panel).toBeVisible();
  await panel.getByRole('button', { name: 'Open full chat' }).click();
  await expect(page).toHaveURL(agentDetailPath('chat'));
  await expect(page.getByRole('heading', { level: 1, name: 'Agent chat' })).toBeVisible();
});

test('opening Agent Quick chat replaces an existing target assistant dock', async ({ page }) => {
  await page.goto('/workspaces/fixture-workspace/overview', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Open assistant' }).first().click();
  await expect(page.getByRole('complementary', { name: 'Cluster Assistant' })).toBeVisible();
  const recentActivityDialog = page.getByRole('dialog', { name: 'Choose how to continue' });
  await expect(recentActivityDialog).toBeVisible();
  await recentActivityDialog.getByRole('button', { name: 'Open conversation' }).click();

  const agentsLink = page.locator('a[href="/workspaces/fixture-workspace/agents"]').first();
  await agentsLink.click();
  await expect(page).toHaveURL('/workspaces/fixture-workspace/agents');
  const card = page.locator('[data-agent-id="fixture-specialist"]');
  await card.getByRole('button', { name: 'Quick chat' }).click();

  await expect(page.getByRole('complementary', { name: 'Quick chat with Kubernetes Specialist' })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Cluster Assistant' })).toHaveCount(0);
  await expect(page.locator('[data-docked-assistant="true"]')).toHaveCount(1);
});

test('Agent creation persists the selected emoji identity', async ({ page }) => {
  await page.goto('/workspaces/fixture-workspace/agents', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'New agent' }).click();

  const drawer = page.getByRole('dialog', { name: 'Create agent' });
  await drawer.getByRole('button', { name: 'Use 🛡️ for this Agent' }).click();
  await drawer.getByLabel('Name').fill('Security Guide');
  await drawer.getByLabel('Assignment purpose').fill('Reviews workspace security posture and recommends bounded follow-up.');
  await drawer.getByRole('button', { name: 'Next' }).click();
  await drawer.getByRole('button', { name: 'Next' }).click();
  await expect(drawer.getByText('🛡️', { exact: true })).toBeVisible();
  await drawer.getByRole('button', { name: 'Save agent' }).click();

  const card = page.locator('[data-agent-card="true"]').filter({ hasText: 'Security Guide' });
  await expect(card).toBeVisible();
  await expect(card.locator('[data-agent-avatar="true"]')).toHaveText('🛡️');
});

test('Agent identity choices stay dense and dirty drawer closes use the product dialog', async ({ page }) => {
  await page.goto('/workspaces/fixture-workspace/agents', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'New agent' }).click();

  const drawer = page.getByRole('dialog', { name: 'Create agent' });
  const emojiGrid = drawer.locator('[data-agent-emoji-options="true"]');
  const emojiButtons = emojiGrid.getByRole('button');
  await expect(emojiButtons).toHaveCount(24);
  const emojiLayout = await emojiButtons.evaluateAll((buttons) => {
    const rows = new Map<number, DOMRect[]>();
    for (const button of buttons) {
      const rect = button.getBoundingClientRect();
      const top = Math.round(rect.top);
      rows.set(top, [...(rows.get(top) || []), rect]);
    }
    const gaps = [...rows.values()].flatMap((row) => row
      .sort((left, right) => left.left - right.left)
      .slice(1)
      .map((rect, index) => rect.left - row[index].right));
    return {
      maxGap: Math.max(...gaps),
      maxRowSize: Math.max(...[...rows.values()].map((row) => row.length)),
      minTarget: Math.min(...buttons.map((button) => button.getBoundingClientRect().width))
    };
  });
  expect(emojiLayout.maxGap).toBeLessThanOrEqual(9);
  expect(emojiLayout.maxRowSize).toBeGreaterThanOrEqual(12);
  expect(emojiLayout.minTarget).toBeGreaterThanOrEqual(43.9);

  await drawer.getByLabel('Name').fill('Draft response agent');
  await drawer.getByRole('button', { name: 'Close create agent drawer' }).click();

  const discardDialog = page.getByRole('dialog', { name: 'Discard unsaved agent changes?' });
  await expect(discardDialog).toBeVisible();
  await discardDialog.getByRole('button', { name: 'Keep editing' }).click();
  await expect(drawer).toBeVisible();
  await expect(drawer.getByLabel('Name')).toHaveValue('Draft response agent');

  await drawer.getByRole('button', { name: 'Close create agent drawer' }).click();
  await discardDialog.getByRole('button', { name: 'Discard changes' }).click();
  await expect(drawer).toHaveCount(0);
  await expect(page).not.toHaveURL(/panel=create/);
});

test('browser Back uses the Agent discard dialog and keeps the draft when cancelled', async ({ page }) => {
  await page.goto('/workspaces/fixture-workspace/agents', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'New agent' }).click();

  const drawer = page.getByRole('dialog', { name: 'Create agent' });
  await drawer.getByLabel('Name').fill('Back guarded agent');
  await page.evaluate(() => new Promise(requestAnimationFrame));
  await page.goBack();

  const discardDialog = page.getByRole('dialog', { name: 'Discard unsaved agent changes?' });
  await expect(discardDialog).toBeVisible();
  await discardDialog.getByRole('button', { name: 'Keep editing' }).click();
  await expect(drawer).toBeVisible();
  await expect(drawer.getByLabel('Name')).toHaveValue('Back guarded agent');
  await expect(page).toHaveURL(/panel=create/);
});

test('Agent Quick chat remains a modal drawer in a narrow viewport', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto('/workspaces/fixture-workspace/agents', { waitUntil: 'domcontentloaded' });

  const card = page.locator('[data-agent-id="fixture-specialist"]');
  await card.getByRole('button', { name: 'Quick chat' }).click();

  await expect(page.getByRole('dialog', { name: 'Quick chat with Kubernetes Specialist' })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Quick chat with Kubernetes Specialist' })).toHaveCount(0);
  await page.close();
});

test('Agent conversations follow the Agent policy without a redundant access elevation', async ({ page }) => {
  await page.goto(agentDetailPath('chat'), { waitUntil: 'domcontentloaded' });

  await page.locator('[data-chat-history-trigger="new-chat"]').click();
  await expect(page.getByText('Changes follow this Agent’s policy. Approval is required before every write.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enable changes' })).toHaveCount(0);

  const composer = page.getByRole('combobox', { name: 'Message Kubernetes Specialist assistant' });
  await composer.fill('Summarize the available incident evidence.');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByText('Fixture Agent analysis complete. No external changes were made.')).toBeVisible();
});

test('Agent lifecycle confirmations announce themselves, receive focus, and restore focus', async ({ page }) => {
  await page.goto(agentDetailPath('settings'), { waitUntil: 'domcontentloaded' });

  const disable = page.getByRole('button', { name: 'Disable', exact: true }).first();
  await disable.click();

  const confirmation = page.getByRole('alert');
  await expect(confirmation).toBeFocused();
  await expect(confirmation).toHaveAttribute('aria-labelledby', 'agent-disable-confirmation-title');
  await expect(confirmation).toHaveAttribute('aria-describedby', 'agent-disable-confirmation-description');
  await confirmation.getByRole('button', { name: 'Cancel' }).click();
  await expect(disable).toBeFocused();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('Agent Chat follows the selected Chinese application locale', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('app_language', 'zh');
    window.localStorage.setItem('acornops_profile_preferences:test-user%40fixture.acornops.dev:language', 'zh');
  });
  await page.goto(agentDetailPath('chat'), { waitUntil: 'domcontentloaded' });

  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await expect(page.getByText('此 Agent 可立即检查，并会在每次更改前请求批准。')).toBeVisible();
});

test('Agent tools follow the selected Chinese application locale', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('app_language', 'zh');
    window.localStorage.setItem('acornops_profile_preferences:test-user%40fixture.acornops.dev:language', 'zh');
  });
  await page.goto(agentDetailPath('tools'), { waitUntil: 'domcontentloaded' });

  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await expect(page.getByRole('heading', { level: 1, name: '工具' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: '工具清单' })).toBeVisible();
});

test('Agent tools use the dedicated stable route without nested capability navigation', async ({ page }) => {
  await page.goto(agentDetailPath('tools'), { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { level: 1, name: 'Tools' })).toBeVisible();
  await expect(page.getByRole('tablist', { name: 'Agent capability sections' })).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 2, name: 'Tool inventory' })).toBeVisible();
  await expect(page.getByRole('table', { name: 'Tools' })).toBeVisible();
});

test('Agent detail stays within a narrow viewport in light and dark themes', async ({ browser }) => {
  for (const theme of ['light', 'dark'] as const) {
    const page = await browser.newPage({
      colorScheme: theme,
      reducedMotion: 'reduce',
      viewport: { width: 390, height: 844 }
    });
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    await page.addInitScript((selectedTheme) => {
      window.localStorage.setItem('acornops_active_theme_preference', selectedTheme);
    }, theme);
    await page.goto(agentDetailPath('settings'), { waitUntil: 'domcontentloaded' });

    const detail = page.getByRole('heading', { level: 1, name: 'Agent Settings' })
      .locator('xpath=ancestor::section[1]');
    await expect(detail).toBeVisible();
    await expect(page.locator('html')).toHaveClass(theme === 'dark' ? /dark/ : /^(?!.*dark).*$/);
    expect(await detail.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

    const undersizedControls = await detail.locator('button:visible, a:visible, [role="tab"]:visible').evaluateAll((controls) => controls
      .map((control) => {
        const rect = control.getBoundingClientRect();
        return { height: rect.height, text: control.textContent?.trim() || '', width: rect.width };
      })
      .filter((control) => control.height < 44 || control.width < 44));
    expect(undersizedControls).toEqual([]);
    expect(consoleErrors).toEqual([]);
    await page.close();
  }
});
