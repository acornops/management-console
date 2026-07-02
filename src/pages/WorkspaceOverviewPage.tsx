import React from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Clock3,
  Terminal
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { InlineLoadingIndicator } from '@/components/common/Loading';
import { ICONS } from '@/constants';
import { headerMotion } from '@/lib/motion';
import { issueStatusTone } from '@/pages/issues/issueUi';
import { formatControlPlaneError } from '@/services/control-plane/errorFormatting';
import { controlPlaneApi, type ControlPlaneIssueItem, type ControlPlaneVirtualMachine } from '@/services/controlPlaneApi';
import { type KubernetesCluster, type Workspace } from '@/types';
import { readRecentInvestigation } from '@/pages/workspace-overview/recentInvestigation';
import {
  buildWorkspaceOverviewCards,
  type WorkspaceOverviewAttentionItem,
  type WorkspaceOverviewTargetCard
} from '@/pages/workspace-overview/workspaceOverviewModel';
import type { TargetPromptRequest } from '@/pages/target-prompts/targetPromptModel';

interface WorkspaceOverviewPageProps {
  currentUserId: string;
  workspace: Workspace;
  kubernetesClusters: KubernetesCluster[];
  virtualMachines: ControlPlaneVirtualMachine[];
  hasLoadedWorkspaceVirtualMachines: boolean;
  onReplaceWorkspaceVirtualMachines: (workspaceId: string, nextVirtualMachines: ControlPlaneVirtualMachine[]) => void;
  onResumeRecentInvestigation: (path: string) => void;
  onRunTriage: (request: TargetPromptRequest) => void;
  onSelectCluster: (clusterId: string) => void;
  onSelectVirtualMachine: (vmId: string) => void;
}

function formatRelativeTime(timestamp: number, t: (key: string, options?: Record<string, unknown>) => string): string {
  const elapsedMinutes = Math.max(1, Math.floor((Date.now() - timestamp) / 60000));
  if (elapsedMinutes < 60) return t('overview.updatedMinutesAgo', { count: elapsedMinutes });
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return t('overview.updatedHoursAgo', { count: elapsedHours });
  return t('overview.updatedDaysAgo', { count: Math.floor(elapsedHours / 24) });
}

function formatIsoRelativeTime(timestamp: string, fallbackTimestamp: number, t: (key: string, options?: Record<string, unknown>) => string): string {
  const parsed = Date.parse(timestamp);
  return formatRelativeTime(Number.isFinite(parsed) ? parsed : fallbackTimestamp, t);
}

async function loadAllWorkspaceIssues(workspaceId: string): Promise<ControlPlaneIssueItem[]> {
  const items: ControlPlaneIssueItem[] = [];
  let cursor: string | undefined;

  do {
    const page = await controlPlaneApi.listWorkspaceIssues(workspaceId, { limit: 100, cursor });
    items.push(...page.items);
    cursor = page.nextCursor;
  } while (cursor);

  return items;
}

async function loadAllWorkspaceVirtualMachines(workspaceId: string): Promise<ControlPlaneVirtualMachine[]> {
  const items: ControlPlaneVirtualMachine[] = [];
  let cursor: string | undefined;

  do {
    const page = await controlPlaneApi.listVirtualMachinesForWorkspace(workspaceId, { limit: 100, cursor });
    items.push(...page.items);
    cursor = page.nextCursor;
  } while (cursor);

  return items;
}

