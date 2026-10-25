import { expect, test, type Page } from '@playwright/test';

const assistants = [
  { name: 'Agent', path: '/workspaces/fixture-workspace/agents/fixture-specialist/chat', width: 1440, theme: 'light' },
  { name: 'Kubernetes', path: '/kubernetes-clusters/fixture-cluster/chat', width: 1440, theme: 'dark' },
  { name: 'VM', path: '/workspaces/fixture-workspace/virtual-machines/fixture-vm/chat', width: 390, theme: 'dark' }
] as const;

async function installPolicyScenario(page: Page, mode: 'stale' | 'removed' | 'none' | 'refresh-error' = 'stale') {
  await page.addInitScript(({ mode }) => {
    const originalFetch = window.fetch.bind(window);
    const state = { rejected: mode === 'removed', refreshFails: mode === 'refresh-error', reads: 0, messages: [] as any[] };
    (window as any).modelPolicyScenario = state;
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
    window.fetch = async (input, init) => {
      const path = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.href).pathname;
      const method = init?.method || (input instanceof Request ? input.method : 'GET');
      if (path.endsWith('/ai-settings') && method === 'GET') {
        state.reads++;
        if (state.rejected && state.refreshFails) return json({ error: { code: 'UNAVAILABLE', message: 'Fixture policy refresh failed' } }, 503);
        const response = await originalFetch(input, init);
        const settings = await response.json();
        const models = state.rejected ? mode === 'none' ? [] : ['fixture-next-model'] : ['gpt-5.5', 'fixture-next-model'];
        const defaultModel = state.rejected && mode === 'stale' ? 'fixture-next-model' : 'gpt-5.5';
        return json({ ...settings, defaultProvider: 'openai', defaultModel, allowedProviders: ['openai'],
          allowedProviderModels: { openai: models, anthropic: [], gemini: [] }, allowedModels: models });
      }
      if (method === 'POST' && /\/(agent-conversations|sessions)\/[^/]+\/messages$/.test(path)) {
        state.messages.push(JSON.parse(String(init?.body || '{}')));
        state.rejected = true;
        return json({ error: { code: 'MODEL_NOT_ALLOWED', message: 'Selected model is no longer allowed' } }, 400);
      }
      return originalFetch(input, init);
    };
  }, { mode });
}

async function chooseReplacement(page: Page) {
  const selector = page.getByRole('button', { name: 'Model and reasoning effort', exact: true });
  await selector.focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'gpt-5.5', exact: true }).click();
  const replacement = page.getByRole('button', { name: 'fixture-next-model OpenAI', exact: true });
  await replacement.focus();
  await page.keyboard.press('Enter');
  await expect(selector).toContainText('fixture-next-model');
}

