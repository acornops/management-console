import React from 'react';
import { Button } from '@/components/common/Button';
import { SelectOption } from '@/components/common/Select';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formInputClassName, formTextareaClassName } from '@/components/common/formControlStyles';
import {
  type AgentDefinition
} from '@/pages/agents/agentModel';
import {
  type AgentDefinitionApi,
  type AgentTriggerDefinitionApi
} from '@/services/control-plane/agentApi';
import { type WorkflowOptionsCatalog } from '@/services/control-plane/workflowApi';
import type { Workspace } from '@/types';

export interface WorkspaceAgentsPageProps {
  workspace: Workspace;
}

export type AgentDraft = {
  name: string;
  description: string;
  instructions: string;
  providerType: AgentDefinition['providerType'];
};

export type AgentEditDraft = AgentDraft & {
  status: AgentDefinition['status'];
  ownerUserId: string;
  mcpServers: string;
  tools: string;
  skills: string;
  targetScope: string;
  contextScope: string;
  writeToolsRequireApproval: boolean;
  allowExternalData: boolean;
};

export type LocalNotice = { tone: 'success' | 'danger'; message: string };
export type AgentCapabilityOptions = Pick<WorkflowOptionsCatalog, 'mcpServers' | 'mcpTools' | 'skills'>;
export type EventTriggerType = Extract<AgentTriggerDefinitionApi['type'], 'webhook' | 'audit_event' | 'target_event' | 'external_adapter'>;

export const agentFormInputClassName = formInputClassName('mt-2');
export const agentFormTextareaClassName = formTextareaClassName('mt-2');

export const statusTone = (status: AgentDefinition['status']): 'success' | 'warning' | 'neutral' => {
  if (status === 'active') return 'success';
  if (status === 'draft') return 'warning';
  return 'neutral';
};

export const healthTone = (status: AgentDefinition['health']['status']): 'success' | 'warning' | 'neutral' => {
  if (status === 'healthy') return 'success';
  if (status === 'degraded') return 'warning';
  return 'neutral';
};

export const splitInput = (value: string): string[] =>
  value.split(/\n|,/).map((item) => item.trim()).filter(Boolean);

const joinInput = (values: string[]): string => values.join('\n');

export const appendUniqueToken = (current: string, value: string): string => {
  const values = splitInput(current);
  return joinInput(values.includes(value) ? values : [...values, value]);
};

const uniqueStrings = (values: string[]): string[] => Array.from(new Set(values.filter(Boolean)));

export const createFallbackAgentCapabilityOptions = (agents: AgentDefinition[]): AgentCapabilityOptions => ({
  mcpServers: uniqueStrings(agents.flatMap((agent) => agent.mcpServers)).map((value) => ({ value, label: value })),
  mcpTools: uniqueStrings(agents.flatMap((agent) => agent.tools)).map((value) => ({ value, label: value })),
  skills: uniqueStrings(agents.flatMap((agent) => agent.skills)).map((value) => ({ value, label: value }))
});

const normalizeAgentCapabilityOption = (option: unknown): AgentCapabilityOptions['mcpServers'][number] | null => {
  if (typeof option === 'string' && option.trim()) return { value: option.trim(), label: option.trim() };
  if (!option || typeof option !== 'object') return null;
  const value = option as { value?: unknown; label?: unknown; description?: unknown; disabled?: unknown; disabledReason?: unknown };
  if (typeof value.value !== 'string' || !value.value.trim()) return null;
  return {
    value: value.value,
    label: typeof value.label === 'string' && value.label.trim() ? value.label : value.value,
    description: typeof value.description === 'string' ? value.description : undefined,
    disabled: typeof value.disabled === 'boolean' ? value.disabled : undefined,
    disabledReason: typeof value.disabledReason === 'string' ? value.disabledReason : undefined
  };
};

const normalizeAgentCapabilityOptionList = (
  options: unknown,
  fallback: AgentCapabilityOptions['mcpServers']
): AgentCapabilityOptions['mcpServers'] => {
  if (!Array.isArray(options)) return fallback;
  const normalized = options
    .map(normalizeAgentCapabilityOption)
    .filter((option): option is NonNullable<typeof option> => Boolean(option));
  return normalized.length > 0 ? normalized : fallback;
};

