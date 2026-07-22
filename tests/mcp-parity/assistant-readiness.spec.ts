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
  await expect(page.getByRole('textbox', { name: /Message .* assistant/ })).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.screenshot({ path: '/tmp/ai-readiness-desktop-light.png', fullPage: true });

  await page.evaluate(() => {
    window.localStorage.setItem('acornops_active_theme_preference', 'dark');
    window.localStorage.setItem('acornops_profile_preferences:ning%40fixture.acornops.dev:theme', 'dark');
  });
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.getByText('Connect an AI model to continue')).toBeVisible();
  await page.screenshot({ path: '/tmp/ai-readiness-desktop-dark.png', fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/workspaces/${workspaceId}/virtual-machines/${virtualMachineId}/chat`);
  await expect(page.getByText('Connect an AI model to continue')).toBeVisible();
  await expect(page.getByRole('textbox', { name: /Message .* assistant/ })).toHaveCount(0);
  await page.screenshot({ path: '/tmp/ai-readiness-mobile-dark.png', fullPage: true });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`/workspaces/${workspaceId}/kubernetes-clusters/${clusterId}/overview`);
  await page.getByRole('button', { name: 'Run triage' }).first().click();
  const dockedAssistant = page.getByRole('dialog', { name: 'Cluster Assistant' });
  await expect(dockedAssistant.getByText('Connect an AI model to continue')).toBeVisible();
  await expect(dockedAssistant.getByRole('textbox', { name: /Message .* assistant/ })).toHaveCount(0);
  await page.screenshot({ path: '/tmp/ai-readiness-docked-dark.png', fullPage: true });
});
