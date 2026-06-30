import React from 'react';
import { motion } from 'framer-motion';
import { buildTraceFromRunEvents } from '@/features/kubernetes-cluster-detail/hooks/chatRunTrace';
import type { LiveRunTrace } from '@/features/kubernetes-cluster-detail/types';
import {
  createDefaultWorkflowDefinitions,
  type WorkflowDefinition,
  type WorkflowStatus,
  type WorkflowTab
} from '@/pages/workflows/workflowModel';
import type {
  WorkflowApiDefinition,
  WorkflowCreateInput,
  WorkflowOptionsCatalog,
  WorkflowRunEvent,
  WorkflowRunSummary
} from '@/services/control-plane/workflowApi';
import { formatElapsedDuration } from '@/utils/dateTime';

export const tabs: WorkflowTab[] = ['overview', 'agents', 'capabilities', 'runs', 'settings'];

export type ScopeDraft = {
  category: string;
  enabledMcpServers: string;
  enabledSkills: string;
  policyMode: WorkflowDefinition['policy']['mode'];
  approvalRequirements: string;
  steps: Record<string, {
    allowedTools: string;
    contextGrants: string;
    approvalRequired: boolean;
  }>;
};

export type CreateWorkflowDraft = {
  name: string;
  description: string;
  starterPrompt: string;
  agentIds: string[];
  enabledMcpServers: string;
  enabledSkills: string;
  allowedTools: string;
};

export type WorkflowEditDraft = {
  name: string;
  description: string;
  starterPrompt: string;
};

export type AgentSelectionDraft = {
  agentIds: string[];
};

export type McpServerDraft = {
  name: string;
  type: string;
  baseUrl: string;
  command: string;
  tools: string;
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
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative h-7 w-12 shrink-0 rounded-full border transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
      checked ? 'border-status-success bg-status-success' : 'border-ui-border bg-ui-bg'
    }`}
  >
    <motion.span
      className="absolute left-1 top-1 h-5 w-5 rounded-full bg-ui-surface shadow-sm"
      animate={{ x: checked ? 18 : 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    />
  </button>
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
    category: workflow.category,
    enabledMcpServers: joinLines(workflow.enabledMcpServers),
    enabledSkills: joinLines(workflow.enabledSkills),
    policyMode: workflow.policy.mode,
    approvalRequirements: joinLines(workflow.policy.approvals),
    steps: Object.fromEntries(workflow.steps.map((step) => [
      step.id,
      {
        allowedTools: joinLines(step.allowedTools),
        contextGrants: joinLines(step.contextGrants),
        approvalRequired: step.approvalRequired
      }
    ]))
  };
}

export function createWorkflowDraft(): CreateWorkflowDraft {
  return {
    name: '',
    description: '',
    starterPrompt: '',
    agentIds: [],
    enabledMcpServers: '',
    enabledSkills: '',
    allowedTools: ''
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
  const enabledMcpServers = splitLines(draft.enabledMcpServers);
  const enabledSkills = splitLines(draft.enabledSkills);
  const allowedTools = splitLines(draft.allowedTools);
  const agentIds = uniqueInOrder(draft.agentIds.map((agentId) => agentId.trim()));

  return {
    name,
    description: draft.description.trim(),
    tags: [],
    starterPrompt: draft.starterPrompt.trim() || `Start ${name}.`,
    inputs: [],
    enabledMcpServers,
    enabledSkills,
    requiredPermissions: ['read_workspace_data', 'create_read_only_runs'],
    policy: {
      mode: 'read_only',
      maxRuntimeSeconds: 900,
      retentionDays: 90,
      approvalRequirements: []
    },
    steps: [{
      id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'workflow'}-step`,
      title: 'Generate run plan',
      requiredInputs: [],
      enabledSkills,
      agentIds,
      allowedMcpServers: enabledMcpServers,
      allowedTools,
      contextGrants: ['workspace_metadata'],
      approvalRequired: false
    }]
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
    agentIds: workflow.agents.map((agent) => agent.agentId).filter(Boolean)
  };
}

