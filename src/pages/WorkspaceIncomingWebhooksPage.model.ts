import type {
  WorkflowWebhook,
  WorkflowWebhookSecret
} from '@/services/control-plane/workflowWebhookApi';

export interface WebhookDraft {
  id?: string;
  workflowId: string;
  name: string;
  enabled: boolean;
  principalId?: string;
}

export interface SecretDisclosure extends WorkflowWebhookSecret {
  name: string;
}

export function emptyWebhookDraft(): WebhookDraft {
  return {
    workflowId: '',
    name: '',
    enabled: true
  };
}

export function draftFromWebhook(
  webhook: WorkflowWebhook
): WebhookDraft {
  return {
    id: webhook.id,
    workflowId: webhook.workflowId,
    name: webhook.name,
    enabled: webhook.status === 'enabled',
    principalId: webhook.principal.id
  };
}
