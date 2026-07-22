import type { WorkflowRunMessage } from './workflowModel';
import type { WorkflowRunSummary, WorkflowSessionSummary } from '@/services/control-plane/workflowApi';

export function mapPersistedWorkflowRunResponse(run: WorkflowRunSummary): WorkflowRunMessage | null {
  const content = run.assistantMessage?.content;
  if (!content?.trim()) return null;

  return {
    id: `workflow-run-${run.id}-assistant-final`,
    runId: run.id,
    role: 'agent',
    author: 'Workflow response',
    content,
    createdAt: run.endedAt || run.startedAt || run.requestedAt || 'Unknown',
    status: 'sent'
  };
}

export function indexPersistedWorkflowRunResponses(
  sessions: WorkflowSessionSummary[]
): Record<string, WorkflowRunMessage[]> {
  const messagesByRunId: Record<string, WorkflowRunMessage[]> = {};

  for (const session of sessions) {
    for (const run of session.runs || []) {
      const message = mapPersistedWorkflowRunResponse(run);
      if (message) messagesByRunId[run.id] = [message];
    }
  }

  return messagesByRunId;
}

export function mergePersistedWorkflowRunResponses(
  current: Record<string, WorkflowRunMessage[]>,
  persisted: Record<string, WorkflowRunMessage[]>
): Record<string, WorkflowRunMessage[]> {
  let next = current;

  for (const [runId, persistedMessages] of Object.entries(persisted)) {
    const currentMessages = current[runId] || [];
    const persistedById = new Map(persistedMessages.map((message) => [message.id, message]));
    const currentIds = new Set(currentMessages.map((message) => message.id));
    let changed = false;
    const merged = currentMessages.map((message) => {
      const savedMessage = persistedById.get(message.id);
      if (!savedMessage) return message;
      if (
        savedMessage.content === message.content
        && savedMessage.createdAt === message.createdAt
        && savedMessage.status === message.status
      ) return message;
      changed = true;
      return savedMessage;
    });

    for (const message of persistedMessages) {
      if (currentIds.has(message.id)) continue;
      merged.push(message);
      changed = true;
    }

    if (!changed) continue;
    if (next === current) next = { ...current };
    next[runId] = merged;
  }

  return next;
}