export const normalizeAgentCapabilityOptions = (
  catalog: WorkflowOptionsCatalog,
  fallback: AgentCapabilityOptions
): AgentCapabilityOptions => ({
  mcpServers: normalizeAgentCapabilityOptionList(catalog.mcpServers, fallback.mcpServers),
  mcpTools: normalizeAgentCapabilityOptionList(catalog.mcpTools, fallback.mcpTools),
  skills: normalizeAgentCapabilityOptionList(catalog.skills, fallback.skills)
});

const listValuesChanged = (left: string[], right: string): boolean => {
  const rightValues = splitInput(right);
  if (left.length !== rightValues.length) return true;
  return left.some((value, index) => value !== rightValues[index]);
};

const targetScopeTokens = (scope: AgentDefinitionApi['targetScope']): string[] => {
  if (Array.isArray(scope)) return scope;
  if (!scope || typeof scope !== 'object') return ['workspace:current'];
  return [
    scope.type ? `scope:${scope.type}` : '',
    ...(scope.targetTypes || []).map((targetType) => `target-type:${targetType}`),
    ...(scope.targetIds || []).map((targetId) => `target:${targetId}`)
  ].filter(Boolean);
};

const approvalPolicyFor = (policy: AgentDefinitionApi['approvalPolicy']): AgentDefinition['approvalPolicy'] => {
  const mode = typeof policy?.mode === 'string' ? policy.mode : undefined;
  return {
    sensitiveActions: mode === 'none' ? 'allowed' : 'approval_required',
    writeActions: policy?.writeToolsRequireApproval === false ? 'allowed' : 'approval_required'
  };
};

const trustPolicyFor = (policy: AgentDefinitionApi['trustPolicy'], providerType: AgentDefinition['providerType']): AgentDefinition['trustPolicy'] => ({
  boundary: typeof policy?.level === 'string' ? `${policy.level} trust boundary` : providerType === 'external' ? 'External provider requires approval' : 'Internal AcornOps runtime',
  dataEgress: policy?.allowExternalData === true ? 'External data allowed by policy' : 'Workspace approved context only'
});

export const mapApiAgent = (item: AgentDefinitionApi, fallback: AgentDefinition, workspaceName: string): AgentDefinition => {
  const providerType = item.providerType || (item.source === 'system' ? 'internal' : fallback.providerType);
  const contextScope = item.contextGrants || item.contextScope || fallback.contextScope;
  return {
    ...fallback,
    id: item.id,
    workspaceId: item.workspaceId,
    name: item.name,
    description: item.description || fallback.description,
    instructions: item.instructions || fallback.instructions,
    status: item.status || fallback.status,
    source: item.source || fallback.source,
    providerType,
    ownerUserId: item.ownerUserId || fallback.ownerUserId,
    owner: item.ownerUserId || fallback.owner || workspaceName,
    version: item.version || fallback.version,
    mcpServers: item.mcpServers || [],
    tools: item.tools || [],
    skills: item.skills || [],
    targetScope: targetScopeTokens(item.targetScope),
    contextScope,
    approvalPolicy: approvalPolicyFor(item.approvalPolicy),
    trustPolicy: trustPolicyFor(item.trustPolicy, providerType),
    capabilities: item.capabilities || fallback.capabilities,
    workflowsUsingAgent: item.workflowsUsingAgent || fallback.workflowsUsingAgent,
    triggers: item.triggers || fallback.triggers,
    auditHistory: fallback.auditHistory,
    health: {
      status: item.activity?.lastStatus === 'failed' ? 'degraded' : item.status === 'active' ? 'healthy' : fallback.health.status,
      summary: item.activity?.lastRunAt ? `Last run ${item.activity.lastRunAt}` : fallback.health.summary
    }
  };
};

export const canManageWorkspaceAgents = (workspace: Workspace): boolean => {
  return workspace.permissions?.manage_agents === true;
};

export const formatAgentDisplayValue = (value: string): string =>
  value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
export const formatPolicyValue = (value: string): string => formatAgentDisplayValue(value);

export const providerTypeOptions: Array<SelectOption<AgentDefinition['providerType']>> = [
  { value: 'internal', label: 'Internal' },
  { value: 'external', label: 'External' }
];

export const statusOptions: Array<SelectOption<AgentDefinition['status']>> = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'disabled', label: 'Disabled' }
];

export const eventTriggerTypeOptions: Array<SelectOption<EventTriggerType>> = [
  { value: 'webhook', label: 'Webhook' },
  { value: 'audit_event', label: 'Audit event' },
  { value: 'target_event', label: 'Target event' },
  { value: 'external_adapter', label: 'External adapter' }
];

