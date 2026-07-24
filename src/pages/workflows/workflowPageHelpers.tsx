import React from 'react';
import { Switch } from '@/components/common/FormControls';
import { motion } from 'framer-motion';
import { buildTraceFromRunEvents } from '@/features/targets/chat/hooks/chatRunTrace';
import type { LiveRunTrace } from '@/features/targets/chat/types';
import {
  type WorkflowDefinition,
  type WorkflowStatus,
  type WorkflowTab
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

export const tabs: WorkflowTab[] = ['overview', 'agents', 'capabilities', 'runs', 'settings'];

export type ScopeDraft = {
  restrictionMode: 'inherit' | 'restrict';
  semanticCapabilityIds: string;
};

export type CreateWorkflowDraft = {
  name: string;
  description: string;
  starterPrompt: string;
  agentIds: string[];
  semanticCapabilityIds: string;
  restrictionMode: 'inherit' | 'restrict';
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
  if (status === 'waiting_approval' || status === 'running' || status === 'dispatching' || status === 'queued' || status === 'cancelling') return 'warning';
  return 'neutral';
}

export const ScopeSwitch: React.FC<{
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
  return name
    .replace(/([A-Z])/g, ' $1')
    .replaceAll('_', ' ')
    .replace(/^\w/, (value) => value.toUpperCase());
}

export function uniqueValues(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

export function joinLines(values: string[]): string {
  return values.join('\n');
}

export function splitLines(value: string): string[] {
  return uniqueValues(value.split(/[\n,]+/).map((entry) => entry.trim()).filter(Boolean));
}

export function setLineValue(current: string, value: string, enabled: boolean): string {
  const values = splitLines(current);
  const nextValues = enabled
    ? uniqueValues([...values, value])
    : values.filter((entry) => entry !== value);
  return joinLines(nextValues);
}

export function getToolServerHint(toolName: string): string {
  const prefix = toolName.split('.')[0] || toolName;
  const hints: Record<string, string> = {
    audit: 'audit-log',
    chat: 'workspace-chat',
    credentials: 'identity-provider',
    github: 'github',
    gitlab: 'gitlab',
    mcp: 'workspace-registry',
    members: 'identity-provider',
    registry: 'workspace-registry',
    repo: 'repository-files',
    roles: 'workspace-registry',
    tasks: 'task-tracker',
    workspace: 'workspace-status'
  };
  return hints[prefix] || prefix;
}

export function getScopeTokenLabel(value: string): string {
  return value.replaceAll('_', ' ').replaceAll('-', ' ');
}

export function summarizeValues(values: string[], empty = 'None configured'): string {
  if (values.length === 0) return empty;
  if (values.length <= 2) return values.join(', ');
  return `${values.slice(0, 2).join(', ')} +${values.length - 2}`;
}

export function isRunActive(status: WorkflowDefinition['runs'][number]['status']): boolean {
  return status === 'queued' || status === 'dispatching' || status === 'running' || status === 'waiting_approval' || status === 'cancelling';
}

export function isTerminalRunStatus(status: WorkflowDefinition['runs'][number]['status']): boolean {
  return status === 'completed' || status === 'failed' || status === 'cancelled';
}

export type RunDiscussionState = 'active' | 'waiting_session' | 'terminal';

export function getRunDiscussionState(run: WorkflowDefinition['runs'][number], workflowSessionId: string): RunDiscussionState {
  if (isRunActive(run.status)) {
    return workflowSessionId ? 'active' : 'waiting_session';
  }
  return 'terminal';
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
      label: run.status === 'completed' ? 'Completed' : isRunActive(run.status) ? 'Workflow running' : titleFromInputName(run.status),
      detail: run.output,
      status: run.status === 'failed' || run.status === 'cancelled' ? 'error' : run.status === 'completed' ? 'success' : 'info',
      timestamp: Date.now()
    }],
    toolCalls: []
  };
}

