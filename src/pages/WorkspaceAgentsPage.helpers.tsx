import React from 'react';
import { SelectOption } from '@/components/common/Select';
import {
  filterAgentDefinitions,
  type AgentDefinition
} from '@/pages/agents/agentModel';
import {
  type AgentDefinitionApi,
  type AgentActivityRecordApi
} from '@/services/control-plane/agentApi';
import { type WorkflowOptionsCatalog } from '@/services/control-plane/workflowApi';
import type { Workspace } from '@/types';
import { formatUserDateTime } from '@/utils/dateTime';

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
  allowExternalData: boolean;
};

export type AgentEditDraftSource = {
  agentId: string;
  draft: AgentEditDraft;
};

export type LocalNotice = { tone: 'success' | 'danger'; message: string; actionHref?: string; actionLabel?: string };
export type AgentCapabilityOptions = Pick<WorkflowOptionsCatalog, 'mcpServers' | 'mcpTools' | 'skills'>;
export type AgentCatalogFocus = 'all' | 'active' | 'draft' | 'disabled';

export const statusTone = (status: AgentDefinition['status']): 'success' | 'warning' | 'danger' => {
  if (status === 'active') return 'success';
  if (status === 'draft') return 'warning';
  return 'danger';
};

export const isSystemProvidedAgent = (agent: Pick<AgentDefinition, 'origin'>): boolean =>
  agent.origin.type === 'template';

export const splitInput = (value: string): string[] =>
  value.split(/\n|,/).map((item) => item.trim()).filter(Boolean);

const joinInput = (values: string[]): string => values.join('\n');

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
  options: unknown
): AgentCapabilityOptions['mcpServers'] => {
  if (!Array.isArray(options)) return [];
  const normalized = options
    .map(normalizeAgentCapabilityOption)
    .filter((option): option is NonNullable<typeof option> => Boolean(option));
  return normalized;
};