export function agentIdsFromDraft(draft: AgentSelectionDraft | CreateWorkflowDraft): string[] {
  return uniqueInOrder(draft.agentIds.map((agentId) => agentId.trim()));
}

export function createMcpServerDraft(): McpServerDraft {
  return {
    name: '',
    type: 'http',
    baseUrl: '',
    command: '',
    tools: ''
  };
}

export function createFallbackWorkflowOptions(workflows: WorkflowDefinition[]): WorkflowOptionsCatalog {
  const workflowAgentOptions = workflows.flatMap((workflow) => workflow.agents);
  const workflowAgentLabels = new Map(workflowAgentOptions.map((agent) => [agent.agentId, agent.name]));

  return {
    clusters: [
      { value: 'production-us-east', label: 'production-us-east' },
      { value: 'staging-us-west', label: 'staging-us-west' }
    ],
    repositories: [
      { value: 'acornops/control-plane', label: 'acornops/control-plane' },
      { value: 'acornops/management-console', label: 'acornops/management-console' }
    ],
    mcpServers: uniqueValues(workflows.flatMap((workflow) => workflow.enabledMcpServers)).map((value) => ({ value, label: value })),
    mcpTools: uniqueValues(workflows.flatMap((workflow) => workflow.allowedTools)).map((value) => ({ value, label: value })),
    skills: uniqueValues(workflows.flatMap((workflow) => workflow.enabledSkills)).map((value) => ({ value, label: value })),
    agents: uniqueValues(workflowAgentOptions.map((agent) => agent.agentId)).map((value) => ({
      value,
      label: workflowAgentLabels.get(value) || value
    })),
    chatSessions: [
      { value: 'incident-chat-1042', label: 'Incident chat 1042' },
      { value: 'incident-chat-1043', label: 'Incident chat 1043' }
    ],
    outputFormats: [
      { value: 'pdf', label: 'PDF' },
      { value: 'markdown', label: 'Markdown' }
    ],
    approvalPolicies: [
      { value: 'read_only', label: 'Read only' },
      { value: 'read_write', label: 'Read/write with approvals' }
    ],
    runtimeLimits: [],
    retentionPolicies: []
  };
}

type WorkflowScopeAgentSource = {
  id: string;
  mcpServers: string[];
  tools: string[];
  skills: string[];
};

type WorkflowScopeOptions = Pick<WorkflowOptionsCatalog, 'mcpServers' | 'mcpTools' | 'skills'>;

function optionsForAgentValues(
  values: string[],
  catalogOptions: WorkflowOptionsCatalog['mcpServers']
): WorkflowOptionsCatalog['mcpServers'] {
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
    mcpServers: optionsForAgentValues(selectedAgents.flatMap((agent) => agent.mcpServers), catalog.mcpServers),
    mcpTools: optionsForAgentValues(selectedAgents.flatMap((agent) => agent.tools), catalog.mcpTools),
    skills: optionsForAgentValues(selectedAgents.flatMap((agent) => agent.skills), catalog.skills)
  };
}

function normalizeWorkflowOption(value: unknown): { value: string; label: string; description?: string; disabled?: boolean; disabledReason?: string } | null {
  if (typeof value === 'string' && value.trim()) {
    return { value: value.trim(), label: value.trim() };
  }
  if (!value || typeof value !== 'object') return null;
  const option = value as { value?: unknown; label?: unknown; description?: unknown; disabled?: unknown; disabledReason?: unknown };
  if (typeof option.value !== 'string' || !option.value.trim()) return null;
  return {
    value: option.value,
    label: typeof option.label === 'string' && option.label.trim() ? option.label : option.value,
    description: typeof option.description === 'string' ? option.description : undefined,
    disabled: typeof option.disabled === 'boolean' ? option.disabled : undefined,
    disabledReason: typeof option.disabledReason === 'string' ? option.disabledReason : undefined
  };
}

