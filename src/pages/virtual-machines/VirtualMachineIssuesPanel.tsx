import React from 'react';
import { useTranslation } from 'react-i18next';

import { TargetIssuesPanel } from '@/features/targets/issues/TargetIssuesPanel';
import type { ControlPlaneIssueItem, ControlPlaneTargetIssueSummary } from '@/services/controlPlaneApi';

interface VirtualMachineIssuesPanelProps {
  workspaceId: string;
  issues: ControlPlaneIssueItem[] | null;
  issueSummary: ControlPlaneTargetIssueSummary | null;
  isLoading: boolean;
  issueLoadFailed: boolean;
  onOpenIssueTriage: (issue: ControlPlaneIssueItem) => void;
}

export const VirtualMachineIssuesPanel: React.FC<VirtualMachineIssuesPanelProps> = ({
  workspaceId,
  issues,
  issueSummary,
  isLoading,
  issueLoadFailed,
  onOpenIssueTriage
}) => {
  const { t } = useTranslation();
  const targetId = issues?.[0]?.targetId || '';

  return (
    <TargetIssuesPanel
      workspaceId={workspaceId}
      targetId={targetId}
      targetType="virtual_machine"
      issues={issues}
      issueSummary={issueSummary}
      isLoading={isLoading}
      loadFailed={issueLoadFailed}
      alwaysShowCounts
      className="mb-10"
      sourceForIssue={(issue) => issue.objectName || issue.objectKind || issue.reason || t('virtualMachines.overview.hostSource')}
      onOpenAssistant={onOpenIssueTriage}
      labels={{
        title: t('virtualMachines.overview.activeIssues'),
        description: <p className="mt-1 type-body leading-6 text-ui-text-muted">{t('virtualMachines.overview.activeIssuesBody')}</p>,
        issueCount: (count) => t('virtualMachines.overview.issueCount', { count }),
        criticalCount: (count) => t('virtualMachines.overview.criticalIssues', { count }),
        warningCount: (count) => t('virtualMachines.overview.warningIssues', { count }),
        issueColumn: t('virtualMachines.overview.issue'),
        severityColumn: t('virtualMachines.overview.severity'),
        sourceColumn: t('virtualMachines.overview.source'),
        firstSeen: t('overview.firstSeenLabel'),
        lastSeen: t('overview.lastSeenLabel'),
        actionColumn: t('virtualMachines.overview.action'),
        openAssistant: t('virtualMachines.overview.openAssistant'),
        loadingTitle: t('virtualMachines.overview.loadingIssuesTitle'),
        loadingBody: t('virtualMachines.overview.loadingIssuesBody'),
        failureTitle: t('virtualMachines.overview.issueLoadFailedTitle'),
        failureBody: t('virtualMachines.overview.issueLoadFailedBody'),
        emptyTitle: t('virtualMachines.overview.noIssuesTitle'),
        emptyBody: t('virtualMachines.overview.noIssuesBody'),
        retry: t('common.retry'),
        severityLabel: (severity) => t(`issues.severity.${severity}`),
        statusLabel: (status) => t(`issues.status.${status}`)
      }}
    />
  );
};
