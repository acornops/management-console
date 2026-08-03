import React from 'react';
import { Bot } from 'lucide-react';
import {
  Button,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHeader,
  DataTableHeaderCell,
  DataTableRow,
  IconTile,
  StatusBadge
} from '@acornops/ui';

import { ICONS } from '@/constants';
import {
  AutomaticInvestigationActivity,
  shouldShowManualAssistantFallback
} from '@/features/auto-triage/AutomaticInvestigationActivity';
import { issueSeverityTone, issueStatusTone, issueSupportingText, shouldShowIssueStatus } from '@/pages/issues/issueUi';
import type { ControlPlaneIssueItem, ControlPlaneTargetIssueSummary } from '@/services/controlPlaneApi';
import type { TargetType } from '@/services/control-plane/types';
import { formatRelativeTime, formatUserDateTime } from '@/utils/dateTime';

interface TargetIssuesLabels {
  title: string;
  description: React.ReactNode;
  issueCount: (count: number) => string;
  criticalCount: (count: number) => string;
  warningCount: (count: number) => string;
  issueColumn: string;
  severityColumn: string;
  sourceColumn: string;
  firstSeen: string;
  lastSeen: string;
  actionColumn: string;
  openAssistant: string;
  loadingTitle: string;
  loadingBody: string;
  failureTitle: string;
  failureBody: string;
  emptyTitle: string;
  emptyBody: string;
  retry: string;
  severityLabel: (severity: ControlPlaneIssueItem['severity']) => string;
  statusLabel: (status: ControlPlaneIssueItem['status']) => string;
}

interface TargetIssuesPanelProps {
  workspaceId: string;
  targetId: string;
  targetType: TargetType;
  issues: ControlPlaneIssueItem[] | null;
  issueSummary: ControlPlaneTargetIssueSummary | null;
  isLoading: boolean;
  loadFailed: boolean;
  labels: TargetIssuesLabels;
  sourceForIssue: (issue: ControlPlaneIssueItem) => string;
  onOpenAssistant?: (issue: ControlPlaneIssueItem) => void;
  onRetry?: () => void;
  alwaysShowCounts?: boolean;
  className?: string;
}

function issueTimestamp(issue: ControlPlaneIssueItem): number {
  return Date.parse(issue.lastSeenAt || issue.updatedAt) || Date.now();
}

function firstSeenTimestamp(issue: ControlPlaneIssueItem): number {
  return Date.parse(issue.firstSeenAt || issue.createdAt) || issueTimestamp(issue);
}

function severityRank(severity: ControlPlaneIssueItem['severity']): number {
  if (severity === 'critical') return 0;
  if (severity === 'warning') return 1;
  return 2;
}

function IssueTime({ label, timestamp, visibleLabel = false }: { label: string; timestamp: number; visibleLabel?: boolean }) {
  const exactTime = formatUserDateTime(timestamp);
  return (
    <time dateTime={new Date(timestamp).toISOString()} title={exactTime} aria-label={`${label}: ${exactTime}`}>
      {visibleLabel ? `${label}: ` : ''}{formatRelativeTime(timestamp)}
    </time>
  );
}