function normalizeWorkflowOptionList(value: unknown, fallback: WorkflowOptionsCatalog[keyof WorkflowOptionsCatalog]): typeof fallback {
  if (!Array.isArray(value)) return fallback;
  const options = value.map(normalizeWorkflowOption).filter((option): option is NonNullable<typeof option> => Boolean(option));
  return options.length > 0 ? options : fallback;
}

export function normalizeWorkflowOptionsCatalog(
  catalog: unknown,
  fallback: WorkflowOptionsCatalog
): WorkflowOptionsCatalog {
  const value = catalog && typeof catalog === 'object' ? catalog as Record<string, unknown> : {};
  return {
    clusters: normalizeWorkflowOptionList(value.clusters, fallback.clusters),
    repositories: normalizeWorkflowOptionList(value.repositories, fallback.repositories),
    mcpServers: normalizeWorkflowOptionList(value.mcpServers, fallback.mcpServers),
    mcpTools: normalizeWorkflowOptionList(value.mcpTools, fallback.mcpTools),
    skills: normalizeWorkflowOptionList(value.skills, fallback.skills),
    agents: normalizeWorkflowOptionList(value.agents, fallback.agents),
    chatSessions: normalizeWorkflowOptionList(value.chatSessions, fallback.chatSessions),
    outputFormats: normalizeWorkflowOptionList(value.outputFormats, fallback.outputFormats),
    approvalPolicies: normalizeWorkflowOptionList(value.approvalPolicies, fallback.approvalPolicies),
    runtimeLimits: normalizeWorkflowOptionList(value.runtimeLimits, fallback.runtimeLimits),
    retentionPolicies: normalizeWorkflowOptionList(value.retentionPolicies, fallback.retentionPolicies)
  };
}

