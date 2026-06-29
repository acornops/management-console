import React from 'react';
import { StatusBadge } from '@/components/common/StatusBadge';
import { getAgentAccessClass, getAgentReadinessLabel, type AgentDefinition } from '@/pages/agents/agentModel';
import { formatAgentDisplayValue } from '@/pages/WorkspaceAgentsPage.helpers';

export type ReviewFilter = 'all' | 'attention' | 'production' | 'write_gated' | 'unused';

export const reviewFilters: Array<{ value: ReviewFilter; label: string }> = [
  { value: 'all', label: 'All agents' },
  { value: 'attention', label: 'Needs attention' },
  { value: 'production', label: 'Production access' },
  { value: 'write_gated', label: 'Write gated' },
  { value: 'unused', label: 'Unused' }
];

interface AgentReviewQueueProps {
  reviewQueue: {
    agentsNeedingAttention: number;
    broadTargetScope: number;
    staleReadiness: number;
    disabledReferenced: number;
  };
}

export const AgentReviewQueue: React.FC<AgentReviewQueueProps> = ({ reviewQueue }) => (
  <section aria-label="Review queue" className="mb-4 flex flex-col gap-3 rounded-lg border border-ui-border bg-ui-surface px-4 py-3 md:flex-row md:items-center md:justify-between">
    <div className="type-micro-label text-ui-text-muted">Review queue</div>
    <div className="flex flex-wrap gap-2">
      <span className="rounded-full border border-status-warning/30 bg-status-warning-soft px-3 py-1 text-xs font-bold text-status-warning-text">{reviewQueue.agentsNeedingAttention} need attention</span>
      <span className="rounded-full border border-ui-border bg-ui-bg px-3 py-1 text-xs font-bold text-ui-text-muted">{reviewQueue.broadTargetScope} broad target scope</span>
      <span className="rounded-full border border-ui-border bg-ui-bg px-3 py-1 text-xs font-bold text-ui-text-muted">{reviewQueue.staleReadiness} stale readiness</span>
      <span className="rounded-full border border-ui-border bg-ui-bg px-3 py-1 text-xs font-bold text-ui-text-muted">{reviewQueue.disabledReferenced} disabled but referenced</span>
    </div>
  </section>
);

interface WorkspaceAgentsCatalogProps {
  agents: AgentDefinition[];
  visibleAgents: AgentDefinition[];
  selectedAgent?: AgentDefinition;
  reviewFilter: ReviewFilter;
  onReviewFilterChange: (filter: ReviewFilter) => void;
  onSelectedAgentChange: (agentId: string) => void;
}

export const WorkspaceAgentsCatalog: React.FC<WorkspaceAgentsCatalogProps> = ({
  agents,
  visibleAgents,
  selectedAgent,
  reviewFilter,
  onReviewFilterChange,
  onSelectedAgentChange
}) => (
  <section aria-label="Agent catalog" className="min-w-0 overflow-hidden rounded-lg border border-ui-border bg-ui-surface">
    <div className="flex items-start justify-between gap-4 border-b border-ui-border px-4 py-4">
      <div className="min-w-0">
        <div className="type-panel-title">Agent catalog</div>
        <p className="type-caption mt-1 text-ui-text-muted">Filtering narrows this stable list; it does not reorder agents.</p>
      </div>
      <div className="type-caption shrink-0 font-semibold text-ui-text-muted">{visibleAgents.length} of {agents.length} agents</div>
    </div>
    <div className="flex flex-wrap gap-2 border-b border-ui-border bg-ui-bg px-4 py-3" aria-label="Agent catalog filters">
      {reviewFilters.map((filter) => (
        <button
          key={filter.value}
          type="button"
          onClick={() => onReviewFilterChange(filter.value)}
          className={`rounded-full border px-3 py-1 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 ${reviewFilter === filter.value ? 'border-accent/35 bg-accent-soft text-ui-text' : 'border-ui-border bg-ui-surface text-ui-text-muted hover:bg-accent-soft/40'}`}
        >
          {filter.label}
        </button>
      ))}
    </div>
    {visibleAgents.length > 0 ? (
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full min-w-[48rem] table-fixed border-collapse">
          <thead>
            <tr className="border-b border-ui-border">
              <th className="w-[30%] px-4 py-3 text-left type-micro-label text-ui-text-muted">Agent</th>
              <th className="w-[16%] px-3 py-3 text-left type-micro-label text-ui-text-muted">Readiness</th>
              <th className="w-[21%] px-3 py-3 text-left type-micro-label text-ui-text-muted">Access class</th>
              <th className="w-[16%] px-3 py-3 text-left type-micro-label text-ui-text-muted">Approval</th>
              <th className="w-[9%] px-3 py-3 text-left type-micro-label text-ui-text-muted">Used by</th>
              <th className="w-[8%] px-3 py-3 text-left type-micro-label text-ui-text-muted">Owner</th>
            </tr>
          </thead>
          <tbody>
            {visibleAgents.map((agent) => {
              const readiness = getAgentReadinessLabel(agent);
              return (
                <tr key={agent.id} className={`border-b border-ui-border last:border-b-0 ${agent.id === selectedAgent?.id ? 'bg-accent-soft/45' : 'bg-ui-surface'}`}>
                  <td className="px-4 py-3 align-middle">
                    <button type="button" onClick={() => onSelectedAgentChange(agent.id)} className="block min-w-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25">
                      <span className="type-row-title block truncate text-ui-text">{agent.name}</span>
                      <span className="type-caption mt-1 block truncate text-ui-text-muted">{agent.description}</span>
                    </button>
                  </td>
                  <td className="px-3 py-3 align-middle"><StatusBadge tone={readiness === 'Ready' ? 'success' : readiness === 'Disabled' ? 'neutral' : 'warning'}>{readiness}</StatusBadge></td>
                  <td className="px-3 py-3 align-middle text-sm font-semibold text-ui-text">{getAgentAccessClass(agent)}</td>
                  <td className="px-3 py-3 align-middle text-sm text-ui-text">{formatAgentDisplayValue(agent.approvalPolicy.writeActions)}</td>
                  <td className="px-3 py-3 align-middle text-sm font-semibold text-ui-text">{agent.workflowsUsingAgent.length}</td>
                  <td className="px-3 py-3 align-middle text-sm text-ui-text-muted">{agent.owner}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    ) : (
      <div className="p-6 text-sm font-semibold text-ui-text-muted">No agents match. Search by agent name, tool, skill, scope, or provider.</div>
    )}
  </section>
);
