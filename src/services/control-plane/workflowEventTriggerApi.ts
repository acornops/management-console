import { requestJson } from './http';

export type WorkflowEventTriggerSourceType = 'webhook' | 'acornops_event';
export type WorkflowEventTriggerStatus = 'enabled' | 'paused';
export type WorkflowEventTriggerLastStatus = 'dispatched' | 'failed' | 'auto_paused' | 'rejected';
export type WorkflowEventInputBinding =
  | 'issue.id'
  | 'issue.title'
  | 'issue.summary'
  | 'issue.severity'
  | 'issue.scope'
  | 'issue.object'
  | 'target.id'
  | 'target.type';

export interface WorkflowEventTrigger {
  id: string;
  workspaceId: string;
  workflowId: string;
  name: string;
  status: WorkflowEventTriggerStatus;
  sourceType: WorkflowEventTriggerSourceType;
  eventType?: 'issue.created.v1' | null;
  inputBindings: Record<string, WorkflowEventInputBinding>;
  approvedContextGrants: string[];
  principal: { type: 'user'; id: string };
  endpointUrl?: string;
  lastTriggeredAt?: string | null;
  lastStatus?: WorkflowEventTriggerLastStatus | null;
  lastError?: string | null;
}

export interface WorkflowEventTriggerListResponse {
  items: WorkflowEventTrigger[];
}

export interface WorkflowEventTriggerInput {
  workflowId: string;
  name: string;
  enabled?: boolean;
  sourceType: WorkflowEventTriggerSourceType;
  eventType?: 'issue.created.v1';
  inputBindings?: Record<string, WorkflowEventInputBinding>;
  approvedContextGrants?: string[];
}

export type WorkflowEventTriggerUpdateInput = Partial<Omit<
  WorkflowEventTriggerInput,
  'workflowId' | 'sourceType' | 'eventType'
>>;

export interface WorkflowEventTriggerSecret {
  url: string;
  secret: string;
  secretDisclosure: 'one_time';
}

export interface WorkflowEventTriggerCreatedResponse {
  trigger: WorkflowEventTrigger;
  webhook?: WorkflowEventTriggerSecret;
}

export function listWorkspaceWorkflowEventTriggers(
  workspaceId: string
): Promise<WorkflowEventTriggerListResponse> {
  return requestJson<WorkflowEventTriggerListResponse>(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/workflow-event-triggers`
  );
}

export function createWorkflowEventTrigger(
  workspaceId: string,
  input: WorkflowEventTriggerInput
): Promise<WorkflowEventTriggerCreatedResponse> {
  return requestJson<WorkflowEventTriggerCreatedResponse>(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/workflow-event-triggers`,
    {
      method: 'POST',
      body: JSON.stringify(input)
    }
  );
}

export function updateWorkflowEventTrigger(
  workspaceId: string,
  triggerId: string,
  input: WorkflowEventTriggerUpdateInput
): Promise<WorkflowEventTrigger> {
  return requestJson<{ trigger: WorkflowEventTrigger }>(
    `/api/v1/workflow-event-triggers/${encodeURIComponent(triggerId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ workspaceId, ...input })
    }
  ).then((response) => response.trigger);
}

export function deleteWorkflowEventTrigger(workspaceId: string, triggerId: string): Promise<void> {
  return requestJson<void>(
    `/api/v1/workflow-event-triggers/${encodeURIComponent(triggerId)}`,
    {
      method: 'DELETE',
      body: JSON.stringify({ workspaceId })
    }
  ).then(() => undefined);
}

export function rotateWorkflowEventTriggerSecret(
  workspaceId: string,
  triggerId: string
): Promise<WorkflowEventTriggerCreatedResponse> {
  return requestJson<WorkflowEventTriggerCreatedResponse>(
    `/api/v1/workflow-event-triggers/${encodeURIComponent(triggerId)}/rotate-secret`,
    {
      method: 'POST',
      body: JSON.stringify({ workspaceId })
    }
  );
}
