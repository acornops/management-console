import React from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  Button,
  CollectionState,
  CollectionLoadingSkeleton,
  createDiscoveryFilterGroup,
  DiscoveryFilterBar,
  EmptyState,
  MenuItem,
  PageHeader,
  StatusBadge,
  type DiscoveryFilterOption
} from '@acornops/ui';
import { Copy, Settings } from 'lucide-react';
import { ICONS } from '@/constants';
import {
  ResourceCatalogActionMenu,
  ResourceCatalogCard
} from '@/features/targets/catalog/TargetCatalogPrimitives';
import type { AgentDefinition } from '@/pages/agents/agentModel';
import { AgentAvatar } from '@/pages/agents/AgentAvatar';

export type AgentFocusFilter = 'all' | 'active' | 'draft' | 'disabled';
export interface AgentCatalogFilters { focus: AgentFocusFilter }
export const defaultAgentCatalogFilters: AgentCatalogFilters = { focus: 'all' };
export const hasActiveAgentCatalogFilters = (filters: AgentCatalogFilters): boolean => filters.focus !== 'all';

export const WorkspaceAgentsRouteHeader: React.FC<{
  canManageAgents: boolean;
  onCreateAgent: () => void;
}> = ({ canManageAgents, onCreateAgent }) => {
  const { t } = useTranslation();
  return (
    <PageHeader
      title={t('agentsWorkflows.agents.title')}
      description={t('agentsWorkflows.agents.description')}
      actions={
        <Button type="button" variant="primary" size="md" onClick={onCreateAgent} disabled={!canManageAgents}>
          <ICONS.Plus className="h-4 w-4" aria-hidden="true" />
          {t('agentsWorkflows.agents.newAgent')}
        </Button>
      }
    />
  );
};

export function getAgentCapabilitySummary(agent: AgentDefinition, t: TFunction): string {
  const counts = [
    agent.mcpServers.length > 0 ? t('agentsWorkflows.agents.capabilityCounts.mcpServer', { count: agent.mcpServers.length }) : '',
    agent.skills.length > 0 ? t('agentsWorkflows.agents.capabilityCounts.skill', { count: agent.skills.length }) : '',
    agent.tools.length > 0 ? t('agentsWorkflows.agents.capabilityCounts.tool', { count: agent.tools.length }) : ''
  ].filter(Boolean);
  return counts.length > 0 ? counts.join(' · ') : t('agentsWorkflows.agents.noCapabilities');
}

function agentReadinessWarning(agent: AgentDefinition, t: TFunction): string {
  if (agent.status === 'disabled') return t('agentsWorkflows.agents.readiness.reactivate');
  if (agent.status === 'draft') return t('agentsWorkflows.agents.readiness.activate');
  return agent.readiness.reasons[0] || t('agentsWorkflows.agents.readiness.finishConfiguration');
}

interface WorkspaceAgentsCatalogProps {
  agents: AgentDefinition[];
  visibleAgents: AgentDefinition[];
  loading?: boolean;
  canManageAgents: boolean;
  query: string;
  onQueryChange: (query: string) => void;
  catalogFilters: AgentCatalogFilters;
  dockedQuickChatOpen: boolean;
  duplicatingAgentId: string;
  onCatalogFiltersChange: (filters: AgentCatalogFilters) => void;
  onClearFilters: () => void;
  onOpenManagement: (agent: AgentDefinition) => void;
  onQuickChat: (agent: AgentDefinition) => void;
  onDuplicate: (agent: AgentDefinition) => void;
  onOpenSettings?: (agent: AgentDefinition) => void;
}

