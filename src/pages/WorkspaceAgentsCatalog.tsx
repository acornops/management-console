import React from 'react';
import { CollectionState } from '@/components/common/CollectionState';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { createDiscoveryFilterGroup, DiscoveryFilterBar, type DiscoveryFilterOption } from '@/components/common/DiscoveryFilterBar';
import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageComposition';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ICONS } from '@/constants';
import type { AgentDefinition } from '@/pages/agents/agentModel';
import { isSystemProvidedAgent, statusTone } from '@/pages/WorkspaceAgentsPage.helpers';
import { AppPaths } from '@/utils/routes';

export type AgentFocusFilter = 'all' | 'active' | 'draft' | 'disabled';

export interface AgentCatalogFilters {
  focus: AgentFocusFilter;
}

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
      <Button
        type="button"
        variant="primary"
        size="md"
        className="whitespace-nowrap self-start lg:self-auto"
        onClick={onCreateAgent}
        disabled={!canManageAgents}
        title={!canManageAgents ? t('agentsWorkflows.agents.createPermission') : undefined}
      >
        <ICONS.Plus className="h-4 w-4" aria-hidden="true" />
        {t('agentsWorkflows.agents.newAgent')}
      </Button>
      }
    />
  );
};

export function getAgentCapabilitySummary(agent: AgentDefinition, t: TFunction): string {
  return [
    t('agentsWorkflows.agents.capabilityCounts.mcpServer', { count: agent.mcpServers.length }),
    t('agentsWorkflows.agents.capabilityCounts.tool', { count: agent.tools.length }),
    t('agentsWorkflows.agents.capabilityCounts.skill', { count: agent.skills.length })
  ].join(' · ');
}

export interface AgentWorkflowAssignmentSummary {
  countLabel: string;
  emptyLabel?: string;
  firstWorkflow?: string;
  overflowLabel?: string;
}

export function getAgentWorkflowAssignmentSummary(agent: AgentDefinition, t: TFunction): AgentWorkflowAssignmentSummary {
  const count = agent.workflowsUsingAgent.length;
  return {
    countLabel: t('agentsWorkflows.agents.workflowAssignment.count', { count }),
    emptyLabel: count === 0 ? t('agentsWorkflows.agents.workflowAssignment.none') : undefined,
    firstWorkflow: agent.workflowsUsingAgent[0],
    overflowLabel: count > 1 ? t('agentsWorkflows.agents.workflowAssignment.overflow', { count: count - 1 }) : undefined
  };
}

function workflowCatalogHref(workspaceId: string, workflowName: string): string {
  const params = new URLSearchParams({ workflow: workflowName });
  return `${AppPaths.workspaceWorkflows(workspaceId)}?${params.toString()}`;
}

const catalogGridClass = 'pointer-events-none relative z-10 grid min-w-0 grid-cols-2 gap-x-5 gap-y-3 px-4 py-3.5 lg:grid-cols-[minmax(14rem,1.4fr)_7rem_minmax(12rem,0.8fr)_minmax(13rem,1fr)_2.75rem] lg:items-center';

const CatalogCell: React.FC<React.PropsWithChildren<{ label: string; className?: string }>> = ({ label, className = '', children }) => (
  <div className={`min-w-0 ${className}`.trim()}>
    <span className="type-micro-label mb-1 block text-ui-text-muted lg:sr-only">{label}</span>
    {children}
  </div>
);

const WorkflowAssignment: React.FC<{ agent: AgentDefinition }> = ({ agent }) => {
  const { t } = useTranslation();
  const summary = getAgentWorkflowAssignmentSummary(agent, t);
  return (
    <div className="min-w-0">
      <span className="type-caption block font-semibold text-ui-text">{summary.countLabel}</span>
      {summary.firstWorkflow ? (
        <div className="mt-0.5 flex min-w-0 items-center gap-2">
          <a
            href={workflowCatalogHref(agent.workspaceId, summary.firstWorkflow)}
            aria-label={t('agentsWorkflows.agents.workflowAssignment.open', { name: summary.firstWorkflow })}
            className="pointer-events-auto relative z-20 inline-flex min-h-11 min-w-0 items-center rounded-sm text-sm font-medium text-ui-text-muted underline-offset-4 transition-colors hover:text-accent-strong hover:underline focus:outline-none focus-visible:text-accent-strong focus-visible:ring-2 focus-visible:ring-accent/35"
          >
            <span className="min-w-0 break-words [overflow-wrap:anywhere]">{summary.firstWorkflow}</span>
          </a>
          {summary.overflowLabel && <span className="type-caption shrink-0 font-semibold text-ui-text-muted">{summary.overflowLabel}</span>}
        </div>
      ) : (
        <span className="type-caption mt-1 block text-ui-text-muted">{summary.emptyLabel}</span>
      )}
    </div>
  );
};

