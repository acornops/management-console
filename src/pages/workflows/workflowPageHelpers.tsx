import React from 'react';
import { Switch } from '@acornops/ui';
import { buildTraceFromRunEvents, type LiveRunTrace } from '@/features/conversations/presentation';
import {
  type WorkflowDefinition,
  type WorkflowStatus,
  type WorkflowView
} from '@/pages/workflows/workflowModel';
import type {
  WorkflowApiDefinition,
  WorkflowCreateInput,
  WorkflowOptionsCatalog,
  WorkflowOption,
  WorkflowRunEvent,
  WorkflowRunSummary
} from '@/services/control-plane/workflowApi';
import { formatElapsedDuration } from '@/utils/dateTime';
import { formatIdentifierLabel } from '@/utils/textFormatting';
import type { AgentDefinition } from '@/pages/agents/agentModel';

export const workflowViews: WorkflowView[] = ['overview', 'capabilities', 'schedules', 'webhooks', 'runs', 'settings'];

export type CreateWorkflowDraft = {
  name: string;
  description: string;
  starterPrompt: string;
  agentIds: string[];
};

export type WorkflowEditDraft = {
  name: string;
  description: string;
  starterPrompt: string;
};

export type AgentSelectionDraft = {
  agentIds: string[];
};

export function workflowStatusTone(status: WorkflowStatus): 'success' | 'warning' | 'neutral' {
  if (status === 'active') return 'success';
  if (status === 'draft') return 'warning';
  return 'neutral';
}

export function runStatusTone(status: WorkflowDefinition['runs'][number]['status']): 'success' | 'warning' | 'neutral' {
  if (status === 'completed') return 'success';
  if (status === 'waiting_approval' || status === 'needs_review' || status === 'running' || status === 'dispatching' || status === 'queued' || status === 'cancelling') return 'warning';
  return 'neutral';
}

export const WorkflowAvailabilitySwitch: React.FC<{
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}> = ({ checked, disabled, label, onChange }) => (
  <Switch
    checked={checked}
    label={label}
    disabled={disabled}
    onCheckedChange={onChange}
  />
);

export function titleFromInputName(name: string): string {
  return formatIdentifierLabel(name);
}

