import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const readSource = (path: string) => readFileSync(resolve(root, path), 'utf8');
const page = readSource('src/pages/WorkspaceWebhooksPage.tsx');
const editor = readSource('src/features/webhooks/WebhookEditor.tsx');
const list = readSource('src/features/webhooks/WebhookList.tsx');
const model = readSource('src/features/webhooks/webhookModel.ts');
const appPageContent = readSource('src/app/AppPageContent.tsx');
const controlPlaneApi = readSource('src/services/controlPlaneApi.ts');
const webhookApi = readSource('src/services/control-plane/webhookApi.ts');

describe('WorkspaceWebhooksPage contract surface', () => {
  it('mounts the webhook route and uses the typed browser API client', () => {
    expect(appPageContent).toContain("route.kind === 'workspaceWebhooks'");
    expect(controlPlaneApi).toContain('...webhookApi');
    expect(webhookApi).toContain('async listWebhooks(workspaceId: string)');
    expect(webhookApi).toContain('async createWebhook(workspaceId: string, input: ControlPlaneWebhookInput)');
    expect(webhookApi).toContain('async updateWebhook(');
    expect(webhookApi).toContain('async deleteWebhook(workspaceId: string, webhookId: string)');
    expect(webhookApi).toContain('async listWebhookHistory(');
  });

  it('keeps read access separate from manage_webhooks mutations', () => {
    expect(page).toContain('canManageWebhooks');
    expect(page).toContain('{canManageWebhooks && (');
    expect(page).toContain('workspaceWebhooks.readOnlyTitle');
    expect(list).toContain('{canManageWebhooks && (');
  });

  it('uses current accessible form, state, status, and destructive confirmation primitives', () => {
    expect(editor).toContain('<form');
    expect(editor).toContain('type="url"');
    expect(editor).toContain('<fieldset');
    expect(list).toContain('<DataSurface');
    expect(list).toContain('<EmptyState');
    expect(list).toContain('<StatusBadge');
    expect(list).toContain('<InlineConfirmation');
  });

  it('expands current event groups without duplicating events', () => {
    expect(editor).toContain('applyEventGroup(group.eventTypes)');
    expect(model).toContain('return [...new Set(events)]');
    expect(model).toContain("id: 'issueAlerts'");
    expect(model).toContain("eventTypes: ['issue.created.v1', 'issue.reopened.v1', 'issue.resolved.v1']");
    expect(model).toContain("id: 'runAlerts'");
  });

  it('keeps created signing secrets in one-time component state only', () => {
    expect(page).toContain('const [createdSecret, setCreatedSecret]');
    expect(page).toContain('setCreatedSecret({ name: created.name, secret: created.secret })');
    expect(page).not.toContain('localStorage');
    expect(page).not.toContain('sessionStorage');
  });

  it('loads delivery history through the manage_webhooks-gated endpoint', () => {
    expect(page).toContain('controlPlaneApi.listWebhookHistory(requestedWorkspaceId, webhook.id, { limit: 25 })');
    expect(list).toContain("t('workspaceWebhooks.historyEmpty')");
    expect(list).toContain('deliveryStatusTone(entry)');
    expect(list).toContain('entry.attemptNumber');
    expect(list).toContain('entry.nextAttemptAt');
    expect(list).toContain('entry.terminalReason');
  });

  it('fences asynchronous list, history, and mutation results to the active workspace', () => {
    expect(page).toContain('currentWorkspaceId.current = workspace.id');
    expect(page).toContain('webhookRequestSequence.current === requestSequence');
    expect(page).toContain('historyRequestSequence.current === requestSequence');
    expect(page).toContain('saveRequestSequence.current === requestSequence');
    expect(page).toContain('deleteRequestSequence.current === requestSequence');
    expect(page).toContain('setWebhooks([])');
    expect(page).toContain('const workspaceStateCurrent = stateWorkspaceId === workspace.id');
    expect(page).toContain('const visibleWebhooks = workspaceStateCurrent ? webhooks : []');
  });
});