interface WorkspaceAgentsCatalogProps {
  agents: AgentDefinition[];
  visibleAgents: AgentDefinition[];
  loading?: boolean;
  selectedAgent?: AgentDefinition;
  drawerOpen: boolean;
  canManageAgents: boolean;
  query: string;
  onQueryChange: (query: string) => void;
  catalogFilters: AgentCatalogFilters;
  onCatalogFiltersChange: (filters: AgentCatalogFilters) => void;
  onClearFilters: () => void;
  onOpenManagement: (agent: AgentDefinition) => void;
}

export const WorkspaceAgentsCatalog: React.FC<WorkspaceAgentsCatalogProps> = ({
  agents,
  visibleAgents,
  loading = false,
  selectedAgent,
  drawerOpen,
  canManageAgents,
  query,
  onQueryChange,
  catalogFilters,
  onCatalogFiltersChange,
  onClearFilters,
  onOpenManagement
}) => {
  const { t } = useTranslation();
  const filterOptions = React.useMemo<Array<DiscoveryFilterOption<AgentFocusFilter>>>(() => [
    { value: 'all', label: t('agentsWorkflows.agents.filters.all'), count: agents.length },
    { value: 'active', label: t('agentsWorkflows.agents.status.active'), count: agents.filter((agent) => agent.status === 'active').length },
    { value: 'draft', label: t('agentsWorkflows.agents.status.draft'), count: agents.filter((agent) => agent.status === 'draft').length },
    { value: 'disabled', label: t('agentsWorkflows.agents.status.disabled'), count: agents.filter((agent) => agent.status === 'disabled').length }
  ], [agents, t]);
  const hasActiveFilters = Boolean(query.trim()) || hasActiveAgentCatalogFilters(catalogFilters);

  return (
    <section aria-label={t('agentsWorkflows.agents.catalogLabel')} className="min-w-0">
      {(loading || agents.length > 0 || hasActiveFilters) && (
        <DiscoveryFilterBar
          idPrefix="agent-catalog"
          query={query}
          queryLabel={t('agentsWorkflows.agents.searchLabel')}
          queryPlaceholder={t('agentsWorkflows.agents.searchPlaceholder')}
          queryClearLabel={t('common.clearSearch')}
          resultSummary={loading ? t('common.loading') : hasActiveFilters ? t('agentsWorkflows.agents.resultCount', { visible: visibleAgents.length, total: agents.length }) : t('agentsWorkflows.agents.totalCount', { count: agents.length })}
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
        className="overflow-hidden rounded-lg border border-ui-border bg-ui-surface"
        loading={(
          <div role="status" aria-live="polite">
          <span className="sr-only">{t('common.loading')}</span>
          <ul aria-hidden="true" className="divide-y divide-ui-border">
            {Array.from({ length: 3 }).map((_, index) => (
              <li key={index} className="grid min-h-28 grid-cols-[minmax(0,1fr)_5rem] items-center gap-5 px-4 py-3.5 lg:grid-cols-[minmax(14rem,1.4fr)_7rem_minmax(12rem,0.8fr)_minmax(13rem,1fr)_2.75rem]">
                <span className="space-y-2">
                  <span className="block h-3 w-36 max-w-full rounded-full bg-ui-border/75" />
                  <span className="block h-2.5 w-64 max-w-full rounded-full bg-ui-border/60" />
                  <span className="block h-2.5 w-28 max-w-full rounded-full bg-ui-border/60" />
                </span>
                <span className="h-6 w-16 rounded-full bg-ui-border/60" />
                <span className="hidden h-3 w-32 max-w-full rounded-full bg-ui-border/60 lg:block" />
                <span className="hidden h-3 w-36 max-w-full rounded-full bg-ui-border/60 lg:block" />
                <span className="hidden h-4 w-4 rounded bg-ui-border/60 lg:block" />
              </li>
            ))}
          </ul>
          </div>
        )}
        empty={<EmptyState embedded icon={<ICONS.Bot />} title={t('agentsWorkflows.agents.emptyTitle')} description={t(canManageAgents ? 'agentsWorkflows.agents.emptyBody' : 'agentsWorkflows.agents.emptyReadOnlyBody')} />}
        filteredEmpty={<EmptyState embedded icon={<ICONS.Search />} title={t('agentsWorkflows.agents.noResultsTitle')} description={t('agentsWorkflows.agents.noResultsBody')} />}
        error={null}
      >
          <ul role="list" className="divide-y divide-ui-border">
            {visibleAgents.map((agent) => {
              const selected = drawerOpen && selectedAgent?.id === agent.id;
              return (
                <li key={agent.id} data-agent-catalog-row={agent.id} className={`group relative isolate min-w-0 overflow-hidden transition-colors duration-200 ${selected ? 'bg-accent-soft/45 ring-1 ring-inset ring-accent/30' : 'hover:bg-ui-bg/70'}`}>
                  <button
                    type="button"
                    aria-label={t('agentsWorkflows.agents.openProfile', { name: agent.name })}
                    aria-current={selected ? 'true' : undefined}
                    onClick={() => onOpenManagement(agent)}
                    className="control-target absolute inset-0 z-0 h-full w-full cursor-pointer rounded-none focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/45"
                  />
                  <div className={catalogGridClass}>
                    <CatalogCell label={t('agentsWorkflows.agents.fields.identity')} className="col-span-2 lg:col-span-1">
                      <span className="block min-w-0 pr-8 lg:pr-0">
                        <span className="flex min-w-0 flex-wrap items-center gap-2">
                          <span className="type-row-title break-words text-ui-text transition-colors group-hover:text-accent-strong group-focus-within:text-accent-strong [overflow-wrap:anywhere]">{agent.name}</span>
                          {isSystemProvidedAgent(agent) && (
                            <span className="type-micro-label shrink-0 rounded-full bg-accent-soft/45 px-2 py-0.5 text-accent-readable">
                              {t('common.providedByAcornOps')}
                            </span>
                          )}
                        </span>
                        <span className="type-caption mt-1 block break-words text-ui-text-muted [overflow-wrap:anywhere]">{agent.description}</span>
                        <span className="type-caption mt-1.5 block break-words font-semibold text-ui-text-muted [overflow-wrap:anywhere]">
                          {isSystemProvidedAgent(agent)
                            ? `v${agent.version}`
                            : t('agentsWorkflows.agents.ownerVersion', { owner: agent.owner, version: agent.version })}
                        </span>
                      </span>
                    </CatalogCell>
                    <CatalogCell label={t('agentsWorkflows.agents.fields.status')}>
                      <StatusBadge tone={statusTone(agent.status)}>{t(`agentsWorkflows.agents.status.${agent.status}`)}</StatusBadge>
                    </CatalogCell>
                    <CatalogCell label={t('agentsWorkflows.agents.fields.capabilities')}>
                      <span className="type-caption break-words font-semibold text-ui-text [overflow-wrap:anywhere]">{getAgentCapabilitySummary(agent, t)}</span>
                    </CatalogCell>
                    <CatalogCell label={t('agentsWorkflows.agents.fields.assignment')} className="col-span-2 lg:col-span-1"><WorkflowAssignment agent={agent} /></CatalogCell>
                    <div aria-hidden="true" className="absolute right-4 top-3.5 flex min-h-11 items-center justify-end lg:static">
                      <ICONS.ChevronRight className="h-4 w-4 shrink-0 text-ui-text-muted transition-colors group-hover:text-accent-strong group-focus-within:text-accent-strong" />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
      </CollectionState>
    </section>
  );
};
