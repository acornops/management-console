import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const webhooksPage = readFileSync(resolve(root, 'src/pages/WorkspaceWebhooksPage.tsx'), 'utf8');
const controlPlaneApi = readFileSync(resolve(root, 'src/services/controlPlaneApi.ts'), 'utf8');
const webhookApi = readFileSync(resolve(root, 'src/services/control-plane/webhookApi.ts'), 'utf8');

describe('WorkspaceWebhooksPage contract surface', () => {
  it('uses the browser webhook CRUD endpoints through the typed control-plane API client', () => {
    expect(controlPlaneApi).toContain('...webhookApi');
    expect(webhookApi).toContain('async listWebhooks(workspaceId: string)');
    expect(webhookApi).toContain('async createWebhook(workspaceId: string, input: ControlPlaneWebhookInput)');
    expect(webhookApi).toContain('async updateWebhook(');
    expect(webhookApi).toContain('async deleteWebhook(workspaceId: string, webhookId: string)');
    expect(webhookApi).toContain('async listWebhookHistory(');
    expect(webhookApi).toContain('/api/v1/workspaces/${encodeURIComponent(workspaceId)}/webhooks');
  });

  it('keeps read access separate from manage_webhooks mutations and expands event groups in UI', () => {
    expect(webhooksPage).toContain('canManageWebhooks');
    expect(webhooksPage).toContain('Webhook management required');
    expect(webhooksPage).toContain('{canManageWebhooks && (');
    expect(webhooksPage).toContain('const eventGroups');
    expect(webhooksPage).toContain('applyEventGroup(group.eventTypes)');
    expect(webhooksPage).toContain('eventTypes: sortedEvents([...current.eventTypes, ...eventTypes])');
  });

  it('shows created signing secrets only through one-time create state', () => {
    expect(webhooksPage).toContain('const [createdSecret, setCreatedSecret]');
    expect(webhooksPage).toContain('setCreatedSecret({ name: created.name, secret: created.secret })');
    expect(webhooksPage).toContain('setCreatedSecret(null)');
    expect(webhooksPage).not.toContain('localStorage');
    expect(webhooksPage).not.toContain('sessionStorage');
  });

  it('loads delivery history through the manage_webhooks-gated history endpoint', () => {
    expect(webhooksPage).toContain('controlPlaneApi.listWebhookHistory(workspace.id, webhook.id, { limit: 25 })');
    expect(webhooksPage).toContain('No delivery attempts recorded.');
  });
});
