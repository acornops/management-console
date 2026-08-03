import React from 'react';
import { SelectOption } from '@acornops/ui';
import { filterAgentDefinitions, type AgentDefinition } from '@/pages/agents/agentModel';
import type { AgentDefinitionApi } from '@/services/control-plane/agentApi';
import type { Workspace } from '@/types';
import type { AgentSubview } from '@/utils/routes';
import { formatUserDateTime } from '@/utils/dateTime';
import { formatIdentifierLabel } from '@/utils/textFormatting';
import { Button } from '@acornops/ui';

export interface WorkspaceAgentsPageProps {
  workspace: Workspace;
  currentUserId: string;
  isDark: boolean;
  routeState?: { kind: 'workspaceAgentDetail'; workspaceId: string; agentId: string; tab: AgentSubview };
  navigate: (path: string, options?: { replace?: boolean }) => void;
}

export type AgentDraft = {
  name: string;
  avatarEmoji: string;
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
  allowExternalData: boolean;
};

export type AgentEditDraftSource = {
  agentId: string;
  draft: AgentEditDraft;
};

export type LocalNotice = {
  tone: 'success' | 'danger';
  message: string;
  actionHref?: string;
  actionLabel?: string;
};
export type AgentCatalogFocus = 'all' | 'active' | 'draft' | 'disabled';

export const statusTone = (status: AgentDefinition['status']): 'success' | 'warning' | 'danger' => {
  if (status === 'active') return 'success';
  if (status === 'draft') return 'warning';
  return 'danger';
};

export const splitInput = (value: string): string[] =>
  value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);

const joinInput = (values: string[]): string => values.join('\n');

const listValuesChanged = (left: string[], right: string): boolean => {
  const rightValues = splitInput(right);
  if (left.length !== rightValues.length) return true;
  return left.some((value, index) => value !== rightValues[index]);
};

const trustPolicyFor = (policy: AgentDefinitionApi['trustPolicy']): AgentDefinition['trustPolicy'] => ({
  boundary: typeof policy?.level === 'string' ? `${policy.level} trust boundary` : 'Restricted workspace trust boundary',
  dataEgress: policy?.allowExternalData === true ? 'Additional data access allowed by policy' : 'External data access disabled'
});

export const mapApiAgent = (item: AgentDefinitionApi, workspaceName: string, ownerLabelsByUserId: Map<string, string> = new Map()): AgentDefinition => {
  const ownerUserId = item.ownerUserId;
  const owner = ownerUserId ? ownerLabelsByUserId.get(ownerUserId) || ownerUserId : workspaceName;
  return {
    id: item.id,
    workspaceId: item.workspaceId,
    name: item.name,
    avatarEmoji: item.avatarEmoji || '🤖',
    description: item.description || '',
    instructions: item.instructions || '',
    status: item.status || 'draft',
    reviewState: item.reviewState,
    providerType: item.providerType || 'internal',
    ownerUserId,
    owner,
    createdBy: item.createdBy,
    mcpServers: item.mcpInstallations?.map((server) => server.name) || item.mcpServers || [],
    mcpInstallations: item.mcpInstallations || [],
    tools: [
      ...(item.tools || []),
      ...(item.mcpInstallations || []).flatMap((server) => server.tools.filter((tool) => tool.enabled && tool.reviewState === 'approved').map((tool) => tool.alias))
    ],
    nativeToolConfigs: item.nativeToolConfigs || {},
    skills: item.skillInstallations?.map((skill) => skill.name) || item.skills || [],
    skillInstallations: item.skillInstallations || [],
    semanticCapabilityIds: item.semanticCapabilityIds || [],
    permissionMode: item.permissionMode || 'ask_before_changes',
    trustPolicy: trustPolicyFor(item.trustPolicy),
    capabilities: item.capabilities || [],
    readiness: item.readiness || {
      status: item.status === 'active' ? 'ready' : 'needs_setup',
      reasons: item.status === 'active' ? [] : ['Activate this Agent before starting a conversation.']
    },
    templateRef: item.templateRef
  };
};

