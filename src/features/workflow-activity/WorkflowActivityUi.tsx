import React from 'react';
import { ArrowRight, CircleDot, GitBranch, PauseCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { appHref, handleAppLinkClick } from '@/app/workspaceNavigation';
import { buttonClassName } from '@acornops/ui';
import { StatusBadge } from '@acornops/ui';
import {
  type WorkflowActivitySummary,
  type WorkflowExecutionOrigin,
  type WorkflowExecutionStatus,
  type WorkflowExecutionSummary
} from '@/services/control-plane/workflowApi';
import { formatElapsedDuration, formatRelativeTime, formatUserDateTime } from '@/utils/dateTime';
import { AppPaths } from '@/utils/routes';

const terminalStatuses = new Set<WorkflowExecutionStatus>(['completed', 'failed', 'cancelled']);
const activeStatuses = new Set<WorkflowExecutionStatus>(['queued', 'dispatching', 'running', 'cancelling']);
const durationSettledStatuses = new Set<WorkflowExecutionStatus>([
  ...terminalStatuses,
  'needs_review'
]);

export const workflowExecutionLedgerGridClass =
  'xl:grid-cols-[minmax(18rem,1fr)_minmax(10rem,14rem)_minmax(9rem,12rem)_5.5rem_6.25rem]';

function executionStatusTone(
  status: WorkflowExecutionStatus
): React.ComponentProps<typeof StatusBadge>['tone'] {
  if (status === 'completed') return 'success';
  if (status === 'failed' || status === 'cancelled') return 'danger';
  if (status === 'waiting_for_approval' || status === 'needs_review') return 'warning';
  return 'neutral';
}

function ExecutionStatusBadge({ status }: { status: WorkflowExecutionStatus }) {
  const { t } = useTranslation();
  return (
    <StatusBadge tone={executionStatusTone(status)}>
      <span className="inline-flex items-center gap-1.5">
        {activeStatuses.has(status) && (
          <CircleDot
            className="h-3 w-3 animate-pulse motion-reduce:animate-none"
            aria-hidden="true"
          />
        )}
        {status === 'waiting_for_approval' && <PauseCircle className="h-3 w-3" aria-hidden="true" />}
        {t(`workflowActivity.status.${status}`)}
      </span>
    </StatusBadge>
  );
}

export function workflowExecutionActionKey(
  status: WorkflowExecutionStatus
): 'openRun' | 'reviewRun' {
  return status === 'waiting_for_approval' || status === 'needs_review'
    ? 'reviewRun'
    : 'openRun';
}

export function WorkflowExecutionLink({
  execution
}: {
  execution: WorkflowExecutionSummary;
}) {
  const { t } = useTranslation();
  const path = AppPaths.workspaceWorkflowRun(
    execution.workspaceId,
    execution.workflow.id,
    execution.id
  );
  return (
    <>
      <ExecutionStatusBadge status={execution.status} />
      <a
        className="type-caption type-emphasis text-ui-text underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-control-boundary"
        href={appHref(path)}
      >
        {t(`workflowActivity.actions.${workflowExecutionActionKey(execution.status)}`)}
      </a>
    </>
  );
}

function ProvenanceChain({
  origin,
  tone = 'muted'
}: {
  origin: WorkflowExecutionOrigin;
  tone?: 'muted' | 'danger';
}) {
  const { t } = useTranslation();
  return (
    <span className={`inline-flex max-w-full min-w-0 items-center gap-1.5 ${
      tone === 'danger' ? 'text-status-danger-text' : 'text-ui-text-muted'
    }`}>
      <GitBranch className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="min-w-0 truncate">
        {t(`workflowActivity.origin.${origin.kind}`)}
        {(origin.kind === 'schedule' || origin.kind === 'event_trigger') && (
          <>
            <span aria-hidden="true"> · </span>
            <span className="text-ui-text">{origin.label}</span>
          </>
        )}
        {origin.kind === 'event_trigger' && (
          <>
            <span aria-hidden="true"> · </span>
            {origin.source.label}
          </>
        )}
      </span>
    </span>
  );
}

export function executionDuration(
  execution: WorkflowExecutionSummary,
  labels: { notStarted: string; unavailable: string } = {
    notStarted: 'Not started',
    unavailable: 'Duration unavailable'
  }
): string {
  const startedAt = execution.startedAt || execution.rootRun?.startedAt;
  const endedAt = execution.endedAt || execution.rootRun?.endedAt;
  if (!startedAt) return activeStatuses.has(execution.status) ? labels.notStarted : labels.unavailable;
  if (endedAt) return formatElapsedDuration(startedAt, endedAt);
  if (durationSettledStatuses.has(execution.status)) return labels.unavailable;
  return formatElapsedDuration(startedAt, Date.now());
}

export function executionTimestamp(execution: WorkflowExecutionSummary): {
  label: 'Started' | 'Completed' | 'Updated';
  value: string;
} {
  const endedAt = execution.endedAt || execution.rootRun?.endedAt;
  const startedAt = execution.startedAt || execution.rootRun?.startedAt;
  if (endedAt) return { label: 'Completed', value: endedAt };
  if (execution.status === 'needs_review') return { label: 'Updated', value: execution.updatedAt };
  if (startedAt) return { label: 'Started', value: startedAt };
  return { label: 'Updated', value: execution.updatedAt };
}

export function WorkflowExecutionRow({
  execution,
  navigate
}: {
  execution: WorkflowExecutionSummary;
  navigate: (path: string) => void;
}) {
  const { t } = useTranslation();
  const timestamp = executionTimestamp(execution);
  const path = AppPaths.workspaceWorkflowRun(
    execution.workspaceId,
    execution.workflow.id,
    execution.id
  );
  const actionLabel = t(`workflowActivity.actions.${workflowExecutionActionKey(execution.status)}`);
  return (
    <a
      href={appHref(path)}
      onClick={(event) => handleAppLinkClick(event, path, navigate)}
      className={`control-target grid w-full min-w-0 gap-3 px-4 py-4 text-left outline-none transition-colors hover:bg-ui-bg focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-control-boundary sm:grid-cols-2 sm:gap-x-6 sm:px-6 xl:items-center xl:px-8 xl:py-6 ${workflowExecutionLedgerGridClass}`}
    >
      <span className="min-w-0 sm:col-span-2 xl:col-span-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="type-row-title break-words text-ui-text">{execution.workflow.name}</span>
          <ExecutionStatusBadge status={execution.status} />
        </span>
        <span className="type-caption mt-1 block w-full min-w-0">
          <ProvenanceChain origin={execution.origin} />
        </span>
      </span>
      <span className="min-w-0">
        <span className="type-micro-label block text-ui-text-muted xl:hidden">{t('workflowActivity.target')}</span>
        <span className="type-caption mt-1 block truncate text-ui-text xl:mt-0">
          {execution.rootRun?.targetName
            || execution.rootRun?.targetId
            || t('workflowActivity.workspaceScope')}
        </span>
      </span>
      <span className="min-w-0">
        <span className="type-micro-label block text-ui-text-muted xl:hidden">{t(`workflowActivity.time.${timestamp.label.toLowerCase()}`)}</span>
        <time
          dateTime={timestamp.value}
          title={formatUserDateTime(timestamp.value)}
          className="type-caption mt-1 block text-ui-text xl:mt-0"
        >
          {formatRelativeTime(timestamp.value)}
        </time>
      </span>
      <span className="min-w-0">
        <span className="type-micro-label block text-ui-text-muted xl:hidden">{t('workflowActivity.duration')}</span>
        <span className="type-caption mt-1 block tabular-nums text-ui-text xl:mt-0">
          {executionDuration(execution, {
            notStarted: t('workflowActivity.notStarted'),
            unavailable: t('workflowActivity.durationUnavailable')
          })}
        </span>
      </span>
      <span className="type-caption inline-flex items-center gap-1.5 type-emphasis text-ui-text sm:self-end sm:justify-self-end xl:self-auto">
        {actionLabel}
        <ArrowRight className="h-4 w-4 text-ui-text-muted" aria-hidden="true" />
      </span>
    </a>
  );
}

export function issueWorkflowActivityPath(
  workspaceId: string,
  issueId: string,
  activity: WorkflowActivitySummary
): string {
  const openExecution = activity.openCount === 1 ? activity.openExecution : undefined;
  const directExecution = activity.openCount === 0 ? activity.latestExecution : openExecution;
  return directExecution
    ? AppPaths.workspaceWorkflowRun(workspaceId, directExecution.workflow.id, directExecution.id)
    : AppPaths.workspaceRuns(workspaceId, { issueId });
}

export function IssueWorkflowActivity({
  workspaceId,
  issueId,
  activity,
  navigate
}: {
  workspaceId: string;
  issueId: string;
  activity?: WorkflowActivitySummary;
  navigate?: (path: string) => void;
}) {
  const { t } = useTranslation();
  const execution = (activity?.openCount || 0) > 0
    ? activity?.openExecution || activity?.latestExecution
    : activity?.latestExecution;
  if (!execution) return null;
  const primaryPath = issueWorkflowActivityPath(workspaceId, issueId, activity);
  const primaryLabel = (activity.openCount || 0) > 1
    ? t('workflowActivity.actions.viewRuns')
    : execution.status === 'waiting_for_approval' || execution.status === 'needs_review'
      ? t('workflowActivity.actions.reviewRun')
      : (activity.openCount || 0) === 1
        ? t('workflowActivity.actions.openRun')
        : execution.status === 'failed'
          ? t('workflowActivity.actions.reviewFailure')
          : t('workflowActivity.actions.viewHistory');
  const timestamp = executionTimestamp(execution);
  return (
    <div className={`mt-3 rounded-md border px-3 py-3 ${
      execution.status === 'failed'
        ? 'border-status-danger/30 bg-status-danger-soft'
        : execution.status === 'waiting_for_approval' || execution.status === 'needs_review'
          ? 'border-status-warning/30 bg-status-warning-soft'
          : 'border-ui-border bg-ui-bg'
    }`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <ExecutionStatusBadge status={execution.status} />
            <span className="type-caption type-emphasis text-ui-text">{execution.workflow.name}</span>
            {(activity?.totalCount || 0) > 1 && (
              <span className="type-caption text-ui-text-muted">
                {(activity?.openCount || 0) > 1
                  ? t('workflowActivity.openRuns', { count: activity?.openCount })
                  : t('workflowActivity.relatedRuns', { count: activity?.totalCount })}
              </span>
            )}
          </div>
          <p className="type-caption mt-1 min-w-0">
            <ProvenanceChain
              origin={execution.origin}
              tone={execution.status === 'failed' ? 'danger' : 'muted'}
            />
          </p>
          <p className={`type-caption mt-1 ${
            execution.status === 'failed' ? 'text-status-danger-text' : 'text-ui-text-muted'
          }`}>
            {t(`workflowActivity.time.${timestamp.label.toLowerCase()}`)} {formatRelativeTime(timestamp.value)}
          </p>
        </div>
        <a
          href={appHref(primaryPath)}
          onClick={navigate ? (event) => handleAppLinkClick(event, primaryPath, navigate) : undefined}
          className={buttonClassName({
            variant: execution.status === 'failed'
              ? 'danger'
              : (activity.openCount || 0) > 0
                ? 'primary'
                : 'secondary',
            size: 'sm',
            className: 'w-full shrink-0 justify-center sm:w-auto'
          })}
        >
          {primaryLabel}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}
