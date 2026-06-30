import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/common/Button';
import { FilterToggleGroup, type CompactControlItem } from '@/components/common/ComponentVocabulary';
import { PageSearchInput } from '@/components/common/PageSearchInput';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ICONS } from '@/constants';
import { getAgentEligibilityLabel, getAgentReviewSignals, type AgentDefinition } from '@/pages/agents/agentModel';
import { formatAgentTimestamp } from '@/pages/WorkspaceAgentsPage.helpers';
import { AppPaths } from '@/utils/routes';

export type AgentFocusFilter = 'all' | 'needs_review' | 'needs_test' | 'ready';

export interface AgentCatalogFilters {
  focus: AgentFocusFilter;
}

export const defaultAgentCatalogFilters: AgentCatalogFilters = {
  focus: 'all'
};

export const hasActiveAgentCatalogFilters = (filters: AgentCatalogFilters): boolean => (
  filters.focus !== defaultAgentCatalogFilters.focus
);

export const WorkspaceAgentsRouteHeader: React.FC<{
  canManageAgents: boolean;
  onCreateAgent: () => void;
  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
}> = ({ canManageAgents, onCreateAgent, query, setQuery }) => (
  <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
    <div className="min-w-0 flex-1">
      <h1 className="type-route-title">Agents</h1>
      <p className="type-body mt-3 max-w-none break-words text-ui-text-muted">Browse workspace agent profiles and manage the capabilities workflows can use.</p>
    </div>
    <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
      <PageSearchInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search agents, workflows, tools" aria-label="Search agents" className="min-w-0 lg:w-80" />
      <Button type="button" variant="secondary" size="md" className="w-full justify-center whitespace-nowrap sm:w-auto" onClick={onCreateAgent} disabled={!canManageAgents}>
        <ICONS.Plus className="h-4 w-4" />
        New agent
      </Button>
    </div>
  </header>
);

function getAgentApprovalCheckSummary(agent: AgentDefinition): string {
  const sensitiveRequiresApproval = agent.approvalPolicy.sensitiveActions === 'approval_required';
  const writeRequiresApproval = agent.approvalPolicy.writeActions === 'approval_required';
  const writeBlocked = agent.approvalPolicy.writeActions === 'blocked';
  if (sensitiveRequiresApproval && writeBlocked) return 'Write actions blocked; sensitive actions require approval';
  if (sensitiveRequiresApproval && writeRequiresApproval) return 'Sensitive and write actions require approval';
  if (writeRequiresApproval) return 'Write actions require approval';
  if (sensitiveRequiresApproval) return 'Sensitive actions require approval';
  if (writeBlocked) return 'Write actions blocked';
  return 'No approvals required';
}

type AgentApprovalPolicyAction = AgentDefinition['approvalPolicy']['writeActions'];

function getApprovalPolicyChip(label: 'Write' | 'Sensitive', action: AgentApprovalPolicyAction) {
  if (action === 'blocked') {
    return {
      label: `${label} blocked`,
      Icon: ICONS.Lock,
      className: 'text-status-danger-text'
    };
  }
  if (action === 'approval_required') {
    return {
      label: `${label} approval`,
      Icon: ICONS.Shield,
      className: 'text-status-warning-text'
    };
  }
  return {
    label: `${label} allowed`,
    Icon: ICONS.CheckCircle2,
    className: 'text-status-success-text'
  };
}

function getAgentEligibilityReason(agent: AgentDefinition): string {
  const eligibility = getAgentEligibilityLabel(agent);
  const signals = getAgentReviewSignals(agent);
  if (eligibility === 'Ready') return agent.health.summary;
  if (eligibility === 'Disabled') return 'Definition disabled';
  if (eligibility === 'Needs test') return signals.includes('No recent readiness test') ? 'No test recorded' : agent.health.summary;
  if (signals.includes('Broad target scope')) return 'Access review';
  if (signals.includes('Write tools can run without approval')) return 'Ungated writes';
  if (signals.length > 0) return signals[0];
  return agent.health.summary;
}

function getAgentMetadataItems(agent: AgentDefinition): string[] {
  const items: string[] = [];
  if (agent.source === 'user') items.push('Custom');
  const owner = agent.owner.trim();
  if (agent.ownerUserId === 'system' || owner.toLowerCase() === 'system') {
    items.push('System');
  } else if (owner) {
    items.push(owner);
  }
  items.push(`v${agent.version}`);
  return items;
}