export const createAgentEditDraft = (agent: AgentDefinition): AgentEditDraft => ({
  name: agent.name,
  description: agent.description,
  instructions: agent.instructions,
  providerType: agent.providerType,
  status: agent.status,
  ownerUserId: agent.ownerUserId || '',
  mcpServers: joinInput(agent.mcpServers),
  tools: joinInput(agent.tools),
  skills: joinInput(agent.skills),
  targetScope: joinInput(agent.targetScope),
  contextScope: joinInput(agent.contextScope),
  writeToolsRequireApproval: agent.approvalPolicy.writeActions === 'approval_required',
  allowExternalData: agent.trustPolicy.dataEgress.toLowerCase().includes('external')
});

export const getAgentEditChangeSummary = (agent: AgentDefinition, draft: AgentEditDraft): string[] => {
  const changes: string[] = [];
  if (agent.name !== draft.name.trim() || agent.description !== draft.description.trim() || agent.instructions !== draft.instructions.trim()) {
    changes.push('Name, purpose, or instructions changed');
  }
  if (agent.status !== draft.status) changes.push(`Status will change to ${draft.status}`);
  if ((agent.ownerUserId || '') !== draft.ownerUserId.trim()) changes.push('Owner changed');
  if (agent.providerType !== draft.providerType) changes.push('Provider changed');
  if (listValuesChanged(agent.mcpServers, draft.mcpServers) || listValuesChanged(agent.tools, draft.tools) || listValuesChanged(agent.skills, draft.skills)) {
    changes.push('Capability sources changed');
  }
  if (listValuesChanged(agent.targetScope, draft.targetScope)) changes.push('Target scope changed');
  if (listValuesChanged(agent.contextScope, draft.contextScope)) changes.push('Context access changed');
  if ((agent.approvalPolicy.writeActions === 'approval_required') !== draft.writeToolsRequireApproval) changes.push('Write approval rule changed');
  if (agent.trustPolicy.dataEgress.toLowerCase().includes('external') !== draft.allowExternalData) changes.push('External data rule changed');
  return changes.length > 0 ? changes : ['No changes to save.'];
};

export const CapabilityList: React.FC<{ title: string; values: string[] }> = ({ title, values }) => (
  <div>
    <div className="type-micro-label">{title}</div>
    <div className="mt-2 grid gap-1">
      {values.length > 0
        ? values.map((value) => <span key={value} className="type-code truncate rounded-md bg-ui-bg px-2 py-1 text-xs text-ui-text-muted">{value}</span>)
        : <span className="type-caption text-ui-text-muted">No values configured.</span>}
    </div>
  </div>
);

export const AgentCapabilityOptionButtons: React.FC<{
  options: AgentCapabilityOptions['mcpServers'];
  onSelect: (value: string) => void;
}> = ({ options, onSelect }) => (
  <div className="mt-2 flex flex-wrap gap-2" aria-label="Capability catalog options">
    {options.length > 0
      ? options.slice(0, 8).map((option) => (
        <button
          key={option.value}
          type="button"
          className="max-w-full rounded-md border border-ui-border bg-ui-surface px-2.5 py-1.5 text-left text-xs font-bold text-ui-text-muted transition-colors hover:bg-ui-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => onSelect(option.value)}
          disabled={option.disabled}
          title={option.disabledReason || option.description || option.label}
        >
          <span className="block max-w-44 truncate">{option.label}</span>
        </button>
      ))
      : <span className="type-caption text-ui-text-muted">No catalog options loaded. Paste an approved ID if needed.</span>}
  </div>
);

export const AgentAssignmentSummary: React.FC<{ agent: AgentDefinition }> = ({ agent }) => {
  const approvalCount = [agent.approvalPolicy.sensitiveActions, agent.approvalPolicy.writeActions].filter((value) => value === 'approval_required').length;
  const approvalSummary = approvalCount > 0
    ? `${approvalCount} approval ${approvalCount === 1 ? 'gate' : 'gates'} configured`
    : 'No approval gates configured';

  return (
    <section aria-label="Assignment summary" className="mt-5">
      <div className="type-micro-label text-ui-text-muted">Assignment summary</div>
      <dl className="mt-2 grid min-w-0 overflow-hidden rounded-md border border-ui-border bg-ui-bg sm:grid-cols-2 xl:grid-cols-4">
        <AgentReadinessFact label="Owner" value={agent.owner} />
        <AgentReadinessFact label="Health" value={formatAgentDisplayValue(agent.health.status)} />
        <AgentReadinessFact label="Provider" value={formatAgentDisplayValue(agent.providerType)} />
        <AgentReadinessFact label="Approvals" value={approvalSummary} />
      </dl>
    </section>
  );
};

