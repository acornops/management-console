import { toArray } from './formatters';
import { requestJson } from './http';
import type {
  ControlPlaneWebhookCreated,
  ControlPlaneWebhookHistory,
  ControlPlaneWebhookInput,
  ControlPlaneWebhookPatch,
  ControlPlaneWebhookSubscription
} from './webhookTypes';

const workspaceWebhooksPath = (workspaceId: string): string =>
  `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/webhooks`;

const workspaceWebhookPath = (workspaceId: string, webhookId: string): string =>
  `${workspaceWebhooksPath(workspaceId)}/${encodeURIComponent(webhookId)}`;

export const webhookApi = {
  async listWebhooks(workspaceId: string): Promise<ControlPlaneWebhookSubscription[]> {
    const result = await requestJson<ControlPlaneWebhookSubscription[]>(workspaceWebhooksPath(workspaceId));
    return toArray(result);
  },

  async createWebhook(workspaceId: string, input: ControlPlaneWebhookInput): Promise<ControlPlaneWebhookCreated> {
    return requestJson<ControlPlaneWebhookCreated>(
      workspaceWebhooksPath(workspaceId),
      { method: 'POST', body: JSON.stringify(input) }
    );
  },

  async updateWebhook(
    workspaceId: string,
    webhookId: string,
    patch: ControlPlaneWebhookPatch
  ): Promise<ControlPlaneWebhookSubscription> {
    return requestJson<ControlPlaneWebhookSubscription>(
      workspaceWebhookPath(workspaceId, webhookId),
      { method: 'PATCH', body: JSON.stringify(patch) }
    );
  },

  async deleteWebhook(workspaceId: string, webhookId: string): Promise<void> {
    await requestJson<void>(
      workspaceWebhookPath(workspaceId, webhookId),
      { method: 'DELETE' }
    );
  },

  async listWebhookHistory(
    workspaceId: string,
    webhookId: string,
    options?: { limit?: number }
  ): Promise<ControlPlaneWebhookHistory[]> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    const query = params.toString();
    const result = await requestJson<ControlPlaneWebhookHistory[]>(
      `${workspaceWebhookPath(workspaceId, webhookId)}/history${query ? `?${query}` : ''}`
    );
    return toArray(result);
  }
};