function workflowCatalogHref(workspaceId: string, workflowName: string): string {
  const params = new URLSearchParams({ workflow: workflowName, q: workflowName });
  return `${AppPaths.workspaceWorkflows(workspaceId)}?${params.toString()}`;
}

function getAgentWorkflowUsageSummary(agent: AgentDefinition): { countLabel: string; previewLabel: string } {
  const count = agent.workflowsUsingAgent.length;
  if (count === 0) {
    return { countLabel: 'Unassigned', previewLabel: 'Not assigned to a workflow' };
  }
  const firstWorkflow = agent.workflowsUsingAgent[0] || '';
  return {
    countLabel: `${count} ${count === 1 ? 'workflow' : 'workflows'}`,
    previewLabel: count === 1 ? firstWorkflow : `${firstWorkflow} +${count - 1} more`
  };
}

const catalogGridClass = 'grid min-w-0 gap-x-4 gap-y-3 px-4 py-3.5 xl:grid-cols-[minmax(0,1.45fr)_minmax(9rem,0.58fr)_minmax(10rem,0.68fr)_2rem] xl:items-center xl:gap-x-5';

interface CatalogCellProps {
  label: string;
  className?: string;
  children: React.ReactNode;
}

const CatalogCell: React.FC<CatalogCellProps> = ({ label, className = '', children }) => (
  <div className={`min-w-0 ${className}`}>
    <span className="type-micro-label mb-1 block text-ui-text-muted xl:hidden">{label}</span>
    {children}
  </div>
);

const AgentMetadataLine: React.FC<{ agent: AgentDefinition }> = ({ agent }) => (
  <span className="type-caption mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-ui-text-muted" aria-label={getAgentMetadataItems(agent).join(', ')}>
    {getAgentMetadataItems(agent).map((item, index) => (
      <span key={item} className="inline-flex min-w-0 items-center gap-x-2">
        {index > 0 && <span aria-hidden="true" className="h-1 w-1 shrink-0 rounded-full bg-ui-text-muted" />}
        <span className="min-w-0 break-words [overflow-wrap:anywhere]">{item}</span>
      </span>
    ))}
  </span>
);

const AgentWorkflowUsageCell: React.FC<{ agent: AgentDefinition }> = ({ agent }) => (
  <div className="min-w-0" aria-label={`${getAgentWorkflowUsageSummary(agent).countLabel}, ${getAgentWorkflowUsageSummary(agent).previewLabel}`}>
    <div className="text-sm font-semibold text-ui-text">{getAgentWorkflowUsageSummary(agent).countLabel}</div>
    <div className="type-caption mt-1 min-w-0 truncate text-ui-text-muted">{getAgentWorkflowUsageSummary(agent).previewLabel}</div>
  </div>
);

const ApprovalPolicyStack: React.FC<{ agent: AgentDefinition }> = ({ agent }) => {
  const chips = [
    getApprovalPolicyChip('Write', agent.approvalPolicy.writeActions),
    getApprovalPolicyChip('Sensitive', agent.approvalPolicy.sensitiveActions)
  ];

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1" aria-label={getAgentApprovalCheckSummary(agent)}>
      {chips.map(({ label, Icon, className }) => (
        <span key={label} className={`inline-flex max-w-full items-center gap-1.5 text-xs font-bold leading-none ${className}`}>
          <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 truncate">{label}</span>
        </span>
      ))}
    </div>
  );
};

const AgentReadinessCell: React.FC<{
  eligibility: string;
  eligibilityReason: string;
}> = ({ eligibility, eligibilityReason }) => (
  <div className="inline-flex min-w-0 max-w-full flex-wrap items-center gap-x-2 gap-y-1">
    <StatusBadge tone={eligibility === 'Ready' ? 'success' : eligibility === 'Disabled' ? 'neutral' : 'warning'}>{eligibility}</StatusBadge>
    <span className={`type-caption min-w-0 break-words [overflow-wrap:anywhere] ${eligibility === 'Ready' ? 'text-ui-text-muted' : 'font-semibold text-status-warning-text'}`}>{eligibilityReason}</span>
  </div>
);

interface AgentReviewQueueProps {
  reviewQueue: {
    agentsNeedingAttention: number;
    broadTargetScope: number;
    staleReadiness: number;
    agentsInUse: number;
  };
}

const ReviewQueueSignal: React.FC<{
  label: string;
  value: number;
}> = ({ label, value }) => (
  <div className="min-w-0">
    <dt className="type-micro-label text-current">{label}</dt>
    <dd className="mt-1 text-sm font-semibold text-ui-text">{value}</dd>
  </div>
);