const AgentReadinessFact: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="min-w-0 border-b border-ui-border px-3 py-2 last:border-b-0 sm:border-r sm:last:border-r-0 xl:border-b-0">
    <dt className="type-micro-label text-ui-text-muted">{label}</dt>
    <dd className="mt-1 min-w-0 break-words text-sm font-semibold text-ui-text [overflow-wrap:anywhere]">{value}</dd>
  </div>
);

export const AgentActivationChecklist: React.FC<{
  agent: AgentDefinition;
  onReviewAccess: () => void;
  onRunReadiness: () => void;
  readinessDisabled: boolean;
}> = ({ agent, onReviewAccess, onRunReadiness, readinessDisabled }) => {
  const hasScope = agent.targetScope.length > 0 && agent.contextScope.length > 0;
  const hasWriteApproval = agent.approvalPolicy.writeActions === 'approval_required';
  const hasReadinessRun = agent.auditHistory.some((entry) => entry.summary.includes('Test run') || entry.summary.includes('Test queued'));
  const workflowLabel = agent.workflowsUsingAgent.length > 0
    ? `${agent.workflowsUsingAgent.length} assigned workflow${agent.workflowsUsingAgent.length === 1 ? '' : 's'}`
    : 'No assigned workflows';
  const items = [
    { label: 'Agent status is active', complete: agent.status === 'active', detail: formatAgentDisplayValue(agent.status) },
    { label: 'Health check is healthy', complete: agent.health.status === 'healthy', detail: agent.health.summary },
    { label: 'Target and context scope reviewed', complete: hasScope, detail: `${agent.targetScope.length} targets, ${agent.contextScope.length} context grants` },
    { label: 'Write actions require approval', complete: hasWriteApproval, detail: formatPolicyValue(agent.approvalPolicy.writeActions) },
    { label: 'Workflow impact checked', complete: agent.workflowsUsingAgent.length === 0, detail: workflowLabel },
    { label: 'Run readiness test before launch', complete: hasReadinessRun, detail: hasReadinessRun ? 'Readiness activity recorded' : 'No readiness test in recent activity' }
  ];

  return (
    <section aria-label="Agent activation checklist" className="border-b border-ui-border bg-ui-surface px-5 py-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h3 className="type-panel-title">Activation checklist</h3>
          <p className="type-caption mt-1 text-ui-text-muted">Check these before assigning the agent to a workflow run.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="tertiary" size="sm" onClick={onReviewAccess}>Review access</Button>
          <Button type="button" variant="tertiary" size="sm" onClick={onRunReadiness} disabled={readinessDisabled}>Run readiness</Button>
        </div>
      </div>
      <div className="mt-3 grid gap-2 lg:grid-cols-2">
        {items.map((item) => (
          <div key={item.label} className="flex min-w-0 items-start justify-between gap-3 rounded-md border border-ui-border bg-ui-bg px-3 py-2">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-ui-text">{item.label}</div>
              <div className="type-caption mt-1 min-w-0 break-words text-ui-text-muted [overflow-wrap:anywhere]">{item.detail}</div>
            </div>
            <StatusBadge tone={item.complete ? 'success' : 'warning'}>{item.complete ? 'Done' : 'Review'}</StatusBadge>
          </div>
        ))}
      </div>
    </section>
  );
};

export const TokenGroup: React.FC<{ title: string; values: string[] }> = ({ title, values }) => (
  <div>
    <div className="type-micro-label">{title}</div>
    <div className="mt-2 flex flex-wrap gap-2">
      {values.length > 0
        ? values.map((value) => <span key={value} className="rounded-md border border-ui-border bg-ui-bg px-2.5 py-1.5 text-xs font-bold text-ui-text-muted">{value}</span>)
        : <span className="type-caption text-ui-text-muted">No scope configured.</span>}
    </div>
  </div>
);

export const Notice: React.FC<React.PropsWithChildren> = ({ children }) => (
  <div className="mb-4 whitespace-normal break-words rounded-md border border-status-warning/30 bg-status-warning-soft px-3 py-2 text-xs font-semibold text-status-warning-text [overflow-wrap:anywhere]">
    {children}
  </div>
);
