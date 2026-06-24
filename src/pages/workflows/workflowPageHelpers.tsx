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
  WorkflowOptionsCatalog,
  WorkflowRunEvent,
  WorkflowRunSummary
} from '@/services/control-plane/workflowApi';

export const tabs: WorkflowTab[] = ['chat', 'runs', 'mcp', 'skills', 'settings'];

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
  enabledMcpServers: string;
  enabledSkills: string;
  allowedTools: string;
};

export type WorkflowEditDraft = {
  name: string;
  description: string;
  starterPrompt: string;
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
    enabledMcpServers: '',
    enabledSkills: '',
    allowedTools: ''
  };
}

export function createWorkflowEditDraft(workflow: WorkflowDefinition): WorkflowEditDraft {
  return {
    name: workflow.name,
    description: workflow.description,
    starterPrompt: workflow.starterPrompt
  };
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

export function mapApiWorkflowToDefinition(
  workflow: WorkflowApiDefinition,
  fallback: WorkflowDefinition | undefined,
  workspaceId: string
): WorkflowDefinition {
  const requiredInputs = uniqueValues(workflow.steps.flatMap((step) => step.requiredInputs));
  const allowedTools = uniqueValues(workflow.steps.flatMap((step) => step.allowedTools));
  const enabledMcpServers = Array.isArray(workflow.enabledMcpServers)
    ? uniqueValues(workflow.enabledMcpServers)
    : uniqueValues(workflow.steps.flatMap((step) => step.allowedMcpServers));
  const enabledSkills = Array.isArray(workflow.enabledSkills)
    ? uniqueValues(workflow.enabledSkills)
    : uniqueValues(workflow.steps.flatMap((step) => step.enabledSkills));
  const contextGrants = uniqueValues(workflow.steps.flatMap((step) => step.contextGrants));

  return {
    id: workflow.id,
    workspaceId,
    name: workflow.name,
    description: workflow.description || fallback?.description || 'Workspace-scoped workflow served by control-plane.',
    status: workflow.status || 'active',
    source: workflow.source || fallback?.source,
    category: typeof workflow.category === 'string' ? workflow.category : fallback?.category || 'cluster-triage',
    tags: Array.isArray(workflow.tags) ? workflow.tags : fallback?.tags || [],
    lastRun: fallback?.lastRun || 'No runs yet',
    primaryAction: fallback?.primaryAction || 'Start workflow',
    requiredPermissions: workflow.requiredPermissions,
    enabledMcpServers,
    allowedTools,
    enabledSkills,
    contextGrants,
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
    steps: workflow.steps.map((step) => ({
      id: step.id,
      title: step.title,
      prompt: fallback?.steps.find((fallbackStep) => fallbackStep.id === step.id)?.prompt || step.title,
      requiredInputs: step.requiredInputs,
      enabledSkills: step.enabledSkills,
      allowedTools: step.allowedTools,
      allowedMcpServers: step.allowedMcpServers,
      contextGrants: step.contextGrants,
      approvalRequired: step.approvalRequired,
      outputArtifacts: step.outputArtifacts
    })),
    policy: {
      mode: workflow.policy.mode,
      maxRuntime: `${Math.round(workflow.policy.maxRuntimeSeconds / 60)} min`,
      retention: `${workflow.policy.retentionDays} days`,
      approvals: workflow.policy.approvalRequirements
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
    duration: run.endedAt && run.startedAt ? 'Completed' : 'In progress',
    approvals: 0,
    output: run.assistantMessage?.content || (status === 'completed' ? 'Completed without assistant output.' : 'Workflow run is in progress.'),
    startedAt: run.requestedAt || run.startedAt || 'Unknown'
  };
}
