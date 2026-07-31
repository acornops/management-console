import type {
  WorkflowWebhook,
  WorkflowWebhookSecret
} from '@/services/control-plane/workflowWebhookApi';

export interface WebhookDraft {
  id?: string;
  workflowId: string;
  name: string;
  enabled: boolean;
  approvedContextGrants: string;
  principalId?: string;
}

export interface SecretDisclosure extends WorkflowWebhookSecret {
  name: string;
}

export function emptyWebhookDraft(): WebhookDraft {
  return {
    workflowId: '',
    name: '',
    enabled: true,
    approvedContextGrants: ''
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
    approvedContextGrants: webhook.approvedContextGrants.join('\n'),
    principalId: webhook.principal.id
  };
}

export function parseContextGrants(value: string): string[] {
  return value.split(/\n|,/).map((grant) => grant.trim()).filter(Boolean);
}
