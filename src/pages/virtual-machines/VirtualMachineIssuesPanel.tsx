import React from 'react';
import { Terminal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { ICONS } from '@/constants';
import { issueStatusTone } from '@/pages/issues/issueUi';
import type { ControlPlaneIssueItem, ControlPlaneTargetIssueSummary } from '@/services/controlPlaneApi';
import { issueSeverityTone } from '@/pages/virtual-machines/virtualMachineUi';
import { formatUserDateTime } from '@/utils/dateTime';

interface VirtualMachineIssuesPanelProps {
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

export const VirtualMachineIssuesPanel: React.FC<VirtualMachineIssuesPanelProps> = ({
  issues,
  issueSummary,
  isLoading,
  issueLoadFailed,
  onOpenIssueTriage
}) => {
  const { t } = useTranslation();
  const reportedIssues = [...(issues || [])].sort((left, right) => {
    const severityDelta = issueSeverityRank(left.severity) - issueSeverityRank(right.severity);
    if (severityDelta !== 0) return severityDelta;
    return issueTimestamp(right) - issueTimestamp(left);
  });
  const hasIssueRows = issues !== null;
  const issueCount = issueSummary?.total ?? (hasIssueRows ? reportedIssues.length : 0);
  const criticalIssues = issueSummary
    ? issueSummary.critical
    : hasIssueRows
      ? reportedIssues.filter((issue) => issue.severity === 'critical').length
    : 0;
  const warningIssues = issueSummary
    ? issueSummary.warning
    : hasIssueRows
      ? reportedIssues.filter((issue) => issue.severity === 'warning').length
    : 0;
  const shouldShowIssueLoadFailure = issueLoadFailed && (!issueSummary || issueSummary.total > 0);

  return (
    <section className="mb-10 overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm">
      <div className="flex flex-col gap-6 border-b border-ui-border bg-ui-bg px-5 py-5 sm:px-6 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-ui-border bg-ui-surface/70 text-accent-strong">
            <ICONS.AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="type-row-title">{t('virtualMachines.overview.activeIssues')}</p>
            <p className="mt-1 text-sm leading-6 text-ui-text-muted">
              {t('virtualMachines.overview.activeIssuesBody')}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="type-caption rounded-full bg-ui-surface px-3 py-1">
            {t('virtualMachines.overview.issueCount', { count: issueCount })}
          </span>
          <span className="type-caption rounded-full bg-status-danger-soft px-3 py-1 text-status-danger-text">
            {t('virtualMachines.overview.criticalIssues', { count: criticalIssues })}
          </span>
          <span className="type-caption rounded-full bg-status-warning-soft px-3 py-1 text-status-warning-text">
            {t('virtualMachines.overview.warningIssues', { count: warningIssues })}
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex min-h-36 flex-col items-center justify-center px-6 py-10 text-center">
          <div className="rounded-md border border-ui-border bg-ui-bg p-3 text-accent-strong">
            <ICONS.RefreshCw className="h-5 w-5 animate-spin" />
          </div>
          <h2 className="type-row-title mt-4">{t('virtualMachines.overview.loadingIssuesTitle')}</h2>
          <p className="type-body mt-2 max-w-xl">{t('virtualMachines.overview.loadingIssuesBody')}</p>
        </div>
      ) : reportedIssues.length > 0 ? (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ui-border">
                  <th className="type-label px-5 py-3 text-left">{t('virtualMachines.overview.issue')}</th>
                  <th className="type-label px-5 py-3 text-left">{t('virtualMachines.overview.severity')}</th>
                  <th className="type-label px-5 py-3 text-left">{t('virtualMachines.overview.source')}</th>
                  <th className="type-label px-5 py-3 text-left">{t('overview.lastSeenLabel')}</th>
                  <th className="type-label px-5 py-3 text-right">{t('virtualMachines.overview.action')}</th>
                </tr>
              </thead>
              <tbody>
                {reportedIssues.map((issue) => (
                  <tr key={issue.id} className="border-b border-ui-border transition-colors last:border-b-0 hover:bg-ui-bg/70">
                    <td className="max-w-[34rem] px-5 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`type-micro-label rounded-full px-2.5 py-1 ${issueStatusTone(issue.status)}`}>
                          {t(`issues.status.${issue.status}`)}
                        </span>
                        <span className="type-caption text-ui-text-muted">
                          {t('overview.firstSeenLabel')}: {formatUserDateTime(issueFirstSeenTimestamp(issue))}
                        </span>
                      </div>
                      <h2 className="type-row-title mt-2">{issue.title}</h2>
                      <p className="type-body mt-1">{issue.reason || issue.summary}</p>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <span className={`type-micro-label rounded-full px-2.5 py-1 ${issueSeverityTone(issue.severity)}`}>
                        {t(`issues.severity.${issue.severity}`)}
                      </span>
                    </td>
                    <td className="type-caption px-5 py-4 align-top">
                      {issue.objectName || issue.objectKind || issue.reason || 'host'}
                    </td>
                    <td className="type-caption px-5 py-4 align-top">
                      {formatUserDateTime(issueTimestamp(issue))}
                    </td>
                    <td className="px-5 py-4 align-top text-right">
                      <Button onClick={() => onOpenIssueTriage(issue)} variant="accent" size="md">
                        <Terminal className="h-4 w-4" />
                        {t('virtualMachines.overview.runTriage')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-ui-border md:hidden">
            {reportedIssues.map((issue) => (
              <article key={issue.id} className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`type-micro-label rounded-full px-2.5 py-1 ${issueSeverityTone(issue.severity)}`}>
                    {t(`issues.severity.${issue.severity}`)}
                  </span>
                  <span className={`type-micro-label rounded-full px-2.5 py-1 ${issueStatusTone(issue.status)}`}>
                    {t(`issues.status.${issue.status}`)}
                  </span>
                </div>
                <p className="type-caption mt-3 text-ui-text-muted">
                  {t('overview.firstSeenLabel')}: {formatUserDateTime(issueFirstSeenTimestamp(issue))}
                </p>
                <h2 className="type-row-title mt-4">{issue.title}</h2>
                <p className="type-body mt-2">{issue.reason || issue.summary}</p>
                <Button onClick={() => onOpenIssueTriage(issue)} variant="accent" size="md" className="mt-4">
                  <Terminal className="h-4 w-4" />
                  {t('virtualMachines.overview.runTriage')}
                </Button>
              </article>
            ))}
          </div>
        </>
      ) : shouldShowIssueLoadFailure ? (
        <div className="flex min-h-36 flex-col items-center justify-center px-6 py-10 text-center">
          <div className="rounded-md border border-status-warning/20 bg-status-warning-soft p-3 text-status-warning-text">
            <ICONS.AlertTriangle className="h-5 w-5" />
          </div>
          <h2 className="type-row-title mt-4">{t('virtualMachines.overview.issueLoadFailedTitle')}</h2>
          <p className="type-body mt-2 max-w-xl">{t('virtualMachines.overview.issueLoadFailedBody')}</p>
        </div>
      ) : (
        <div className="flex min-h-36 flex-col items-center justify-center px-6 py-10 text-center">
          <div className="rounded-md border border-status-success/20 bg-status-success-soft p-3 text-status-success-text">
            <ICONS.CheckCircle2 className="h-5 w-5" />
          </div>
          <h2 className="type-row-title mt-4">{t('virtualMachines.overview.noIssuesTitle')}</h2>
          <p className="type-body mt-2 max-w-xl">{t('virtualMachines.overview.noIssuesBody')}</p>
        </div>
      )}
    </section>
  );
};