export const WorkspaceOverviewPage: React.FC<WorkspaceOverviewPageProps> = ({
  currentUserId,
  workspace,
  kubernetesClusters,
  virtualMachines,
  hasLoadedWorkspaceVirtualMachines,
  onReplaceWorkspaceVirtualMachines,
  onResumeRecentInvestigation,
  onRunTriage,
  onSelectCluster,
  onSelectVirtualMachine
}) => {
  const { t } = useTranslation();
  const [workspaceVirtualMachines, setWorkspaceVirtualMachines] = React.useState(virtualMachines);
  const [workspaceIssues, setWorkspaceIssues] = React.useState<ControlPlaneIssueItem[]>([]);
  const [isLoadingIssues, setIsLoadingIssues] = React.useState(true);
  const [isLoadingVirtualMachines, setIsLoadingVirtualMachines] = React.useState(
    !hasLoadedWorkspaceVirtualMachines && virtualMachines.length === 0
  );
  const [issueLoadError, setIssueLoadError] = React.useState<string | null>(null);
  const issueRequestSeqRef = React.useRef(0);
  const vmListRequestSeqRef = React.useRef(0);

  React.useEffect(() => {
    if (hasLoadedWorkspaceVirtualMachines || virtualMachines.length > 0) {
      setWorkspaceVirtualMachines(virtualMachines);
      setIsLoadingVirtualMachines(false);
    }
  }, [hasLoadedWorkspaceVirtualMachines, virtualMachines]);

  React.useEffect(() => {
    const requestId = ++issueRequestSeqRef.current;
    setIsLoadingIssues(true);
    setIssueLoadError(null);

    void loadAllWorkspaceIssues(workspace.id)
      .then((items) => {
        if (requestId !== issueRequestSeqRef.current) return;
        setWorkspaceIssues(items);
      })
      .catch((error) => {
        console.error('Failed loading workspace issues', error);
        if (requestId !== issueRequestSeqRef.current) return;
        setWorkspaceIssues([]);
        setIssueLoadError(formatControlPlaneError(error, t('overview.clusterIssuesUnavailable')));
      })
      .finally(() => {
        if (requestId !== issueRequestSeqRef.current) return;
        setIsLoadingIssues(false);
      });
  }, [t, workspace.id]);

  React.useEffect(() => {
    if (hasLoadedWorkspaceVirtualMachines || virtualMachines.length > 0) return undefined;

    const requestId = ++vmListRequestSeqRef.current;
    setIsLoadingVirtualMachines(true);

    void loadAllWorkspaceVirtualMachines(workspace.id)
      .then((items) => {
        if (requestId !== vmListRequestSeqRef.current) return;
        setWorkspaceVirtualMachines(items);
        onReplaceWorkspaceVirtualMachines(workspace.id, items);
      })
      .catch((error) => {
        console.error('Failed loading workspace virtual machines', error);
        if (requestId !== vmListRequestSeqRef.current) return;
        setWorkspaceVirtualMachines([]);
      })
      .finally(() => {
        if (requestId !== vmListRequestSeqRef.current) return;
        setIsLoadingVirtualMachines(false);
      });

    return () => {
      vmListRequestSeqRef.current += 1;
    };
  }, [hasLoadedWorkspaceVirtualMachines, onReplaceWorkspaceVirtualMachines, virtualMachines.length, workspace.id]);

  const recentInvestigation = React.useMemo(
    () => readRecentInvestigation(workspace.id, currentUserId),
    [currentUserId, workspace.id]
  );
  const { attentionItems, connectedClusterCards, connectedVirtualMachineCards, criticalIssueCount, warningIssueCount } = React.useMemo(
    () =>
      buildWorkspaceOverviewCards({
        kubernetesClusters,
        issues: workspaceIssues,
        virtualMachines: workspaceVirtualMachines,
        t
      }),
    [kubernetesClusters, t, workspaceIssues, workspaceVirtualMachines]
  );

  const summaryStats = [
    {
      label: t('overview.criticalIssues'),
      value: criticalIssueCount,
      tone: criticalIssueCount > 0 ? 'text-status-danger-text' : 'text-ui-text-muted'
    },
    {
      label: t('overview.warningIssues'),
      value: warningIssueCount,
      tone: warningIssueCount > 0 ? 'text-status-warning-text' : 'text-ui-text-muted'
    }
  ];

  const isLoadingBoard = isLoadingIssues || isLoadingVirtualMachines;
  const boardWarnings = [issueLoadError]
    .filter((warning): warning is string => Boolean(warning));
  const recentInvestigationUpdated = recentInvestigation ? formatRelativeTime(recentInvestigation.timestamp, t) : '';
  const recentInvestigationBody = recentInvestigation
    ? t('overview.quickActionsResumeBody', {
      targetName: recentInvestigation.targetName,
      updated: recentInvestigationUpdated
    })
    : t('overview.quickActionsEmptyBody');

  const openCard = (card: { targetId: string; targetType: 'kubernetes' | 'virtual_machine' }) => {
    if (card.targetType === 'kubernetes') {
      onSelectCluster(card.targetId);
      return;
    }
    onSelectVirtualMachine(card.targetId);
  };

  const runTriage = (item: WorkspaceOverviewAttentionItem) => {
    const issue = item.issue;
    const prompt = item.targetType === 'virtual_machine'
      ? t('virtualMachines.overview.triageIssuePrompt', {
        title: issue.title,
        severity: issue.severity,
        source: issue.detail,
        message: issue.evidence || issue.title
      })
      : `Triage "${issue.title}" on ${item.targetName}. Severity: ${issue.severity}. Scope: ${issue.detail}. Issue summary: ${issue.evidence || issue.title}`;

    onRunTriage({
      targetId: item.targetId,
      workspaceId: workspace.id,
      targetType: item.targetType,
      prompt
    });
  };

  const renderConnectedPanel = (
    title: string,
    Icon: typeof ICONS.Layers,
    emptyTitle: string,
    emptyBody: string,
    cards: WorkspaceOverviewTargetCard[]
  ) => (
    <section className="rounded-lg border border-ui-border bg-ui-surface">
      <div className="border-b border-ui-border px-4 py-3 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-ui-border bg-ui-bg text-accent-strong">
              <Icon className="h-5 w-5" />
            </span>
            <h2 className="type-row-title truncate">{title}</h2>
          </div>
          <span className="type-caption shrink-0 text-ui-text-muted">{t('overview.connectedTargetCount', { count: cards.length })}</span>
        </div>
      </div>
      <div>
        {cards.length === 0 ? (
          <div className="px-4 py-4 sm:px-5">
            <p className="type-row-title">{emptyTitle}</p>
            <p className="type-body mt-1 text-ui-text-muted">{emptyBody}</p>
          </div>
        ) : (
          <div className="divide-y divide-ui-border">
            {cards.map((card) => (
              <button
                key={`${card.targetType}-${card.targetId}`}
                type="button"
                onClick={() => openCard(card)}
                className="group flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-ui-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 sm:px-5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`type-micro-label shrink-0 rounded-full px-2.5 py-1 ${card.postureTone}`}>
                    {card.postureLabel}
                  </span>
                  <h3 className="type-row-title break-words text-ui-text">{card.name}</h3>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );

  const renderAttentionIssueCard = (item: WorkspaceOverviewAttentionItem, index: number) => {
    const issue = item.issue;
    const isPrimary = index === 0;
    return (
      <article
        key={`${issue.id}-${item.targetType}-${item.targetId}`}
        className="w-full rounded-lg border border-ui-border bg-ui-bg p-4 text-left transition-colors hover:border-accent/40 hover:bg-accent-soft/20 sm:p-5"
      >
        <div data-primary-issue-card={isPrimary ? 'true' : undefined} className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="type-micro-label rounded-full border border-ui-border bg-ui-surface px-2.5 py-1 text-ui-text-muted">
                {t('overview.issueRank', { count: index + 1 })}
              </span>
              <span
                className={`type-micro-label rounded-full px-2.5 py-1 ${
                  issue.severity === 'critical'
                    ? 'bg-status-danger-soft text-status-danger-text'
                    : issue.severity === 'warning'
                      ? 'bg-status-warning-soft text-status-warning-text'
                      : 'bg-ui-surface text-ui-text-muted'
                }`}
              >
                {t(`issues.severity.${issue.severity}`)}
              </span>
              <span className={`type-micro-label rounded-full px-2.5 py-1 ${issueStatusTone(issue.status)}`}>
                {t(`issues.status.${issue.status}`)}
              </span>
              <span className="type-micro-label rounded-full border border-ui-border bg-ui-surface px-2.5 py-1 text-ui-text-muted">
                {item.targetTypeLabel}
              </span>
            </div>
            <h3 className="mt-3 type-panel-title break-words">{issue.title}</h3>
            <dl className="mt-3 grid gap-3 text-ui-text-muted sm:grid-cols-2 xl:grid-cols-4">
              <div className="min-w-0">
                <dt className="type-micro-label">{t('overview.targetLabel')}</dt>
                <dd className="type-caption mt-1 break-words text-ui-text">{item.targetName}</dd>
              </div>
              <div className="min-w-0">
                <dt className="type-micro-label">{t('overview.scopeLabel')}</dt>
                <dd className="type-caption mt-1 break-words text-ui-text">{issue.detail}</dd>
              </div>
              <div className="min-w-0">
                <dt className="type-micro-label">{t('overview.lastSeenLabel')}</dt>
                <dd className="type-caption mt-1 text-ui-text">{formatRelativeTime(issue.timestamp, t)}</dd>
              </div>
              <div className="min-w-0">
                <dt className="type-micro-label">{t('overview.firstSeenLabel')}</dt>
                <dd className="type-caption mt-1 text-ui-text">{formatIsoRelativeTime(issue.firstSeenAt, issue.timestamp, t)}</dd>
              </div>
            </dl>
            {issue.evidence && (
              <p className="type-body mt-3 line-clamp-2 max-w-4xl text-ui-text-muted">
                <span className="font-semibold text-ui-text">{t('overview.evidenceLabel')}: </span>
                {issue.evidence}
              </p>
            )}
          </div>
          <div className="flex w-full shrink-0 flex-col gap-2 self-start sm:w-auto sm:flex-row lg:justify-end">
            <Button onClick={() => runTriage(item)} variant="accent" size="sm" className="w-full justify-center sm:w-auto">
              <Terminal className="h-4 w-4" />
              {t('overview.runTriageIssue')}
            </Button>
            <Button onClick={() => openCard(item)} variant="secondary" size="sm" className="w-full justify-center sm:w-auto">
              <ArrowRight className="h-4 w-4" />
              {t('overview.viewMoreIssue')}
            </Button>
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="min-h-0 w-full max-w-full flex-1 overflow-x-hidden overflow-y-auto bg-ui-bg px-4 py-6 custom-scrollbar stable-scrollbar-gutter sm:px-6 lg:px-10 lg:py-8">
      <motion.header {...headerMotion} className="mb-8 flex min-w-0 flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 max-w-3xl">
          <h1 className="type-route-title">{t('overview.title')}</h1>
          <p className="type-body mt-2 break-words">{t('overview.summaryFor')}</p>
        </div>
        <dl className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center lg:w-auto lg:max-w-2xl lg:justify-end">
          {summaryStats.map((item) => (
            <div key={item.label} className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md border border-ui-border bg-ui-surface px-4 py-2 shadow-sm sm:w-fit">
              <dt className="type-label whitespace-nowrap">{item.label}</dt>
              <dd className={`type-row-title tabular-nums ${item.tone}`}>{item.value}</dd>
            </div>
          ))}
        </dl>
      </motion.header>

      <section
        data-overview-quick-actions="true"
        className="mb-6 overflow-hidden rounded-xl border border-accent/20 bg-accent-soft/60 px-5 py-4 shadow-sm sm:px-6"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="type-micro-label text-accent-strong">{t('overview.quickActionsTitle')}</p>
            <p className="type-row-title mt-2">{recentInvestigationBody}</p>
          </div>
          <Button
            onClick={() => recentInvestigation && onResumeRecentInvestigation(recentInvestigation.path)}
            variant="secondary"
            size="md"
            disabled={!recentInvestigation}
            className="w-full justify-center sm:w-auto"
          >
            <Clock3 className="h-4 w-4" />
            {t('overview.resumeRecentInvestigation')}
          </Button>
        </div>
      </section>

      {boardWarnings.length > 0 && (
        <div className="mb-6 rounded-lg border border-status-warning/30 bg-status-warning-soft px-5 py-4 text-sm text-status-warning-text sm:px-6">
          {boardWarnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      )}

      <section
        data-attention-board="true"
        className="mb-6 rounded-lg border border-ui-border bg-ui-surface shadow-sm"
      >
        <div className="border-b border-ui-border px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-ui-border bg-ui-bg text-accent-strong">
              <ICONS.AlertTriangle className="h-5 w-5" />
            </span>
            <div>
              <h2 className="type-row-title">{t('overview.needsAttentionTitle')}</h2>
              <p className="type-caption mt-1">{t('overview.needsAttentionBody')}</p>
            </div>
          </div>
        </div>

        {isLoadingBoard ? (
          <div className="px-5 py-5 sm:px-6">
            <InlineLoadingIndicator label={t('overview.loadingBoard')} />
          </div>
        ) : attentionItems.length === 0 ? (
          <div className="px-5 py-5 sm:px-6">
            <div className="rounded-md border border-ui-border bg-ui-bg px-4 py-4">
              <p className="type-row-title">{t('overview.noAttentionTargetsTitle')}</p>
              <p className="type-body mt-1 text-ui-text-muted">{t('overview.noAttentionTargetsBody')}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 px-5 py-5 sm:px-6">
            {attentionItems.map((item, index) => renderAttentionIssueCard(item, index))}
          </div>
        )}
      </section>

      <div data-connected-targets="true" className="mb-6 grid gap-6 xl:grid-cols-2">
        {renderConnectedPanel(
          t('overview.connectedClustersTitle'),
          ICONS.Layers,
          t('overview.noConnectedClustersTitle'),
          t('overview.noConnectedClustersBody'),
          connectedClusterCards
        )}
        {renderConnectedPanel(
          t('overview.connectedVirtualMachinesTitle'),
          ICONS.Server,
          t('overview.noConnectedVirtualMachinesTitle'),
          t('overview.noConnectedVirtualMachinesBody'),
          connectedVirtualMachineCards
        )}
      </div>
    </div>
  );
};
