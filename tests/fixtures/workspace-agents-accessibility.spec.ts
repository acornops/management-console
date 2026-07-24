import { expect, test } from '@playwright/test';

const agentProfilePath = (tab: string) =>
  `/workspaces/fixture-workspace/agents?panel=profile&agent=fixture-specialist&agentTab=${tab}`;

test('mobile agent profile keeps the keyboard-selected tab fully in view', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(agentProfilePath('overview'), { waitUntil: 'domcontentloaded' });

  const profile = page.getByRole('dialog', { name: 'Kubernetes Specialist' });
  const tablist = profile.getByRole('tablist', { name: 'Agent profile sections' });
  await profile.getByRole('tab', { name: 'Overview' }).focus();
  await page.keyboard.press('End');

  const settings = profile.getByRole('tab', { name: 'Settings' });
  await expect(settings).toBeFocused();
  await expect(settings).toHaveAttribute('aria-selected', 'true');
  await expect(settings).toHaveAttribute('aria-controls', 'agent-profile-settings-panel');
  await expect(profile.getByRole('tab', { name: 'Overview' })).not.toHaveAttribute('aria-controls', /.+/);
  await expect(profile.getByRole('tabpanel')).toHaveAttribute('id', 'agent-profile-settings-panel');

  const geometry = await tablist.evaluate((element) => {
    const active = element.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
    const listRect = element.getBoundingClientRect();
    const activeRect = active?.getBoundingClientRect();
    return {
      activeLeft: activeRect?.left,
      activeRight: activeRect?.right,
      listLeft: listRect.left,
      listRight: listRect.right
    };
  });
  expect(geometry.activeLeft).toBeGreaterThanOrEqual(geometry.listLeft);
  expect(geometry.activeRight).toBeLessThanOrEqual(geometry.listRight);
});

test('mobile agent profile reveals the URL-selected tab on first render', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(agentProfilePath('settings'), { waitUntil: 'domcontentloaded' });

  const profile = page.getByRole('dialog', { name: 'Kubernetes Specialist' });
  const tablist = profile.getByRole('tablist', { name: 'Agent profile sections' });
  const settings = profile.getByRole('tab', { name: 'Settings' });
  await expect(settings).toHaveAttribute('aria-selected', 'true');
  const [listBox, settingsBox] = await Promise.all([tablist.boundingBox(), settings.boundingBox()]);
  expect(settingsBox?.x).toBeGreaterThanOrEqual(listBox?.x || 0);
  expect((settingsBox?.x || 0) + (settingsBox?.width || 0)).toBeLessThanOrEqual((listBox?.x || 0) + (listBox?.width || 0));
});

test('agent lifecycle confirmations announce themselves, receive focus, and restore focus on cancel', async ({ page }) => {
  await page.goto(agentProfilePath('settings'), { waitUntil: 'domcontentloaded' });

  const profile = page.getByRole('dialog', { name: 'Kubernetes Specialist' });
  const disable = profile.getByRole('button', { name: 'Disable agent' });
  await disable.click();

  const confirmation = profile.getByRole('alert');
  await expect(confirmation).toBeFocused();
  await expect(confirmation).toHaveAttribute('aria-labelledby', 'agent-disable-confirmation-title');
  await expect(confirmation).toHaveAttribute('aria-describedby', 'agent-disable-confirmation-description');
  await confirmation.getByRole('button', { name: 'Cancel' }).click();
  await expect(disable).toBeFocused();
  await expect(profile.getByRole('alert')).toHaveCount(0);
});

test('agent profile follows the selected Chinese application locale', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('app_language', 'zh');
    window.localStorage.setItem('acornops_profile_preferences:ning%40fixture.acornops.dev:language', 'zh');
  });
  await page.goto(agentProfilePath('overview'), { waitUntil: 'domcontentloaded' });

  const profile = page.getByRole('dialog', { name: 'Kubernetes Specialist' });
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await expect(profile.getByRole('tablist', { name: 'Agent 资料分区' })).toBeVisible();
  await expect(profile.getByRole('heading', { name: '身份与分配' })).toBeVisible();
  await expect(profile.getByRole('heading', { name: '已分配的工作流' })).toBeVisible();
  await expect(profile.getByRole('heading', { name: '范围与策略' })).toBeVisible();
});

test('nested agent capabilities follow the selected Chinese application locale', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('app_language', 'zh');
    window.localStorage.setItem('acornops_profile_preferences:ning%40fixture.acornops.dev:language', 'zh');
  });
  await page.goto(`${agentProfilePath('capabilities')}&capabilityTab=tools`, { waitUntil: 'domcontentloaded' });

  const profile = page.getByRole('dialog', { name: 'Kubernetes Specialist' });
  const capabilityTabs = profile.getByRole('tablist', { name: 'Agent 能力分区' });
  await expect(capabilityTabs.getByRole('tab', { name: '工具' })).toHaveAttribute('aria-selected', 'true');
  await expect(capabilityTabs.getByRole('tab', { name: '技能' })).toBeVisible();
  await expect(profile.getByRole('heading', { name: 'AcornOps 原生工具' })).toBeVisible();
  await expect(profile.getByRole('heading', { name: 'MCP 发现的工具' })).toBeVisible();
});

test('agent profile stays within a narrow viewport in light and dark themes', async ({ browser }) => {
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
    await page.goto(agentProfilePath('settings'), { waitUntil: 'domcontentloaded' });

    const profile = page.getByRole('dialog', { name: 'Kubernetes Specialist' });
    await expect(profile).toBeVisible();
    await expect(page.locator('html')).toHaveClass(theme === 'dark' ? /dark/ : /^(?!.*dark).*$/);
    expect(await profile.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

    const undersizedControls = await profile.locator('button:visible, a:visible, [role="tab"]:visible').evaluateAll((controls) => controls
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
