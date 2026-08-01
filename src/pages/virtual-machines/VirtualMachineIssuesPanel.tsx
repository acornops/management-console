import React from 'react';
import { Bot } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, DataTableHeader, DataTableHeaderCell, IconTile, StatusBadge } from '@acornops/ui';
import { ICONS } from '@/constants';
import { issueSeverityTone, issueStatusTone, issueSupportingText, shouldShowIssueStatus } from '@/pages/issues/issueUi';
import type { ControlPlaneIssueItem, ControlPlaneTargetIssueSummary } from '@/services/controlPlaneApi';
import { formatRelativeTime, formatUserDateTime } from '@/utils/dateTime';
import {
  AutomaticInvestigationActivity,
  shouldShowManualAssistantFallback
} from '@/features/auto-triage/AutomaticInvestigationActivity';
import { DataTable, DataTableBody, DataTableCell, DataTableRow } from '@acornops/ui';

interface VirtualMachineIssuesPanelProps {
  workspaceId: string;
  issues: ControlPlaneIssueItem[] | null;
  issueSummary: ControlPlaneTargetIssueSummary | null;
  isLoading: boolean;
  issueLoadFailed: boolean;
  onOpenIssueTriage: (issue: ControlPlaneIssueItem) => void;
}

function issueTimestamp(issue: ControlPlaneIssueItem): number {
  return Date.parse(issue.lastSeenAt || issue.updatedAt) || Date.now();
}

function issueFirstSeenTimestamp(issue: ControlPlaneIssueItem): number {
  return Date.parse(issue.firstSeenAt || issue.createdAt) || issueTimestamp(issue);
}