export const canManageWorkspaceAgents = (workspace: Workspace): boolean => {
  return workspace.permissions?.manage_agents === true;
};

export const isWorkspaceCatalogAgent = (agent: AgentDefinition): boolean => {
  return Boolean(agent.id);
};

export function filterVisibleAgents(agents: AgentDefinition[], query: string, filters: { focus: AgentCatalogFocus }): AgentDefinition[] {
  const statusOrder: Record<AgentDefinition['status'], number> = {
    active: 0,
    draft: 1,
    disabled: 2
  };
  return filterAgentDefinitions(agents.filter(isWorkspaceCatalogAgent), query)
    .filter((agent) => filters.focus === 'all' || agent.status === filters.focus)
    .sort((left, right) => statusOrder[left.status] - statusOrder[right.status] || left.name.localeCompare(right.name));
}

export const formatAgentTimestamp = (value: string | undefined, fallback = '-', locale?: Intl.LocalesArgument): string =>
  formatUserDateTime(value, { fallback: value || fallback, locale });

export const formatAgentDisplayValue = (value: string): string => formatIdentifierLabel(value, 'title');
export const statusOptions: Array<SelectOption<AgentDefinition['status']>> = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'disabled', label: 'Disabled' }
];

export const createAgentEditDraft = (agent: AgentDefinition): AgentEditDraft => ({
  name: agent.name,
  avatarEmoji: agent.avatarEmoji,
  description: agent.description,
  instructions: agent.instructions,
  providerType: agent.providerType,
  status: agent.status,
  ownerUserId: agent.ownerUserId || '',
  mcpServers: joinInput(agent.mcpServers),
  tools: joinInput(agent.tools),
  skills: joinInput(agent.skills),
  allowExternalData: agent.trustPolicy.dataEgress.toLowerCase().includes('external')
});

export const agentEditDraftsEqual = (left: AgentEditDraft, right: AgentEditDraft): boolean =>
  Object.keys(left).every((key) => left[key as keyof AgentEditDraft] === right[key as keyof AgentEditDraft]);

export const shouldRefreshAgentEditDraft = (agentId: string, currentDraft: AgentEditDraft | null, source: AgentEditDraftSource | null): boolean =>
  !currentDraft || !source || source.agentId !== agentId || agentEditDraftsEqual(currentDraft, source.draft);

export const getAgentEditChangeSummary = (agent: AgentDefinition, draft: AgentEditDraft): string[] => {
  const changes: string[] = [];
  if (agent.name !== draft.name.trim() || agent.avatarEmoji !== draft.avatarEmoji || agent.description !== draft.description.trim() || agent.instructions !== draft.instructions.trim()) {
    changes.push('Identity, purpose, or instructions changed');
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
      {values.length > 0 ? (
        values.map((value) => (
          <span key={value} title={value} className="type-code min-w-0 break-words rounded-md bg-ui-bg px-2 py-1 text-ui-text-muted [overflow-wrap:anywhere]">
            {value}
          </span>
        ))
      ) : (
        <span className="type-caption text-ui-text-muted">No values configured.</span>
      )}
    </div>
  </div>
);

export const Notice: React.FC<
  React.PropsWithChildren<{
    title?: string;
    actionLabel?: string;
    onAction?: () => void;
  }>
> = ({ actionLabel, children, onAction, title }) => (
  <section
    role="status"
    className="mb-4 whitespace-normal break-words rounded-md border border-ui-border bg-ui-surface px-3 py-2 type-caption type-emphasis text-ui-text-muted shadow-sm [overflow-wrap:anywhere]"
  >
    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        {title && <div className="type-micro-label text-ui-text">{title}</div>}
        <div className={title ? 'mt-1' : ''}>{children}</div>
      </div>
      {actionLabel && onAction && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onAction}
          className="shrink-0 px-2.5 py-1"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  </section>
);
