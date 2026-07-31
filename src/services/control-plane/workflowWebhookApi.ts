import { requestJson } from './http';
import type { WorkflowExecutionSummary } from './workflowApi';

export type WorkflowWebhookStatus = 'enabled' | 'paused';
export type WorkflowWebhookLastStatus = 'dispatched' | 'failed' | 'auto_paused' | 'rejected';

export interface WorkflowWebhook {
  id: string;
  workspaceId: string;
  workflowId: string;
  name: string;
  status: WorkflowWebhookStatus;
  approvedContextGrants: string[];
  principal: { type: 'user'; id: string };
  endpointUrl: string;
  lastReceivedAt?: string | null;
  lastStatus?: WorkflowWebhookLastStatus | null;
  lastError?: string | null;
  lastExecutionId?: string | null;
  lastRunId?: string | null;
  latestExecution?: WorkflowExecutionSummary;
}

export interface WorkflowWebhookListResponse {
  items: WorkflowWebhook[];
}

export interface WorkflowWebhookInput {
  workflowId: string;
  name: string;
  enabled?: boolean;
  approvedContextGrants?: string[];
}

export type WorkflowWebhookUpdateInput = Partial<Omit<
  WorkflowWebhookInput,
  'workflowId'
>>;

export interface WorkflowWebhookSecret {
  url: string;
  secret: string;
  secretDisclosure: 'one_time';
}

export interface WorkflowWebhookCreatedResponse {
  webhook: WorkflowWebhook;
  signingSecret: WorkflowWebhookSecret;
}

export function listWorkspaceWorkflowWebhooks(
  workspaceId: string
): Promise<WorkflowWebhookListResponse> {
  return requestJson<WorkflowWebhookListResponse>(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/workflow-webhooks`
  );
}

export function createWorkflowWebhook(
  workspaceId: string,
  input: WorkflowWebhookInput
): Promise<WorkflowWebhookCreatedResponse> {
  return requestJson<WorkflowWebhookCreatedResponse>(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/workflow-webhooks`,
    {
      method: 'POST',
      body: JSON.stringify(input)
    }
  );
}

export function updateWorkflowWebhook(
  workspaceId: string,
  webhookId: string,
  input: WorkflowWebhookUpdateInput
): Promise<WorkflowWebhook> {
  return requestJson<{ webhook: WorkflowWebhook }>(
    `/api/v1/workflow-webhooks/${encodeURIComponent(webhookId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ workspaceId, ...input })
    }
  ).then((response) => response.webhook);
}

export function deleteWorkflowWebhook(workspaceId: string, webhookId: string): Promise<void> {
  return requestJson<void>(
    `/api/v1/workflow-webhooks/${encodeURIComponent(webhookId)}`,
    {
      method: 'DELETE',
      body: JSON.stringify({ workspaceId })
    }
  ).then(() => undefined);
}

export function rotateWorkflowWebhookSecret(
  workspaceId: string,
  webhookId: string
): Promise<WorkflowWebhookCreatedResponse> {
  return requestJson<WorkflowWebhookCreatedResponse>(
    `/api/v1/workflow-webhooks/${encodeURIComponent(webhookId)}/rotate-secret`,
    {
      method: 'POST',
      body: JSON.stringify({ workspaceId })
    }
  );
}