export function createScopeDraft(workflow: WorkflowDefinition): ScopeDraft {
  return {
    restrictionMode: workflow.capabilityRestrictionMode === 'inherit' ? 'inherit' : 'restrict',
    semanticCapabilityIds: joinLines(workflow.semanticCapabilityIds)
  };
}

export function createWorkflowDraft(): CreateWorkflowDraft {
  return {
    name: '',
    description: '',
    starterPrompt: '',
    agentIds: [],
    semanticCapabilityIds: '',
    restrictionMode: 'inherit'
  };
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
  const semanticCapabilityIds = draft.restrictionMode === 'restrict' ? splitLines(draft.semanticCapabilityIds) : [];
  const agentIds = uniqueInOrder(draft.agentIds.map((agentId) => agentId.trim())).sort((left, right) => left.localeCompare(right));

  return {
    name,
    description: draft.description.trim(),
    tags: [],
    prompt: draft.starterPrompt.trim() || `Start ${name}.`,
    agentIds,
    resourceRequirements: [],
    inputs: [],
    capabilityPolicy: {
      restrictionMode: draft.restrictionMode,
      semanticCapabilityIds
    }
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
    mcpServers: [],
    mcpTools: [],
    skills: [],
    agents: [],
    outputFormats: [],
    approvalPolicies: [],
    runtimeLimits: [],
    retentionPolicies: [],
    sourceAvailability: {
      mcpServers: { status: 'unavailable', message: 'MCP catalog has not loaded.' },
      mcpTools: { status: 'unavailable', message: 'MCP catalog has not loaded.' },
      skills: { status: 'unavailable', message: 'Skill catalog has not loaded.' },
      agents: { status: 'unavailable', message: 'Agent catalog has not loaded.' },
    }
  };
}

type WorkflowScopeAgentSource = {
  id: string;
  semanticCapabilityIds: string[];
};

type WorkflowScopeOptions = {
  semanticCapabilities: WorkflowOption[];
};

function optionsForCapabilityIds(
  values: string[],
  catalogOptions: WorkflowOption[]
): WorkflowOption[] {
  const catalogByValue = new Map(catalogOptions.map((option) => [option.value, option]));
  return uniqueValues(values).map((value) => catalogByValue.get(value) || { value, label: value });
}

