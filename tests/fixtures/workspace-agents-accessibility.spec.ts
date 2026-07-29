import { expect, test } from '@playwright/test';

const agentDetailPath = (tab = 'chat') =>
  `/workspaces/fixture-workspace/agents/fixture-specialist/${tab}`;

test('mobile Agent detail keeps its five route-backed sections keyboard accessible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(agentDetailPath('chat'), { waitUntil: 'domcontentloaded' });

  const tablist = page.getByRole('tablist', { name: 'Agent sections' });
  const tabs = tablist.getByRole('tab');
  await expect(tabs).toHaveCount(5);
  await expect(tabs).toHaveText(['Chat', 'MCP Servers', 'Skills', 'Tools', 'Settings']);
  await expect(page.getByRole('tab', { name: /Overview|Capabilities|Versions|Activity/ })).toHaveCount(0);

  await page.getByRole('tab', { name: 'Chat' }).focus();
  await page.keyboard.press('End');
  const settings = page.getByRole('tab', { name: 'Settings' });
  await expect(settings).toBeFocused();
  await expect(settings).toHaveAttribute('aria-selected', 'true');
  await expect(page).toHaveURL(agentDetailPath('settings'));

  const [listBox, settingsBox] = await Promise.all([tablist.boundingBox(), settings.boundingBox()]);
  expect(settingsBox?.x).toBeGreaterThanOrEqual(listBox?.x || 0);
  expect((settingsBox?.x || 0) + (settingsBox?.width || 0))
    .toBeLessThanOrEqual((listBox?.x || 0) + (listBox?.width || 0));
});

test('the base Agent URL opens Chat and browser history restores the previous section', async ({ page }) => {
  await page.goto('/workspaces/fixture-workspace/agents/fixture-specialist', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('tab', { name: 'Chat' })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('tab', { name: 'Settings' }).click();
  await expect(page).toHaveURL(agentDetailPath('settings'));
  await page.goBack();
  await expect(page.getByRole('tab', { name: 'Chat' })).toHaveAttribute('aria-selected', 'true');
});

test('Agent conversations start read-only and require explicit access elevation', async ({ page }) => {
  await page.goto(agentDetailPath('chat'), { waitUntil: 'domcontentloaded' });

  await page.getByRole('button', { name: 'New chat' }).click();
  await expect(page.getByText('This conversation is read-only. Enable changes explicitly when needed.')).toBeVisible();
  await page.getByRole('button', { name: 'Enable changes' }).click();
  await expect(page.getByText('Changes are enabled for this conversation. Write tools still follow approval policy.')).toBeVisible();

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
    window.localStorage.setItem('acornops_profile_preferences:ning%40fixture.acornops.dev:language', 'zh');
  });
  await page.goto(agentDetailPath('chat'), { waitUntil: 'domcontentloaded' });

  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await expect(page.getByText('新对话默认为只读。只有任务需要写入工具时才明确启用更改。')).toBeVisible();
});

test('Agent tools use the dedicated stable route without nested capability navigation', async ({ page }) => {
  await page.goto(agentDetailPath('tools'), { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('tab', { name: 'Tools' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tablist', { name: 'Agent capability sections' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'AcornOps native tools' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'MCP-discovered tools' })).toBeVisible();
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

    const detail = page.getByRole('heading', { level: 1, name: 'Kubernetes Specialist' })
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
