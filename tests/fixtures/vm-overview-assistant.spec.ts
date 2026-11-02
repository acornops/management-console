import { expect, test } from '@playwright/test';
import { FIXTURE_CLOCK } from '../../src/fixtures/store';

const overviewPath = '/workspaces/fixture-workspace/virtual-machines/fixture-vm';

test('VM overview waits for the initial conversation before maximizing the assistant', async ({ page }) => {
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    const activityReady = new Promise<void>((resolve) => {
      window.addEventListener('release-vm-activity', () => resolve(), { once: true });
    });
    window.fetch = async (input, init) => {
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.href);
      const response = await originalFetch(input, init);
      if (url.pathname === '/api/v1/workspaces/fixture-workspace/targets/fixture-vm/chat-activity') {
        document.documentElement.dataset.vmActivityPending = 'true';
        await activityReady;
        const body = await response.json();
        // Keep the delayed initialization independent of the recent-conversation chooser.
        body.recentActivity = [];
        return new Response(JSON.stringify(body), { status: response.status, headers: response.headers });
      }
      return response;
    };
  });
  await page.clock.setFixedTime(FIXTURE_CLOCK);
  await page.goto(overviewPath, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Open assistant' }).first().click();
  const assistant = page.getByRole('complementary', { name: 'VM Assistant', exact: true });
  const maximize = assistant.getByRole('button', { name: 'Open full chat', exact: true });
  await expect(page.locator('html')).toHaveAttribute('data-vm-activity-pending', 'true');
  await expect(maximize).toHaveCount(0, { timeout: 1_000 });

  await page.evaluate(() => window.dispatchEvent(new Event('release-vm-activity')));
  const composer = assistant.getByRole('combobox', { name: 'Message Payments VM assistant' });
  await expect(composer).toHaveValue(/Payment gateway service is degraded/);
  const prompt = await composer.inputValue();
  await maximize.click();

  await expect(page).toHaveURL(new RegExp(`${overviewPath}/chat\\?session=.+`));
  await expect(assistant).toHaveCount(0);
  await expect(page.getByRole('combobox', { name: 'Message Payments VM assistant' })).toHaveValue(prompt);
});

test('VM overview preserves an edited draft when maximizing the assistant', async ({ page }) => {
  await page.clock.setFixedTime(FIXTURE_CLOCK);
  await page.goto(overviewPath, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Open assistant' }).first().click();
  const assistant = page.getByRole('complementary', { name: 'VM Assistant', exact: true });
  const composer = assistant.getByRole('combobox', { name: 'Message Payments VM assistant' });
  await expect(composer).toHaveValue(/Payment gateway service is degraded/);
  const draft = `${await composer.inputValue()}\nCheck the logs before suggesting a restart.`;
  const conversationTitle = await assistant.getByRole('heading', { level: 1 }).innerText();
  await composer.fill(draft);
  await assistant.getByRole('button', { name: 'Open full chat', exact: true }).click();

  await expect(page).toHaveURL(new RegExp(`${overviewPath}/chat\\?session=.+`));
  await expect(assistant).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1, name: conversationTitle, exact: true })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Message Payments VM assistant' })).toHaveValue(draft);
});

for (const narrow of [false, true]) {
  test(`VM overview opens issue assistance in the ${narrow ? 'mobile drawer' : 'desktop dock'}`, async ({ page }) => {
    if (narrow) await page.setViewportSize({ width: 390, height: 844 });
    await page.clock.setFixedTime(FIXTURE_CLOCK);
    await page.goto(overviewPath, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Open assistant' }).first().click();

    await expect(page).toHaveURL(overviewPath);
    const assistant = page.getByRole(narrow ? 'dialog' : 'complementary', { name: 'VM Assistant', exact: true });
    await expect(assistant).toBeVisible();
    await expect(assistant.locator('[data-target-chat-surface="true"]')).toBeVisible();
    await expect(assistant.locator('textarea')).toHaveValue(/Payment gateway service is degraded/);
    await expect(assistant.locator('textarea')).toHaveValue(/payment-gateway\.service/);

    if (!narrow) {
      const mainBox = await page.locator('main').boundingBox();
      const assistantBox = await assistant.boundingBox();
      expect(mainBox).not.toBeNull();
      expect(assistantBox).not.toBeNull();
      expect(mainBox!.x + mainBox!.width).toBeLessThanOrEqual(assistantBox!.x + 1);
    }
    await assistant.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(assistant).toBeHidden();
    await expect(page).toHaveURL(overviewPath);
    await expect(page.getByRole('button', { name: 'Open assistant' }).first()).toBeVisible();
  });
}