export const normalizeAgentCapabilityOptions = (
  catalog: WorkflowOptionsCatalog
): AgentCapabilityOptions => ({
  mcpServers: normalizeAgentCapabilityOptionList(catalog.mcpServers),
  mcpTools: normalizeAgentCapabilityOptionList(catalog.mcpTools),
  skills: normalizeAgentCapabilityOptionList(catalog.skills)
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

const trustPolicyFor = (policy: AgentDefinitionApi['trustPolicy']): AgentDefinition['trustPolicy'] => ({
  boundary: typeof policy?.level === 'string' ? `${policy.level} trust boundary` : 'Restricted workspace trust boundary',
  dataEgress: policy?.allowExternalData === true ? 'Additional data access allowed by policy' : 'Workspace approved context only'
});

export const mapApiAgent = (
  item: AgentDefinitionApi,
  workspaceName: string,
  ownerLabelsByUserId: Map<string, string> = new Map()
): AgentDefinition => {
  const ownerUserId = item.ownerUserId;
  const owner = item.origin.type === 'template'
    ? 'AcornOps'
    : ownerUserId ? ownerLabelsByUserId.get(ownerUserId) || ownerUserId : workspaceName;
  return {
    id: item.id,
    workspaceId: item.workspaceId,
    name: item.name,
    description: item.description || '',
    instructions: item.instructions || '',
    status: item.status || 'draft',
    origin: item.origin,
    kind: item.kind,
    reviewState: item.reviewState,
    providerType: item.providerType || 'internal',
    ownerUserId,
    owner,
    createdBy: item.createdBy,
    version: item.version || 1,
    mcpServers: item.mcpInstallations?.map((server) => server.name) || item.mcpServers || [],
    mcpInstallations: item.mcpInstallations || [],
    tools: [
      ...(item.tools || []),
      ...(item.mcpInstallations || []).flatMap((server) => server.tools
        .filter((tool) => tool.enabled && tool.reviewState === 'approved')
        .map((tool) => tool.alias))
    ],
    skills: item.skillInstallations?.map((skill) => skill.name) || item.skills || [],
    skillInstallations: item.skillInstallations || [],
    semanticCapabilityIds: item.semanticCapabilityIds || [],
    targetScope: targetScopeTokens(item.targetScope),
    contextScope: item.contextGrants || item.contextScope || [],
    permissionMode: item.permissionMode || 'ask_before_changes',
    trustPolicy: trustPolicyFor(item.trustPolicy),
    capabilities: item.capabilities || [],
    workflowsUsingAgent: item.workflowsUsingAgent || [],
    triggers: item.triggers || [],
    activity: {
      runCount: item.activity?.runCount ?? 0,
      lastRunAt: item.activity?.lastRunAt,
      lastStatus: item.activity?.lastStatus as AgentDefinition['activity']['lastStatus'] | undefined
    },
    auditHistory: []
  };
};

export const withAgentAuditHistoryEntry = (
  agent: AgentDefinition,
  summary: string,
  occurredAt = new Date().toISOString()
): AgentDefinition => ({
  ...agent,
  auditHistory: [
    {
      id: `agent-audit-${occurredAt}-${summary.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
      summary,
      occurredAt
    },
    ...agent.auditHistory
  ]
});

export const canManageWorkspaceAgents = (workspace: Workspace): boolean => {
  return workspace.permissions?.manage_agents === true;
};

export const isWorkspaceCatalogAgent = (agent: AgentDefinition): boolean => {
  return Boolean(agent.id);
};

export function filterVisibleAgents(
  agents: AgentDefinition[],
  query: string,
  filters: { focus: AgentCatalogFocus }
): AgentDefinition[] {
  const statusOrder: Record<AgentDefinition['status'], number> = { active: 0, draft: 1, disabled: 2 };
  return filterAgentDefinitions(agents.filter(isWorkspaceCatalogAgent), query)
    .filter((agent) => filters.focus === 'all' || agent.status === filters.focus)
    .sort((left, right) => statusOrder[left.status] - statusOrder[right.status] || left.name.localeCompare(right.name));
}

export const summarizeAgentActivityRecord = (activity: AgentActivityRecordApi): string => `Activity ${activity.status} on v${activity.agentVersion}`;

export const formatAgentTimestamp = (value: string | undefined, fallback = '-', locale?: Intl.LocalesArgument): string =>
  formatUserDateTime(value, { fallback: value || fallback, locale });

export const activityStateFromRecord = (
  current: AgentDefinition['activity'],
  activity: AgentActivityRecordApi | undefined,
  activityCount: number
): AgentDefinition['activity'] => activity
  ? {
    runCount: Math.max(current.runCount, activityCount),
    lastRunAt: activity.updatedAt || activity.createdAt,
    lastStatus: activity.status
  }
  : current;

export const auditHistoryFromAgentActivity = (activity: AgentActivityRecordApi[]): AgentDefinition['auditHistory'] =>
  activity.map((record) => ({ id: record.id, summary: summarizeAgentActivityRecord(record), occurredAt: record.updatedAt || record.createdAt }));

export const mergeAgentAuditHistoryWithActivity = (
  current: AgentDefinition['auditHistory'],
  activity: AgentActivityRecordApi[]
): AgentDefinition['auditHistory'] => {
  const refreshed = auditHistoryFromAgentActivity(activity);
  const refreshedIds = new Set(refreshed.map((entry) => entry.id));
  return [...refreshed, ...current.filter((entry) => !refreshedIds.has(entry.id))]
    .sort((left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt));
};

export const formatAgentDisplayValue = (value: string): string =>
  value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
export const statusOptions: Array<SelectOption<AgentDefinition['status']>> = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'disabled', label: 'Disabled' }
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
  allowExternalData: agent.trustPolicy.dataEgress.toLowerCase().includes('external')
});

export const agentEditDraftsEqual = (left: AgentEditDraft, right: AgentEditDraft): boolean =>
  Object.keys(left).every((key) => left[key as keyof AgentEditDraft] === right[key as keyof AgentEditDraft]);

export const shouldRefreshAgentEditDraft = (
  agentId: string,
  currentDraft: AgentEditDraft | null,
  source: AgentEditDraftSource | null
): boolean => !currentDraft || !source || source.agentId !== agentId || agentEditDraftsEqual(currentDraft, source.draft);

export const getAgentEditChangeSummary = (agent: AgentDefinition, draft: AgentEditDraft): string[] => {
  const changes: string[] = [];
  if (agent.name !== draft.name.trim() || agent.description !== draft.description.trim() || agent.instructions !== draft.instructions.trim()) {
    changes.push('Name, purpose, or instructions changed');
  }
  if (agent.status !== draft.status) changes.push(`Status will change to ${draft.status}`);
  if ((agent.ownerUserId || '') !== draft.ownerUserId.trim()) changes.push('Owner changed');
  if (listValuesChanged(agent.mcpServers, draft.mcpServers) || listValuesChanged(agent.tools, draft.tools) || listValuesChanged(agent.skills, draft.skills)) {
    changes.push('Capability sources changed');
  }
  return changes;
};

export const isAgentEditDraftDirty = (agent: AgentDefinition, draft: AgentEditDraft): boolean => getAgentEditChangeSummary(agent, draft).length > 0;

export const CapabilityList: React.FC<{ title: string; values: string[] }> = ({ title, values }) => (
  <div className="min-w-0">
    <div className="type-micro-label">{title}</div>
    <div className="mt-2 grid gap-1">
      {values.length > 0
        ? values.map((value) => <span key={value} title={value} className="type-code min-w-0 break-words rounded-md bg-ui-bg px-2 py-1 text-xs text-ui-text-muted [overflow-wrap:anywhere]">{value}</span>)
        : <span className="type-caption text-ui-text-muted">No values configured.</span>}
    </div>
  </div>
);

export const Notice: React.FC<React.PropsWithChildren<{ title?: string; actionLabel?: string; onAction?: () => void }>> = ({ actionLabel, children, onAction, title }) => (
  <section role="status" className="mb-4 whitespace-normal break-words rounded-md border border-ui-border bg-ui-surface px-3 py-2 text-xs font-semibold text-ui-text-muted shadow-sm [overflow-wrap:anywhere]">
    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        {title && <div className="type-micro-label text-ui-text">{title}</div>}
        <div className={title ? 'mt-1' : ''}>{children}</div>
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="control-target min-h-8 shrink-0 rounded-md border border-ui-border bg-ui-bg px-2.5 py-1 text-xs font-bold text-ui-text shadow-sm transition-colors hover:border-accent/35 hover:bg-accent-soft/45 hover:text-accent-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
        >
          {actionLabel}
        </button>
      )}
    </div>
  </section>
);