export const AgentReviewQueue: React.FC<AgentReviewQueueProps> = ({ reviewQueue }) => {
  const hasAttention = reviewQueue.agentsNeedingAttention > 0;
  const queueTextClassName = hasAttention ? 'text-ui-text' : 'text-ui-text-muted';

  return (
    <section
      aria-label="Profile queue"
      className="mb-4 rounded-lg border border-ui-border bg-ui-surface px-4 py-3"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className={`type-micro-label ${queueTextClassName}`}>Profile queue</div>
          <div className="mt-1 type-panel-title text-ui-text">{reviewQueue.agentsNeedingAttention} profiles need review</div>
          <p className={`type-caption mt-1 max-w-2xl ${queueTextClassName}`}>Resolve stale tests, access review, or ungated write access before workflow assignment.</p>
        </div>
        <dl className={`grid min-w-0 gap-x-5 gap-y-3 sm:grid-cols-3 md:min-w-[28rem] md:text-right ${queueTextClassName}`}>
          <ReviewQueueSignal label="Access review" value={reviewQueue.broadTargetScope} />
          <ReviewQueueSignal label="No recent test" value={reviewQueue.staleReadiness} />
          <ReviewQueueSignal label="Assigned" value={reviewQueue.agentsInUse} />
        </dl>
      </div>
    </section>
  );
};

interface WorkspaceAgentsCatalogProps {
  agents: AgentDefinition[];
  visibleAgents: AgentDefinition[];
  selectedAgent?: AgentDefinition;
  expandedAgentId: string;
  canManageAgents: boolean;
  catalogFilters: AgentCatalogFilters;
  onCatalogFiltersChange: (filters: AgentCatalogFilters) => void;
  onSelectedAgentChange: (agentId: string) => void;
  onEditAgent: (agent: AgentDefinition) => void;
  onOpenActivity: (agent: AgentDefinition) => void;
  onOpenManagement: (agent: AgentDefinition) => void;
}

