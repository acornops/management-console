import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/common/Button';
import { FilterToggleGroup, type CompactControlItem } from '@/components/common/ComponentVocabulary';
import { PageSearchInput } from '@/components/common/PageSearchInput';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ICONS } from '@/constants';
import { getAgentActivitySummary, getAgentDecisionSummary, getAgentReadinessLabel, getAgentReviewSignals, type AgentDefinition } from '@/pages/agents/agentModel';
import { formatAgentDisplayValue, formatAgentTimestamp } from '@/pages/WorkspaceAgentsPage.helpers';

export type AgentFocusFilter = 'all' | 'action_needed' | 'ready' | 'in_use' | 'available' | 'broad_scope' | 'write_gated';

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
      <p className="type-body mt-3 max-w-none break-words text-ui-text-muted">Create or select agents by job, access, and current blocker.</p>
    </div>
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <PageSearchInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search agents, workflows, tools, scope" aria-label="Search agents" className="lg:w-80" />
      <Button type="button" variant="secondary" size="md" className="whitespace-nowrap" onClick={onCreateAgent} disabled={!canManageAgents}>
        <ICONS.Plus className="h-4 w-4" />
        Create agent
      </Button>
    </div>
  </header>
);

const targetScopeLabels: Record<string, string> = {
  'kubernetes:*': 'All Kubernetes clusters',
  'repository:selected': 'Selected repositories',
  'workspace:current': 'Current workspace',
  workspace: 'Current workspace'
};

const targetTypeLabels: Record<string, string> = {
  kubernetes: 'Kubernetes clusters',
  repository: 'Repositories',
  vm: 'VMs'
};

const contextScopeLabels: Record<string, string> = {
  workspace_metadata: 'Workspace metadata',
  target_inventory: 'Target inventory',
  selected_chat_sessions: 'Selected chat sessions'
};

function formatFallbackScopeToken(token: string): string {
  if (targetScopeLabels[token]) return targetScopeLabels[token];
  const [kind, value] = token.split(':', 2);
  if (!kind || !value) return formatAgentDisplayValue(token);
  if (value === '*') return `All ${formatAgentDisplayValue(kind)}`;
  return `${formatAgentDisplayValue(kind)}: ${formatAgentDisplayValue(value)}`;
}

function getAgentTargetSummary(agent: AgentDefinition): string {
  if (agent.targetScope.length === 0) return 'No targets configured';
  const targetTypes = agent.targetScope.flatMap((scope) => {
    if (!scope.startsWith('target-type:')) return [];
    const targetType = scope.slice('target-type:'.length);
    return [targetTypeLabels[targetType] ?? formatAgentDisplayValue(targetType)];
  });
  const selectedTargets = agent.targetScope.flatMap((scope) => scope.startsWith('target:')
    ? [formatAgentDisplayValue(scope.slice('target:'.length))]
    : []);
  const directTargets = agent.targetScope.flatMap((scope) => {
    if (targetScopeLabels[scope]) return [targetScopeLabels[scope]];
    const [kind, value] = scope.split(':', 2);
    if (!kind || !value || value === '*' || kind === 'scope' || kind === 'target-type' || kind === 'target' || kind === 'workspace') return [];
    return [`${formatAgentDisplayValue(kind)} ${formatAgentDisplayValue(value)}`];
  });
  const labels = [
    ...targetTypes,
    ...selectedTargets,
    ...directTargets
  ];
  return labels.length > 0 ? Array.from(new Set(labels)).join(', ') : agent.targetScope.map(formatFallbackScopeToken).join(', ');
}

function getAgentContextSummary(agent: AgentDefinition): string {
  if (agent.contextScope.length === 0) return 'No data sources selected';
  return agent.contextScope.map((scope) => contextScopeLabels[scope] ?? formatAgentDisplayValue(scope)).join(', ');
}

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