const defaultOrchestrator = {
  agentId: 'agent-workflow-orchestrator',
  name: 'System Orchestrator',
  role: 'Coordinator',
  required: true
};

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
  return fallback?.owner || (workflow.source === 'system' || fallback?.source === 'system' ? 'AcornOps' : 'Unknown user');
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
  const workflowSteps = Array.isArray(workflow.steps) && workflow.steps.length > 0
    ? workflow.steps
    : fallback?.steps.map((step) => ({
        id: step.id,
        title: step.title,
        requiredInputs: step.requiredInputs,
        agentIds: step.agentIds || [],
        enabledSkills: step.enabledSkills,
        allowedMcpServers: step.allowedMcpServers,
        allowedTools: step.allowedTools,
        contextGrants: step.contextGrants,
        approvalRequired: step.approvalRequired,
        outputArtifacts: step.outputArtifacts
      })) || [];
  const workflowPolicy = workflow.policy || {
    mode: fallback?.policy.mode || 'read_only',
    maxRuntimeSeconds: 0,
    retentionDays: 0,
    approvalRequirements: fallback?.policy.approvals || []
  };
  const workflowEnabledTools = Array.isArray(workflow.enabledTools)
    ? workflow.enabledTools.filter((tool): tool is string => typeof tool === 'string')
    : undefined;
  const requiredInputs = uniqueValues(workflowSteps.flatMap((step) => step.requiredInputs || []));
  const allowedTools = workflowEnabledTools && workflowEnabledTools.length > 0
    ? uniqueValues(workflowEnabledTools)
    : uniqueValues(workflowSteps.flatMap((step) => step.allowedTools || []));
  const enabledMcpServers = Array.isArray(workflow.enabledMcpServers)
    ? uniqueValues(workflow.enabledMcpServers)
    : uniqueValues(workflowSteps.flatMap((step) => step.allowedMcpServers || []));
  const enabledSkills = Array.isArray(workflow.enabledSkills)
    ? uniqueValues(workflow.enabledSkills)
    : uniqueValues(workflowSteps.flatMap((step) => step.enabledSkills || []));
  const contextGrants = uniqueValues(workflowSteps.flatMap((step) => step.contextGrants || []));
  const agentIds = uniqueInOrder(workflowSteps.flatMap((step) => step.agentIds || []));
  const fallbackAssignments = fallback?.agents || [];
  const agentOptionLabels = new Map((options?.agents || []).map((agent) => [agent.value, agent.label]));
  const apiAssignments = agentIds.map((agentId) => {
    const fallbackAgent = fallbackAssignments.find((agent) => agent.agentId === agentId);
    return fallbackAgent || {
      agentId,
      name: agentOptionLabels.get(agentId) || titleCaseAgentId(agentId),
      role: 'Agent',
      required: false
    };
  });

  return {
    id: workflow.id,
    workspaceId,
    name: workflow.name,
    description: workflow.description || fallback?.description || 'Workspace-scoped workflow served by control-plane.',
    status: workflow.status || 'active',
    source: workflow.source || fallback?.source,
    owner: workflowOwnerLabel(workflow, fallback, ownerLabelsByUserId),
    category: typeof workflow.category === 'string' ? workflow.category : fallback?.category || 'cluster-triage',
    tags: Array.isArray(workflow.tags) ? workflow.tags : fallback?.tags || [],
    lastRun: fallback?.lastRun || 'No runs yet',
    primaryAction: fallback?.primaryAction || 'Start workflow',
    orchestrator: fallback?.orchestrator || {
      ...defaultOrchestrator,
      agentId: workflow.orchestratorAgentId || defaultOrchestrator.agentId
    },
    agents: apiAssignments.length > 0 ? apiAssignments : fallback?.agents || [],
    requiredPermissions: Array.isArray(workflow.requiredPermissions) ? workflow.requiredPermissions : fallback?.requiredPermissions || [],
    enabledMcpServers,
    allowedTools,
    enabledSkills,
    contextGrants,
    disabledCapabilities: fallback?.disabledCapabilities || [],
    inputs: Array.isArray(workflow.inputs) && workflow.inputs.length > 0
      ? workflow.inputs.map((input) => ({
          name: input.name,
          label: input.label,
          type: input.type === 'output_format' ? 'format' : (['text', 'select', 'chat_session_list', 'repository', 'format'].includes(input.type) ? input.type as WorkflowDefinition['inputs'][number]['type'] : 'select'),
          required: input.required
        }))
      : requiredInputs.map((name) => ({
          name,
          label: titleFromInputName(name),
          type: 'text',
          required: true
        })),
    steps: workflowSteps.map((step) => ({
      id: step.id,
      title: step.title,
      prompt: fallback?.steps.find((fallbackStep) => fallbackStep.id === step.id)?.prompt || step.title,
      requiredInputs: step.requiredInputs || [],
      agentIds: step.agentIds || [],
      enabledSkills: step.enabledSkills || [],
      allowedTools: step.allowedTools || [],
      allowedMcpServers: step.allowedMcpServers || [],
      contextGrants: step.contextGrants || [],
      approvalRequired: Boolean(step.approvalRequired),
      outputArtifacts: step.outputArtifacts
    })),
    policy: {
      mode: workflowPolicy.mode,
      maxRuntime: workflowPolicy.maxRuntimeSeconds > 0 ? `${Math.round(workflowPolicy.maxRuntimeSeconds / 60)} min` : fallback?.policy.maxRuntime || '',
      retention: workflowPolicy.retentionDays > 0 ? `${workflowPolicy.retentionDays} days` : fallback?.policy.retention || '',
      approvals: workflowPolicy.approvalRequirements || []
    },
    scope: { type: 'workspace' },
    starterPrompt: workflow.starterPrompt || fallback?.starterPrompt || `Start ${workflow.name}.`,
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
    id: run.workflowRunId || run.id,
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
