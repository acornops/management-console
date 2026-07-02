import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/common/Button';
import { FilterToggleGroup, type CompactControlItem } from '@/components/common/ComponentVocabulary';
import { PageSearchInput } from '@/components/common/PageSearchInput';
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
  <header className="mb-6 flex min-w-0 w-full max-w-full flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
    <div className="min-w-0 flex-1">
      <h1 className="type-route-title">Agents</h1>
      <p className="type-body mt-3 max-w-none break-words text-ui-text-muted">Browse workspace agent profiles and manage the capabilities workflows can use.</p>
    </div>
    <div className="flex w-full min-w-0 max-w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
      <PageSearchInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search agents, workflows, tools" aria-label="Search agents" className="w-full min-w-0 lg:w-80" />
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
      scopeLabel: label,
      label: 'Blocked',
      Icon: ICONS.Lock,
      className: 'border-status-danger/25 bg-status-danger-soft text-status-danger-text'
    };
  }
  if (action === 'approval_required') {
    return {
      scopeLabel: label,
      label: 'Approval required',
      Icon: ICONS.Shield,
      className: 'border-status-warning/25 bg-status-warning-soft text-status-warning-text'
    };
  }
  return {
    scopeLabel: label,
    label: 'Allowed',
    Icon: ICONS.CheckCircle2,
    className: 'border-status-success/25 bg-status-success-soft text-status-success-text'
  };
}

function getAgentEligibilityVisual(eligibility: string) {
  if (eligibility === 'Ready') {
    return {
      Icon: ICONS.CheckCircle2,
      badgeClassName: 'border-status-success/25 bg-status-success-soft text-status-success-text',
      reasonClassName: 'text-ui-text-muted'
    };
  }
  if (eligibility === 'Needs test') {
    return {
      Icon: ICONS.Activity,
      badgeClassName: 'border-status-warning/25 bg-status-warning-soft text-status-warning-text',
      reasonClassName: 'font-semibold text-status-warning-text'
    };
  }
  if (eligibility === 'Needs review') {
    return {
      Icon: ICONS.Shield,
      badgeClassName: 'border-status-danger/25 bg-status-danger-soft text-status-danger-text',
      reasonClassName: 'font-semibold text-status-danger-text'
    };
  }
  return {
    Icon: ICONS.Lock,
    badgeClassName: 'border-ui-border bg-ui-bg text-ui-text-muted',
    reasonClassName: 'text-ui-text-muted'
  };
}

function getAgentEligibilityReason(agent: AgentDefinition): string {
  const eligibility = getAgentEligibilityLabel(agent);
  const signals = getAgentReviewSignals(agent);
  if (eligibility === 'Ready') return agent.health.summary;
  if (eligibility === 'Disabled') return 'Definition disabled';
  if (eligibility === 'Needs test') return signals.includes('No recent readiness test') ? 'No recent test' : agent.health.summary;
  if (signals.includes('Broad target scope')) return 'Review target access';
  if (signals.includes('Write tools can run without approval')) return 'Require write approval';
  if (signals.length > 0) return signals[0];
  return agent.health.summary;
}