function getAgentReadinessReason(agent: AgentDefinition): string {
  const readiness = getAgentReadinessLabel(agent);
  const signals = getAgentReviewSignals(agent);
  if (readiness === 'Ready') return agent.health.summary;
  if (readiness === 'Disabled') return 'Definition disabled';
  if (signals.length > 0) return signals[0];
  return agent.health.summary;
}

const catalogGridClass = 'grid min-w-0 gap-3 px-4 py-3.5 xl:grid-cols-[minmax(0,1fr)_minmax(16rem,0.42fr)] xl:items-center xl:gap-4';

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

interface AgentReviewQueueProps {
  reviewQueue: {
    agentsNeedingAttention: number;
    broadTargetScope: number;
    staleReadiness: number;
    agentsInUse: number;
  };
}

export const AgentReviewQueue: React.FC<AgentReviewQueueProps> = ({ reviewQueue }) => {
  const hasAttention = reviewQueue.agentsNeedingAttention > 0;
  const queueTextClassName = hasAttention ? 'text-status-warning-text' : 'text-ui-text-muted';

  return (
    <section
      aria-label="Review queue"
      className={`mb-4 rounded-lg border px-4 py-3 ${hasAttention ? 'border-status-warning/35 bg-status-warning-soft/70' : 'border-ui-border bg-ui-surface'}`}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className={`type-micro-label ${queueTextClassName}`}>Review queue</div>
          <div className="mt-1 type-panel-title text-ui-text">{reviewQueue.agentsNeedingAttention} agents need action</div>
          <p className={`type-caption mt-1 max-w-2xl ${queueTextClassName}`}>Fix stale tests, risky scope, or ungated write access before assignment.</p>
        </div>
        <p className={`type-caption min-w-0 md:text-right ${queueTextClassName}`}>
          {reviewQueue.broadTargetScope} broad scope · {reviewQueue.staleReadiness} stale tests · {reviewQueue.agentsInUse} in use
        </p>
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
    { value: 'action_needed', label: 'Action needed', count: agents.filter((agent) => getAgentReadinessLabel(agent) === 'Action needed').length },
    { value: 'ready', label: 'Ready', count: agents.filter((agent) => getAgentReadinessLabel(agent) === 'Ready').length },
    { value: 'in_use', label: 'In use', count: agents.filter((agent) => agent.workflowsUsingAgent.length > 0).length },
    { value: 'available', label: 'Available', count: agents.filter((agent) => agent.workflowsUsingAgent.length === 0).length },
    { value: 'broad_scope', label: 'Broad scope', count: agents.filter((agent) => getAgentReviewSignals(agent).includes('Broad target scope')).length },
    { value: 'write_gated', label: 'Write gated', count: agents.filter((agent) => agent.approvalPolicy.writeActions === 'approval_required').length }
  ], [agents]);
  const hasActiveFilters = hasActiveAgentCatalogFilters(catalogFilters);
  return (
  <section aria-label="Agent catalog" className="min-w-0 overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ui-border px-4 py-4">
      <div className="min-w-0">
        <div className="type-panel-title">Agent assignment</div>
        <p className="type-caption mt-1 max-w-2xl text-ui-text-muted">Scan what each agent does, whether it can write or expose data, and what blocks safe use.</p>
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
            {['Agent', 'Readiness'].map((column) => (
              <div key={column} className="type-micro-label min-w-0 text-ui-text-muted">
                {column}
              </div>
            ))}
          </div>
        </div>
        <ul role="list" aria-label="Agent catalog list" className="grid gap-3 bg-ui-bg/45 p-3 xl:block xl:bg-transparent xl:p-0">
          {visibleAgents.map((agent) => {
            const readiness = getAgentReadinessLabel(agent);
            const selected = agent.id === selectedAgent?.id;
            const expanded = agent.id === expandedAgentId;
            const readinessReason = getAgentReadinessReason(agent);
            const decisionSummary = getAgentDecisionSummary(agent);
            const activitySummary = getAgentActivitySummary(agent);
            const activityStatusLabel = formatAgentDisplayValue(activitySummary.status);
            const lastRunLabel = activitySummary.status === 'not run'
              ? formatAgentDisplayValue(activitySummary.lastRun)
              : `${activitySummary.lastRun} (${activityStatusLabel})`;
            return (
              <li key={agent.id} className={`rounded-md border bg-ui-surface xl:rounded-none xl:border-x-0 xl:border-t-0 xl:last:border-b-0 ${expanded ? 'border-accent/35 shadow-sm xl:mb-4' : 'border-ui-border'}`}>
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={`agent-assignment-detail-${agent.id}`}
                  aria-current={selected ? 'true' : undefined}
                  onClick={() => onSelectedAgentChange(agent.id)}
                  className={`${catalogGridClass} group w-full cursor-pointer text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 ${selected ? 'bg-accent-soft/80 outline outline-1 -outline-offset-1 outline-accent/35' : 'hover:bg-ui-bg/70'}`}
                >
                  <CatalogCell label="Agent">
                    <div className="block min-w-0 text-left">
                      <span className="type-row-title block min-w-0 break-words text-ui-text group-hover:text-accent-strong [overflow-wrap:anywhere]">{agent.name}</span>
                      <span className="type-caption mt-1 block min-w-0 break-words text-ui-text-muted [overflow-wrap:anywhere]">{agent.description}</span>
                      <span className="mt-2 flex min-w-0 flex-wrap gap-x-3 gap-y-1 type-caption text-ui-text-muted">
                        <span className="min-w-0 break-words [overflow-wrap:anywhere]"><span className="font-semibold text-ui-text">Workflow:</span> {formatAgentDisplayValue(decisionSummary.work)}</span>
                        <span className="min-w-0 break-words [overflow-wrap:anywhere]"><span className="font-semibold text-ui-text">Access:</span> {formatAgentDisplayValue(decisionSummary.access)}</span>
                        <span className="min-w-0 break-words [overflow-wrap:anywhere]"><span className="font-semibold text-ui-text">Issue:</span> {formatAgentDisplayValue(decisionSummary.issue)}</span>
                        <span className="min-w-0 break-words [overflow-wrap:anywhere]"><span className="font-semibold text-ui-text">Last Run:</span> {lastRunLabel}</span>
                      </span>
                    </div>
                  </CatalogCell>
                  <CatalogCell label="Readiness">
                    <div className="flex items-center justify-between gap-3">
                      <StatusBadge tone={readiness === 'Ready' ? 'success' : readiness === 'Disabled' ? 'neutral' : 'warning'}>{readiness}</StatusBadge>
                      <motion.span
                        aria-hidden="true"
                        animate={shouldReduceMotion ? { rotate: 0 } : { rotate: expanded ? 180 : 0 }}
                        transition={shouldReduceMotion ? { duration: 0.01 } : { duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-ui-border bg-ui-surface text-ui-text-muted"
                      >
                        <ICONS.ChevronDown className="h-4 w-4" />
                      </motion.span>
                    </div>
                    <div className="type-caption mt-2 min-w-0 break-words text-ui-text-muted [overflow-wrap:anywhere]">{readinessReason}</div>
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
                    className="border-y border-accent/20 bg-ui-bg/70 px-4 py-4"
                  >
                    <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
                      <section className="min-w-0 rounded-md border border-ui-border bg-ui-surface px-4 py-4" aria-label={`${agent.name} capabilities`}>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <h3 className="type-panel-title">Capabilities</h3>
                            <p className="type-caption mt-1 text-ui-text-muted">MCP servers, tools, and skills this agent can use.</p>
                          </div>
                          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end" aria-label={`${agent.name} expanded actions`}>
                            <span className="type-caption font-semibold text-ui-text-muted">{agent.capabilities.length} capability entries</span>
                            <Button type="button" variant="secondary" size="sm" onClick={() => onEditAgent(agent)} disabled={!canManageAgents}>
                              <ICONS.Pencil className="h-4 w-4" />
                              Edit agent
                            </Button>
                            {canManageAgents && (
                              <Button type="button" variant="tertiary" size="sm" onClick={() => onOpenManagement(agent)}>
                                <ICONS.Settings className="h-4 w-4" />
                                Manage
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="mt-4 grid gap-4 lg:grid-cols-3">
                          <ExpandedCapabilityGroup title="MCP servers" values={agent.mcpServers} />
                          <ExpandedCapabilityGroup title="Tools allowed" values={agent.tools} />
                          <ExpandedCapabilityGroup title="Skills" values={agent.skills} />
                        </div>
                      </section>

                      <aside className="min-w-0 rounded-md border border-ui-border bg-ui-surface px-4 py-4" aria-label={`${agent.name} assignment checks`}>
                        <h3 className="type-panel-title">Assignment checks</h3>
                        <dl className="mt-4 grid gap-3 text-sm">
                          <AssignmentCheck label="Targets" value={getAgentTargetSummary(agent)} />
                          <AssignmentCheck label="Data available" value={getAgentContextSummary(agent)} />
                          <AssignmentCheck label="Approvals" value={getAgentApprovalCheckSummary(agent)} />
                          <AssignmentCheck label="Workflows" value={agent.workflowsUsingAgent.length > 0 ? agent.workflowsUsingAgent.join(', ') : 'Not assigned yet'} />
                        </dl>
                      </aside>
                      <section className="min-w-0 rounded-md border border-ui-border bg-ui-surface px-4 py-4 lg:col-span-2" aria-label={`${agent.name} recent activity`}>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <h3 className="type-panel-title">Recent activity</h3>
                            <p className="type-caption mt-1 min-w-0 break-words text-ui-text-muted [overflow-wrap:anywhere]">{activitySummary.line}</p>
                            <p className="type-caption mt-1 text-ui-text-muted">Full run logs are not available from agent activity yet.</p>
                          </div>
                          <Button type="button" variant="secondary" size="sm" onClick={() => onOpenActivity(agent)}>
                            <ICONS.Eye className="h-4 w-4" />
                            View activity
                          </Button>
                        </div>
                        <ol className="mt-3 divide-y divide-ui-border overflow-hidden rounded-md border border-ui-border">
                          {agent.auditHistory.slice(0, 3).map((entry) => (
                            <li key={entry.id} className="grid min-w-0 gap-1 bg-ui-surface px-3 py-2 text-sm sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-3">
                              <time className="type-caption min-w-0 break-words font-semibold text-ui-text-muted [overflow-wrap:anywhere]">{formatAgentTimestamp(entry.occurredAt)}</time>
                              <span className="min-w-0 break-words font-semibold text-ui-text [overflow-wrap:anywhere]">{entry.summary}</span>
                            </li>
                          ))}
                        </ol>
                      </section>
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
      <div className="p-6 text-sm font-semibold text-ui-text-muted">No agents match. Search by agent name, workflow, tool, skill, or scope.</div>
    )}
  </section>
  );
};

const ExpandedCapabilityGroup: React.FC<{ title: string; values: string[] }> = ({ title, values }) => (
  <div className="min-w-0">
    <div className="type-micro-label text-ui-text-muted">{title}</div>
    <div className="mt-2 grid gap-1.5">
      {values.length > 0
        ? values.map((value) => (
          <span key={value} className="type-code min-w-0 break-words rounded-md bg-ui-bg px-2 py-1 text-xs text-ui-text-muted [overflow-wrap:anywhere]">{value}</span>
        ))
        : <span className="type-caption text-ui-text-muted">No values configured.</span>}
    </div>
  </div>
);

const AssignmentCheck: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="min-w-0">
    <dt className="type-micro-label text-ui-text-muted">{label}</dt>
    <dd className="mt-1 min-w-0 break-words font-semibold text-ui-text [overflow-wrap:anywhere]">{value}</dd>
  </div>
);