export function uniqueValues(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

export function isRunActive(status: WorkflowDefinition['runs'][number]['status']): boolean {
  return status === 'queued' || status === 'dispatching' || status === 'running' || status === 'waiting_approval' || status === 'cancelling';
}

export function isTerminalRunStatus(status: WorkflowDefinition['runs'][number]['status']): boolean {
  return status === 'completed' || status === 'failed' || status === 'cancelled';
}

export function workflowRunTraceStatus(status: WorkflowDefinition['runs'][number]['status']): LiveRunTrace['status'] {
  if (status === 'completed') return 'completed';
  if (status === 'failed') return 'failed';
  if (status === 'cancelled') return 'cancelled';
  return status === 'queued' || status === 'dispatching' ? 'connecting' : 'running';
}

export function workflowRunToTrace(run: WorkflowDefinition['runs'][number], events: WorkflowRunEvent[]): LiveRunTrace {
  const runId = run.runId || run.id;
  if (events.length > 0) {
    return buildTraceFromRunEvents({
      id: runId,
      workspaceId: '',
      sessionId: '',
      messageId: '',
      status: run.status,
      requestedAt: run.startedAt
    } as never, events as never);
  }
  return {
    runId,
    status: workflowRunTraceStatus(run.status),
    steps: [{
      id: `${runId}-status`,
      label: run.status === 'completed' ? 'Completed' : run.status === 'waiting_approval' ? 'Waiting for approval' : isRunActive(run.status) ? 'Workflow running' : titleFromInputName(run.status),
      detail: run.output,
      status: run.status === 'failed' || run.status === 'cancelled' ? 'error' : run.status === 'completed' ? 'success' : 'info',
      timestamp: Date.now()
    }],
    toolCalls: []
  };
}

export function createWorkflowDraft(): CreateWorkflowDraft {
  return {
    name: '',
    description: '',
    starterPrompt: '',
    agentIds: []
  };
}

export function getSoleAvailableWorkflowAgentId(agents: WorkflowOptionsCatalog['agents']): string {
  const availableAgents = agents.filter((agent) => !agent.disabled);
  return availableAgents.length === 1 ? availableAgents[0].value : '';
}

function uniqueInOrder(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    if (!value || seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

export function buildWorkflowCreateInput(draft: CreateWorkflowDraft): WorkflowCreateInput {
  const name = draft.name.trim();
  const agentIds = uniqueInOrder(draft.agentIds.map((agentId) => agentId.trim())).sort((left, right) => left.localeCompare(right));

  return {
    name,
    description: draft.description.trim(),
    tags: [],
    prompt: draft.starterPrompt.trim() || `Start ${name}.`,
    agentIds
  };
}

export function createWorkflowEditDraft(workflow: WorkflowDefinition): WorkflowEditDraft {
  return {
    name: workflow.name,
    description: workflow.description,
    starterPrompt: workflow.starterPrompt
  };
}

export function createAgentSelectionDraft(workflow: WorkflowDefinition): AgentSelectionDraft {
  return {
    agentIds: uniqueInOrder(workflow.agentIds).sort((left, right) => left.localeCompare(right))
  };
}

export function agentIdsFromDraft(draft: AgentSelectionDraft | CreateWorkflowDraft): string[] {
  return uniqueInOrder(draft.agentIds.map((agentId) => agentId.trim())).sort((left, right) => left.localeCompare(right));
}

export function createFallbackWorkflowOptions(_workflows: WorkflowDefinition[]): WorkflowOptionsCatalog {
  return {
    agents: [],
    sourceAvailability: {
      agents: { status: 'unavailable', message: 'Agent catalog has not loaded.' },
    }
  };
}

function normalizeWorkflowOption(value: unknown): WorkflowOption | null {
  if (typeof value === 'string' && value.trim()) {
    return { value: value.trim(), label: value.trim() };
  }
  if (!value || typeof value !== 'object') return null;
  const option = value as { value?: unknown; label?: unknown; description?: unknown; disabled?: unknown; disabledReason?: unknown; provenance?: unknown };
  if (typeof option.value !== 'string' || !option.value.trim()) return null;
  return {
    value: option.value,
    label: typeof option.label === 'string' && option.label.trim() ? option.label : option.value,
    description: typeof option.description === 'string' ? option.description : undefined,
    disabled: typeof option.disabled === 'boolean' ? option.disabled : undefined,
    disabledReason: typeof option.disabledReason === 'string' ? option.disabledReason : undefined,
    provenance: option.provenance && typeof option.provenance === 'object'
      ? option.provenance as WorkflowOption['provenance']
      : undefined
  };
}

function normalizeWorkflowOptionList(value: unknown, fallback: WorkflowOption[]): WorkflowOption[] {
  if (!Array.isArray(value)) return fallback;
  const options = value.map(normalizeWorkflowOption).filter((option): option is NonNullable<typeof option> => Boolean(option));
  return options;
}

export function normalizeWorkflowOptionsCatalog(
  catalog: unknown,
  fallback: WorkflowOptionsCatalog
): WorkflowOptionsCatalog {
  const value = catalog && typeof catalog === 'object' ? catalog as Record<string, unknown> : {};
  return {
    agents: normalizeWorkflowOptionList(value.agents, fallback.agents),
    sourceAvailability: value.sourceAvailability && typeof value.sourceAvailability === 'object'
      ? value.sourceAvailability as WorkflowOptionsCatalog['sourceAvailability']
      : fallback.sourceAvailability
  };
}

function workflowOwnerLabel(
  workflow: WorkflowApiDefinition,
  fallback?: WorkflowDefinition,
  ownerLabelsByUserId?: Map<string, string>
): string {
  const createdByUser = workflow.createdByUser;
  if (createdByUser) {
    return createdByUser.displayName || createdByUser.email || createdByUser.userId || createdByUser.id || fallback?.owner || 'Unknown user';
  }
  if (typeof workflow.createdBy === 'string' && workflow.createdBy.trim()) {
    const ownerLabel = ownerLabelsByUserId?.get(workflow.createdBy);
    if (ownerLabel) return ownerLabel;
    return workflow.createdBy === 'system' ? 'AcornOps' : workflow.createdBy;
  }
  return fallback?.owner || 'Unknown user';
}

function titleCaseAgentId(agentId: string): string {
  return formatIdentifierLabel(agentId.replace(/^agent-/, ''), 'title');
}

export function mapApiWorkflowToDefinition(
  workflow: WorkflowApiDefinition,
  fallback: WorkflowDefinition | undefined,
  workspaceId: string,
  options?: WorkflowOptionsCatalog,
  ownerLabelsByUserId?: Map<string, string>,
  agents: AgentDefinition[] = []
): WorkflowDefinition {
  const agentIds = uniqueInOrder(Array.isArray(workflow.agentIds) ? workflow.agentIds : [])
    .sort((left, right) => left.localeCompare(right));
  const assignedAgents = agentIds.map((agentId) => agents.find((agent) => agent.id === agentId))
    .filter((agent): agent is AgentDefinition => Boolean(agent));
  const semanticCapabilityIds = uniqueValues(assignedAgents.flatMap((agent) => agent.semanticCapabilityIds));
  const capabilityRestrictionMode = 'inherit' as const;
  const executionMode = workflow.executionMode || (agentIds.length > 1 ? 'coordinated' : 'direct');
  const agentOptionLabels = new Map((options?.agents || []).map((agent) => [agent.value, agent.label]));
  const fallbackAssignments = fallback?.agents || [];
  const apiAssignments = agentIds.map((agentId) => {
    const fallbackAgent = fallbackAssignments.find((agent) => agent.agentId === agentId);
    const assignedAgent = assignedAgents.find((agent) => agent.id === agentId);
    return {
      agentId,
      name: fallbackAgent?.name || agentOptionLabels.get(agentId) || titleCaseAgentId(agentId),
      avatarEmoji: assignedAgent?.avatarEmoji || fallbackAgent?.avatarEmoji,
      role: executionMode === 'direct' ? 'Direct' : 'AcornOps-coordinated',
      required: true
    };
  });
  return {
    id: workflow.id,
    workspaceId,
    name: workflow.name,
    description: workflow.description || fallback?.description || 'Workspace-scoped workflow served by control-plane.',
    status: workflow.status || 'active',
    createdBy: workflow.createdBy,
    agentIds,
    executionMode,
    semanticCapabilityIds,
    capabilityRestrictionMode,
    readiness: workflow.readiness,
    owner: workflowOwnerLabel(workflow, fallback, ownerLabelsByUserId),
    tags: Array.isArray(workflow.tags) ? workflow.tags : fallback?.tags || [],
    lastRun: fallback?.lastRun || 'No runs yet',
    agents: apiAssignments.length > 0 ? apiAssignments : fallback?.agents || [],
    policy: {
      mode: assignedAgents.some((agent) => agent.permissionMode !== 'read_only') ? 'read_write' : 'read_only',
      approvals: []
    },
    starterPrompt: workflow.prompt || fallback?.starterPrompt || `Start ${workflow.name}.`,
    runs: fallback?.runs || []
  };
}

export function mapWorkflowRunSummary(run: WorkflowRunSummary): WorkflowDefinition['runs'][number] {
  const status = run.status === 'completed'
    ? 'completed'
    : run.status === 'failed'
      ? 'failed'
      : run.status === 'cancelled'
        ? 'cancelled'
        : run.status === 'running'
          ? 'running'
          : run.status === 'dispatching'
            ? 'dispatching'
            : run.status === 'queued'
              ? 'queued'
              : run.status === 'cancelling'
                ? 'cancelling'
                : run.status === 'needs_review'
                  ? 'needs_review'
                : 'waiting_approval';
  const startedAt = run.startedAt || run.requestedAt;
  const terminalWithoutDuration = ['completed', 'failed', 'cancelled', 'needs_review'].includes(status);
  const duration = run.endedAt && startedAt
    ? formatElapsedDuration(startedAt, run.endedAt)
    : terminalWithoutDuration
      ? 'Duration unavailable'
      : startedAt
        ? formatElapsedDuration(startedAt, Date.now())
        : 'Not started';
  return {
    id: run.id,
    executionId: run.executionId,
    runId: run.id,
    status,
    actor: run.createdBy || 'Operator',
    duration,
    approvals: 0,
    output: run.assistantMessage?.content
      || (status === 'waiting_approval'
        ? 'Workflow run is waiting for approval.'
        : ['completed', 'failed', 'cancelled', 'needs_review'].includes(status)
          ? 'No assistant output was recorded.'
          : 'Workflow run is in progress.'),
    startedAt: startedAt || 'Unknown'
  };
}

function workflowRunKeys(run: WorkflowDefinition['runs'][number]): string[] {
  return [run.id, run.runId].filter((value): value is string => Boolean(value));
}

export function mergeWorkflowRunsWithLocalDispatches(
  serverRuns: WorkflowDefinition['runs'],
  localDispatches: WorkflowDefinition['runs']
): WorkflowDefinition['runs'] {
  const serverRunKeys = new Set(serverRuns.flatMap(workflowRunKeys));
  const pendingLocalRuns = localDispatches.filter((run) => (
    workflowRunKeys(run).every((key) => !serverRunKeys.has(key))
  ));
  return [...pendingLocalRuns, ...serverRuns];
}