export function TargetIssuesPanel({
  workspaceId,
  targetId,
  targetType,
  issues,
  issueSummary,
  isLoading,
  loadFailed,
  labels,
  sourceForIssue,
  onOpenAssistant,
  onRetry,
  alwaysShowCounts = false,
  className = 'mb-8'
}: TargetIssuesPanelProps) {
  const titleId = React.useId();
  const reportedIssues = React.useMemo(() => [...(issues || [])].sort((left, right) => {
    const severityDelta = severityRank(left.severity) - severityRank(right.severity);
    return severityDelta || issueTimestamp(right) - issueTimestamp(left);
  }), [issues]);
  const hasRows = issues !== null;
  const showCounts = alwaysShowCounts || issueSummary !== null || hasRows;
  const issueCount = issueSummary?.total ?? (hasRows ? reportedIssues.length : 0);
  const criticalCount = issueSummary?.critical ?? reportedIssues.filter((issue) => issue.severity === 'critical').length;
  const warningCount = issueSummary?.warning ?? reportedIssues.filter((issue) => issue.severity === 'warning').length;
  const showFailure = loadFailed && (!issueSummary || issueSummary.total > 0);

  const assistantAction = (issue: ControlPlaneIssueItem, className: string) => (
    onOpenAssistant && shouldShowManualAssistantFallback(issue.automaticInvestigation) ? (
      <Button onClick={() => onOpenAssistant(issue)} variant="primary" size="md" className={className}>
        <Bot className="h-4 w-4" aria-hidden="true" />
        {labels.openAssistant}
      </Button>
    ) : null
  );

  return (
    <section aria-labelledby={titleId} aria-busy={isLoading || undefined} className={`${className} overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm`}>
      <div className="flex flex-col gap-6 border-b border-ui-border bg-ui-bg px-5 py-5 sm:px-6 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <IconTile tone="accent" className="mt-1 bg-accent-soft text-accent-readable">
            <ICONS.AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </IconTile>
          <div className="min-w-0">
            <h2 id={titleId} className="type-row-title">{labels.title}</h2>
            {labels.description}
          </div>
        </div>
        {showCounts && (
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone="neutral" className="px-3 py-1 type-caption normal-case tracking-normal">{labels.issueCount(issueCount)}</StatusBadge>
            <StatusBadge tone="danger" className="px-3 py-1 type-caption normal-case tracking-normal">{labels.criticalCount(criticalCount)}</StatusBadge>
            <StatusBadge tone="warning" className="px-3 py-1 type-caption normal-case tracking-normal">{labels.warningCount(warningCount)}</StatusBadge>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex min-h-36 flex-col items-center justify-center px-6 py-10 text-center" role="status" aria-live="polite">
          <div className="rounded-md border border-ui-border bg-ui-bg p-3 text-accent-strong"><ICONS.RefreshCw className="h-5 w-5 animate-spin" aria-hidden="true" /></div>
          <h3 className="type-row-title mt-4">{labels.loadingTitle}</h3>
          <p className="type-body mt-2 max-w-xl">{labels.loadingBody}</p>
        </div>
      ) : reportedIssues.length > 0 ? (
        <>
          <div className="hidden overflow-x-auto 2xl:block">
            <DataTable caption={labels.title} className="w-full">
              <DataTableHeader><DataTableRow>
                <DataTableHeaderCell density="compact">{labels.issueColumn}</DataTableHeaderCell>
                <DataTableHeaderCell density="compact">{labels.severityColumn}</DataTableHeaderCell>
                <DataTableHeaderCell density="compact">{labels.sourceColumn}</DataTableHeaderCell>
                <DataTableHeaderCell density="compact">{labels.lastSeen}</DataTableHeaderCell>
                {onOpenAssistant && <DataTableHeaderCell density="compact" numeric>{labels.actionColumn}</DataTableHeaderCell>}
              </DataTableRow></DataTableHeader>
              <DataTableBody>{reportedIssues.map((issue) => (
                <DataTableRow key={issue.id} className="border-b border-ui-border transition-colors last:border-b-0 hover:bg-ui-bg/70">
                  <DataTableCell density="compact" className="max-w-[34rem]">
                    <div className="flex flex-wrap items-center gap-2">
                      {shouldShowIssueStatus(issue.status) && <StatusBadge tone={issueStatusTone(issue.status)}>{labels.statusLabel(issue.status)}</StatusBadge>}
                      <span className="type-caption text-ui-text-muted"><IssueTime label={labels.firstSeen} timestamp={firstSeenTimestamp(issue)} visibleLabel /></span>
                    </div>
                    <h3 className="type-row-title mt-2 break-words">{issue.title}</h3>
                    {issueSupportingText(issue) && <p className="type-body mt-1 break-words">{issueSupportingText(issue)}</p>}
                    <AutomaticInvestigationActivity workspaceId={workspaceId} targetId={issue.targetId || targetId} targetType={targetType} issueId={issue.id} activity={issue.automaticInvestigation} />
                  </DataTableCell>
                  <DataTableCell density="compact"><StatusBadge tone={issueSeverityTone(issue.severity)}>{labels.severityLabel(issue.severity)}</StatusBadge></DataTableCell>
                  <DataTableCell density="compact" className="type-caption break-words">{sourceForIssue(issue)}</DataTableCell>
                  <DataTableCell density="compact" className="type-caption"><IssueTime label={labels.lastSeen} timestamp={issueTimestamp(issue)} /></DataTableCell>
                  {onOpenAssistant && <DataTableCell density="compact" className="text-right">{assistantAction(issue, 'whitespace-nowrap')}</DataTableCell>}
                </DataTableRow>
              ))}</DataTableBody>
            </DataTable>
          </div>
          <div className="divide-y divide-ui-border 2xl:hidden">{reportedIssues.map((issue) => (
            <article key={issue.id} className="p-5">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={issueSeverityTone(issue.severity)}>{labels.severityLabel(issue.severity)}</StatusBadge>
                {shouldShowIssueStatus(issue.status) && <StatusBadge tone={issueStatusTone(issue.status)}>{labels.statusLabel(issue.status)}</StatusBadge>}
              </div>
              <h3 className="type-row-title mt-4 break-words">{issue.title}</h3>
              {issueSupportingText(issue) && <p className="type-body mt-2 break-words">{issueSupportingText(issue)}</p>}
              <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                <div><dt className="type-micro-label text-ui-text-muted">{labels.sourceColumn}</dt><dd className="type-caption mt-1 break-words">{sourceForIssue(issue)}</dd></div>
                <div><dt className="type-micro-label text-ui-text-muted">{labels.firstSeen}</dt><dd className="type-caption mt-1"><IssueTime label={labels.firstSeen} timestamp={firstSeenTimestamp(issue)} /></dd></div>
                <div><dt className="type-micro-label text-ui-text-muted">{labels.lastSeen}</dt><dd className="type-caption mt-1"><IssueTime label={labels.lastSeen} timestamp={issueTimestamp(issue)} /></dd></div>
              </dl>
              <AutomaticInvestigationActivity workspaceId={workspaceId} targetId={issue.targetId || targetId} targetType={targetType} issueId={issue.id} activity={issue.automaticInvestigation} />
              {assistantAction(issue, 'mt-4')}
            </article>
          ))}</div>
        </>
      ) : showFailure ? (
        <div className="flex min-h-36 flex-col items-center justify-center px-6 py-10 text-center" role="alert">
          <div className="rounded-md border border-status-warning/20 bg-status-warning-soft p-3 text-status-warning-text"><ICONS.AlertTriangle className="h-5 w-5" aria-hidden="true" /></div>
          <h3 className="type-row-title mt-4">{labels.failureTitle}</h3>
          <p className="type-body mt-2 max-w-xl">{labels.failureBody}</p>
          {onRetry && <Button onClick={onRetry} variant="secondary" size="sm" className="mt-4">{labels.retry}</Button>}
        </div>
      ) : (
        <div className="flex min-h-36 flex-col items-center justify-center px-6 py-10 text-center">
          <div className="rounded-md border border-status-success/20 bg-status-success-soft p-3 text-status-success-text"><ICONS.CheckCircle2 className="h-5 w-5" aria-hidden="true" /></div>
          <h3 className="type-row-title mt-4">{labels.emptyTitle}</h3>
          <p className="type-body mt-2 max-w-xl">{labels.emptyBody}</p>
        </div>
      )}
    </section>
  );
}