export const WorkspaceAgentsCatalog: React.FC<WorkspaceAgentsCatalogProps> = ({
  agents,
  visibleAgents,
  loading = false,
  canManageAgents,
  query,
  onQueryChange,
  catalogFilters,
  dockedQuickChatOpen,
  duplicatingAgentId,
  onCatalogFiltersChange,
  onClearFilters,
  onOpenManagement,
  onQuickChat,
  onDuplicate,
  onOpenSettings
}) => {
  const { t } = useTranslation();
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);
  const filterOptions = React.useMemo<Array<DiscoveryFilterOption<AgentFocusFilter>>>(() => [
    { value: 'all', label: t('agentsWorkflows.agents.filters.all'), count: loading ? undefined : agents.length },
    { value: 'active', label: t('agentsWorkflows.agents.status.active'), count: loading ? undefined : agents.filter((agent) => agent.status === 'active').length },
    { value: 'draft', label: t('agentsWorkflows.agents.status.draft'), count: loading ? undefined : agents.filter((agent) => agent.status === 'draft').length },
    { value: 'disabled', label: t('agentsWorkflows.agents.status.disabled'), count: loading ? undefined : agents.filter((agent) => agent.status === 'disabled').length }
  ], [agents, loading, t]);
  const hasActiveFilters = Boolean(query.trim()) || hasActiveAgentCatalogFilters(catalogFilters);

  return (
    <section
      aria-label={t('agentsWorkflows.agents.catalogLabel')}
      data-agent-catalog-layout={dockedQuickChatOpen ? 'docked' : 'full'}
      data-resource-card-catalog="true"
      className="resource-card-catalog min-w-0"
    >
      {(loading || agents.length > 0 || hasActiveFilters) && (
        <DiscoveryFilterBar
          idPrefix="agent-catalog"
          query={query}
          queryLabel={t('agentsWorkflows.agents.searchLabel')}
          queryPlaceholder={t('agentsWorkflows.agents.searchPlaceholder')}
          queryClearLabel={t('common.clearSearch')}
          resultSummary={loading ? t('agentsWorkflows.agents.loading') : t('agentsWorkflows.agents.resultCount', { visible: visibleAgents.length, total: agents.length })}
          filters={[createDiscoveryFilterGroup<AgentFocusFilter>({
            id: 'status',
            label: t('common.status'),
            value: catalogFilters.focus,
            defaultValue: 'all',
            options: filterOptions,
            onChange: (focus) => onCatalogFiltersChange({ focus })
          })]}
          clearAllLabel={t('common.clearAll')}
          onQueryChange={onQueryChange}
          onClearAll={onClearFilters}
          className="mb-4"
        />
      )}
      <CollectionState
        phase={loading ? 'loading' : 'ready'}
        itemCount={visibleAgents.length}
        filtered={hasActiveFilters && agents.length > 0}
        loading={
          <CollectionLoadingSkeleton
            label={t('agentsWorkflows.agents.loading')}
            variant="card-grid"
            gridClassName="resource-card-grid gap-4"
            gridProps={{ 'data-agent-card-grid': 'true', 'data-resource-card-grid': 'true' }}
            announce={false}
          />
        }
        empty={<EmptyState embedded icon={<ICONS.Bot />} title={t('agentsWorkflows.agents.emptyTitle')} description={t(canManageAgents ? 'agentsWorkflows.agents.emptyBody' : 'agentsWorkflows.agents.emptyReadOnlyBody')} />}
        filteredEmpty={<EmptyState embedded icon={<ICONS.Search />} title={t('agentsWorkflows.agents.noResultsTitle')} description={t('agentsWorkflows.agents.noResultsBody')} />}
        error={null}
      >
        <div data-agent-card-grid="true" data-resource-card-grid="true" className="resource-card-grid min-w-0 gap-4">
          {visibleAgents.map((agent) => {
            const readinessBlocked = agent.status !== 'active' || agent.readiness.status !== 'ready';
            const readinessLabel = agent.readiness.status === 'blocked'
              ? t('agentsWorkflows.agents.readiness.blocked')
              : t('agentsWorkflows.agents.readiness.needsSetup');
            const purpose = agent.description || agent.instructions || t('agentsWorkflows.agents.noPurpose');
            const capabilitySummary = getAgentCapabilitySummary(agent, t);
            const readinessWarning = agentReadinessWarning(agent, t);
            return (
              <ResourceCatalogCard
                key={agent.id}
                cardAttribute={{ 'data-agent-card': 'true', 'data-agent-id': agent.id }}
                actionAttribute={{ 'data-agent-card-primary-action': 'true' }}
                actionLabel={t('agentsWorkflows.agents.openDetailsLabel', { name: agent.name })}
                onActivate={() => onOpenManagement(agent)}
              >
                <div className="flex min-h-[4.5rem] min-w-0 items-start gap-3 px-4 py-4">
                  <AgentAvatar emoji={agent.avatarEmoji} />
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <h3 className="type-panel-title min-w-0 truncate text-ui-text" title={agent.name}>{agent.name}</h3>
                      {readinessBlocked && <StatusBadge tone="warning">{readinessLabel}</StatusBadge>}
                    </div>
                    <span aria-hidden="true" className="type-caption type-emphasis mt-1 inline-flex items-center gap-1 text-ui-text-muted transition-colors group-hover:text-accent-strong group-focus-within:text-accent-strong">
                      {t('agentsWorkflows.agents.viewDetails')} <ICONS.ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <div className="pointer-events-auto relative z-20 flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={(event) => {
                        event.stopPropagation();
                        onQuickChat(agent);
                      }}
                      aria-label={t('agentChat.quickChatLabel', { name: agent.name })}
                      data-agent-quick-chat="true"
                    >
                      <ICONS.MessageSquare className="h-4 w-4" aria-hidden="true" />
                      {t('agentsWorkflows.agents.quickChat')}
                    </Button>
                    {canManageAgents && onOpenSettings && (
                      <ResourceCatalogActionMenu
                        label={t('agentsWorkflows.agents.actionsLabel', { name: agent.name })}
                        open={openMenuId === agent.id}
                        onOpenChange={(open) => setOpenMenuId(open ? agent.id : null)}
                        triggerAttribute={{ 'data-agent-overflow-action': 'toggle' }}
                      >
                        <MenuItem
                          disabled={Boolean(duplicatingAgentId)}
                          onClick={() => { setOpenMenuId(null); onDuplicate(agent); }}
                        >
                          <Copy className="h-4 w-4 text-ui-text-muted" aria-hidden="true" />
                          {duplicatingAgentId === agent.id ? t('agentsWorkflows.duplicating') : t('agentsWorkflows.duplicate')}
                        </MenuItem>
                        <MenuItem onClick={() => { setOpenMenuId(null); onOpenSettings(agent); }}>
                          <Settings className="h-4 w-4 text-ui-text-muted" aria-hidden="true" />
                          {t('agentChat.tabs.settings')}
                        </MenuItem>
                      </ResourceCatalogActionMenu>
                    )}
                  </div>
                </div>
                <div className="border-t border-ui-border px-4 py-4">
                  <p className="type-body line-clamp-2 text-ui-text-muted" title={purpose}>{purpose}</p>
                  <p
                    className="type-caption type-emphasis mt-3 line-clamp-2 text-ui-text"
                    title={`${agent.owner} · ${capabilitySummary}`}
                  >
                    {agent.owner} · {capabilitySummary}
                  </p>
                  {readinessBlocked && (
                    <p className="type-caption type-emphasis mt-2 line-clamp-2 text-status-warning-text" title={readinessWarning}>
                      {readinessWarning}
                    </p>
                  )}
                </div>
              </ResourceCatalogCard>
            );
          })}
        </div>
      </CollectionState>
    </section>
  );
};
