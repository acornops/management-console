import React from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { FilterToggleGroup, type CompactControlItem } from '@/components/common/ComponentVocabulary';
import { PageSearchInput } from '@/components/common/PageSearchInput';
import { PageHeader } from '@/components/common/PageComposition';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ICONS } from '@/constants';
import type { AgentDefinition } from '@/pages/agents/agentModel';
import { statusTone } from '@/pages/WorkspaceAgentsPage.helpers';
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
  const params = new URLSearchParams({ q: workflowName });
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
  selectedAgent?: AgentDefinition;
  drawerOpen: boolean;
  canManageAgents: boolean;
  query: string;
  onQueryChange: (query: string) => void;
  catalogFilters: AgentCatalogFilters;
  onCatalogFiltersChange: (filters: AgentCatalogFilters) => void;
  onOpenManagement: (agent: AgentDefinition) => void;
}

export const WorkspaceAgentsCatalog: React.FC<WorkspaceAgentsCatalogProps> = ({
  agents,
  visibleAgents,
  selectedAgent,
  drawerOpen,
  canManageAgents,
  query,
  onQueryChange,
  catalogFilters,
  onCatalogFiltersChange,
  onOpenManagement
}) => {
  const { t } = useTranslation();
  const filterOptions = React.useMemo<Array<CompactControlItem<AgentFocusFilter>>>(() => [
    { value: 'all', label: t('agentsWorkflows.agents.filters.all'), count: agents.length },
    { value: 'active', label: t('agentsWorkflows.agents.status.active'), count: agents.filter((agent) => agent.status === 'active').length },
    { value: 'draft', label: t('agentsWorkflows.agents.status.draft'), count: agents.filter((agent) => agent.status === 'draft').length },
    { value: 'disabled', label: t('agentsWorkflows.agents.status.disabled'), count: agents.filter((agent) => agent.status === 'disabled').length }
  ], [agents, t]);

  return (
    <section aria-label={t('agentsWorkflows.agents.catalogLabel')} className="min-w-0">
      <div className="mb-3 flex min-w-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-1">
        <h2 className="type-panel-title">{t('agentsWorkflows.agents.catalogHeading')}</h2>
        <span className="type-caption whitespace-nowrap text-ui-text-muted">{t('agentsWorkflows.agents.resultCount', { visible: visibleAgents.length, total: agents.length })}</span>
      </div>
      <div aria-label={t('agentsWorkflows.agents.toolbarLabel')} className="mb-4 flex min-w-0 flex-col gap-3 border-y border-ui-border py-3 xl:flex-row xl:items-center xl:justify-between">
        <PageSearchInput value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={t('agentsWorkflows.agents.searchPlaceholder')} aria-label={t('agentsWorkflows.agents.searchLabel')} className="w-full min-w-0 lg:w-full xl:max-w-xl" />
        <div className="min-w-0 max-w-full overflow-x-auto pb-1 xl:overflow-visible xl:pb-0">
          <FilterToggleGroup activeValue={catalogFilters.focus} items={filterOptions} onValueChange={(focus) => onCatalogFiltersChange({ focus })} ariaLabel={t('agentsWorkflows.agents.statusFilterLabel')} className="flex-nowrap" />
        </div>
      </div>

      {visibleAgents.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-ui-border bg-ui-surface">
          <ul role="list" className="divide-y divide-ui-border">
            {visibleAgents.map((agent) => {
              const selected = drawerOpen && selectedAgent?.id === agent.id;
              return (
                <li key={agent.id} className={`group relative isolate min-w-0 overflow-hidden transition-colors duration-200 ${selected ? 'bg-accent-soft/45 ring-1 ring-inset ring-accent/30' : 'hover:bg-ui-bg/70'}`}>
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
                        <span className="type-row-title block break-words text-ui-text transition-colors group-hover:text-accent-strong group-focus-within:text-accent-strong [overflow-wrap:anywhere]">{agent.name}</span>
                        <span className="type-caption mt-1 block break-words text-ui-text-muted [overflow-wrap:anywhere]">{agent.description}</span>
                        <span className="type-caption mt-1.5 block break-words text-ui-text-muted [overflow-wrap:anywhere]">{t('agentsWorkflows.agents.ownerVersion', { owner: agent.owner, version: agent.version })}</span>
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
        </div>
      ) : (
        <div role="status" className="grid min-h-48 place-items-center border-y border-ui-border px-4 py-10 text-center">
          <div className="max-w-md">
            <ICONS.Bot className="mx-auto h-6 w-6 text-ui-text-muted" aria-hidden="true" />
            <h2 className="mt-3 type-panel-title">{agents.length === 0 ? t('agentsWorkflows.agents.emptyTitle') : t('agentsWorkflows.agents.noResultsTitle')}</h2>
            <p className="type-caption mt-2 text-ui-text-muted">{agents.length === 0 ? t(canManageAgents ? 'agentsWorkflows.agents.emptyBody' : 'agentsWorkflows.agents.emptyReadOnlyBody') : t('agentsWorkflows.agents.noResultsBody')}</p>
          </div>
        </div>
      )}
    </section>
  );
};
