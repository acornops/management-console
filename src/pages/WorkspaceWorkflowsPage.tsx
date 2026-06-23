import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, SlidersHorizontal, Square, X } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { PageSearchInput } from '@/components/common/PageSearchInput';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Tooltip } from '@/components/common/Tooltip';
import { ICONS } from '@/constants';
import { headerMotion } from '@/lib/motion';
import { modalOverlayMotion, modalPanelMotion } from '@/lib/motion';
import type { Workspace } from '@/types';
import { TraceFooter } from '@/features/kubernetes-cluster-detail/components/detail/TraceFooter';
import { buildTraceFromRunEvents } from '@/features/kubernetes-cluster-detail/hooks/chatRunTrace';
import type { LiveRunTrace } from '@/features/kubernetes-cluster-detail/types';
import {
  appendWorkflowSearchTag,
  createDefaultWorkflowDefinitions,
  filterWorkflowDefinitions,
  getOptimisticWorkflowRunStatus,
  getWorkflowTabLabel,
  getWorkflowToolScopeSummary,
  type WorkflowDefinition,
  type WorkflowStatus,
  type WorkflowTab
} from '@/pages/workflows/workflowModel';
import {
  cancelWorkflowRun,
  createWorkflow,
  createWorkflowMcpServer,
  createWorkflowSession,
  decideWorkflowRunApproval,
  deleteWorkflow,
  listWorkflowMcpServers,
  listWorkflowOptions,
  listWorkflowRunEvents,
  listWorkflowRunApprovals,
  listWorkflowSessions,
  listWorkspaceWorkflows,
  postWorkflowSessionMessage,
  updateWorkflow,
  updateWorkflowScope,
  type WorkflowApiDefinition,
  type WorkflowMcpServer,
  type WorkflowOptionsCatalog,
  type WorkflowRunApproval,
  type WorkflowRunEvent,
  type WorkflowRunSummary
} from '@/services/control-plane/workflowApi';

interface WorkspaceWorkflowsPageProps {
  workspace: Workspace;
}

const tabs: WorkflowTab[] = ['chat', 'runs', 'mcp', 'skills', 'settings'];
type CreateWorkflowStep = 'details' | 'prompt' | 'access';

const createWorkflowSteps: Array<{ id: CreateWorkflowStep; label: string; description: string }> = [
  { id: 'details', label: 'Details', description: 'Name and describe the automation.' },
  { id: 'prompt', label: 'Prompt', description: 'Set the starting instruction.' },
  { id: 'access', label: 'Access', description: 'Choose MCP, skills, and tools.' }
];