function getAgentNextStep(agent: AgentDefinition): string {
  const eligibility = getAgentEligibilityLabel(agent);
  const signals = getAgentReviewSignals(agent);
  if (eligibility === 'Ready') return 'Ready for workflow assignment';
  if (eligibility === 'Disabled') return 'Reactivate before assignment';
  if (signals.includes('No recent readiness test')) return 'Open profile, then run readiness';
  if (signals.includes('Broad target scope')) return 'Open profile and narrow target scope';
  if (signals.includes('Write tools can run without approval')) return 'Edit policy before assignment';
  return 'Open profile to resolve assignment blockers';
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

const catalogGridClass = 'grid min-w-0 gap-x-3 gap-y-3 px-3 py-3 sm:px-4 sm:py-3.5 xl:grid-cols-[minmax(0,1.35fr)_minmax(9rem,0.52fr)_minmax(9rem,0.52fr)_minmax(11rem,max-content)_2rem] xl:items-center xl:gap-x-5';

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
      {chips.map(({ scopeLabel, label, Icon, className }) => (
        <span key={`${scopeLabel}-${label}`} className="inline-flex max-w-full items-center gap-1.5">
          <span className="type-micro-label shrink-0 text-ui-text-muted">{scopeLabel}</span>
          <span title={`${scopeLabel}: ${label}`} className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-0.5 text-[0.68rem] font-bold uppercase leading-none tracking-widest ${className}`}>
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 truncate">{label}</span>
          </span>
        </span>
      ))}
    </div>
  );
};

const AgentReadinessCell: React.FC<{
  agent: AgentDefinition;
  eligibility: string;
  eligibilityReason: string;
}> = ({ agent, eligibility, eligibilityReason }) => {
  const visual = getAgentEligibilityVisual(eligibility);
  const Icon = visual.Icon;

  return (
    <div className="grid min-w-0 gap-1">
      <div className="inline-flex min-w-0 max-w-full flex-wrap items-center gap-x-2 gap-y-1">
        <AgentEligibilityBadge eligibility={eligibility} />
        <span className={`type-caption min-w-0 break-words [overflow-wrap:anywhere] ${visual.reasonClassName}`}>{eligibilityReason}</span>
      </div>
      <span className="type-caption min-w-0 break-words text-ui-text-muted [overflow-wrap:anywhere]">
        <Icon className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />
        {getAgentNextStep(agent)}
      </span>
    </div>
  );
};

const AgentEligibilityBadge: React.FC<{ eligibility: string }> = ({ eligibility }) => {
  const visual = getAgentEligibilityVisual(eligibility);
  const Icon = visual.Icon;

  return (
    <span className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-0.5 text-[0.68rem] font-bold uppercase leading-none tracking-widest ${visual.badgeClassName}`}>
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="min-w-0 truncate">{eligibility}</span>
    </span>
  );
};

const AgentRowActionCell: React.FC<{
  agent: AgentDefinition;
  canManageAgents: boolean;
  eligibility: string;
  isTesting: boolean;
  onOpenManagement: (agent: AgentDefinition) => void;
  onTestAgent: (agent: AgentDefinition) => void;
}> = ({ agent, canManageAgents, eligibility, isTesting, onOpenManagement, onTestAgent }) => {
  if (eligibility === 'Needs test') {
    return (
      <Button type="button" variant="secondary" size="sm" className="w-full justify-center xl:w-auto" onClick={() => onTestAgent(agent)} disabled={!canManageAgents || isTesting}>
        <ICONS.Activity className="h-4 w-4" />
        {isTesting ? 'Queuing...' : 'Run readiness'}
      </Button>
    );
  }

  if (eligibility === 'Ready') {
    return (
      <Button type="button" variant="tertiary" size="sm" className="w-full justify-center xl:w-auto" onClick={() => onOpenManagement(agent)}>
        <ICONS.CheckCircle2 className="h-4 w-4" />
        Ready for assignment
      </Button>
    );
  }

  const label = eligibility === 'Needs review' ? 'Review access' : 'Review before assignment';
  return (
    <Button type="button" variant="secondary" size="sm" className="w-full justify-center xl:w-auto" onClick={() => onOpenManagement(agent)} disabled={!canManageAgents}>
      <ICONS.Shield className="h-4 w-4" />
      {label}
    </Button>
  );
};

interface WorkspaceAgentsCatalogProps {
  agents: AgentDefinition[];
  visibleAgents: AgentDefinition[];
  selectedAgent?: AgentDefinition;
  expandedAgentId: string;
  canManageAgents: boolean;
  testingAgentId: string;
  catalogFilters: AgentCatalogFilters;
  onCatalogFiltersChange: (filters: AgentCatalogFilters) => void;
  onSelectedAgentChange: (agentId: string) => void;
  onEditAgent: (agent: AgentDefinition) => void;
  onOpenManagement: (agent: AgentDefinition) => void;
  onTestAgent: (agent: AgentDefinition) => void;
}

export const WorkspaceAgentsCatalog: React.FC<WorkspaceAgentsCatalogProps> = ({
  agents,
  visibleAgents,
  selectedAgent,
  expandedAgentId,
  canManageAgents,
  testingAgentId,
  catalogFilters,
  onCatalogFiltersChange,
  onSelectedAgentChange,
  onEditAgent,
  onOpenManagement,
  onTestAgent
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
  <section aria-label="Agent catalog" className="min-w-0 w-full max-w-full overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm">
    <div className="flex min-w-0 w-full max-w-full flex-wrap items-start justify-between gap-3 border-b border-ui-border px-4 py-4">
      <div className="min-w-0 max-w-full">
        <div className="type-panel-title">Workspace agent profiles</div>
        <p className="type-caption mt-1 max-w-2xl text-ui-text-muted">Browse capability ownership, workflow usage, and assignment eligibility. Open a profile for approvals, versions, and activity.</p>
      </div>
      <div className="rounded-full border border-ui-border bg-ui-bg px-3 py-1 text-xs font-bold text-ui-text-muted">{visibleAgents.length} of {agents.length} agents</div>
    </div>
    <div className="flex min-w-0 w-full max-w-full flex-wrap items-end justify-between gap-3 border-b border-ui-border bg-ui-bg/70 px-4 py-3" aria-label="Agent catalog filters">
      <div className="grid min-w-0 max-w-full flex-1 gap-1.5">
        <span className="type-micro-label text-ui-text-muted">Focus</span>
        <FilterToggleGroup<AgentFocusFilter>
          activeValue={catalogFilters.focus}
          items={focusOptions}
          onValueChange={(value) => updateCatalogFilter('focus', value)}
          ariaLabel="Agent focus filter"
          className="grid w-full grid-cols-2 items-stretch gap-2 min-[520px]:flex min-[520px]:w-auto [&>button]:min-w-0 [&>button]:justify-center"
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
      <div className="min-w-0 w-full max-w-full">
        <div aria-hidden="true" className="hidden border-b border-ui-border bg-ui-bg/65 xl:block">
          <div className={catalogGridClass}>
            {['Agent', 'Eligibility', 'Workflows', 'Assignment action', ''].map((column) => (
              <div key={column} className="type-micro-label min-w-0 text-ui-text-muted">
                {column}
              </div>
            ))}
          </div>
        </div>
        <ul role="list" aria-label="Agent catalog list" className="grid min-w-0 w-full max-w-full gap-3 bg-ui-bg/45 p-3 xl:block xl:bg-transparent xl:p-0">
          {visibleAgents.map((agent) => {
            const eligibility = getAgentEligibilityLabel(agent);
            const selected = agent.id === selectedAgent?.id;
            const expanded = agent.id === expandedAgentId;
            const eligibilityReason = getAgentEligibilityReason(agent);
            return (
              <li key={agent.id} className={`min-w-0 max-w-full overflow-hidden rounded-md border bg-ui-surface xl:rounded-none xl:border-x-0 xl:border-t-0 xl:last:border-b-0 ${expanded ? 'border-accent/25 bg-ui-surface shadow-sm ring-1 ring-accent/10 xl:mb-3' : 'border-ui-border'}`}>
                <div className={`${catalogGridClass} transition-colors ${selected ? 'bg-accent-soft/55 outline outline-1 -outline-offset-1 outline-accent/35 ring-1 ring-accent/15' : 'hover:bg-ui-bg/70'}`}>
                  <CatalogCell label="Agent">
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-controls={`agent-assignment-detail-${agent.id}`}
                      aria-current={selected ? 'true' : undefined}
                      onClick={() => onSelectedAgentChange(agent.id)}
                      className="group block w-full min-w-0 rounded-md text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
                    >
                      <span className="type-row-title block min-w-0 break-words text-ui-text group-hover:text-accent-strong [overflow-wrap:anywhere]">{agent.name}</span>
                      <span className="type-caption mt-1 block min-w-0 break-words text-ui-text-muted [overflow-wrap:anywhere]">{agent.description}</span>
                      <AgentMetadataLine agent={agent} />
                    </button>
                  </CatalogCell>
                  <CatalogCell label="Eligibility">
                    <AgentReadinessCell agent={agent} eligibility={eligibility} eligibilityReason={eligibilityReason} />
                  </CatalogCell>
                  <CatalogCell label="Workflows">
                    <AgentWorkflowUsageCell agent={agent} />
                  </CatalogCell>
                  <CatalogCell label="Assignment action">
                    <AgentRowActionCell
                      agent={agent}
                      canManageAgents={canManageAgents}
                      eligibility={eligibility}
                      isTesting={testingAgentId === agent.id}
                      onOpenManagement={onOpenManagement}
                      onTestAgent={onTestAgent}
                    />
                  </CatalogCell>
                  <CatalogCell label="Expand" className="flex justify-end">
                    <button
                      type="button"
                      aria-label={`${expanded ? 'Collapse' : 'Expand'} ${agent.name} evidence`}
                      aria-expanded={expanded}
                      aria-controls={`agent-assignment-detail-${agent.id}`}
                      onClick={() => onSelectedAgentChange(agent.id)}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-ui-border bg-ui-surface text-ui-text-muted transition-colors hover:border-accent/35 hover:bg-accent-soft/45 hover:text-accent-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 sm:h-9 sm:w-9"
                    >
                      <motion.span
                        aria-hidden="true"
                        animate={shouldReduceMotion ? { rotate: 0 } : { rotate: expanded ? 180 : 0 }}
                        transition={shouldReduceMotion ? { duration: 0.01 } : { duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <ICONS.ChevronDown className="h-4 w-4" />
                      </motion.span>
                    </button>
                  </CatalogCell>
                </div>
                <AnimatePresence initial={false}>
                  {expanded && (
                  <motion.div
                    id={`agent-assignment-detail-${agent.id}`}
                    key={`${agent.id}-assignment-detail`}
                    initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                    animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                    exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                    transition={shouldReduceMotion ? { duration: 0.01 } : { duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    className="border-t border-accent/20 bg-ui-bg/85 px-3 py-4 sm:px-5"
                  >
                    <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,0.34fr)]">
                      <section className="min-w-0 rounded-md border border-ui-border bg-ui-surface p-3 shadow-sm sm:p-4" aria-label={`${agent.name} recent evidence`}>
                        <div className="flex flex-col gap-4 border-b border-ui-border pb-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <h3 className="type-panel-title">Recent evidence</h3>
                            <p className="type-caption mt-1 max-w-3xl text-ui-text-muted">Latest profile evidence and activity that affect assignment. Open agent management for configuration, versions, and full activity.</p>
                          </div>
                          <div className="min-w-0 shrink-0 lg:min-w-[18rem]" aria-label={`${agent.name} expanded actions`}>
                            <div className="grid min-w-0 grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:justify-end">
                              <Button type="button" variant="secondary" size="sm" className="w-full justify-center sm:w-auto" onClick={() => onEditAgent(agent)} disabled={!canManageAgents}>
                                <ICONS.Pencil className="h-4 w-4" />
                                Edit agent
                              </Button>
                              {canManageAgents && (
                                <Button type="button" variant="secondary" size="sm" className="w-full justify-center sm:w-auto" onClick={() => onOpenManagement(agent)}>
                                  <ICONS.Settings className="h-4 w-4" />
                                  Profile & activity
                                </Button>
                              )}
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
          className="inline-flex min-h-11 max-w-full items-center rounded-md border border-ui-border bg-ui-surface px-2.5 text-xs font-bold text-ui-text-muted transition-colors hover:border-accent/35 hover:bg-accent-soft/45 hover:text-accent-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
        >
          <span className="min-w-0 truncate">{workflow}</span>
        </a>
      ))}
    </div>
  );
};
