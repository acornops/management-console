import { requestJson } from './http';
import {
  parseWebhookCreated,
  parseWebhookHistoryPage,
  parseWebhookPage,
  parseWebhookSubscription,
  type ControlPlaneWebhookCreated,
  type ControlPlaneWebhookHistory,
  type ControlPlaneWebhookInput,
  type ControlPlaneWebhookPatch,
  type ControlPlaneWebhookSubscription
} from './webhookTypes';

const workspaceWebhooksPath = (workspaceId: string): string =>
  `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/webhooks`;

const workspaceWebhookPath = (workspaceId: string, webhookId: string): string =>
  `${workspaceWebhooksPath(workspaceId)}/${encodeURIComponent(webhookId)}`;

export const webhookApi = {
  async listWebhooks(workspaceId: string): Promise<ControlPlaneWebhookSubscription[]> {
    return parseWebhookPage(await requestJson<unknown>(workspaceWebhooksPath(workspaceId)));
  },

  async createWebhook(workspaceId: string, input: ControlPlaneWebhookInput): Promise<ControlPlaneWebhookCreated> {
    return parseWebhookCreated(await requestJson<unknown>(
      workspaceWebhooksPath(workspaceId),
      { method: 'POST', body: JSON.stringify(input) }
    ));
  },

  async updateWebhook(
    workspaceId: string,
    webhookId: string,
    patch: ControlPlaneWebhookPatch
  ): Promise<ControlPlaneWebhookSubscription> {
    return parseWebhookSubscription(await requestJson<unknown>(
      workspaceWebhookPath(workspaceId, webhookId),
      { method: 'PATCH', body: JSON.stringify(patch) }
    ));
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
    const result = await requestJson<unknown>(
      `${workspaceWebhookPath(workspaceId, webhookId)}/history${query ? `?${query}` : ''}`
    );
    return parseWebhookHistoryPage(result);
  }
};