type ScopeDraft = {
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

type CreateWorkflowDraft = {
  name: string;
  description: string;
  starterPrompt: string;
  enabledMcpServers: string;
  enabledSkills: string;
  allowedTools: string;
};

type WorkflowEditDraft = {
  name: string;
  description: string;
  starterPrompt: string;
};

type McpServerDraft = {
  name: string;
  type: string;
  baseUrl: string;
  command: string;
  tools: string;
};

type WorkflowMcpToolRow = {
  name: string;
  capability: 'read' | 'write';
  serverHint: string;
  selected: boolean;
};

function workflowStatusTone(status: WorkflowStatus): 'success' | 'warning' | 'neutral' {
  if (status === 'active') return 'success';
  if (status === 'draft') return 'warning';
  return 'neutral';
}

function runStatusTone(status: WorkflowDefinition['runs'][number]['status']): 'success' | 'warning' | 'neutral' {
  if (status === 'completed') return 'success';
  if (status === 'waiting_approval' || status === 'running' || status === 'dispatching' || status === 'queued' || status === 'cancelling') return 'warning';
  return 'neutral';
}

function approvalStatusTone(status: WorkflowRunApproval['status']): 'success' | 'warning' | 'neutral' {
  if (status === 'approved') return 'success';
  if (status === 'pending') return 'warning';
  return 'neutral';
}

const WorkflowMetaList: React.FC<{ label: string; values: string[] }> = ({ label, values }) => (
  <div>
    <dt className="type-micro-label">{label}</dt>
    <dd className="mt-2 flex flex-wrap gap-1.5">
      {values.length > 0 ? values.map((value) => (
        <span key={value} className="rounded-md border border-ui-border bg-ui-bg px-2 py-1 text-xs font-semibold text-ui-text-muted">
          {value.replaceAll('_', ' ')}
        </span>
      )) : (
        <span className="type-caption">None configured</span>
      )}
    </dd>
  </div>
);

const ScopeSwitch: React.FC<{
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

const WorkflowMcpToolsDialog: React.FC<{
  serverId: string;
  serverName: string;
  tools: WorkflowMcpToolRow[];
  canManageTools: boolean;
  onClose: () => void;
  onToggleTool: (toolName: string, enabled: boolean) => void;
}> = ({
  serverId,
  serverName,
  tools,
  canManageTools,
  onClose,
  onToggleTool
}) => {
  const readTools = tools.filter((tool) => tool.capability === 'read');
  const writeTools = tools.filter((tool) => tool.capability === 'write');
  const enabledCount = tools.filter((tool) => tool.selected).length;
  const renderToolSection = (title: string, subtitle: string, sectionTools: WorkflowMcpToolRow[]) => (
    <section className="overflow-hidden rounded-lg border border-ui-border bg-ui-surface">
      <div className="flex items-center justify-between gap-3 border-b border-ui-border bg-ui-bg px-4 py-3">
        <div className="min-w-0">
          <h3 className="type-row-title">{title}</h3>
          <p className="type-caption text-ui-text-muted">{subtitle}</p>
        </div>
        <span className="type-micro-label rounded-full bg-ui-surface px-2 py-1 text-ui-text-muted">{sectionTools.length}</span>
      </div>
      {sectionTools.length > 0 ? sectionTools.map((tool) => (
        <div key={tool.name} className={`grid min-w-0 grid-cols-1 gap-3 border-b border-ui-border px-4 py-3 last:border-b-0 lg:grid-cols-[minmax(18rem,1fr)_8rem_auto] lg:items-center ${tool.capability === 'write' ? 'bg-status-warning-soft/35' : 'bg-ui-surface'}`}>
          <div className="min-w-0">
            <h4 className="type-row-title truncate" title={tool.name}>{getScopeTokenLabel(tool.name)}</h4>
            <p className="type-code mt-1 truncate text-ui-text-muted" title={tool.name}>{tool.name}</p>
          </div>
          <div className="min-w-0">
            <span className={tool.selected ? 'type-label text-ui-text' : 'type-label text-ui-text-muted'}>
              {tool.selected ? 'Enabled' : 'Disabled'}
            </span>
            {tool.capability === 'write' && tool.selected && (
              <p className="type-caption mt-0.5 text-status-warning-text">Approval required</p>
            )}
          </div>
          <ScopeSwitch
            checked={tool.selected}
            disabled={!canManageTools}
            label={`${tool.selected ? 'Disable' : 'Enable'} ${tool.name}`}
            onChange={(enabled) => onToggleTool(tool.name, enabled)}
          />
        </div>
      )) : (
        <p className="type-caption px-4 py-4 text-ui-text-muted">No tools in this section.</p>
      )}
    </section>
  );

  return (
    <motion.div {...modalOverlayMotion} className="fixed inset-0 z-50 flex items-center justify-center bg-ui-text/45 p-4 dark:bg-ui-bg/75" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <motion.div {...modalPanelMotion} role="dialog" aria-modal="true" aria-labelledby="workflow-mcp-tools-title" className="relative flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-ui-border bg-ui-bg px-6 py-5">
          <div className="min-w-0">
            <div className="type-micro-label mb-2 flex items-center gap-2 text-ui-text-muted">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Configure tools
            </div>
            <h2 id="workflow-mcp-tools-title" className="type-section-title truncate" title={serverName}>{serverName}</h2>
            <p className="type-code mt-1 truncate text-ui-text-muted" title={serverId}>{serverId}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-ui-text-muted transition-colors hover:bg-ui-surface hover:text-accent-strong" aria-label="Close tool settings">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-6 custom-scrollbar">
          <div className="space-y-4">
            <section className="overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm">
              <div className="grid grid-cols-1 divide-y divide-ui-border md:grid-cols-[minmax(15rem,1.35fr)_repeat(4,minmax(7rem,1fr))] md:divide-x md:divide-y-0">
                <div className="px-5 py-3.5">
                  <h3 className="type-row-title">Tool access summary</h3>
                  <p className="type-caption mt-1 text-ui-text-muted">Tools enabled for this workflow from this MCP server.</p>
                </div>
                <div className="px-5 py-3.5">
                  <p className="type-caption text-ui-text-muted">Total tools</p>
                  <p className="mt-0.5 text-xl font-semibold tracking-tight text-ui-text">{tools.length}</p>
                </div>
                <div className="px-5 py-3.5">
                  <p className="type-caption text-ui-text-muted">Enabled</p>
                  <p className="mt-0.5 text-xl font-semibold tracking-tight text-ui-text">{enabledCount}</p>
                </div>
                <div className="px-5 py-3.5">
                  <p className="type-caption text-ui-text-muted">Read-only</p>
                  <p className="mt-0.5 text-xl font-semibold tracking-tight text-ui-text">{readTools.length}</p>
                </div>
                <div className="px-5 py-3.5">
                  <p className="type-caption text-ui-text-muted">Write-capable</p>
                  <p className="mt-0.5 text-xl font-semibold tracking-tight text-ui-text">{writeTools.length}</p>
                </div>
              </div>
            </section>
            {renderToolSection('Read-only tools', 'Tools that can inspect workspace state.', readTools)}
            {renderToolSection('Write-capable tools', 'Tools that can change external systems or workspace records.', writeTools)}
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-ui-border bg-ui-bg px-6 py-4">
          <Button onClick={onClose} variant="secondary" size="sm">Close</Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

function titleFromInputName(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replaceAll('_', ' ')
    .replace(/^\w/, (value) => value.toUpperCase());
}

function uniqueValues(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function joinLines(values: string[]): string {
  return values.join('\n');
}

function splitLines(value: string): string[] {
  return uniqueValues(value.split(/[\n,]+/).map((entry) => entry.trim()).filter(Boolean));
}

function setLineValue(current: string, value: string, enabled: boolean): string {
  const values = splitLines(current);
  const nextValues = enabled
    ? uniqueValues([...values, value])
    : values.filter((entry) => entry !== value);
  return joinLines(nextValues);
}

function inferToolCapability(toolName: string): 'read' | 'write' {
  return /(apply|add|create|delete|merge|patch|propose|restart|scale|update|write)/i.test(toolName)
    ? 'write'
    : 'read';
}

function getToolServerHint(toolName: string): string {
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

function getScopeTokenLabel(value: string): string {
  return value.replaceAll('_', ' ').replaceAll('-', ' ');
}

function summarizeValues(values: string[], empty = 'None configured'): string {
  if (values.length === 0) return empty;
  if (values.length <= 2) return values.join(', ');
  return `${values.slice(0, 2).join(', ')} +${values.length - 2}`;
}

function isRunActive(status: WorkflowDefinition['runs'][number]['status']): boolean {
  return status === 'queued' || status === 'dispatching' || status === 'running' || status === 'waiting_approval' || status === 'cancelling';
}

function workflowRunTraceStatus(status: WorkflowDefinition['runs'][number]['status']): LiveRunTrace['status'] {
  if (status === 'completed') return 'completed';
  if (status === 'failed') return 'failed';
  if (status === 'cancelled') return 'cancelled';
  return status === 'queued' || status === 'dispatching' ? 'connecting' : 'running';
}

function workflowRunToTrace(run: WorkflowDefinition['runs'][number], events: WorkflowRunEvent[]): LiveRunTrace {
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

function createScopeDraft(workflow: WorkflowDefinition): ScopeDraft {
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

function createWorkflowDraft(): CreateWorkflowDraft {
  return {
    name: '',
    description: '',
    starterPrompt: '',
    enabledMcpServers: '',
    enabledSkills: '',
    allowedTools: ''
  };
}

function createWorkflowEditDraft(workflow: WorkflowDefinition): WorkflowEditDraft {
  return {
    name: workflow.name,
    description: workflow.description,
    starterPrompt: workflow.starterPrompt
  };
}

function createMcpServerDraft(): McpServerDraft {
  return {
    name: '',
    type: 'http',
    baseUrl: '',
    command: '',
    tools: ''
  };
}

function createFallbackWorkflowOptions(workflows: WorkflowDefinition[]): WorkflowOptionsCatalog {
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

function mapApiWorkflowToDefinition(
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

function mapWorkflowRunSummary(run: WorkflowRunSummary): WorkflowDefinition['runs'][number] {
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

export const WorkspaceWorkflowsPage: React.FC<WorkspaceWorkflowsPageProps> = ({ workspace }) => {
  const fallbackWorkflows = useMemo(() => createDefaultWorkflowDefinitions(workspace.id), [workspace.id]);
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>(fallbackWorkflows);
  const [workflowOptions, setWorkflowOptions] = useState<WorkflowOptionsCatalog>(() => createFallbackWorkflowOptions(fallbackWorkflows));
  const [workflowMcpServers, setWorkflowMcpServers] = useState<WorkflowMcpServer[]>([]);
  const [query, setQuery] = useState('');
  const [workflowSearchOpen, setWorkflowSearchOpen] = useState(false);
  const workflowSearchTags = useMemo(() => uniqueValues(workflows.flatMap((workflow) => workflow.tags)), [workflows]);
  const filteredWorkflows = useMemo(() => filterWorkflowDefinitions(workflows, query), [query, workflows]);
  const visibleWorkflows = filteredWorkflows;
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(workflows[0]?.id || '');
  const selectedWorkflow = visibleWorkflows.find((workflow) => workflow.id === selectedWorkflowId) || visibleWorkflows[0] || filteredWorkflows[0] || workflows[0];
  const [activeTab, setActiveTab] = useState<WorkflowTab>('chat');
  const [isEditingScopeTab, setIsEditingScopeTab] = useState<'' | 'mcp' | 'skills'>('');
  const [workflowLoadError, setWorkflowLoadError] = useState('');
  const [workflowMessage, setWorkflowMessage] = useState('');
  const [workflowSessionIds, setWorkflowSessionIds] = useState<Record<string, string>>({});
  const [compiledScopes, setCompiledScopes] = useState<Record<string, Record<string, unknown>>>({});
  const [launchingWorkflowId, setLaunchingWorkflowId] = useState('');
  const [launchError, setLaunchError] = useState('');
  const [launchResult, setLaunchResult] = useState<{ workflowId: string; runId: string; workflowRunId: string } | null>(null);
  const [approvalRecords, setApprovalRecords] = useState<Record<string, WorkflowRunApproval[]>>({});
  const [approvalAction, setApprovalAction] = useState('');
  const [approvalError, setApprovalError] = useState('');
  const [runEventsByRunId, setRunEventsByRunId] = useState<Record<string, WorkflowRunEvent[]>>({});
  const [expandedRunLogId, setExpandedRunLogId] = useState('');
  const [runLogLoadingId, setRunLogLoadingId] = useState('');
  const [runLogError, setRunLogError] = useState('');
  const [cancelRunAction, setCancelRunAction] = useState('');
  const [cancelRunError, setCancelRunError] = useState('');
  const [scopeDrafts, setScopeDrafts] = useState<Record<string, ScopeDraft>>({});
  const [scopeSaveError, setScopeSaveError] = useState<{ tab: 'mcp' | 'skills'; message: string } | null>(null);
  const [scopeSaveResult, setScopeSaveResult] = useState<{ tab: 'mcp' | 'skills'; message: string } | null>(null);
  const [savingScope, setSavingScope] = useState('');
  const [newWorkflowTag, setNewWorkflowTag] = useState('');
  const [createPanelOpen, setCreatePanelOpen] = useState(false);
  const [createWorkflowStep, setCreateWorkflowStep] = useState<CreateWorkflowStep>('details');
  const [createDraft, setCreateDraft] = useState<CreateWorkflowDraft>(() => createWorkflowDraft());
  const [createError, setCreateError] = useState('');
  const [creatingWorkflow, setCreatingWorkflow] = useState(false);
  const [editingWorkflowId, setEditingWorkflowId] = useState('');
  const [workflowEditDrafts, setWorkflowEditDrafts] = useState<Record<string, WorkflowEditDraft>>({});
  const [workflowUpdateError, setWorkflowUpdateError] = useState('');
  const [workflowUpdateResult, setWorkflowUpdateResult] = useState('');
  const [updatingWorkflowId, setUpdatingWorkflowId] = useState('');
  const [deleteWorkflowId, setDeleteWorkflowId] = useState('');
  const [deletingWorkflowId, setDeletingWorkflowId] = useState('');
  const [deleteWorkflowError, setDeleteWorkflowError] = useState('');
  const [mcpServerDraft, setMcpServerDraft] = useState<McpServerDraft>(() => createMcpServerDraft());
  const [creatingMcpServer, setCreatingMcpServer] = useState(false);
  const [mcpServerError, setMcpServerError] = useState('');
  const [activeMcpToolsServerId, setActiveMcpToolsServerId] = useState('');
  const canManageWorkflowScope = Boolean(workspace.permissions?.manage_mcp);
  React.useEffect(() => {
    let mounted = true;
    setWorkflows(fallbackWorkflows);
    setWorkflowOptions(createFallbackWorkflowOptions(fallbackWorkflows));
    setSelectedWorkflowId((current) => current || fallbackWorkflows[0]?.id || '');
    setWorkflowLoadError('');
    listWorkspaceWorkflows(workspace.id)
      .then((items) => {
        if (!mounted) return;
        const mapped = items.map((item) => mapApiWorkflowToDefinition(
          item,
          fallbackWorkflows.find((workflow) => workflow.id === item.id),
          workspace.id
        ));
        if (mapped.length > 0) {
          setWorkflows(mapped);
          setSelectedWorkflowId((current) => mapped.some((workflow) => workflow.id === current) ? current : mapped[0].id);
        }
      })
      .catch((error) => {
        if (!mounted) return;
        setWorkflowLoadError(error instanceof Error ? error.message : 'Unable to load workflow catalog');
      });
    return () => {
      mounted = false;
    };
  }, [fallbackWorkflows, workspace.id]);

  React.useEffect(() => {
    let mounted = true;
    listWorkflowOptions(workspace.id)
      .then((catalog) => {
        if (mounted) setWorkflowOptions(catalog);
      })
      .catch(() => undefined);
    listWorkflowMcpServers(workspace.id)
      .then((servers) => {
        if (mounted) setWorkflowMcpServers(servers);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, [workspace.id]);

  React.useEffect(() => {
    if (!selectedWorkflow) return;
    setWorkflowMessage(selectedWorkflow.starterPrompt);
    setScopeDrafts((current) => ({
      ...current,
      [selectedWorkflow.id]: current[selectedWorkflow.id] || createScopeDraft(selectedWorkflow)
    }));
    setScopeSaveError(null);
    setScopeSaveResult(null);
    setIsEditingScopeTab('');
  }, [selectedWorkflow?.id, workflowOptions]);

  React.useEffect(() => {
    if (!selectedWorkflow) return;
    let mounted = true;
    listWorkflowSessions(workspace.id, selectedWorkflow.id)
      .then((sessions) => {
        if (!mounted) return;
        const runs = sessions.flatMap((session) => session.runs || []).map(mapWorkflowRunSummary);
        setWorkflows((current) => current.map((workflow) => workflow.id === selectedWorkflow.id
          ? { ...workflow, runs, lastRun: runs[0]?.startedAt || 'No runs yet' }
          : workflow));
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, [selectedWorkflow?.id, workspace.id]);

  const selectedRunIds = useMemo(() => (
    selectedWorkflow?.runs.map((run) => run.runId).filter((runId): runId is string => Boolean(runId)) || []
  ), [selectedWorkflow?.runs]);
  const selectedRunIdsKey = selectedRunIds.join('|');

  React.useEffect(() => {
    if (selectedRunIds.length === 0) return;
    let mounted = true;
    Promise.all(selectedRunIds.map(async (runId) => {
      const approvals = await listWorkflowRunApprovals(runId).catch(() => undefined);
      return { runId, approvals };
    })).then((results) => {
      if (!mounted) return;
      setApprovalRecords((current) => {
        const next = { ...current };
        for (const result of results) {
          if (result.approvals) next[result.runId] = result.approvals;
        }
        return next;
      });
    }).catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, [selectedRunIdsKey]);

  React.useEffect(() => {
    if (!expandedRunLogId || !selectedWorkflow) return;
    const expandedRun = selectedWorkflow.runs.find((run) => run.runId === expandedRunLogId || run.id === expandedRunLogId);
    if (!expandedRun || !isRunActive(expandedRun.status)) return;
    let cancelled = false;
    const refresh = async () => {
      const events = await listWorkflowRunEvents(expandedRunLogId).catch(() => undefined);
      if (!cancelled && events) {
        setRunEventsByRunId((current) => ({ ...current, [expandedRunLogId]: events }));
      }
    };
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, 2500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [expandedRunLogId, selectedWorkflow?.runs]);

  React.useEffect(() => {
    if (!selectedWorkflow || filteredWorkflows.some((workflow) => workflow.id === selectedWorkflow.id)) return;
    setSelectedWorkflowId(filteredWorkflows[0]?.id || workflows[0]?.id || '');
  }, [filteredWorkflows, selectedWorkflow, workflows]);

  const selectedCompiledScope = selectedWorkflow ? compiledScopes[selectedWorkflow.id] : undefined;
  const selectedAccessTools = Array.isArray(selectedCompiledScope?.tools)
    ? selectedCompiledScope.tools.filter((tool): tool is string => typeof tool === 'string')
    : selectedWorkflow?.allowedTools || [];
  const selectedScopeDraft = selectedWorkflow
    ? scopeDrafts[selectedWorkflow.id] || createScopeDraft(selectedWorkflow)
    : undefined;
  const selectedScopeBaseline = selectedWorkflow ? createScopeDraft(selectedWorkflow) : undefined;
  const selectedScopeDirty = Boolean(
    selectedScopeDraft &&
    selectedScopeBaseline &&
    JSON.stringify(selectedScopeDraft) !== JSON.stringify(selectedScopeBaseline)
  );
  const isEditingMcpScope = isEditingScopeTab === 'mcp';
  const isEditingSkillScope = isEditingScopeTab === 'skills';
  const activeMcpToolsServer = activeMcpToolsServerId
    ? workflowMcpServers.find((server) => server.id === activeMcpToolsServerId)
    : undefined;
  const activeMcpToolsStep = selectedWorkflow?.steps[0];
  const activeMcpToolsStepDraft = selectedScopeDraft && activeMcpToolsStep
    ? selectedScopeDraft.steps[activeMcpToolsStep.id]
    : undefined;
  const activeMcpToolsSelectedTools = splitLines(activeMcpToolsStepDraft?.allowedTools || '');
  const activeMcpToolsSavedTools = activeMcpToolsServerId
    ? selectedWorkflow?.steps
      .filter((step) => step.allowedMcpServers.includes(activeMcpToolsServerId))
      .flatMap((step) => step.allowedTools) || []
    : [];
  const activeMcpToolsRows = activeMcpToolsServerId && selectedScopeDraft
    ? uniqueValues([
        ...workflowOptions.mcpTools.map((option) => option.value).filter((value) => getToolServerHint(value) === activeMcpToolsServerId),
        ...activeMcpToolsSavedTools,
        ...activeMcpToolsSelectedTools
      ]).map((toolName) => ({
        name: toolName,
        capability: inferToolCapability(toolName),
        serverHint: activeMcpToolsServerId,
        selected: activeMcpToolsSelectedTools.includes(toolName)
      }))
    : [];
  const workflowMcpServerIds = uniqueValues([
    ...workflowOptions.mcpServers.map((option) => option.value),
    ...workflowMcpServers.map((server) => server.id),
    ...(selectedWorkflow?.enabledMcpServers || []),
    ...splitLines(selectedScopeDraft?.enabledMcpServers || '')
  ]);
  const selectedMcpServerIds = splitLines(selectedScopeDraft?.enabledMcpServers || '');
  const mcpServerRows = workflowMcpServerIds.map((serverId) => {
    const server = workflowMcpServers.find((item) => item.id === serverId);
    const selected = selectedMcpServerIds.includes(serverId);
    const toolCount = workflowOptions.mcpTools.filter((tool) => getToolServerHint(tool.value) === serverId).length;
    return { serverId, server, selected, toolCount };
  });
  const isEditingWorkflow = Boolean(selectedWorkflow && editingWorkflowId === selectedWorkflow.id);
  const selectedWorkflowEditDraft = selectedWorkflow
    ? workflowEditDrafts[selectedWorkflow.id] || createWorkflowEditDraft(selectedWorkflow)
    : undefined;
  const createWorkflowStepIndex = createWorkflowSteps.findIndex((step) => step.id === createWorkflowStep);
  const createDetailsComplete = Boolean(createDraft.name.trim());
  const createPromptComplete = Boolean(createDraft.starterPrompt.trim());
  const createAccessCount = splitLines(createDraft.enabledMcpServers).length
    + splitLines(createDraft.enabledSkills).length
    + splitLines(createDraft.allowedTools).length;
  const createAccessComplete = createAccessCount > 0;
  const canAdvanceCreateWorkflow = createWorkflowStep !== 'details' || createDetailsComplete;

  function createWorkflowStepStatus(step: CreateWorkflowStep): string {
    if (step === 'details') return createDetailsComplete ? 'Complete' : 'Missing';
    if (step === 'prompt') return createPromptComplete ? 'Complete' : 'Default';
    return createAccessComplete ? 'Configured' : 'Optional';
  }

  function closeCreateWorkflowPanel(): void {
    setCreatePanelOpen(false);
    setCreateWorkflowStep('details');
    setCreateError('');
  }

  async function launchSelectedWorkflow(): Promise<void> {
    if (!selectedWorkflow) return;
    setLaunchError('');
    setLaunchingWorkflowId(selectedWorkflow.id);
    try {
      let effectiveSessionId = workflowSessionIds[selectedWorkflow.id];
      if (!effectiveSessionId) {
        const sessionResponse = await createWorkflowSession(workspace.id, selectedWorkflow.id, {
          approvedContextGrants: selectedWorkflow.contextGrants
        });
        effectiveSessionId = sessionResponse.session.id;
        setWorkflowSessionIds((current) => ({ ...current, [selectedWorkflow.id]: effectiveSessionId }));
        setCompiledScopes((current) => ({ ...current, [selectedWorkflow.id]: sessionResponse.compiledAccessScope }));
      }
      const result = await postWorkflowSessionMessage(workspace.id, effectiveSessionId, {
        content: workflowMessage || selectedWorkflow.starterPrompt
      });
      const runId = typeof result.run_id === 'string' ? result.run_id : '';
      const workflowRunId = typeof result.workflow_run_id === 'string' ? result.workflow_run_id : '';
      setLaunchResult({ workflowId: selectedWorkflow.id, runId, workflowRunId });
      setWorkflows((current) => current.map((workflow) => workflow.id === selectedWorkflow.id
        ? {
            ...workflow,
            lastRun: 'Just now',
            runs: [
              {
                id: workflowRunId || runId || 'workflow-run',
                runId,
                status: getOptimisticWorkflowRunStatus(workflow),
                actor: 'You',
                duration: 'Queued',
                approvals: workflow.policy.approvals.length,
                output: 'Workflow run dispatched to execution engine.',
                startedAt: 'Just now'
              },
              ...workflow.runs
            ]
          }
        : workflow));
      setActiveTab('chat');
    } catch (error) {
      setLaunchError(error instanceof Error ? error.message : 'Unable to launch workflow');
    } finally {
      setLaunchingWorkflowId('');
    }
  }

  async function decideApproval(runId: string, approvalId: string, decision: 'approved' | 'rejected'): Promise<void> {
    setApprovalError('');
    setApprovalAction(`${runId}:${approvalId}:${decision}`);
    try {
      const approval = await decideWorkflowRunApproval(runId, approvalId, decision);
      setApprovalRecords((current) => ({
        ...current,
        [runId]: (current[runId] || []).map((item) => item.id === approval.id ? approval : item)
      }));
    } catch (error) {
      setApprovalError(error instanceof Error ? error.message : 'Unable to decide workflow approval');
    } finally {
      setApprovalAction('');
    }
  }

  async function toggleRunLogs(runId: string): Promise<void> {
    if (expandedRunLogId === runId) {
      setExpandedRunLogId('');
      return;
    }
    setExpandedRunLogId(runId);
    setRunLogError('');
    if (runEventsByRunId[runId]) return;
    setRunLogLoadingId(runId);
    try {
      const events = await listWorkflowRunEvents(runId);
      setRunEventsByRunId((current) => ({ ...current, [runId]: events }));
    } catch (error) {
      setRunLogError(error instanceof Error ? error.message : 'Unable to load workflow run logs');
    } finally {
      setRunLogLoadingId('');
    }
  }

  async function stopWorkflowRun(runId: string): Promise<void> {
    setCancelRunError('');
    setCancelRunAction(runId);
    try {
      await cancelWorkflowRun(runId);
      setWorkflows((current) => current.map((workflow) => ({
        ...workflow,
        runs: workflow.runs.map((run) => run.runId === runId || run.id === runId
          ? { ...run, status: 'cancelling', output: 'Cancellation requested.' }
          : run)
      })));
      setRunEventsByRunId((current) => ({
        ...current,
        [runId]: [
          ...(current[runId] || []),
          {
            schema_version: 1,
            run_id: runId,
            seq: (current[runId]?.length || 0) + 1,
            ts: new Date().toISOString(),
            type: 'run_cancel_requested',
            payload: { source: 'management_console' }
          }
        ]
      }));
    } catch (error) {
      setCancelRunError(error instanceof Error ? error.message : 'Unable to stop workflow run');
    } finally {
      setCancelRunAction('');
    }
  }

  function updateScopeDraft(workflowId: string, update: (draft: ScopeDraft) => ScopeDraft): void {
    setScopeSaveResult(null);
    setScopeDrafts((current) => {
      const workflow = workflows.find((item) => item.id === workflowId);
      const currentDraft = current[workflowId] || (workflow ? createScopeDraft(workflow) : undefined);
      if (!currentDraft) return current;
      return { ...current, [workflowId]: update(currentDraft) };
    });
  }

  function startEditingScopeTab(tab: 'mcp' | 'skills'): void {
    setScopeSaveError(null);
    setScopeSaveResult(null);
    setIsEditingScopeTab(tab);
  }

  function cancelEditingScopeTab(): void {
    if (selectedWorkflow) {
      setScopeDrafts((current) => ({
        ...current,
        [selectedWorkflow.id]: createScopeDraft(selectedWorkflow)
      }));
    }
    setScopeSaveError(null);
    setIsEditingScopeTab('');
  }

  async function saveWorkflowScope(tab: 'mcp' | 'skills'): Promise<void> {
    if (!selectedWorkflow) return;
    const draft = scopeDrafts[selectedWorkflow.id] || createScopeDraft(selectedWorkflow);
    setScopeSaveError(null);
    setScopeSaveResult(null);
    setSavingScope(selectedWorkflow.id);
    try {
      const updated = await updateWorkflowScope(workspace.id, selectedWorkflow.id, {
        enabledMcpServers: splitLines(draft.enabledMcpServers),
        enabledSkills: splitLines(draft.enabledSkills),
        policy: {
          mode: draft.policyMode,
          approvalRequirements: splitLines(draft.approvalRequirements)
        },
        steps: selectedWorkflow.steps.map((step) => {
          const stepDraft = draft.steps[step.id];
          return {
            id: step.id,
            allowedTools: splitLines(stepDraft?.allowedTools || ''),
            contextGrants: splitLines(stepDraft?.contextGrants || ''),
            approvalRequired: Boolean(stepDraft?.approvalRequired)
          };
        })
      });
      const mapped = mapApiWorkflowToDefinition(updated, selectedWorkflow, workspace.id);
      setWorkflows((current) => current.map((workflow) => workflow.id === selectedWorkflow.id
        ? { ...mapped, runs: workflow.runs, lastRun: workflow.lastRun }
        : workflow));
      setCompiledScopes((current) => {
        const next = { ...current };
        delete next[selectedWorkflow.id];
        return next;
      });
      setScopeDrafts((current) => ({ ...current, [selectedWorkflow.id]: createScopeDraft(mapped) }));
      setScopeSaveResult({ tab, message: tab === 'mcp'
        ? 'Workflow MCP scope saved. Future sessions will use the updated scope.'
        : 'Workflow skills saved. Future sessions will use the updated scope.'
      });
      setIsEditingScopeTab('');
    } catch (error) {
      setScopeSaveError({ tab, message: error instanceof Error ? error.message : 'Unable to save workflow scope' });
    } finally {
      setSavingScope('');
    }
  }

  function setStepScopeValue(
    workflowId: string,
    stepId: string,
    key: 'allowedTools' | 'contextGrants',
    value: string,
    enabled: boolean
  ): void {
    updateScopeDraft(workflowId, (draft) => ({
      ...draft,
      steps: {
        ...draft.steps,
        [stepId]: {
          ...draft.steps[stepId],
          [key]: setLineValue(draft.steps[stepId]?.[key] || '', value, enabled)
        }
      }
    }));
  }

  function addWorkflowTag(workflowId: string): void {
    const tag = newWorkflowTag.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!tag) return;
    setWorkflows((current) => current.map((workflow) => workflow.id === workflowId
      ? { ...workflow, tags: uniqueValues([...workflow.tags, tag]) }
      : workflow));
    setNewWorkflowTag('');
  }

  function removeWorkflowTag(workflowId: string, tag: string): void {
    setWorkflows((current) => current.map((workflow) => workflow.id === workflowId
      ? { ...workflow, tags: workflow.tags.filter((value) => value !== tag) }
      : workflow));
  }

  function setWorkflowScopeValue(
    workflowId: string,
    key: 'enabledMcpServers' | 'enabledSkills',
    value: string,
    enabled: boolean
  ): void {
    updateScopeDraft(workflowId, (draft) => ({
      ...draft,
      [key]: setLineValue(draft[key], value, enabled)
    }));
  }

  function startEditingWorkflow(workflow: WorkflowDefinition): void {
    setWorkflowEditDrafts((current) => ({ ...current, [workflow.id]: createWorkflowEditDraft(workflow) }));
    setWorkflowUpdateError('');
    setWorkflowUpdateResult('');
    setDeleteWorkflowError('');
    setDeleteWorkflowId('');
    setEditingWorkflowId(workflow.id);
  }

  function cancelEditingWorkflow(workflow: WorkflowDefinition): void {
    setWorkflowEditDrafts((current) => ({ ...current, [workflow.id]: createWorkflowEditDraft(workflow) }));
    setWorkflowUpdateError('');
    setEditingWorkflowId('');
  }

  function updateWorkflowEditDraft(workflowId: string, update: Partial<WorkflowEditDraft>): void {
    setWorkflowUpdateResult('');
    setWorkflowEditDrafts((current) => {
      const workflow = workflows.find((item) => item.id === workflowId);
      const currentDraft = current[workflowId] || (workflow ? createWorkflowEditDraft(workflow) : undefined);
      if (!currentDraft) return current;
      return { ...current, [workflowId]: { ...currentDraft, ...update } };
    });
  }

  async function saveWorkflowDefinition(): Promise<void> {
    if (!selectedWorkflow || !selectedWorkflowEditDraft) return;
    const name = selectedWorkflowEditDraft.name.trim();
    if (!name) return;
    setWorkflowUpdateError('');
    setWorkflowUpdateResult('');
    setUpdatingWorkflowId(selectedWorkflow.id);
    try {
      const updated = await updateWorkflow(workspace.id, selectedWorkflow.id, {
        name,
        description: selectedWorkflowEditDraft.description.trim(),
        starterPrompt: selectedWorkflowEditDraft.starterPrompt.trim() || `Start ${name}.`
      });
      const mapped = mapApiWorkflowToDefinition(updated, selectedWorkflow, workspace.id);
      setWorkflows((current) => current.map((workflow) => workflow.id === selectedWorkflow.id
        ? { ...mapped, runs: workflow.runs, lastRun: workflow.lastRun }
        : workflow));
      setWorkflowEditDrafts((current) => ({ ...current, [selectedWorkflow.id]: createWorkflowEditDraft(mapped) }));
      setWorkflowUpdateResult('Workflow updated.');
      setEditingWorkflowId('');
    } catch (error) {
      setWorkflowUpdateError(error instanceof Error ? error.message : 'Unable to update workflow');
    } finally {
      setUpdatingWorkflowId('');
    }
  }

  async function toggleWorkflowActive(workflow: WorkflowDefinition, active: boolean): Promise<void> {
    setWorkflowUpdateError('');
    setWorkflowUpdateResult('');
    setUpdatingWorkflowId(workflow.id);
    try {
      const updated = await updateWorkflow(workspace.id, workflow.id, {
        status: active ? 'active' : 'paused'
      });
      const mapped = mapApiWorkflowToDefinition(updated, workflow, workspace.id);
      setWorkflows((current) => current.map((item) => item.id === workflow.id
        ? { ...mapped, runs: item.runs, lastRun: item.lastRun }
        : item));
      setWorkflowUpdateResult(active ? 'Workflow activated.' : 'Workflow deactivated.');
    } catch (error) {
      setWorkflowUpdateError(error instanceof Error ? error.message : 'Unable to update workflow status');
    } finally {
      setUpdatingWorkflowId('');
    }
  }

  async function deleteSelectedWorkflow(workflow: WorkflowDefinition): Promise<void> {
    setDeleteWorkflowError('');
    setDeletingWorkflowId(workflow.id);
    try {
      await deleteWorkflow(workspace.id, workflow.id);
      const nextWorkflows = workflows.filter((item) => item.id !== workflow.id);
      setWorkflows(nextWorkflows);
      setSelectedWorkflowId(nextWorkflows[0]?.id || '');
      setDeleteWorkflowId('');
      setEditingWorkflowId('');
    } catch (error) {
      setDeleteWorkflowError(error instanceof Error ? error.message : 'Unable to delete workflow');
    } finally {
      setDeletingWorkflowId('');
    }
  }

  async function createNewWorkflow(): Promise<void> {
    const name = createDraft.name.trim();
    if (!name) return;
    setCreateError('');
    setCreatingWorkflow(true);
    const enabledMcpServers = splitLines(createDraft.enabledMcpServers);
    const enabledSkills = splitLines(createDraft.enabledSkills);
    const allowedTools = splitLines(createDraft.allowedTools);
    try {
      const workflow = await createWorkflow(workspace.id, {
        name,
        description: createDraft.description.trim(),
        tags: [],
        starterPrompt: createDraft.starterPrompt.trim() || `Start ${name}.`,
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
          title: 'Run workflow prompt',
          requiredInputs: [],
          enabledSkills,
          allowedMcpServers: enabledMcpServers,
          allowedTools,
          contextGrants: ['workspace_metadata'],
          approvalRequired: false
        }]
      });
      const mapped = mapApiWorkflowToDefinition(workflow, undefined, workspace.id);
      setWorkflows((current) => [mapped, ...current]);
      setSelectedWorkflowId(mapped.id);
      setActiveTab('chat');
      setCreateDraft(createWorkflowDraft());
      setCreateWorkflowStep('details');
      setCreatePanelOpen(false);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Unable to create workflow');
    } finally {
      setCreatingWorkflow(false);
    }
  }

  async function addWorkflowMcpServer(): Promise<void> {
    const name = mcpServerDraft.name.trim();
    if (!name) return;
    setMcpServerError('');
    setCreatingMcpServer(true);
    try {
      const server = await createWorkflowMcpServer(workspace.id, {
        name,
        type: mcpServerDraft.type,
        baseUrl: mcpServerDraft.baseUrl.trim() || undefined,
        command: mcpServerDraft.command.trim() || undefined,
        tools: splitLines(mcpServerDraft.tools)
      });
      setWorkflowMcpServers((current) => uniqueValues([...current.map((item) => item.id), server.id])
        .map((id) => id === server.id ? server : current.find((item) => item.id === id))
        .filter((item): item is WorkflowMcpServer => Boolean(item)));
      setWorkflowOptions((current) => ({
        ...current,
        mcpServers: uniqueValues([...current.mcpServers.map((option) => option.value), server.id])
          .map((value) => ({ value, label: value }))
      }));
      setMcpServerDraft(createMcpServerDraft());
    } catch (error) {
      setMcpServerError(error instanceof Error ? error.message : 'Unable to add MCP server');
    } finally {
      setCreatingMcpServer(false);
    }
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-ui-bg px-4 py-6 custom-scrollbar stable-scrollbar-gutter sm:px-6 lg:px-10 lg:py-8">
      <motion.header {...headerMotion} className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="type-route-title">Workflows</h1>
          <p className="type-body mt-3 max-w-3xl text-ui-text-muted">
            Workspace-scoped automations with their own chat, ordered steps, run records, and compiled tool access.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative lg:w-80">
            <PageSearchInput
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setWorkflowSearchOpen(true);
              }}
              onFocus={() => setWorkflowSearchOpen(true)}
              onBlur={() => {
                window.setTimeout(() => setWorkflowSearchOpen(false), 120);
              }}
              placeholder="Search workflows, tags, skills, MCP scope"
              aria-label="Search workflows"
              aria-expanded={workflowSearchOpen}
              aria-controls="workflow-search-suggestions"
              className="pr-9 lg:w-full"
            />
            <ICONS.ChevronDown className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-text-muted transition-transform ${workflowSearchOpen ? 'rotate-180' : ''}`} />
            {workflowSearchOpen && workflowSearchTags.length > 0 && (
              <div
                id="workflow-search-suggestions"
                role="listbox"
                className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-30 overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-xl shadow-ui-text/10"
              >
                <div className="border-b border-ui-border bg-ui-bg px-3 py-2">
                  <span className="type-micro-label text-ui-text-muted">Workflow tags</span>
                </div>
                <div className="max-h-64 overflow-y-auto py-1 custom-scrollbar">
                  {workflowSearchTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      role="option"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setQuery((current) => appendWorkflowSearchTag(current, tag));
                        setWorkflowSearchOpen(false);
                      }}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm font-semibold text-ui-text transition-colors hover:bg-accent-soft focus:outline-none focus-visible:bg-accent-soft"
                    >
                      <span>{tag}</span>
                      <ICONS.Search className="h-3.5 w-3.5 text-ui-text-muted" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={() => {
              setCreateWorkflowStep('details');
              setCreatePanelOpen((open) => !open);
            }}
          >
            <ICONS.Plus className="h-4 w-4" />
            Add workflow
          </Button>
        </div>
        {workflowLoadError && (
          <div className="rounded-md border border-status-warning/30 bg-status-warning-soft px-3 py-2 text-xs font-semibold text-status-warning-text">
            Using the local workflow catalog because control-plane workflows could not be loaded.
          </div>
        )}
      </motion.header>

      {createPanelOpen && (
        <section data-workflow-create-panel="true" className="mb-6 overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm">
          <div className="flex flex-col gap-3 border-b border-ui-border bg-ui-bg px-5 py-4 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="type-section-title">New workflow</h2>
              <p className="type-caption mt-2 max-w-2xl">
                Create a workspace automation in a short guided flow.
              </p>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={closeCreateWorkflowPanel}>
              <ICONS.X className="h-4 w-4" />
              Close
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3 border-b border-ui-border bg-ui-surface px-5 py-4 sm:px-6">
            {createWorkflowSteps.map((step, index) => {
              const active = step.id === createWorkflowStep;
              const completed = createWorkflowSteps.findIndex((item) => item.id === step.id) < createWorkflowStepIndex;
              const status = createWorkflowStepStatus(step.id);
              return (
                <React.Fragment key={step.id}>
                  {index > 0 && <span className="h-px w-10 bg-ui-border" aria-hidden="true" />}
                  <button
                    type="button"
                    onClick={() => setCreateWorkflowStep(step.id)}
                    className="group flex min-w-0 items-center gap-2 rounded-md px-1 py-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
                    aria-current={active ? 'step' : undefined}
                    title={`${step.label}: ${status}`}
                  >
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[0.68rem] font-bold ${
                      active
                        ? 'border-accent bg-accent text-[oklch(0.99_0.004_86)]'
                        : completed
                          ? 'border-status-success/30 bg-status-success-soft text-status-success-text'
                          : 'border-ui-border bg-ui-bg text-ui-text-muted'
                    }`}>
                      {index + 1}
                    </span>
                    <span className={`type-micro-label truncate ${active ? 'text-accent-strong' : 'text-ui-text-muted group-hover:text-ui-text'}`}>
                      {step.label}
                    </span>
                  </button>
                </React.Fragment>
              );
            })}
            <span className="type-caption ml-auto text-ui-text-muted">Step {createWorkflowStepIndex + 1} of 3</span>
          </div>
          {createError && (
            <div className="mx-5 mt-4 rounded-md border border-status-danger/30 bg-status-danger-soft p-3 text-xs font-semibold text-status-danger-text sm:mx-6">
              {createError}
            </div>
          )}
          <div className="px-5 py-5 sm:px-6">
            {createWorkflowStep === 'details' && (
              <div className="grid max-w-4xl gap-4">
                <div>
                  <h3 className="type-row-title">Workflow details</h3>
                  <p className="type-caption mt-1 text-ui-text-muted">Use a short name operators can scan in the workflow library.</p>
                </div>
                <label className="block max-w-xl">
                  <span className="type-micro-label">Name</span>
                  <input
                    value={createDraft.name}
                    onChange={(event) => setCreateDraft((draft) => ({ ...draft, name: event.target.value }))}
                    className="mt-2 min-h-10 w-full rounded-md border border-ui-border bg-ui-bg px-3 text-sm font-semibold text-ui-text outline-none focus:border-accent"
                  />
                </label>
                <label className="block">
                  <span className="type-micro-label">Description</span>
                  <input
                    value={createDraft.description}
                    onChange={(event) => setCreateDraft((draft) => ({ ...draft, description: event.target.value }))}
                    className="mt-2 min-h-10 w-full rounded-md border border-ui-border bg-ui-bg px-3 text-sm font-medium text-ui-text outline-none focus:border-accent"
                  />
                </label>
              </div>
            )}
            {createWorkflowStep === 'prompt' && (
              <div className="grid max-w-5xl gap-4">
                <div>
                  <h3 className="type-row-title">Starting prompt</h3>
                  <p className="type-caption mt-1 text-ui-text-muted">This becomes the default chat message when the workflow is selected.</p>
                </div>
                <label className="block">
                  <span className="type-micro-label">Workflow prompt</span>
                  <textarea
                    value={createDraft.starterPrompt}
                    onChange={(event) => setCreateDraft((draft) => ({ ...draft, starterPrompt: event.target.value }))}
                    className="mt-2 min-h-32 w-full resize-y rounded-md border border-ui-border bg-ui-bg px-3 py-2 text-sm font-medium leading-6 text-ui-text outline-none focus:border-accent"
                  />
                </label>
              </div>
            )}
            {createWorkflowStep === 'access' && (
              <div className="grid gap-5">
                <div>
                  <h3 className="type-row-title">Workflow access</h3>
                  <p className="type-caption mt-1 text-ui-text-muted">Choose optional MCP servers, skills, and tools. You can refine scope after creating the workflow.</p>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <label className="block">
                    <span className="type-micro-label">MCP servers</span>
                    <select
                      value=""
                      onChange={(event) => {
                        if (event.target.value) {
                          setCreateDraft((draft) => ({ ...draft, enabledMcpServers: setLineValue(draft.enabledMcpServers, event.target.value, true) }));
                        }
                      }}
                      className="mt-2 min-h-10 w-full rounded-md border border-ui-border bg-ui-bg px-3 text-sm font-semibold text-ui-text outline-none focus:border-accent"
                    >
                      <option value="">Add MCP server</option>
                      {workflowOptions.mcpServers.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <span className="type-caption mt-2 block">{summarizeValues(splitLines(createDraft.enabledMcpServers), 'No servers selected')}</span>
                  </label>
                  <label className="block">
                    <span className="type-micro-label">Skills</span>
                    <select
                      value=""
                      onChange={(event) => {
                        if (event.target.value) {
                          setCreateDraft((draft) => ({ ...draft, enabledSkills: setLineValue(draft.enabledSkills, event.target.value, true) }));
                        }
                      }}
                      className="mt-2 min-h-10 w-full rounded-md border border-ui-border bg-ui-bg px-3 text-sm font-semibold text-ui-text outline-none focus:border-accent"
                    >
                      <option value="">Add skill</option>
                      {workflowOptions.skills.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <span className="type-caption mt-2 block">{summarizeValues(splitLines(createDraft.enabledSkills), 'No skills selected')}</span>
                  </label>
                  <label className="block lg:col-span-2">
                    <span className="type-micro-label">Allowed tools</span>
                    <select
                      value=""
                      onChange={(event) => {
                        if (event.target.value) {
                          setCreateDraft((draft) => ({ ...draft, allowedTools: setLineValue(draft.allowedTools, event.target.value, true) }));
                        }
                      }}
                      className="mt-2 min-h-10 w-full rounded-md border border-ui-border bg-ui-bg px-3 text-sm font-semibold text-ui-text outline-none focus:border-accent"
                    >
                      <option value="">Add tool</option>
                      {workflowOptions.mcpTools.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <span className="type-caption mt-2 block">{summarizeValues(splitLines(createDraft.allowedTools), 'No tools selected')}</span>
                  </label>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-ui-border bg-ui-bg px-5 py-4 sm:px-6">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setCreateWorkflowStep(createWorkflowSteps[Math.max(createWorkflowStepIndex - 1, 0)].id)}
              disabled={createWorkflowStepIndex === 0}
            >
              Back
            </Button>
            <div className="flex items-center gap-2">
              {createWorkflowStep !== 'access' ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setCreateWorkflowStep(createWorkflowSteps[Math.min(createWorkflowStepIndex + 1, createWorkflowSteps.length - 1)].id)}
                  disabled={!canAdvanceCreateWorkflow}
                >
                  {createWorkflowStep === 'details' ? 'Next: Prompt' : 'Next: Access'}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="accent"
                  size="md"
                  onClick={() => void createNewWorkflow()}
                  disabled={creatingWorkflow || !createDraft.name.trim()}
                >
                  <ICONS.Plus className="h-4 w-4" />
                  {creatingWorkflow ? 'Creating...' : 'Create workflow'}
                </Button>
              )}
            </div>
          </div>
        </section>
      )}

      <div className="grid min-h-0 gap-6 xl:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)]">
        <section aria-label="Workflow library" className="min-w-0 space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 px-1">
              <div className="type-micro-label">
                {query.trim() ? 'Matching workflows' : 'Workflow library'}
              </div>
              <div className="type-caption font-semibold text-ui-text-muted">{visibleWorkflows.length}</div>
            </div>
            {visibleWorkflows.map((workflow) => {
              const selected = workflow.id === selectedWorkflow?.id;
              return (
                <button
                  key={workflow.id}
                  type="button"
                  onClick={() => {
                    setSelectedWorkflowId(workflow.id);
                    setActiveTab('chat');
                  }}
                  className={`w-full rounded-lg border p-3.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 ${
                    selected
                      ? 'border-accent/45 bg-accent-soft/55 shadow-sm shadow-accent/10'
                      : 'border-ui-border bg-ui-surface hover:border-accent/25 hover:bg-ui-bg'
                  }`}
                  aria-current={selected ? 'page' : undefined}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="type-row-title block text-ui-text">{workflow.name}</span>
                      <span className="type-caption mt-1 block leading-5 text-ui-text-muted">{workflow.description}</span>
                      <span className="mt-3 flex flex-wrap gap-1.5">
                        {workflow.tags.map((tag) => (
                          <span key={tag} className="rounded-md border border-ui-border bg-ui-surface px-2 py-1 text-[11px] font-semibold text-ui-text-muted">
                            {tag}
                          </span>
                        ))}
                      </span>
                    </span>
                    <StatusBadge tone={workflowStatusTone(workflow.status)}>{workflow.status}</StatusBadge>
                  </span>
                  <span className="mt-4 grid gap-3 border-t border-ui-border/70 pt-3 text-xs sm:grid-cols-2 xl:grid-cols-1">
                    <span className="min-w-0">
                      <span className="type-micro-label block text-ui-text-muted">Last run</span>
                      <span className="mt-1 block truncate font-semibold text-ui-text" title={workflow.lastRun}>{workflow.lastRun}</span>
                    </span>
                    <span className="min-w-0">
                      <span className="type-micro-label block text-ui-text-muted">Scope</span>
                      <span className="mt-1 block truncate font-semibold text-ui-text" title={getWorkflowToolScopeSummary(workflow)}>{getWorkflowToolScopeSummary(workflow)}</span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {visibleWorkflows.length === 0 && (
            <div className="rounded-lg border border-ui-border bg-ui-surface p-6 text-sm font-semibold text-ui-text-muted">
              No workflows match this search.
            </div>
          )}
        </section>

        {selectedWorkflow && (
          <section className="min-w-0 overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm">
            <div className="border-b border-ui-border bg-ui-bg px-5 py-6 sm:px-6 lg:px-7">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(14rem,18rem)] lg:items-start">
                <div className="min-w-0">
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <StatusBadge tone={workflowStatusTone(selectedWorkflow.status)}>{selectedWorkflow.status}</StatusBadge>
                  </div>
                  <h2 className="text-2xl font-semibold leading-8 tracking-normal text-ui-text">{selectedWorkflow.name}</h2>
                  <p className="type-body mt-2 max-w-2xl text-ui-text-muted">{selectedWorkflow.description}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Workflow tags">
                    {selectedWorkflow.tags.map((tag) => (
                      <span key={tag} className="rounded-md border border-ui-border bg-ui-surface px-2 py-1 text-xs font-semibold text-ui-text-muted">
                        {tag}
                      </span>
                    ))}
                  </div>
                  {(workflowUpdateError || workflowUpdateResult || deleteWorkflowError) && (
                    <div className={`mt-4 rounded-md border px-3 py-2 text-xs font-semibold ${
                      workflowUpdateError || deleteWorkflowError
                        ? 'border-status-danger/30 bg-status-danger-soft text-status-danger-text'
                        : 'border-status-success/30 bg-status-success-soft text-status-success-text'
                    }`}>
                      {workflowUpdateError || deleteWorkflowError || workflowUpdateResult}
                    </div>
                  )}
                </div>
                <div className="grid content-start gap-4 border-t border-ui-border pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                  <div>
                    <div className="type-micro-label text-ui-text-muted">Last run</div>
                    <div className="mt-1 truncate text-sm font-semibold text-ui-text" title={selectedWorkflow.lastRun}>
                      {selectedWorkflow.lastRun}
                    </div>
                  </div>
                  <div>
                    <div className="type-micro-label text-ui-text-muted">Runtime scope</div>
                    <div className="mt-1 text-sm font-semibold text-ui-text">{getWorkflowToolScopeSummary(selectedWorkflow)}</div>
                  </div>
                  <div>
                    <div className="type-micro-label text-ui-text-muted">Enabled MCP servers</div>
                    <div className="mt-1 text-sm font-semibold text-ui-text">{summarizeValues(selectedWorkflow.enabledMcpServers)}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-b border-ui-border bg-ui-surface px-4 pt-3">
              <div role="tablist" aria-label="Workflow detail sections" className="flex gap-1 overflow-x-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab}
                    onClick={() => setActiveTab(tab)}
                    className={`min-h-10 border-b-2 px-3 text-xs font-bold transition-colors ${
                      activeTab === tab
                        ? 'border-accent text-ui-text'
                        : 'border-transparent text-ui-text-muted hover:text-ui-text'
                    }`}
                  >
                    {getWorkflowTabLabel(tab)}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-ui-bg/45 p-5 sm:p-6">
              {activeTab === 'chat' && (
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
                  <div className="space-y-4">
                    <div>
                      <h3 className="type-row-title">Launch prompt</h3>
                      <p className="type-caption mt-1 max-w-2xl text-ui-text-muted">
                        Review or adjust the prompt before starting a workflow run.
                      </p>
                    </div>
                    <label className="block">
                      <span className="type-micro-label">Run prompt message</span>
                      <textarea
                        value={workflowMessage}
                        onChange={(event) => setWorkflowMessage(event.target.value)}
                        className="mt-2 min-h-32 w-full resize-y rounded-md border border-ui-border bg-ui-surface px-3 py-2 text-sm font-medium leading-6 text-ui-text outline-none focus:border-accent"
                      />
                    </label>
                    {selectedCompiledScope && (
                      <div className="rounded-md border border-accent/25 bg-accent-soft p-3">
                        <div className="type-micro-label">Compiled tool access</div>
                        <p className="type-caption mt-2">
                          {selectedAccessTools.length} tools available for this run.
                        </p>
                      </div>
                    )}
                    {launchError && (
                      <div className="rounded-md border border-status-danger/30 bg-status-danger-soft p-3 text-xs font-semibold text-status-danger-text">
                        {launchError}
                      </div>
                    )}
                    {launchResult?.workflowId === selectedWorkflow.id && (
                      <div className="rounded-md border border-status-success/30 bg-status-success-soft p-3 text-xs font-semibold text-status-success-text">
                        Run {launchResult.workflowRunId || launchResult.runId} dispatched.
                      </div>
                    )}
                    <div className="flex justify-start border-t border-ui-border pt-4">
                      <Button
                        variant="accent"
                        size="md"
                        onClick={() => void launchSelectedWorkflow()}
                        disabled={launchingWorkflowId === selectedWorkflow.id || !workflowMessage.trim()}
                      >
                        <ICONS.Send className="h-4 w-4" />
                        {launchingWorkflowId === selectedWorkflow.id ? 'Starting...' : 'Launch workflow'}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-4 border-t border-ui-border pt-5 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                    <div>
                      <h3 className="type-row-title">Run access</h3>
                      <p className="type-caption mt-1 text-ui-text-muted">Scope compiled for new sessions.</p>
                    </div>
                    <WorkflowMetaList label="MCP servers" values={selectedWorkflow.enabledMcpServers} />
                    <WorkflowMetaList label="Skills" values={selectedWorkflow.enabledSkills} />
                  </div>
                </div>
              )}

              {activeTab === 'runs' && (
                <div className="space-y-3">
                  {approvalError && (
                    <div className="rounded-md border border-status-danger/30 bg-status-danger-soft p-3 text-xs font-semibold text-status-danger-text">
                      {approvalError}
                    </div>
                  )}
                  {runLogError && (
                    <div className="rounded-md border border-status-danger/30 bg-status-danger-soft p-3 text-xs font-semibold text-status-danger-text">
                      {runLogError}
                    </div>
                  )}
                  {cancelRunError && (
                    <div className="rounded-md border border-status-danger/30 bg-status-danger-soft p-3 text-xs font-semibold text-status-danger-text">
                      {cancelRunError}
                    </div>
                  )}
                  <div className="overflow-hidden rounded-lg border border-ui-border">
                  {selectedWorkflow.runs.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-[54rem] w-full text-left">
                        <thead className="border-b border-ui-border bg-ui-bg">
                          <tr>
                            <th className="type-label px-4 py-3">Run</th>
                            <th className="type-label px-4 py-3">Actor</th>
                            <th className="type-label px-4 py-3">Duration</th>
                            <th className="type-label px-4 py-3">Approvals</th>
                            <th className="type-label px-4 py-3">Output</th>
                            <th className="type-label px-4 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-ui-border">
                          {selectedWorkflow.runs.map((run) => {
                            const approvals = run.runId ? approvalRecords[run.runId] || [] : [];
                            const approvalCount = approvals.length || run.approvals;
                            const effectiveRunId = run.runId || run.id;
                            const runEvents = runEventsByRunId[effectiveRunId] || [];
                            const traceExpanded = expandedRunLogId === effectiveRunId;
                            const runTrace = workflowRunToTrace(run, runEvents);
                            return (
                              <React.Fragment key={run.id}>
                                <tr>
                                  <td className="px-4 py-4 align-top">
                                    <div className="type-row-title">{run.id}</div>
                                    <div className="type-caption mt-1">{run.startedAt}</div>
                                    <div className="mt-2"><StatusBadge tone={runStatusTone(run.status)}>{run.status.replace('_', ' ')}</StatusBadge></div>
                                  </td>
                                  <td className="type-caption px-4 py-4 align-top text-ui-text">{run.actor}</td>
                                  <td className="type-caption px-4 py-4 align-top text-ui-text">{run.duration}</td>
                                  <td className="min-w-[20rem] px-4 py-4 align-top text-ui-text">
                                    {approvals.length > 0 ? (
                                      <div className="space-y-2">
                                        {approvals.map((approval) => {
                                          const isPending = approval.status === 'pending';
                                          const actionPrefix = `${approval.runId}:${approval.id}`;
                                          return (
                                            <div
                                              key={approval.id}
                                              className={`rounded-lg border p-3 ${
                                                isPending
                                                  ? 'border-status-warning/35 bg-status-warning-soft/35'
                                                  : 'border-ui-border bg-ui-bg'
                                              }`}
                                            >
                                              <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                  <div className="type-micro-label text-ui-text-muted">
                                                    {isPending ? 'Approval requested' : 'Approval decision'}
                                                  </div>
                                                  <div className="mt-1 text-sm font-semibold leading-5 text-ui-text">
                                                    {approval.summary || approval.toolName}
                                                  </div>
                                                  {approval.summary && approval.toolName && (
                                                    <div className="mt-1 break-all text-xs font-semibold text-ui-text-muted">
                                                      {approval.toolName}
                                                    </div>
                                                  )}
                                                </div>
                                                <div className="flex shrink-0 flex-col items-end gap-1">
                                                  <StatusBadge tone={approvalStatusTone(approval.status)}>{titleFromInputName(approval.status)}</StatusBadge>
                                                  {approval.executionStatus && (
                                                    <span className="type-micro-label text-ui-text-muted">{titleFromInputName(approval.executionStatus)}</span>
                                                  )}
                                                </div>
                                              </div>
                                              {isPending && (
                                                <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-ui-border/70 pt-3">
                                                  <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => void decideApproval(approval.runId, approval.id, 'approved')}
                                                    disabled={approvalAction.startsWith(actionPrefix)}
                                                  >
                                                    <ICONS.CheckCircle2 className="h-4 w-4" />
                                                    Approve
                                                  </Button>
                                                  <Button
                                                    size="sm"
                                                    variant="danger"
                                                    onClick={() => void decideApproval(approval.runId, approval.id, 'rejected')}
                                                    disabled={approvalAction.startsWith(actionPrefix)}
                                                  >
                                                    <ICONS.X className="h-4 w-4" />
                                                    Reject
                                                  </Button>
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <span className="type-caption">{approvalCount > 0 ? `${approvalCount} approval${approvalCount === 1 ? '' : 's'} expected` : 'No approvals'}</span>
                                    )}
                                  </td>
                                  <td className="type-caption px-4 py-4 align-top text-ui-text">{run.output}</td>
                                  <td className="px-4 py-4 align-top">
                                    <div className="flex justify-end gap-2">
                                      {isRunActive(run.status) && (
                                        <Tooltip content={cancelRunAction === effectiveRunId ? 'Stopping workflow run' : 'Stop workflow run'}>
                                        <Button
                                          type="button"
                                          size="icon"
                                          variant="secondary"
                                          className="border-status-danger/25 bg-status-danger-soft text-status-danger-text hover:border-status-danger/40 hover:bg-status-danger-soft/80 focus-visible:ring-status-danger/20"
                                          onClick={() => void stopWorkflowRun(effectiveRunId)}
                                          aria-label="Stop workflow run"
                                          disabled={cancelRunAction === effectiveRunId}
                                        >
                                          {cancelRunAction === effectiveRunId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-3.5 w-3.5 fill-current" />}
                                        </Button>
                                        </Tooltip>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                                <tr>
                                  <td colSpan={6} className="border-t border-ui-border bg-ui-bg px-4 py-2">
                                    <div data-workflow-run-details="true" className={runLogLoadingId === effectiveRunId ? 'opacity-75' : ''}>
                                      <TraceFooter
                                        runId={effectiveRunId}
                                        trace={runTrace}
                                        isExpanded={traceExpanded}
                                        setExpanded={(runId, expanded) => {
                                          if (expanded) {
                                            void toggleRunLogs(runId);
                                          } else {
                                            setExpandedRunLogId('');
                                          }
                                        }}
                                        compactStatusOnly
                                      />
                                    </div>
                                  </td>
                                </tr>
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-6 text-sm font-semibold text-ui-text-muted">This workflow has no prior runs.</div>
                  )}
                  </div>
                </div>
              )}

              {activeTab === 'mcp' && (
                <div className="space-y-6">
                  {selectedScopeDraft && (
                    <section className="border-b border-ui-border pb-6">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <h3 className="type-row-title">Workflow MCP scope</h3>
                          <p className="type-caption mt-2">
                            Choose the MCP servers and tools this workflow can use.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {isEditingMcpScope ? (
                            <>
                              <Button
                                type="button"
                                variant="tertiary"
                                size="sm"
                                onClick={cancelEditingScopeTab}
                                disabled={savingScope === selectedWorkflow.id}
                              >
                                <ICONS.X className="h-4 w-4" />
                                Cancel
                              </Button>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => void saveWorkflowScope('mcp')}
                                disabled={!canManageWorkflowScope || !selectedScopeDirty || savingScope === selectedWorkflow.id}
                              >
                                <ICONS.CheckCircle2 className="h-4 w-4" />
                                {savingScope === selectedWorkflow.id ? 'Saving...' : 'Save MCP changes'}
                              </Button>
                            </>
                          ) : (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => startEditingScopeTab('mcp')}
                              disabled={!canManageWorkflowScope}
                            >
                              <ICONS.Pencil className="h-4 w-4" />
                              Edit MCP scope
                            </Button>
                          )}
                        </div>
                      </div>
                      {!canManageWorkflowScope && (
                        <div className="mt-4 rounded-md border border-status-warning/30 bg-status-warning-soft p-3 text-xs font-semibold text-status-warning-text">
                          You can review workflow MCP scope, but your role cannot edit it.
                        </div>
                      )}
                      {isEditingMcpScope && (
                        <div className="mt-4 rounded-md border border-status-warning/25 bg-status-warning-soft px-3 py-2 text-xs font-semibold text-status-warning-text">
                          {selectedScopeDirty ? 'Draft changes are not saved yet. Save MCP changes to apply them to future sessions.' : 'Editing draft. Changes are not saved until you click Save MCP changes.'}
                        </div>
                      )}
                      {scopeSaveError?.tab === 'mcp' && (
                        <div className="mt-4 rounded-md border border-status-danger/30 bg-status-danger-soft p-3 text-xs font-semibold text-status-danger-text">
                          {scopeSaveError.message}
                        </div>
                      )}
                      {scopeSaveResult?.tab === 'mcp' && (
                        <div className="mt-4 rounded-md border border-status-success/30 bg-status-success-soft p-3 text-xs font-semibold text-status-success-text">
                          {scopeSaveResult.message}
                        </div>
                      )}
                      <div className="mt-5 space-y-5">
                        <section data-workflow-mcp-server-selection="true" className="overflow-hidden rounded-lg border border-ui-border bg-ui-surface">
                          <div className="grid grid-cols-1 divide-y divide-ui-border md:grid-cols-[minmax(15rem,1.4fr)_repeat(3,minmax(7rem,1fr))] md:divide-x md:divide-y-0">
                            <div className="px-5 py-3.5">
                              <h4 className="type-row-title">Workflow MCP servers</h4>
                              <p className="type-caption mt-1 text-ui-text-muted">Servers are enabled once for this workflow.</p>
                            </div>
                            <div className="px-5 py-3.5">
                              <p className="type-caption text-ui-text-muted">Inventory</p>
                              <p className="mt-0.5 text-xl font-semibold tracking-tight text-ui-text">{workflowOptions.mcpServers.length}</p>
                            </div>
                            <div className="px-5 py-3.5">
                              <p className="type-caption text-ui-text-muted">Enabled</p>
                              <p className="mt-0.5 text-xl font-semibold tracking-tight text-ui-text">{splitLines(selectedScopeDraft.enabledMcpServers).length}</p>
                            </div>
                            <div className="px-5 py-3.5">
                              <p className="type-caption text-ui-text-muted">Tools</p>
                              <p className="mt-0.5 text-xl font-semibold tracking-tight text-ui-text">{workflowOptions.mcpTools.length}</p>
                            </div>
                          </div>
                          <div className="min-w-0 overflow-x-auto">
                            <table className="min-w-[38rem] w-full table-fixed text-left" aria-label="Workflow MCP servers">
                              <thead>
                                <tr className="border-t border-b border-ui-border">
                                  <th scope="col" className="type-label px-4 py-4 sm:px-6">Server</th>
                                  <th scope="col" className="type-label px-4 py-4 sm:px-6">Status</th>
                                  <th scope="col" className="type-label px-4 py-4 sm:px-6">Enabled</th>
                                </tr>
                              </thead>
                              <tbody>
                                {mcpServerRows.length > 0 ? mcpServerRows.map(({ serverId, server, selected, toolCount }) => {
                                  return (
                                    <tr
                                      key={serverId}
                                      data-mcp-server-row="true"
                                      tabIndex={0}
                                      role="button"
                                      onClick={() => setActiveMcpToolsServerId(serverId)}
                                      onKeyDown={(event) => {
                                        if (event.key === 'Enter' || event.key === ' ') {
                                          event.preventDefault();
                                          setActiveMcpToolsServerId(serverId);
                                        }
                                      }}
                                      className="cursor-pointer border-b border-ui-bg transition-colors hover:bg-accent-soft/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
                                    >
                                      <td className="px-4 py-4 sm:px-6">
                                        <div className="flex min-w-0 gap-3">
                                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-ui-border bg-ui-bg">
                                            <ICONS.Server className="h-5 w-5 text-accent-strong" />
                                          </div>
                                          <div className="min-w-0">
                                            <h5 className="type-panel-title truncate" title={server?.name || serverId}>{server?.name || getScopeTokenLabel(serverId)}</h5>
                                            <p className="type-code mt-1 truncate text-ui-text-muted" title={serverId}>{serverId}</p>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-4 py-4 sm:px-6">
                                        <span className={selected ? 'type-label text-status-success-text' : 'type-label text-ui-text-muted'}>
                                          {selected ? 'Enabled' : server?.status || 'Available'}
                                        </span>
                                        <p className="type-caption mt-0.5 text-ui-text-muted">{toolCount} tools</p>
                                      </td>
                                      <td className="px-4 py-4 sm:px-6" onClick={(event) => event.stopPropagation()}>
                                        <ScopeSwitch
                                          checked={selected}
                                          disabled={!canManageWorkflowScope || !isEditingMcpScope}
                                          label={`${selected ? 'Disable' : 'Enable'} ${serverId}`}
                                          onChange={(enabled) => setWorkflowScopeValue(selectedWorkflow.id, 'enabledMcpServers', serverId, enabled)}
                                        />
                                      </td>
                                    </tr>
                                  );
                                }) : (
                                  <tr>
                                    <td colSpan={3} className="px-4 py-6 text-sm font-semibold text-ui-text-muted sm:px-6">
                                      No MCP servers are available.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                          {canManageWorkflowScope && isEditingMcpScope && (
                          <div className="border-t border-ui-border bg-ui-bg p-4">
                            <div className="grid gap-3 lg:grid-cols-[minmax(8rem,1fr)_8rem_minmax(10rem,1.2fr)_auto]">
                              <label className="block">
                                <span className="type-micro-label">Name</span>
                                <input
                                  value={mcpServerDraft.name}
                                  onChange={(event) => setMcpServerDraft((draft) => ({ ...draft, name: event.target.value }))}
                                  className="mt-2 min-h-10 w-full rounded-md border border-ui-border bg-ui-surface px-3 text-sm font-semibold text-ui-text outline-none focus:border-accent"
                                />
                              </label>
                              <label className="block">
                                <span className="type-micro-label">Type</span>
                                <select
                                  value={mcpServerDraft.type}
                                  onChange={(event) => setMcpServerDraft((draft) => ({ ...draft, type: event.target.value }))}
                                  className="mt-2 min-h-10 w-full rounded-md border border-ui-border bg-ui-surface px-3 text-sm font-semibold text-ui-text outline-none focus:border-accent"
                                >
                                  <option value="http">HTTP</option>
                                  <option value="stdio">stdio</option>
                                </select>
                              </label>
                              <label className="block">
                                <span className="type-micro-label">URL or command</span>
                                <input
                                  value={mcpServerDraft.type === 'http' ? mcpServerDraft.baseUrl : mcpServerDraft.command}
                                  onChange={(event) => setMcpServerDraft((draft) => draft.type === 'http'
                                    ? { ...draft, baseUrl: event.target.value }
                                    : { ...draft, command: event.target.value })}
                                  className="mt-2 min-h-10 w-full rounded-md border border-ui-border bg-ui-surface px-3 text-sm font-semibold text-ui-text outline-none focus:border-accent"
                                />
                              </label>
                              <div className="flex items-end">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => void addWorkflowMcpServer()}
                                  disabled={creatingMcpServer || !mcpServerDraft.name.trim()}
                                >
                                  <ICONS.Plus className="h-4 w-4" />
                                  {creatingMcpServer ? 'Adding...' : 'Add server'}
                                </Button>
                              </div>
                            </div>
                            {mcpServerError && (
                              <div className="mt-3 rounded-md border border-status-danger/30 bg-status-danger-soft p-3 text-xs font-semibold text-status-danger-text">
                                {mcpServerError}
                              </div>
                            )}
                          </div>
                          )}
                        </section>

                      </div>
                    </section>
                  )}
                </div>
              )}

              {activeTab === 'skills' && selectedScopeDraft && (
                <div className="space-y-6">
                  <section data-workflow-skill-selection="true" className="space-y-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <h3 className="type-row-title">Workflow skills</h3>
                        <p className="type-caption mt-2 max-w-2xl">
                          Skills are selected once for this workflow and passed to every run.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {isEditingSkillScope ? (
                          <>
                            <Button
                              type="button"
                              variant="tertiary"
                              size="sm"
                              onClick={cancelEditingScopeTab}
                              disabled={savingScope === selectedWorkflow.id}
                            >
                              <ICONS.X className="h-4 w-4" />
                              Cancel
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => void saveWorkflowScope('skills')}
                              disabled={!canManageWorkflowScope || !selectedScopeDirty || savingScope === selectedWorkflow.id}
                            >
                              <ICONS.CheckCircle2 className="h-4 w-4" />
                              {savingScope === selectedWorkflow.id ? 'Saving...' : 'Save skills'}
                            </Button>
                          </>
                        ) : (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => startEditingScopeTab('skills')}
                            disabled={!canManageWorkflowScope}
                          >
                            <ICONS.Pencil className="h-4 w-4" />
                            Edit skills
                          </Button>
                        )}
                      </div>
                    </div>
                    {isEditingSkillScope && (
                      <div className="rounded-md border border-status-warning/25 bg-status-warning-soft px-3 py-2 text-xs font-semibold text-status-warning-text">
                        {selectedScopeDirty ? 'Draft changes are not saved yet. Save skills to apply them to future sessions.' : 'Editing draft. Changes are not saved until you click Save skills.'}
                      </div>
                    )}
                    {scopeSaveError?.tab === 'skills' && (
                      <div className="rounded-md border border-status-danger/30 bg-status-danger-soft p-3 text-xs font-semibold text-status-danger-text">
                        {scopeSaveError.message}
                      </div>
                    )}
                    {scopeSaveResult?.tab === 'skills' && (
                      <div className="rounded-md border border-status-success/30 bg-status-success-soft p-3 text-xs font-semibold text-status-success-text">
                        {scopeSaveResult.message}
                      </div>
                    )}
                    {canManageWorkflowScope && isEditingSkillScope && (
                      <select
                        value=""
                        onChange={(event) => {
                          if (event.target.value) setWorkflowScopeValue(selectedWorkflow.id, 'enabledSkills', event.target.value, true);
                        }}
                        disabled={!canManageWorkflowScope}
                        className="min-h-10 rounded-md border border-ui-border bg-ui-bg px-3 text-sm font-semibold text-ui-text outline-none focus:border-accent"
                      >
                        <option value="">Add skill</option>
                        {workflowOptions.skills.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {uniqueValues([
                        ...workflowOptions.skills.map((option) => option.value),
                        ...selectedWorkflow.enabledSkills,
                        ...splitLines(selectedScopeDraft.enabledSkills)
                      ]).map((skill) => {
                        const selected = splitLines(selectedScopeDraft.enabledSkills).includes(skill);
                        return (
                          <button
                            key={skill}
                            type="button"
                            disabled={!canManageWorkflowScope || !isEditingSkillScope}
                            onClick={() => setWorkflowScopeValue(selectedWorkflow.id, 'enabledSkills', skill, !selected)}
                            className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                              selected
                                ? 'border-accent/30 bg-accent-soft text-accent-strong'
                                : 'border-ui-border bg-ui-bg text-ui-text-muted hover:text-ui-text'
                            }`}
                            aria-pressed={selected}
                          >
                            {skill}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="space-y-8">
                  <section className="space-y-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <h3 className="type-row-title">General settings</h3>
                        <p className="type-caption mt-2 max-w-2xl">
                          Edit the saved workflow prompt and library metadata.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {isEditingWorkflow ? (
                          <>
                            <Button
                              type="button"
                              variant="tertiary"
                              size="sm"
                              onClick={() => cancelEditingWorkflow(selectedWorkflow)}
                              disabled={updatingWorkflowId === selectedWorkflow.id}
                            >
                              <ICONS.X className="h-4 w-4" />
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              variant="primary"
                              size="sm"
                              onClick={() => void saveWorkflowDefinition()}
                              disabled={!canManageWorkflowScope || updatingWorkflowId === selectedWorkflow.id || !selectedWorkflowEditDraft?.name.trim()}
                            >
                              <ICONS.CheckCircle2 className="h-4 w-4" />
                              {updatingWorkflowId === selectedWorkflow.id ? 'Saving...' : 'Save workflow'}
                            </Button>
                          </>
                        ) : (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => startEditingWorkflow(selectedWorkflow)}
                            disabled={!canManageWorkflowScope}
                          >
                            <ICONS.Pencil className="h-4 w-4" />
                            Edit workflow
                          </Button>
                        )}
                      </div>
                    </div>
                    {(workflowUpdateError || workflowUpdateResult) && (
                      <div className={`rounded-md border px-3 py-2 text-xs font-semibold ${
                        workflowUpdateError
                          ? 'border-status-danger/30 bg-status-danger-soft text-status-danger-text'
                          : 'border-status-success/30 bg-status-success-soft text-status-success-text'
                      }`}>
                        {workflowUpdateError || workflowUpdateResult}
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-4 rounded-lg border border-ui-border bg-ui-bg px-4 py-3">
                      <div>
                        <h4 className="type-row-title">{selectedWorkflow.status === 'active' ? 'Active' : 'Inactive'}</h4>
                        <p className="type-caption mt-1 text-ui-text-muted">
                          {selectedWorkflow.status === 'active' ? 'This workflow is available to run.' : 'This workflow is hidden from new runs.'}
                        </p>
                      </div>
                      <ScopeSwitch
                        checked={selectedWorkflow.status === 'active'}
                        disabled={!canManageWorkflowScope || updatingWorkflowId === selectedWorkflow.id}
                        label="Toggle workflow active state"
                        onChange={(active) => void toggleWorkflowActive(selectedWorkflow, active)}
                      />
                    </div>
                    <div className="border-y border-ui-border">
                      {isEditingWorkflow && selectedWorkflowEditDraft ? (
                        <>
                          <label className="grid gap-2 py-4 lg:grid-cols-[10rem_minmax(0,1fr)] lg:items-center">
                            <span className="type-micro-label text-ui-text-muted">Workflow name</span>
                            <input
                              value={selectedWorkflowEditDraft.name}
                              onChange={(event) => updateWorkflowEditDraft(selectedWorkflow.id, { name: event.target.value })}
                              className="mt-2 min-h-10 w-full rounded-md border border-ui-border bg-ui-bg px-3 text-sm font-semibold text-ui-text outline-none focus:border-accent"
                            />
                          </label>
                          <label className="grid gap-2 border-t border-ui-border py-4 lg:grid-cols-[10rem_minmax(0,1fr)] lg:items-center">
                            <span className="type-micro-label text-ui-text-muted">Description</span>
                            <input
                              value={selectedWorkflowEditDraft.description}
                              onChange={(event) => updateWorkflowEditDraft(selectedWorkflow.id, { description: event.target.value })}
                              className="mt-2 min-h-10 w-full rounded-md border border-ui-border bg-ui-bg px-3 text-sm font-semibold text-ui-text outline-none focus:border-accent"
                            />
                          </label>
                          <label className="grid gap-2 border-t border-ui-border py-4 lg:grid-cols-[10rem_minmax(0,1fr)]">
                            <span className="type-micro-label text-ui-text-muted">Workflow prompt</span>
                            <textarea
                              value={selectedWorkflowEditDraft.starterPrompt}
                              onChange={(event) => updateWorkflowEditDraft(selectedWorkflow.id, { starterPrompt: event.target.value })}
                              className="mt-2 min-h-28 w-full resize-y rounded-md border border-ui-border bg-ui-bg px-3 py-2 text-sm font-medium leading-6 text-ui-text outline-none focus:border-accent"
                            />
                          </label>
                        </>
                      ) : (
                        <>
                          <div className="grid gap-2 py-4 lg:grid-cols-[10rem_minmax(0,1fr)]">
                            <div className="type-micro-label text-ui-text-muted">Workflow name</div>
                            <div className="text-sm font-semibold text-ui-text">{selectedWorkflow.name}</div>
                          </div>
                          <div className="grid gap-2 border-t border-ui-border py-4 lg:grid-cols-[10rem_minmax(0,1fr)]">
                            <div className="type-micro-label text-ui-text-muted">Description</div>
                            <div className="max-w-3xl text-sm font-medium leading-6 text-ui-text">
                              {selectedWorkflow.description || 'No description set.'}
                            </div>
                          </div>
                          <div className="grid gap-2 border-t border-ui-border py-4 lg:grid-cols-[10rem_minmax(0,1fr)]">
                            <div className="type-micro-label text-ui-text-muted">Workflow prompt</div>
                            <div className="max-w-3xl whitespace-pre-wrap text-sm font-medium leading-6 text-ui-text">
                              {selectedWorkflow.starterPrompt}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </section>

                  <section className="border-t border-ui-border pt-6">
                    <h3 className="type-row-title">Workflow tags</h3>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {selectedWorkflow.tags.length > 0 ? selectedWorkflow.tags.map((tag) => (
                        <span key={tag} className="inline-flex items-center gap-1.5 rounded-md border border-ui-border bg-ui-bg px-2.5 py-1.5 text-xs font-bold text-ui-text-muted">
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeWorkflowTag(selectedWorkflow.id, tag)}
                            aria-label={`Remove workflow tag ${tag}`}
                            className="rounded-sm text-ui-text-muted transition-colors hover:bg-ui-surface hover:text-status-danger-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
                          >
                            <ICONS.X className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      )) : (
                        <span className="type-caption">No tags yet.</span>
                      )}
                    </div>
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <label className="sr-only" htmlFor="workflow-tag-input">Add workflow tag</label>
                      <input
                        id="workflow-tag-input"
                        value={newWorkflowTag}
                        onChange={(event) => setNewWorkflowTag(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            addWorkflowTag(selectedWorkflow.id);
                          }
                        }}
                        placeholder="Add tag"
                        className="min-h-10 flex-1 rounded-md border border-ui-border bg-ui-bg px-3 text-sm font-semibold text-ui-text outline-none placeholder:text-ui-text-muted/60 focus:border-accent"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => addWorkflowTag(selectedWorkflow.id)}
                        disabled={!newWorkflowTag.trim()}
                      >
                        <ICONS.Plus className="h-4 w-4" />
                        Add tag
                      </Button>
                    </div>
                  </section>

                  <section className="border-t border-ui-border pt-6">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <h3 className="type-row-title text-status-danger-text">Delete workflow</h3>
                        <p className="type-caption mt-2">
                          {selectedWorkflow.source === 'user'
                            ? 'Remove this user-authored workflow from the workspace.'
                            : 'Built-in workflows cannot be deleted from the console. Deactivate this workflow to hide it from new runs.'}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedWorkflow.source === 'user' && deleteWorkflowId === selectedWorkflow.id ? (
                          <>
                            <Button
                              type="button"
                              variant="tertiary"
                              size="sm"
                              onClick={() => setDeleteWorkflowId('')}
                              disabled={deletingWorkflowId === selectedWorkflow.id}
                            >
                              <ICONS.X className="h-4 w-4" />
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              variant="danger"
                              size="sm"
                              onClick={() => void deleteSelectedWorkflow(selectedWorkflow)}
                              disabled={deletingWorkflowId === selectedWorkflow.id}
                            >
                              <ICONS.Trash2 className="h-4 w-4" />
                              {deletingWorkflowId === selectedWorkflow.id ? 'Deleting...' : 'Delete'}
                            </Button>
                          </>
                        ) : (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => setDeleteWorkflowId(selectedWorkflow.id)}
                            disabled={!canManageWorkflowScope || selectedWorkflow.source !== 'user'}
                          >
                            <ICONS.Trash2 className="h-4 w-4" />
                            {selectedWorkflow.source === 'user' ? 'Delete workflow' : 'Delete unavailable'}
                          </Button>
                        )}
                      </div>
                    </div>
                    {deleteWorkflowError && (
                      <div className="mt-4 rounded-md border border-status-danger/30 bg-status-danger-soft px-3 py-2 text-xs font-semibold text-status-danger-text">
                        {deleteWorkflowError}
                      </div>
                    )}
                  </section>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
      {selectedWorkflow && selectedScopeDraft && activeMcpToolsServerId && activeMcpToolsStep && (
        <WorkflowMcpToolsDialog
          serverId={activeMcpToolsServerId}
          serverName={activeMcpToolsServer?.name || getScopeTokenLabel(activeMcpToolsServerId)}
          tools={activeMcpToolsRows}
          canManageTools={canManageWorkflowScope && isEditingMcpScope}
          onClose={() => setActiveMcpToolsServerId('')}
          onToggleTool={(toolName, enabled) => setStepScopeValue(selectedWorkflow.id, activeMcpToolsStep.id, 'allowedTools', toolName, enabled)}
        />
      )}
    </div>
  );
};
