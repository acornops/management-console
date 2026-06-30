import React from 'react';
import { Button } from '@/components/common/Button';
import { CloseButton } from '@/components/common/ComponentVocabulary';
import { ICONS } from '@/constants';
import { getAgentActivitySummary, type AgentDefinition } from '@/pages/agents/agentModel';
import { formatAgentTimestamp } from '@/pages/WorkspaceAgentsPage.helpers';
import { RightSidePanel } from '@/components/common/RightSidePanel';

interface AgentActivityDrawerProps {
  agent: AgentDefinition;
  agentActivityAction: string;
  closeButtonRef: React.RefObject<HTMLButtonElement | null>;
  isOpen: boolean;
  onClose: () => void;
  onRefreshActivity: () => void;
}

export const AgentActivityDrawer: React.FC<AgentActivityDrawerProps> = ({
  agent,
  agentActivityAction,
  closeButtonRef,
  isOpen,
  onClose,
  onRefreshActivity
}) => {
  const activitySummary = getAgentActivitySummary(agent);

  return (
    <RightSidePanel
      isOpen={isOpen}
      onClose={onClose}
      titleId="agent-activity-title"
      initialFocusRef={closeButtonRef}
      className="block w-full max-w-[min(100vw,48rem)] overflow-y-auto bg-ui-surface p-0"
    >
      <CloseButton
        ref={closeButtonRef}
        onClick={onClose}
        label="Close agent activity"
        className="absolute right-4 top-4 z-10 shadow-sm"
      />
      <section className="min-w-0 bg-ui-surface">
        <div className="border-b border-ui-border bg-ui-bg px-5 py-5 pr-16">
          <p className="type-micro-label text-ui-text-muted">Agent activity</p>
          <h2 id="agent-activity-title" className="mt-2 type-section-title">{agent.name}</h2>
          <p className="type-caption mt-2 text-ui-text-muted">{activitySummary.line}</p>
        </div>
        <div className="px-5 py-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="type-panel-title">Run history</h3>
              <p className="type-caption mt-1 text-ui-text-muted">Activity records are listed newest first. Full run logs are not available from agent activity yet.</p>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={onRefreshActivity} disabled={agentActivityAction === agent.id}>
              <ICONS.Activity className="h-4 w-4" />
              {agentActivityAction === agent.id ? 'Refreshing...' : 'Refresh activity'}
            </Button>
          </div>
          {agent.auditHistory.length > 0 ? (
            <ol className="divide-y divide-ui-border overflow-hidden rounded-lg border border-ui-border">
              {agent.auditHistory.map((entry) => (
                <li key={entry.id} className="grid min-w-0 gap-2 bg-ui-surface px-4 py-3 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-4">
                  <time className="type-caption min-w-0 break-words font-semibold text-ui-text-muted [overflow-wrap:anywhere]">{formatAgentTimestamp(entry.occurredAt)}</time>
                  <div className="min-w-0">
                    <div className="min-w-0 break-words text-sm font-semibold text-ui-text [overflow-wrap:anywhere]">{entry.summary}</div>
                    <div className="type-caption mt-1 text-ui-text-muted">Activity record</div>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="rounded-lg border border-ui-border bg-ui-bg p-6 text-sm font-semibold text-ui-text-muted">This agent has no activity records yet.</div>
          )}
        </div>
      </section>
    </RightSidePanel>
  );
};