function issueSeverityRank(severity: ControlPlaneIssueItem['severity']): number {
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

export const VirtualMachineIssuesPanel: React.FC<VirtualMachineIssuesPanelProps> = ({ workspaceId, issues, issueSummary, isLoading, issueLoadFailed, onOpenIssueTriage }) => {
  const { t } = useTranslation();
  const issueSectionTitleId = React.useId();
  const reportedIssues = [...(issues || [])].sort((left, right) => {
    const severityDelta = issueSeverityRank(left.severity) - issueSeverityRank(right.severity);
    if (severityDelta !== 0) return severityDelta;
    return issueTimestamp(right) - issueTimestamp(left);
  });
  const hasIssueRows = issues !== null;
  const issueCount = issueSummary?.total ?? (hasIssueRows ? reportedIssues.length : 0);
  const criticalIssues = issueSummary ? issueSummary.critical : hasIssueRows ? reportedIssues.filter((issue) => issue.severity === 'critical').length : 0;
  const warningIssues = issueSummary ? issueSummary.warning : hasIssueRows ? reportedIssues.filter((issue) => issue.severity === 'warning').length : 0;
  const shouldShowIssueLoadFailure = issueLoadFailed && (!issueSummary || issueSummary.total > 0);

  return (
    <section aria-labelledby={issueSectionTitleId} className="mb-10 overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm">
      <div className="flex flex-col gap-6 border-b border-ui-border bg-ui-bg px-5 py-5 sm:px-6 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <IconTile tone="accent" className="mt-1 bg-accent-soft text-accent-readable">
            <ICONS.AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </IconTile>
          <div className="min-w-0">
            <h2 id={issueSectionTitleId} className="type-row-title">
              {t('virtualMachines.overview.activeIssues')}
            </h2>
            <p className="mt-1 type-body leading-6 text-ui-text-muted">{t('virtualMachines.overview.activeIssuesBody')}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone="neutral" className="px-3 py-1 type-caption normal-case tracking-normal">{t('virtualMachines.overview.issueCount', { count: issueCount })}</StatusBadge>
          <StatusBadge tone="danger" className="px-3 py-1 type-caption normal-case tracking-normal">
            {t('virtualMachines.overview.criticalIssues', {
              count: criticalIssues
            })}
          </StatusBadge>
          <StatusBadge tone="warning" className="px-3 py-1 type-caption normal-case tracking-normal">
            {t('virtualMachines.overview.warningIssues', {
              count: warningIssues
            })}
          </StatusBadge>
        </div>
      </div>

      {isLoading ? (
        <div className="flex min-h-36 flex-col items-center justify-center px-6 py-10 text-center">
          <div className="rounded-md border border-ui-border bg-ui-bg p-3 text-accent-strong">
            <ICONS.RefreshCw className="h-5 w-5 animate-spin" aria-hidden="true" />
          </div>
          <h3 className="type-row-title mt-4">{t('virtualMachines.overview.loadingIssuesTitle')}</h3>
          <p className="type-body mt-2 max-w-xl">{t('virtualMachines.overview.loadingIssuesBody')}</p>
        </div>
      ) : reportedIssues.length > 0 ? (
        <>
          <div className="hidden overflow-x-auto 2xl:block">
            <DataTable caption={t('virtualMachines.overview.activeIssues')} className="w-full">
              <DataTableHeader>
                <DataTableRow>
                  <DataTableHeaderCell density="compact">{t('virtualMachines.overview.issue')}</DataTableHeaderCell>
                  <DataTableHeaderCell density="compact">{t('virtualMachines.overview.severity')}</DataTableHeaderCell>
                  <DataTableHeaderCell density="compact">{t('virtualMachines.overview.source')}</DataTableHeaderCell>
                  <DataTableHeaderCell density="compact">{t('overview.lastSeenLabel')}</DataTableHeaderCell>
                  <DataTableHeaderCell density="compact" numeric>{t('virtualMachines.overview.action')}</DataTableHeaderCell>
                </DataTableRow>
              </DataTableHeader>
              <DataTableBody>
                {reportedIssues.map((issue) => (
                  <DataTableRow key={issue.id} className="border-b border-ui-border transition-colors last:border-b-0 hover:bg-ui-bg/70">
                    <DataTableCell density="compact" className="max-w-[34rem]">
                      <div className="flex flex-wrap items-center gap-2">
                        {shouldShowIssueStatus(issue.status) && (
                          <span className={`type-micro-label rounded-full px-2.5 py-1 ${issueStatusTone(issue.status)}`}>{t(`issues.status.${issue.status}`)}</span>
                        )}
                        <span className="type-caption text-ui-text-muted">
                          <IssueTime label={t('overview.firstSeenLabel')} timestamp={issueFirstSeenTimestamp(issue)} visibleLabel />
                        </span>
                      </div>
                      <h3 className="type-row-title mt-2 break-words">{issue.title}</h3>
                      {issueSupportingText(issue) && <p className="type-body mt-1 break-words">{issueSupportingText(issue)}</p>}
                      <AutomaticInvestigationActivity
                        workspaceId={workspaceId}
                        targetId={issue.targetId}
                        targetType="virtual_machine"
                        issueId={issue.id}
                        activity={issue.automaticInvestigation}
                      />
                    </DataTableCell>
                    <DataTableCell density="compact">
                      <span className={`type-micro-label rounded-full px-2.5 py-1 ${issueSeverityTone(issue.severity)}`}>{t(`issues.severity.${issue.severity}`)}</span>
                    </DataTableCell>
                    <DataTableCell density="compact" className="type-caption break-words">
                      {issue.objectName || issue.objectKind || issue.reason || t('virtualMachines.overview.hostSource')}
                    </DataTableCell>
                    <DataTableCell density="compact" className="type-caption">
                      <IssueTime label={t('overview.lastSeenLabel')} timestamp={issueTimestamp(issue)} />
                    </DataTableCell>
                    <DataTableCell density="compact" className="text-right">
                      {shouldShowManualAssistantFallback(issue.automaticInvestigation) && (
                        <Button
                          onClick={() => onOpenIssueTriage(issue)}
                          variant="primary"
                          size="md"
                          className="whitespace-nowrap"
                        >
                          <Bot className="h-4 w-4" aria-hidden="true" />
                          {t('virtualMachines.overview.openAssistant')}
                        </Button>
                      )}
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          </div>

          <div className="divide-y divide-ui-border 2xl:hidden">
            {reportedIssues.map((issue) => (
              <article key={issue.id} className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`type-micro-label rounded-full px-2.5 py-1 ${issueSeverityTone(issue.severity)}`}>{t(`issues.severity.${issue.severity}`)}</span>
                  {shouldShowIssueStatus(issue.status) && (
                    <span className={`type-micro-label rounded-full px-2.5 py-1 ${issueStatusTone(issue.status)}`}>{t(`issues.status.${issue.status}`)}</span>
                  )}
                </div>
                <h3 className="type-row-title mt-4 break-words">{issue.title}</h3>
                {issueSupportingText(issue) && <p className="type-body mt-2 break-words">{issueSupportingText(issue)}</p>}
                <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div>
                    <dt className="type-micro-label text-ui-text-muted">{t('virtualMachines.overview.source')}</dt>
                    <dd className="type-caption mt-1 break-words">{issue.objectName || issue.objectKind || issue.reason || t('virtualMachines.overview.hostSource')}</dd>
                  </div>
                  <div>
                    <dt className="type-micro-label text-ui-text-muted">{t('overview.firstSeenLabel')}</dt>
                    <dd className="type-caption mt-1"><IssueTime label={t('overview.firstSeenLabel')} timestamp={issueFirstSeenTimestamp(issue)} /></dd>
                  </div>
                  <div>
                    <dt className="type-micro-label text-ui-text-muted">{t('overview.lastSeenLabel')}</dt>
                    <dd className="type-caption mt-1"><IssueTime label={t('overview.lastSeenLabel')} timestamp={issueTimestamp(issue)} /></dd>
                  </div>
                </dl>
                <AutomaticInvestigationActivity
                  workspaceId={workspaceId}
                  targetId={issue.targetId}
                  targetType="virtual_machine"
                  issueId={issue.id}
                  activity={issue.automaticInvestigation}
                />
                {shouldShowManualAssistantFallback(issue.automaticInvestigation) && (
                  <Button
                    onClick={() => onOpenIssueTriage(issue)}
                    variant="primary"
                    size="md"
                    className="mt-4"
                  >
                    <Bot className="h-4 w-4" aria-hidden="true" />
                    {t('virtualMachines.overview.openAssistant')}
                  </Button>
                )}
              </article>
            ))}
          </div>
        </>
      ) : shouldShowIssueLoadFailure ? (
        <div className="flex min-h-36 flex-col items-center justify-center px-6 py-10 text-center" role="alert">
          <div className="rounded-md border border-status-warning/20 bg-status-warning-soft p-3 text-status-warning-text">
            <ICONS.AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <h3 className="type-row-title mt-4">{t('virtualMachines.overview.issueLoadFailedTitle')}</h3>
          <p className="type-body mt-2 max-w-xl">{t('virtualMachines.overview.issueLoadFailedBody')}</p>
        </div>
      ) : (
        <div className="flex min-h-36 flex-col items-center justify-center px-6 py-10 text-center">
          <div className="rounded-md border border-status-success/20 bg-status-success-soft p-3 text-status-success-text">
            <ICONS.CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <h3 className="type-row-title mt-4">{t('virtualMachines.overview.noIssuesTitle')}</h3>
          <p className="type-body mt-2 max-w-xl">{t('virtualMachines.overview.noIssuesBody')}</p>
        </div>
      )}
    </section>
  );
};
