import React from 'react';

import { StatusBadge, type StatusBadgeTone } from '@acornops/ui';
import type { WorkflowExecutionSummary } from '@/services/control-plane/workflowApi';
import { WorkflowExecutionLink } from '@/features/workflow-activity/WorkflowActivityUi';

export interface WorkflowTriggerFactStatus {
  label: React.ReactNode;
  tone: StatusBadgeTone;
}

export interface WorkflowTriggerExecutionFactsProps {
  className?: string;
  configuration: WorkflowTriggerFactStatus;
  configurationLabel: React.ReactNode;
  dispatch?: WorkflowTriggerFactStatus;
  dispatchLabel: React.ReactNode;
  dispatchTimestamp?: React.ReactNode;
  latestExecution?: WorkflowExecutionSummary;
  latestExecutionLabel: React.ReactNode;
  noDispatchLabel: React.ReactNode;
  noExecutionLabel: React.ReactNode;
}

export function WorkflowTriggerExecutionFacts({
  className,
  configuration,
  configurationLabel,
  dispatch,
  dispatchLabel,
  dispatchTimestamp,
  latestExecution,
  latestExecutionLabel,
  noDispatchLabel,
  noExecutionLabel
}: WorkflowTriggerExecutionFactsProps) {
  return (
    <dl className={['grid gap-3', className].filter(Boolean).join(' ')}>
      <div>
        <dt className="type-micro-label text-ui-text-muted">{configurationLabel}</dt>
        <dd className="mt-1">
          <StatusBadge tone={configuration.tone}>{configuration.label}</StatusBadge>
        </dd>
      </div>
      <div>
        <dt className="type-micro-label text-ui-text-muted">{dispatchLabel}</dt>
        <dd className="mt-1 flex flex-wrap items-center gap-2 type-caption text-ui-text">
          {dispatch ? <StatusBadge tone={dispatch.tone}>{dispatch.label}</StatusBadge> : noDispatchLabel}
          {dispatchTimestamp}
        </dd>
      </div>
      <div>
        <dt className="type-micro-label text-ui-text-muted">{latestExecutionLabel}</dt>
        <dd className="mt-1 flex flex-wrap items-center gap-2">
          {latestExecution
            ? <WorkflowExecutionLink execution={latestExecution} />
            : <span className="type-caption text-ui-text-muted">{noExecutionLabel}</span>}
        </dd>
      </div>
    </dl>
  );
}
