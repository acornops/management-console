import { expect, test, type Page } from '@playwright/test';

const workspaceId = 'fixture-workspace';
const clusterId = 'fixture-cluster';
const virtualMachineId = 'fixture-vm';
const controlPlaneUrl = 'http://127.0.0.1:4190';

async function resetWithAiRuntimeDisabled(page: Page) {
  await page.request.post(`${controlPlaneUrl}/api/v1/__fixtures/reset`);
  const current = await page.request.get(`${controlPlaneUrl}/api/v1/workspaces/${workspaceId}/ai-settings`);
  const settings = await current.json();
  const response = await page.request.patch(`${controlPlaneUrl}/api/v1/workspaces/${workspaceId}/ai-settings`, {
    data: {
      ...settings,
      providers: settings.providers.map((provider: Record<string, unknown>) => ({
        ...provider,
        configured: false
      }))
    }
  });
  expect(response.ok()).toBe(true);
}

test('AI readiness stays inline across full-page, mobile, dark, and docked assistants', async ({ page }) => {
  await resetWithAiRuntimeDisabled(page);

  await page.goto(`/workspaces/${workspaceId}/kubernetes-clusters/${clusterId}/chat?session=fixture-session`);
  await expect(page.getByText('Why is the payments worker restarting?')).toBeVisible();
  await expect(page.getByText('Connect an AI model to continue')).toBeVisible();
  const chatNewChatBox = await page.locator('[data-page-header-action="true"]').boundingBox();
  expect(chatNewChatBox?.height).toBe(44);
  const railNewChat = page.locator('[data-chat-history-trigger="new-chat"]');
  await expect(railNewChat).toBeVisible();
  await expect(railNewChat).toBeDisabled();
  await railNewChat.hover();
  await expect(page.getByRole('tooltip', {
    name: 'Configure an AI provider and model before starting a new chat.'
  })).toBeVisible();
  await expect(page.getByRole('textbox', { name: /Message .* assistant/ })).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.screenshot({ path: '/tmp/ai-readiness-desktop-light.png', fullPage: true });

  await page.locator('[data-chat-history-trigger="search"]').click();
  await expect(page.getByRole('heading', { name: 'Chats' })).toBeVisible();
  const historyNewChatBox = await page.locator('[data-page-header-action="true"]').boundingBox();
  expect(historyNewChatBox?.height).toBe(chatNewChatBox?.height);
  expect(historyNewChatBox?.width).toBe(chatNewChatBox?.width);
  const chatSearch = page.locator('[data-chat-history-search="true"]');
  await expect(chatSearch).toBeFocused();
  await expect(page.locator('[data-search-filter-frame="true"]')).toBeVisible();
  await expect(page.getByText('Started by', { exact: true })).toBeVisible();
  await expect(page.getByText('Last activity', { exact: true })).toBeVisible();
  const searchChatRow = page.getByRole('button', { name: /Payments restart investigation/ });
  await expect(searchChatRow.getByText('Test User', { exact: true })).toBeVisible();
  const startedByHeaderBox = await page.locator('[data-chat-history-column="started-by"]').first().boundingBox();
  const startedByValueBox = await searchChatRow.locator('[data-chat-history-column="started-by"]').boundingBox();
  const lastActivityHeaderBox = await page.locator('[data-chat-history-column="last-activity"]').first().boundingBox();
  const lastActivityValueBox = await searchChatRow.locator('[data-chat-history-column="last-activity"]').boundingBox();
  expect(Math.abs((startedByHeaderBox?.x ?? 0) - (startedByValueBox?.x ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((lastActivityHeaderBox?.x ?? 0) - (lastActivityValueBox?.x ?? 0))).toBeLessThanOrEqual(1);
  expect((await searchChatRow.boundingBox())?.height).toBeLessThanOrEqual(56);
  await page.screenshot({ path: '/tmp/chat-history-desktop-light.png', fullPage: true });

  await page.locator('[data-chat-history-trigger="chats"]').click();
  await expect(page.getByRole('heading', { name: 'Chats' })).toBeVisible();
  const compactChatRow = page.getByRole('button', { name: /Payments restart investigation/ });
  await expect(compactChatRow).toBeVisible();
  expect((await compactChatRow.boundingBox())?.height).toBeLessThanOrEqual(64);
  await page.screenshot({ path: '/tmp/chat-history-panel-light.png', fullPage: true });
  await page.getByRole('button', { name: 'Configure AI' }).click();
  await expect(page).toHaveURL(new RegExp(`/workspaces/${workspaceId}/ai-settings`));
  await page.goto(`/workspaces/${workspaceId}/kubernetes-clusters/${clusterId}/chat?session=fixture-session`);

  await page.addInitScript(() => {
    window.localStorage.setItem('acornops_active_theme_preference', 'dark');
    window.localStorage.setItem('acornops_profile_preferences:test-user%40fixture.acornops.dev:theme', 'dark');
  });
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.getByText('Connect an AI model to continue')).toBeVisible();
  await page.screenshot({ path: '/tmp/ai-readiness-desktop-dark.png', fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/workspaces/${workspaceId}/virtual-machines/${virtualMachineId}/chat`);
  await expect(page.getByText('Connect an AI model to continue')).toBeVisible();
  await expect(page.getByRole('textbox', { name: /Message .* assistant/ })).toHaveCount(0);
  await page.locator('[data-chat-history-trigger="chats"]').click();
  await expect(page.getByRole('dialog', { name: 'Chats' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Chats' })).toHaveCount(0);
  await page.screenshot({ path: '/tmp/ai-readiness-mobile-dark.png', fullPage: true });
  await page.locator('[data-chat-history-trigger="search"]').click();
  await expect(page.locator('[data-chat-history-search="true"]')).toBeFocused();
  await expect(page.getByText('Last activity', { exact: true })).toBeHidden();
  await page.screenshot({ path: '/tmp/chat-history-mobile-dark.png', fullPage: true });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`/workspaces/${workspaceId}/kubernetes-clusters/${clusterId}/overview`);
  await page.getByRole('button', { name: 'Open assistant' }).first().click();
  const dockedAssistant = page.getByRole('complementary', { name: 'Cluster Assistant' });
  await expect(dockedAssistant.getByText('Connect an AI model to continue')).toBeVisible();
  await expect(dockedAssistant.getByRole('textbox', { name: /Message .* assistant/ })).toHaveCount(0);
  await page.screenshot({ path: '/tmp/ai-readiness-docked-dark.png', fullPage: true });
});
