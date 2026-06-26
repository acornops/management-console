import React from 'react';
import { Terminal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { ICONS } from '@/constants';
import { issueStatusTone } from '@/pages/issues/issueUi';
import type { ControlPlaneIssueItem, ControlPlaneVirtualMachine } from '@/services/controlPlaneApi';
import {
  findingSeverityTone,
  getFindingSeverity
} from '@/pages/virtual-machines/virtualMachineUi';

interface VirtualMachineIssuesPanelProps {
  selected: ControlPlaneVirtualMachine;
  findings: Record<string, unknown>[];
  issues: ControlPlaneIssueItem[] | null;
  isLoading: boolean;
  onOpenFindingTriage: (finding?: Record<string, unknown>) => void;
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
  selected,
  findings,
  issues,
  isLoading,
  onOpenFindingTriage,
  onOpenIssueTriage
}) => {
  const { t } = useTranslation();
  const reportedIssues = [...(issues || [])].sort((left, right) => {
    const severityDelta = issueSeverityRank(left.severity) - issueSeverityRank(right.severity);
    if (severityDelta !== 0) return severityDelta;
    return issueTimestamp(right) - issueTimestamp(left);
  });
  const hasIssueRows = issues !== null;
  const useIssueCounts = hasIssueRows;
  const issueCount = useIssueCounts ? reportedIssues.length : findings.length;
  const criticalIssues = useIssueCounts
    ? reportedIssues.filter((issue) => issue.severity === 'critical').length
    : findings.filter((finding) => getFindingSeverity(finding) === 'critical').length;
  const warningIssues = useIssueCounts
    ? reportedIssues.filter((issue) => issue.severity === 'warning').length
    : findings.filter((finding) => getFindingSeverity(finding) === 'warning').length;

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
                  <th className="type-label px-5 py-3 text-left">{t('clusterOverview.issue')}</th>
                  <th className="type-label px-5 py-3 text-left">{t('clusterOverview.severity')}</th>
                  <th className="type-label px-5 py-3 text-left">{t('virtualMachines.overview.source')}</th>
                  <th className="type-label px-5 py-3 text-left">{t('overview.lastSeenLabel')}</th>
                  <th className="type-label px-5 py-3 text-right">{t('clusterOverview.action')}</th>
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
                          {t('overview.firstSeenLabel')}: {new Date(issueFirstSeenTimestamp(issue)).toLocaleString()}
                        </span>
                      </div>
                      <h2 className="type-row-title mt-2">{issue.title}</h2>
                      <p className="type-body mt-1">{issue.reason || issue.summary}</p>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <span className={`type-micro-label rounded-full px-2.5 py-1 ${findingSeverityTone(issue.severity)}`}>
                        {t(`issues.severity.${issue.severity}`)}
                      </span>
                    </td>
                    <td className="type-caption px-5 py-4 align-top">
                      {issue.objectName || issue.objectKind || issue.reason || 'host'}
                    </td>
                    <td className="type-caption px-5 py-4 align-top">
                      {new Date(issueTimestamp(issue)).toLocaleString()}
                    </td>
                    <td className="px-5 py-4 align-top text-right">
                      <Button onClick={() => onOpenIssueTriage(issue)} variant="accent" size="md">
                        <Terminal className="h-4 w-4" />
                        {t('clusterOverview.runTriage')}
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
                  <span className={`type-micro-label rounded-full px-2.5 py-1 ${findingSeverityTone(issue.severity)}`}>
                    {t(`issues.severity.${issue.severity}`)}
                  </span>
                  <span className={`type-micro-label rounded-full px-2.5 py-1 ${issueStatusTone(issue.status)}`}>
                    {t(`issues.status.${issue.status}`)}
                  </span>
                </div>
                <p className="type-caption mt-3 text-ui-text-muted">
                  {t('overview.firstSeenLabel')}: {new Date(issueFirstSeenTimestamp(issue)).toLocaleString()}
                </p>
                <h2 className="type-row-title mt-4">{issue.title}</h2>
                <p className="type-body mt-2">{issue.reason || issue.summary}</p>
                <Button onClick={() => onOpenIssueTriage(issue)} variant="accent" size="md" className="mt-4">
                  <Terminal className="h-4 w-4" />
                  {t('clusterOverview.runTriage')}
                </Button>
              </article>
            ))}
          </div>
        </>
      ) : hasIssueRows || findings.length === 0 ? (
        <div className="flex min-h-36 flex-col items-center justify-center px-6 py-10 text-center">
          <div className="rounded-md border border-status-success/20 bg-status-success-soft p-3 text-status-success-text">
            <ICONS.CheckCircle2 className="h-5 w-5" />
          </div>
          <h2 className="type-row-title mt-4">{t('virtualMachines.overview.noIssuesTitle')}</h2>
          <p className="type-body mt-2 max-w-xl">{t('virtualMachines.overview.noIssuesBody')}</p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ui-border">
                  <th className="type-label px-5 py-3 text-left">{t('clusterOverview.finding')}</th>
                  <th className="type-label px-5 py-3 text-left">{t('clusterOverview.severity')}</th>
                  <th className="type-label px-5 py-3 text-left">{t('virtualMachines.overview.source')}</th>
                  <th className="type-label px-5 py-3 text-left">{t('clusterOverview.updated')}</th>
                  <th className="type-label px-5 py-3 text-right">{t('clusterOverview.action')}</th>
                </tr>
              </thead>
              <tbody>
                {findings.map((finding, index) => {
                  const severity = getFindingSeverity(finding);
                  return (
                    <tr key={String(finding.findingId || index)} className="border-b border-ui-border transition-colors last:border-b-0 hover:bg-ui-bg/70">
                      <td className="max-w-[34rem] px-5 py-4">
                        <p className="type-micro-label">{t('virtualMachines.overview.snapshotFinding')}</p>
                        <h2 className="type-row-title mt-2">{String(finding.title || t('virtualMachines.overview.findingFallback'))}</h2>
                        <p className="type-body mt-1">{String(finding.message || '')}</p>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <span className={`type-micro-label rounded-full px-2.5 py-1 ${findingSeverityTone(severity)}`}>
                          {t(`issues.severity.${severity}`)}
                        </span>
                      </td>
                      <td className="type-caption px-5 py-4 align-top">
                        {String(finding.source || finding.category || 'host')}
                      </td>
                      <td className="type-caption px-5 py-4 align-top">
                        {String(finding.timestamp || selected.latestSnapshot?.timestamp || selected.updatedAt)}
                      </td>
                      <td className="px-5 py-4 align-top text-right">
                        <Button onClick={() => onOpenFindingTriage(finding)} variant="accent" size="md">
                          <Terminal className="h-4 w-4" />
                          {t('clusterOverview.runTriage')}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-ui-border md:hidden">
            {findings.map((finding, index) => {
              const severity = getFindingSeverity(finding);
              return (
                <article key={String(finding.findingId || index)} className="p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`type-micro-label rounded-full px-2.5 py-1 ${findingSeverityTone(severity)}`}>
                      {t(`issues.severity.${severity}`)}
                    </span>
                    <span className="type-caption">{String(finding.source || finding.category || 'host')}</span>
                  </div>
                  <h2 className="type-row-title mt-4">{String(finding.title || t('virtualMachines.overview.findingFallback'))}</h2>
                  <p className="type-body mt-2">{String(finding.message || '')}</p>
                  <Button onClick={() => onOpenFindingTriage(finding)} variant="accent" size="md" className="mt-4">
                    <Terminal className="h-4 w-4" />
                    {t('clusterOverview.runTriage')}
                  </Button>
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
};