export const WorkspaceAgentsCatalog: React.FC<WorkspaceAgentsCatalogProps> = ({
  agents,
  visibleAgents,
  selectedAgent,
  expandedAgentId,
  canManageAgents,
  catalogFilters,
  onCatalogFiltersChange,
  onSelectedAgentChange,
  onEditAgent,
  onOpenActivity,
  onOpenManagement
}) => {
  const shouldReduceMotion = useReducedMotion();
  const updateCatalogFilter = <Key extends keyof AgentCatalogFilters>(key: Key, value: AgentCatalogFilters[Key]) => {
    onCatalogFiltersChange({ ...catalogFilters, [key]: value });
  };
  const focusOptions = React.useMemo<Array<CompactControlItem<AgentFocusFilter>>>(() => [
    { value: 'all', label: 'All', count: agents.length },
    { value: 'needs_review', label: 'Needs review', count: agents.filter((agent) => getAgentEligibilityLabel(agent) === 'Needs review').length },
    { value: 'needs_test', label: 'Needs test', count: agents.filter((agent) => getAgentEligibilityLabel(agent) === 'Needs test').length },
    { value: 'ready', label: 'Ready', count: agents.filter((agent) => getAgentEligibilityLabel(agent) === 'Ready').length }
  ], [agents]);
  const hasActiveFilters = hasActiveAgentCatalogFilters(catalogFilters);
  return (
  <section aria-label="Agent catalog" className="min-w-0 overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ui-border px-4 py-4">
      <div className="min-w-0">
        <div className="type-panel-title">Workspace agent profiles</div>
        <p className="type-caption mt-1 max-w-2xl text-ui-text-muted">Browse capability ownership, workflow usage, and assignment eligibility. Open a profile for approvals, versions, and activity.</p>
      </div>
      <div className="rounded-full border border-ui-border bg-ui-bg px-3 py-1 text-xs font-bold text-ui-text-muted">{visibleAgents.length} of {agents.length} agents</div>
    </div>
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-ui-border bg-ui-bg/70 px-4 py-3" aria-label="Agent catalog filters">
      <div className="grid min-w-0 flex-1 gap-1.5">
        <span className="type-micro-label text-ui-text-muted">Focus</span>
        <FilterToggleGroup<AgentFocusFilter>
          activeValue={catalogFilters.focus}
          items={focusOptions}
          onValueChange={(value) => updateCatalogFilter('focus', value)}
          ariaLabel="Agent focus filter"
          className="flex-wrap overflow-visible"
        />
      </div>
      {hasActiveFilters && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="justify-center whitespace-nowrap"
          onClick={() => onCatalogFiltersChange(defaultAgentCatalogFilters)}
        >
          Clear filters
        </Button>
      )}
    </div>
    {visibleAgents.length > 0 ? (
      <div className="min-w-0">
        <div aria-hidden="true" className="hidden border-b border-ui-border bg-ui-bg/65 xl:block">
          <div className={catalogGridClass}>
            {['Agent', 'Eligibility', 'Workflows', ''].map((column) => (
              <div key={column} className="type-micro-label min-w-0 text-ui-text-muted">
                {column}
              </div>
            ))}
          </div>
        </div>
        <ul role="list" aria-label="Agent catalog list" className="grid gap-3 bg-ui-bg/45 p-3 xl:block xl:bg-transparent xl:p-0">
          {visibleAgents.map((agent) => {
            const eligibility = getAgentEligibilityLabel(agent);
            const selected = agent.id === selectedAgent?.id;
            const expanded = agent.id === expandedAgentId;
            const eligibilityReason = getAgentEligibilityReason(agent);
            return (
              <li key={agent.id} className={`rounded-md border bg-ui-surface xl:rounded-none xl:border-x-0 xl:border-t-0 xl:last:border-b-0 ${expanded ? 'border-ui-border bg-ui-surface shadow-sm xl:mb-3' : 'border-ui-border'}`}>
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={`agent-assignment-detail-${agent.id}`}
                  aria-current={selected ? 'true' : undefined}
                  onClick={() => onSelectedAgentChange(agent.id)}
                  className={`${catalogGridClass} group w-full cursor-pointer text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 ${selected ? 'bg-ui-bg/65 outline outline-1 -outline-offset-1 outline-ui-border' : 'hover:bg-ui-bg/70'}`}
                >
                  <CatalogCell label="Agent">
                    <div className="block min-w-0 text-left">
                      <span className="type-panel-title block min-w-0 break-words text-ui-text group-hover:text-accent-strong [overflow-wrap:anywhere]">{agent.name}</span>
                      <span className="type-caption mt-1 block min-w-0 break-words text-ui-text-muted [overflow-wrap:anywhere]">{agent.description}</span>
                      <AgentMetadataLine agent={agent} />
                    </div>
                  </CatalogCell>
                  <CatalogCell label="Eligibility">
                    <AgentReadinessCell eligibility={eligibility} eligibilityReason={eligibilityReason} />
                  </CatalogCell>
                  <CatalogCell label="Workflows">
                    <AgentWorkflowUsageCell agent={agent} />
                  </CatalogCell>
                  <CatalogCell label="Expand" className="flex justify-end">
                    <motion.span
                      aria-hidden="true"
                      animate={shouldReduceMotion ? { rotate: 0 } : { rotate: expanded ? 180 : 0 }}
                      transition={shouldReduceMotion ? { duration: 0.01 } : { duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-ui-border bg-ui-surface text-ui-text-muted"
                    >
                      <ICONS.ChevronDown className="h-4 w-4" />
                    </motion.span>
                  </CatalogCell>
                </button>
                <AnimatePresence initial={false}>
                  {expanded && (
                  <motion.div
                    id={`agent-assignment-detail-${agent.id}`}
                    key={`${agent.id}-assignment-detail`}
                    initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                    animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                    exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                    transition={shouldReduceMotion ? { duration: 0.01 } : { duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    className="border-t border-ui-border bg-ui-surface px-4 py-4 sm:px-5"
                  >
                    <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,0.34fr)]">
                      <section className="min-w-0" aria-label={`${agent.name} recent evidence`}>
                        <div className="flex flex-col gap-4 border-b border-ui-border pb-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <h3 className="type-panel-title">Recent evidence</h3>
                            <p className="type-caption mt-1 max-w-3xl text-ui-text-muted">Latest profile evidence and activity that affect assignment. Open agent management for configuration, versions, and full activity.</p>
                          </div>
                          <div className="min-w-0 shrink-0" aria-label={`${agent.name} expanded actions`}>
                            <div className="type-micro-label mb-2 text-ui-text-muted">Profile actions</div>
                            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                              <Button type="button" variant="secondary" size="sm" onClick={() => onEditAgent(agent)} disabled={!canManageAgents}>
                                <ICONS.Pencil className="h-4 w-4" />
                                Edit agent
                              </Button>
                              {canManageAgents && (
                                <Button type="button" variant="tertiary" size="sm" onClick={() => onOpenManagement(agent)}>
                                  <ICONS.Settings className="h-4 w-4" />
                                  Manage agent
                                </Button>
                              )}
                              <Button type="button" variant="tertiary" size="sm" onClick={() => onOpenActivity(agent)}>
                                <ICONS.Eye className="h-4 w-4" />
                                View activity
                              </Button>
                            </div>
                          </div>
                        </div>
                        <ol className="mt-4 divide-y divide-ui-border rounded-md border border-ui-border bg-ui-bg/40">
                          {agent.auditHistory.slice(0, 3).map((entry) => (
                            <li key={entry.id} className="grid min-w-0 gap-1 px-3 py-2.5 text-sm sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-3">
                              <time className="type-caption min-w-0 break-words font-semibold text-ui-text-muted [overflow-wrap:anywhere]">{formatAgentTimestamp(entry.occurredAt)}</time>
                              <span className="min-w-0 break-words font-semibold text-ui-text [overflow-wrap:anywhere]">{entry.summary}</span>
                            </li>
                          ))}
                        </ol>
                      </section>

                      <aside className="min-w-0 rounded-md border border-ui-border bg-ui-bg/65 px-4 py-3" aria-label={`${agent.name} policy snapshot`}>
                        <h3 className="type-panel-title">Policy snapshot</h3>
                        <dl className="mt-3 grid gap-3 text-sm">
                          <div className="min-w-0">
                            <dt className="type-micro-label text-ui-text-muted">Approvals</dt>
                            <dd className="mt-2">
                              <ApprovalPolicyStack agent={agent} />
                            </dd>
                          </div>
                          <div className="min-w-0">
                            <dt className="type-micro-label text-ui-text-muted">Workflows</dt>
                            <dd className="mt-1">
                              <WorkflowBacklinkList agent={agent} />
                            </dd>
                          </div>
                        </dl>
                      </aside>
                    </div>
                  </motion.div>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
      </div>
    ) : (
      <AgentCatalogEmptyState
        kind={agents.length === 0 ? 'empty' : 'no-results'}
        canManageAgents={canManageAgents}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={() => onCatalogFiltersChange(defaultAgentCatalogFilters)}
      />
    )}
  </section>
  );
};

const AgentCatalogEmptyState: React.FC<{
  kind: 'empty' | 'no-results';
  canManageAgents: boolean;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}> = ({ kind, canManageAgents, hasActiveFilters, onClearFilters }) => {
  const empty = kind === 'empty';
  const title = empty ? 'No agents in this workspace' : 'Nothing matches this view';
  const body = empty
    ? canManageAgents
      ? 'Create an agent to define the tools, data, and approvals workflows can use.'
      : 'Agents will appear here after a workspace manager creates them.'
    : 'Clear filters or adjust search to return to the workspace agent catalog.';

  return (
    <section role="status" aria-live="polite" className="grid min-h-48 place-items-center bg-ui-bg/45 px-4 py-10 text-center">
      <div className="max-w-md">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg border border-ui-border bg-ui-surface text-ui-text-muted">
          {empty ? <ICONS.Bot className="h-5 w-5" aria-hidden="true" /> : <ICONS.Search className="h-5 w-5" aria-hidden="true" />}
        </div>
        <h3 className="mt-4 type-panel-title text-ui-text">{title}</h3>
        <p className="type-caption mt-2 text-ui-text-muted">{body}</p>
        {!empty && hasActiveFilters && (
          <Button type="button" variant="secondary" size="sm" className="mt-4" onClick={onClearFilters}>
            Clear filters
          </Button>
        )}
      </div>
    </section>
  );
};

const WorkflowBacklinkList: React.FC<{ agent: AgentDefinition }> = ({ agent }) => {
  if (agent.workflowsUsingAgent.length === 0) {
    return <span className="type-caption text-ui-text-muted">No assigned workflows</span>;
  }

  return (
    <div className="flex min-w-0 flex-wrap gap-2">
      {agent.workflowsUsingAgent.map((workflow) => (
        <a
          key={workflow}
          href={workflowCatalogHref(agent.workspaceId, workflow)}
          aria-label={`Open workflow ${workflow}`}
          title={`Open ${workflow} in Workflows`}
          className="inline-flex min-h-8 max-w-full items-center rounded-md border border-ui-border bg-ui-surface px-2.5 text-xs font-bold text-ui-text-muted transition-colors hover:border-accent/35 hover:bg-accent-soft/45 hover:text-accent-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
        >
          <span className="min-w-0 truncate">{workflow}</span>
        </a>
      ))}
    </div>
  );
};
