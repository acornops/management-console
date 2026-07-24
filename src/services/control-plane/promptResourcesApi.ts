import { requestJson } from './http';

export interface PromptResourceRequirement {
  type: string;
  minimum: number;
  maximum: number;
  requiredOperations: string[];
  constraints?: Record<string, unknown>;
}

export interface PromptReferenceTypeDescriptor {
  type: string;
  displayName: string;
  description: string;
  icon: string;
  placeholderLabel: string;
  availability: 'available' | 'unavailable';
  unavailableReason?: string;
  minimum: number;
  maximum: number;
  allowPinnedReferences: boolean;
  provider: string;
  providerVersion: string;
}

export interface PromptResourceCandidate {
  type: string;
  id: string;
  label: string;
  description?: string;
  provider: string;
  availability: 'available' | 'unavailable';
  unavailableReason?: string;
}

export interface PromptReferenceToken {
  type: string;
  label: string;
  start: number;
  end: number;
}

export interface PromptReferenceResolution {
  prompt: string;
  promptDigest: string;
  bindingDigest: string;
  tokens: PromptReferenceToken[];
  parameters: WorkflowParameterDefinition[];
  candidates: Array<PromptResourceCandidate | null>;
  blockers: Array<{ code: string; message: string; tokenIndex?: number; type?: string; retryable: boolean }>;
}

export interface WorkflowParameterDefinition {
  key: string;
  type: 'text' | 'target' | 'chat';
  required: true;
}

export function listPromptReferenceTypes(workspaceId: string): Promise<PromptReferenceTypeDescriptor[]> {
  return requestJson<{ items: PromptReferenceTypeDescriptor[] }>(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/prompt-reference-types`
  ).then((response) => response.items);
}

export function suggestPromptReferences(
  workspaceId: string,
  type: string,
  query: string,
  workflowId?: string
): Promise<PromptResourceCandidate[]> {
  const parameters = new URLSearchParams({ type, q: query, limit: '20' });
  if (workflowId) parameters.set('workflowId', workflowId);
  return requestJson<{ items: PromptResourceCandidate[] }>(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/prompt-references/suggestions?${parameters}`
  ).then((response) => response.items);
}

export function resolvePromptReferences(
  workspaceId: string,
  input: { prompt: string; workflowId?: string }
): Promise<PromptReferenceResolution> {
  return requestJson<PromptReferenceResolution>(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/prompt-references/resolve`,
    { method: 'POST', body: JSON.stringify(input) }
  );
}