for (const assistant of assistants) {
  test(`${assistant.name}: policy rejection retains draft and attachment until explicit model replacement (${assistant.theme})`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: assistant.width, height: 1000 });
    await page.emulateMedia({ colorScheme: assistant.theme });
    await installPolicyScenario(page);
    await page.goto(assistant.path);
    const input = page.getByRole('combobox', { name: /Message .*assistant/ });
    await input.fill('Keep this draft after the policy changes.');
    await page.locator('input[type="file"]').setInputFiles({ name: 'evidence.txt', mimeType: 'text/plain', buffer: Buffer.from('Local fixture evidence') });
    await expect(page.getByText('evidence.txt', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(page.getByText('gpt-5.5 is no longer available.', { exact: false })).toBeVisible();
    await expect(input).toHaveValue('Keep this draft after the policy changes.');
    await expect(page.getByText('evidence.txt', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Model unavailable', exact: true })).toBeDisabled();
    await page.screenshot({ path: testInfo.outputPath('model-unavailable.png') });
    expect(await page.evaluate(() => (window as any).modelPolicyScenario.messages.length)).toBe(1);
    await chooseReplacement(page);
    await expect(page.getByText('gpt-5.5 is no longer available.', { exact: false })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Send', exact: true })).toBeEnabled();
    expect(await page.evaluate(() => (window as any).modelPolicyScenario.messages.length)).toBe(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await expect.poll(() => page.evaluate(() => (window as any).modelPolicyScenario.messages.length)).toBe(2);
    const last = await page.evaluate(() => (window as any).modelPolicyScenario.messages[1]);
    expect(last.llm.model).toBe('fixture-next-model');
    expect(last.llm.provider).toBe('openai');
  });

  test(`${assistant.name}: an unavailable default remains named without automatic substitution`, async ({ page }) => {
    await installPolicyScenario(page, 'removed');
    await page.goto(assistant.path);
    await expect(page.getByRole('button', { name: 'Model and reasoning effort', exact: true })).toContainText('gpt-5.5');
    await expect(page.getByText('gpt-5.5 is no longer available.', { exact: false })).toBeVisible();
    expect(await page.evaluate(() => (window as any).modelPolicyScenario.messages.length)).toBe(0);
    await chooseReplacement(page);
  });
}

test('Agent: no available alternatives provides administrator guidance and preserves the draft', async ({ page }) => {
  await installPolicyScenario(page, 'none');
  await page.goto(assistants[0].path);
  const input = page.getByRole('combobox', { name: /Message .*assistant/ });
  await input.fill('Keep this draft with no models.');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByText(/If no models are listed, contact your workspace administrator./)).toBeVisible();
  await expect(input).toHaveValue('Keep this draft with no models.');
  await expect(page.getByRole('button', { name: 'Model unavailable', exact: true })).toBeDisabled();
});

for (const assistant of assistants) {
  test(`${assistant.name}: failed policy refresh can retry in place without resending or losing context`, async ({ page }) => {
    await installPolicyScenario(page, 'refresh-error');
    await page.goto(assistant.path);
    const input = page.getByRole('combobox', { name: /Message .*assistant/ });
    await input.fill('Keep this draft while settings are unavailable.');
    await page.locator('input[type="file"]').setInputFiles({ name: 'retry.txt', mimeType: 'text/plain', buffer: Buffer.from('Preserved retry evidence') });
    await expect(page.getByText('retry.txt', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await expect.poll(() => page.evaluate(() => (window as any).modelPolicyScenario.reads)).toBeGreaterThan(1);
    await expect(page.getByRole('button', { name: 'Model unavailable', exact: true })).toBeDisabled();
    await page.evaluate(() => { (window as any).modelPolicyScenario.refreshFails = false; });
    await page.getByRole('button', { name: 'Retry model settings', exact: true }).click();
    await expect(page.getByText('gpt-5.5 is no longer available.', { exact: false })).toBeVisible();
    await chooseReplacement(page);
    await expect(input).toHaveValue('Keep this draft while settings are unavailable.');
    await expect(page.getByText('retry.txt', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send', exact: true })).toBeEnabled();
    expect(await page.evaluate(() => (window as any).modelPolicyScenario.messages.length)).toBe(1);
  });
}

test('Agent: the first rejected message keeps attachments while its conversation is created', async ({ page }) => {
  await installPolicyScenario(page);
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const path = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.href).pathname;
      if (path.endsWith('/agents/fixture-specialist/conversations') && (!init?.method || init.method === 'GET')) {
        return Response.json({ items: [] });
      }
      return originalFetch(input, init);
    };
  });
  await page.goto(assistants[0].path);
  await page.getByRole('combobox', { name: /Message .*assistant/ }).fill('First message draft.');
  await page.locator('input[type="file"]').setInputFiles({ name: 'first-message.txt', mimeType: 'text/plain', buffer: Buffer.from('First message evidence') });
  await expect(page.getByText('first-message.txt', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByText('gpt-5.5 is no longer available.', { exact: false })).toBeVisible();
  await expect(page.getByText('first-message.txt', { exact: true })).toBeVisible();
  await expect(page.getByRole('combobox', { name: /Message .*assistant/ })).toHaveValue('First message draft.');
});

for (const failedRead of ['conversation', 'summaries'] as const) {
  test(`Agent: accepted message clears attachments even when ${failedRead} refresh fails`, async ({ page }) => {
    await installPolicyScenario(page);
    await page.addInitScript(({ failedRead }) => {
      const originalFetch = window.fetch.bind(window);
      const state = { accepted: 0 };
      (window as any).modelAcceptedScenario = state;
      window.fetch = async (input, init) => {
        const path = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.href).pathname;
        if (init?.method === 'POST' && /\/agent-conversations\/[^/]+\/messages$/.test(path)) {
          state.accepted++;
          return Response.json({ message_id: 'fixture-accepted-message', run_id: 'fixture-accepted-run', status: 'queued' });
        }
        const isFailedRead = failedRead === 'conversation'
          ? /\/agent-conversations\/[^/]+$/.test(path)
          : path.endsWith('/agents/fixture-specialist/conversations');
        if (state.accepted && isFailedRead) return Response.json({ error: { code: 'UNAVAILABLE' } }, { status: 503 });
        return originalFetch(input, init);
      };
    }, { failedRead });
    await page.goto(assistants[0].path);
    const input = page.getByRole('combobox', { name: /Message .*assistant/ });
    await input.fill('This message is accepted exactly once.');
    await page.locator('input[type="file"]').setInputFiles({ name: 'accepted.txt', mimeType: 'text/plain', buffer: Buffer.from('Accepted evidence') });
    await expect(page.getByText('accepted.txt', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(input).toHaveValue('');
    await expect(page.getByText('accepted.txt', { exact: true })).toHaveCount(0);
    await expect(page.getByText(/Message sent, but conversation history could not be refreshed./)).toBeVisible();
    expect(await page.evaluate(() => (window as any).modelAcceptedScenario.accepted)).toBe(1);
  });
}

for (const scenario of ['credentials', 'reasoning', 'cancel'] as const) {
  test(`Agent: ${scenario} recovery preserves model identity and existing-run controls`, async ({ page }) => {
    await installPolicyScenario(page);
    await page.addInitScript(({ scenario }) => {
      const originalFetch = window.fetch.bind(window);
      let cancelled = false;
      const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });
      window.fetch = async (input, init) => {
        const path = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.href).pathname;
        if (path.endsWith('/runs/fixture-policy-run/cancel')) {
          cancelled = true;
          return new Response(null, { status: 204 });
        }
        if (path.endsWith('/runs/fixture-policy-run/approvals')) return json([]);
        const response = await originalFetch(input, init);
        if (path.endsWith('/ai-settings')) {
          const settings = await response.json();
          if (scenario === 'credentials') settings.providers = settings.providers.map((provider: any) => ({ ...provider, configured: false }));
          if (scenario === 'reasoning') settings.allowedReasoningEfforts = ['low'];
          if (scenario === 'cancel') settings.allowedProviderModels = { openai: [], anthropic: [], gemini: [] };
          return json(settings);
        }
        if (/\/agent-conversations\/[^/]+$/.test(path) && scenario !== 'credentials') {
          const conversation = await response.json();
          conversation.runs = [{ id: 'fixture-policy-run', workspaceId: 'fixture-workspace', agentId: 'fixture-specialist',
            sessionId: conversation.conversation.id, messageId: 'fixture-agent-message-user', toolAccessMode: 'read_only',
            status: scenario === 'cancel' ? cancelled ? 'cancelled' : 'running' : 'completed',
            requestedAt: '2026-10-25T01:00:00Z', startedAt: '2026-10-25T01:00:00Z', endedAt: null, errorCode: null, events: [],
            runtimeSelection: { provider: 'openai', model: 'fixture-next-model', reasoningEffort: 'high' } }];
          return json(conversation);
        }
        return response;
      };
    }, { scenario });
    await page.goto(assistants[0].path);
    const selector = page.getByRole('button', { name: 'Model and reasoning effort', exact: true });
    if (scenario === 'credentials') {
      await expect(selector).toContainText('gpt-5.5');
      await expect(page.getByText(/gpt-5.5 cannot be used with the current provider credentials/)).toBeVisible();
      await expect(page.getByRole('button', { name: 'Model unavailable', exact: true })).toBeDisabled();
    } else if (scenario === 'reasoning') {
      await expect(selector).toContainText('fixture-next-model Low');
      await expect(page.getByText(/An allowed effort is selected; your model is unchanged./)).toBeVisible();
    } else {
      const cancel = page.getByRole('button', { name: 'Cancel Run', exact: true });
      await expect(cancel).toBeEnabled();
      await cancel.click();
      await expect(cancel).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Model unavailable', exact: true })).toBeDisabled();
    }
    expect(await page.evaluate(() => (window as any).modelPolicyScenario.messages.length)).toBe(0);
  });
}