export function getWorkflowScopeOptionsForAgents(
  agentIds: string[],
  agents: WorkflowScopeAgentSource[],
  catalog: WorkflowOptionsCatalog
): WorkflowScopeOptions {
  const agentsById = new Map(agents.map((agent) => [agent.id, agent]));
  const selectedAgents = uniqueInOrder(agentIds).map((agentId) => agentsById.get(agentId)).filter((agent): agent is WorkflowScopeAgentSource => Boolean(agent));

  return {
    semanticCapabilities: optionsForCapabilityIds(
      selectedAgents.flatMap((agent) => agent.semanticCapabilityIds),
      catalog.mcpTools
    )
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
    mcpServers: normalizeWorkflowOptionList(value.mcpServers, fallback.mcpServers),
    mcpTools: normalizeWorkflowOptionList(value.mcpTools, fallback.mcpTools),
    skills: normalizeWorkflowOptionList(value.skills, fallback.skills),
    agents: normalizeWorkflowOptionList(value.agents, fallback.agents),
    outputFormats: normalizeWorkflowOptionList(value.outputFormats, fallback.outputFormats),
    approvalPolicies: normalizeWorkflowOptionList(value.approvalPolicies, fallback.approvalPolicies),
    runtimeLimits: normalizeWorkflowOptionList(value.runtimeLimits, fallback.runtimeLimits),
    retentionPolicies: normalizeWorkflowOptionList(value.retentionPolicies, fallback.retentionPolicies),
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
  if (workflow.origin?.type === 'template' || workflow.source === 'system' || fallback?.source === 'system') {
    return 'AcornOps';
  }
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
  return agentId
    .replace(/^agent-/, '')
    .replaceAll('-', ' ')
    .replace(/\b\w/g, (value) => value.toUpperCase());
}

export function mapApiWorkflowToDefinition(
  workflow: WorkflowApiDefinition,
  fallback: WorkflowDefinition | undefined,
  workspaceId: string,
  options?: WorkflowOptionsCatalog,
  ownerLabelsByUserId?: Map<string, string>
): WorkflowDefinition {
  const semanticCapabilityIds = uniqueValues(workflow.capabilityPolicy.semanticCapabilityIds);
  const capabilityRestrictionMode = workflow.capabilityPolicy.restrictionMode === 'inherit' ? 'inherit' : 'restrict';
  const agentIds = uniqueInOrder(Array.isArray(workflow.agentIds) ? workflow.agentIds : [])
    .sort((left, right) => left.localeCompare(right));
  const executionMode = workflow.executionMode || (agentIds.length > 1 ? 'coordinated' : 'direct');
  const agentOptionLabels = new Map((options?.agents || []).map((agent) => [agent.value, agent.label]));
  const workflowPolicy = workflow.capabilityPolicy;
  const contextGrants = uniqueValues(workflowPolicy.contextGrants);
  const fallbackAssignments = fallback?.agents || [];
  const apiAssignments = agentIds.map((agentId) => {
    const fallbackAgent = fallbackAssignments.find((agent) => agent.agentId === agentId);
    return {
      agentId,
      name: fallbackAgent?.name || agentOptionLabels.get(agentId) || titleCaseAgentId(agentId),
      role: executionMode === 'direct' ? 'Direct' : 'AcornOps-coordinated',
      required: true
    };
  });
  const source = workflow.source || (workflow.origin?.type === 'template' ? 'system' : workflow.origin ? 'user' : fallback?.source);

  return {
    id: workflow.id,
    workspaceId,
    version: workflow.version,
    name: workflow.name,
    description: workflow.description || fallback?.description || 'Workspace-scoped workflow served by control-plane.',
    status: workflow.status || 'active',
    source,
    origin: workflow.origin,
    createdBy: workflow.createdBy,
    agentIds,
    executionMode,
    semanticCapabilityIds,
    capabilityRestrictionMode,
    resourceRequirements: workflow.resourceRequirements || [],
    readiness: workflow.readiness,
    owner: workflowOwnerLabel(workflow, fallback, ownerLabelsByUserId),
    tags: Array.isArray(workflow.tags) ? workflow.tags : fallback?.tags || [],
    lastRun: fallback?.lastRun || 'No runs yet',
    agents: apiAssignments.length > 0 ? apiAssignments : fallback?.agents || [],
    requiredPermissions: Array.isArray(workflow.requiredPermissions) ? workflow.requiredPermissions : fallback?.requiredPermissions || [],
    contextGrants,
    inputs: Array.isArray(workflow.inputs) && workflow.inputs.length > 0
      ? workflow.inputs.map((input) => ({
          name: input.name,
          label: input.label,
          type: input.type === 'output_format' ? 'format' : (['text', 'select', 'format'].includes(input.type) ? input.type as WorkflowDefinition['inputs'][number]['type'] : 'select'),
          required: input.required,
          optionSource: input.optionSource
        }))
      : [],
    policy: {
      mode: workflowPolicy.mode,
      approvals: uniqueValues(workflowPolicy.approvalRequirements)
    },
    starterPrompt: workflow.prompt || workflow.starterPrompt || fallback?.starterPrompt || `Start ${workflow.name}.`,
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
                : 'waiting_approval';
  return {
    id: run.id,
    runId: run.id,
    status,
    actor: run.createdBy || 'Operator',
    duration: run.endedAt && run.startedAt ? formatElapsedDuration(run.startedAt, run.endedAt) : 'In progress',
    approvals: 0,
    output: run.assistantMessage?.content || (status === 'completed' ? 'Completed without assistant output.' : 'Workflow run is in progress.'),
    startedAt: run.requestedAt || run.startedAt || 'Unknown'
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
