import React from 'react';
import {
  ArrowRight,
  Clock3,
  Terminal
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, buttonClassName } from '@/components/common/Button';
import { CollectionState } from '@/components/common/CollectionState';
import { EmptyState } from '@/components/common/EmptyState';
import { InlineLoadingIndicator } from '@/components/common/Loading';
import { PageHeader, PageShell } from '@/components/common/PageComposition';
import { appHref, handleAppLinkClick } from '@/app/workspaceNavigation';
import { ICONS } from '@/constants';
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
import { useCursorCollection } from '@/hooks/useCursorCollection';
import { AppPaths } from '@/utils/routes';

interface WorkspaceOverviewPageProps {
  currentUserId: string;
  workspace: Workspace;
  kubernetesClusters: KubernetesCluster[];
  virtualMachines: ControlPlaneVirtualMachine[];
  hasLoadedWorkspaceVirtualMachines: boolean;
  onReplaceWorkspaceVirtualMachines: (workspaceId: string, nextVirtualMachines: ControlPlaneVirtualMachine[]) => void;
  onRunTriage: (request: TargetPromptRequest) => void;
  navigate: (path: string) => void;
}

function formatRelativeTime(timestamp: number, t: (key: string, options?: Record<string, unknown>) => string): string {
  const elapsedMinutes = Math.max(1, Math.floor((Date.now() - timestamp) / 60000));
  if (elapsedMinutes < 60) return t('overview.updatedMinutesAgo', { count: elapsedMinutes });
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return t('overview.updatedHoursAgo', { count: elapsedHours });
  return t('overview.updatedDaysAgo', { count: Math.floor(elapsedHours / 24) });
}

export const WorkspaceOverviewPage: React.FC<WorkspaceOverviewPageProps> = ({
  currentUserId,
  workspace,
  kubernetesClusters,
  virtualMachines,
  hasLoadedWorkspaceVirtualMachines,
  onReplaceWorkspaceVirtualMachines,
  onRunTriage,
  navigate
}) => {
  const { t } = useTranslation();
  const [workspaceVirtualMachines, setWorkspaceVirtualMachines] = React.useState(virtualMachines);
  const loadIssuePage = React.useCallback(async ({ cursor, limit, signal }: { cursor?: string; limit: number; signal: AbortSignal }) => {
    try {
      return await controlPlaneApi.listWorkspaceIssues(workspace.id, { limit, cursor, signal });
    } catch (error) {
      throw new Error(formatControlPlaneError(error, t('overview.clusterIssuesUnavailable')));
    }
  }, [t, workspace.id]);
  const issueCollection = useCursorCollection({
    filters: { workspaceId: workspace.id },
    getKey: (issue: ControlPlaneIssueItem) => issue.id,
    loadPage: loadIssuePage,
    pageSize: 24,
    strategy: 'manual'
  });
  const loadVirtualMachinePage = React.useCallback(async ({ cursor, limit, signal }: { cursor?: string; limit: number; signal: AbortSignal }) => {
    try {
      return await controlPlaneApi.listVirtualMachinesForWorkspace(workspace.id, { limit, cursor, signal });
    } catch (error) {
      throw new Error(formatControlPlaneError(error, t('overview.virtualMachinesUnavailable')));
    }
  }, [t, workspace.id]);
  const virtualMachineCollection = useCursorCollection({
    filters: { workspaceId: workspace.id },
    getKey: (virtualMachine: ControlPlaneVirtualMachine) => virtualMachine.id,
    loadPage: loadVirtualMachinePage,
    pageSize: 50,
    strategy: 'manual'
  });
  const workspaceIssues = issueCollection.items;
  const isLoadingIssues = issueCollection.phase === 'loading' || issueCollection.phase === 'refreshing';
  const hasPriorVirtualMachineData = hasLoadedWorkspaceVirtualMachines || workspaceVirtualMachines.length > 0;
  const isLoadingVirtualMachines = !hasLoadedWorkspaceVirtualMachines
    && virtualMachines.length === 0
    && (virtualMachineCollection.phase === 'loading' || virtualMachineCollection.phase === 'refreshing');
  const issueLoadError = issueCollection.error || null;
  const virtualMachineLoadError = virtualMachineCollection.error || null;

  React.useEffect(() => {
    if (hasLoadedWorkspaceVirtualMachines || virtualMachines.length > 0) {
      setWorkspaceVirtualMachines(virtualMachines);
    }
  }, [hasLoadedWorkspaceVirtualMachines, virtualMachines]);

  React.useEffect(() => {
    if (virtualMachineCollection.phase !== 'ready') return;
    setWorkspaceVirtualMachines(virtualMachineCollection.items);
    onReplaceWorkspaceVirtualMachines(workspace.id, virtualMachineCollection.items);
  }, [onReplaceWorkspaceVirtualMachines, virtualMachineCollection.items, virtualMachineCollection.phase, workspace.id]);

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

  const hasMoreIssues = Boolean(issueCollection.nextCursor);
  const recentInvestigationUpdated = recentInvestigation ? formatRelativeTime(recentInvestigation.timestamp, t) : '';
  const recentInvestigationBody = recentInvestigation
    ? t('overview.quickActionsResumeBody', {
      targetName: recentInvestigation.targetName,
      updated: recentInvestigationUpdated
    })
    : '';

  const targetPath = (card: { targetId: string; targetType: 'kubernetes' | 'virtual_machine' }) => (
    card.targetType === 'kubernetes'
      ? AppPaths.workspaceKubernetesClusterDiagnostics(workspace.id, card.targetId)
      : AppPaths.workspaceVirtualMachineDetail(workspace.id, card.targetId)
  );

  const renderCollectionRecovery = (
    message: string,
    retry: () => Promise<void>,
    tone: 'danger' | 'warning' = 'danger'
  ) => (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={`flex flex-col gap-3 rounded-md border px-4 py-4 sm:flex-row sm:items-center sm:justify-between ${
        tone === 'danger'
          ? 'border-status-danger/25 bg-status-danger-soft text-status-danger-text'
          : 'border-status-warning/25 bg-status-warning-soft text-status-warning-text'
      }`}
    >
      <div className="flex min-w-0 items-start gap-3">
        <ICONS.AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p className="type-caption break-words font-semibold">{message}</p>
      </div>
      <Button onClick={() => void retry()} variant="secondary" size="sm" className="w-full shrink-0 sm:w-auto">
        {t('common.retry')}
      </Button>
    </div>
  );

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

  const renderConnectedGroup = (
    title: string,
    Icon: typeof ICONS.Layers,
    emptyTitle: string,
    emptyBody: string,
    cards: WorkspaceOverviewTargetCard[],
    state?: {
      error?: string | null;
      isLoading?: boolean;
      retainedError?: string | null;
      retry?: () => Promise<void>;
    }
  ) => (
    <div
      data-target-group="true"
      aria-busy={state?.isLoading || undefined}
      className="min-w-0 first:border-0 max-xl:border-t max-xl:border-ui-border xl:border-l xl:border-ui-border"
    >
      <div className="border-b border-ui-border px-4 py-3 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Icon className="h-4 w-4 shrink-0 text-ui-text-muted" aria-hidden="true" />
            <h2 className="type-row-title truncate">{title}</h2>
          </div>
          <span className="type-caption shrink-0 text-ui-text-muted">{t('overview.connectedTargetCount', { count: cards.length })}</span>
        </div>
      </div>
      <div>
        {state?.isLoading ? (
          <div className="px-4 py-5 sm:px-5"><InlineLoadingIndicator label={t('overview.loadingVirtualMachines')} /></div>
        ) : state?.error && state.retry ? (
          <div className="px-4 py-5 sm:px-5">{renderCollectionRecovery(state.error, state.retry)}</div>
        ) : cards.length === 0 ? (
          <EmptyState
            embedded
            headingLevel={3}
            className="min-h-0 px-4 py-6 sm:px-5"
            icon={<Icon />}
            title={emptyTitle}
            description={emptyBody}
          />
        ) : (
          <>
            {state?.retainedError && state.retry && (
              <div className="border-b border-ui-border px-4 py-4 sm:px-5">
                {renderCollectionRecovery(state.retainedError, state.retry, 'warning')}
              </div>
            )}
            <div className="divide-y divide-ui-border">
              {cards.map((card) => {
                const path = targetPath(card);
                return (
                  <a
                    key={`${card.targetType}-${card.targetId}`}
                    href={appHref(path)}
                    onClick={(event) => handleAppLinkClick(event, path, navigate)}
                    className="control-target group flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-ui-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/25 sm:px-5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={`type-micro-label shrink-0 rounded-full px-2.5 py-1 ${card.postureTone}`}>
                        {card.postureLabel}
                      </span>
                      <h3 className="type-row-title break-words text-ui-text">{card.name}</h3>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-ui-text-muted transition-colors group-hover:text-ui-text" aria-hidden="true" />
                  </a>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );

  const renderAttentionIssueRow = (item: WorkspaceOverviewAttentionItem) => {
    const issue = item.issue;
    const path = targetPath(item);
    return (
      <article
        key={`${issue.id}-${item.targetType}-${item.targetId}`}
        className="w-full px-5 py-4 text-left transition-colors hover:bg-ui-bg sm:px-6"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
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
            </div>
            <h3 className="mt-2 type-panel-title break-words">{issue.title}</h3>
            <p className="type-caption mt-1 break-words text-ui-text-muted">
              <span className="text-ui-text">{item.targetName}</span>
              {' · '}{item.targetTypeLabel}{' · '}{issue.detail}{' · '}
              {t('overview.lastSeenLabel')} {formatRelativeTime(issue.timestamp, t)}
            </p>
            {issue.evidence && (
              <p className="type-body mt-2 line-clamp-2 max-w-4xl text-ui-text-muted">{issue.evidence}</p>
            )}
          </div>
          <div className="flex w-full shrink-0 flex-col gap-2 self-start sm:w-auto sm:flex-row lg:justify-end">
            <Button onClick={() => runTriage(item)} variant="primary" size="sm" className="w-full justify-center sm:w-auto">
              <Terminal className="h-4 w-4" />
              {t('overview.runTriageIssue')}
            </Button>
            <a
              href={appHref(path)}
              onClick={(event) => handleAppLinkClick(event, path, navigate)}
              className={buttonClassName({ variant: 'tertiary', size: 'sm', className: 'w-full justify-center sm:w-auto' })}
            >
              <ArrowRight className="h-4 w-4" />
              {t('overview.viewMoreIssue')}
            </a>
          </div>
        </div>
      </article>
    );
  };

  return (
    <PageShell>
      <PageHeader title={t('overview.title')} description={t('overview.summaryFor')} />

      {recentInvestigation && (
        <section
          data-overview-quick-actions="true"
          aria-label={t('overview.quickActionsTitle')}
          className="mb-6 flex flex-col gap-3 border-y border-ui-border py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="type-body flex min-w-0 items-center gap-2 text-ui-text-muted">
            <Clock3 className="h-4 w-4 shrink-0" aria-hidden="true" />
            {recentInvestigationBody}
          </p>
          <a
            href={appHref(recentInvestigation.path)}
            onClick={(event) => handleAppLinkClick(event, recentInvestigation.path, navigate)}
            className={buttonClassName({ variant: 'secondary', size: 'sm', className: 'w-full justify-center sm:w-auto' })}
          >
            {t('overview.resumeRecentInvestigation')}
          </a>
        </section>
      )}

      <section
        data-attention-board="true"
        className="mb-6 overflow-hidden rounded-lg border border-ui-border bg-ui-surface"
      >
        <div className="border-b border-ui-border px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <ICONS.AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-accent-strong" aria-hidden="true" />
              <div>
                <h2 className="type-row-title">{t('overview.needsAttentionTitle')}</h2>
                <p className="type-caption mt-1">{t('overview.needsAttentionBody')}</p>
              </div>
            </div>
            <dl className="flex shrink-0 items-center gap-4 text-ui-text-muted">
              <div className="flex items-baseline gap-1.5">
                <dt className="type-caption">{t(hasMoreIssues ? 'overview.criticalIssuesShown' : 'overview.criticalIssues')}</dt>
                <dd className={`type-row-title tabular-nums ${criticalIssueCount > 0 ? 'text-status-danger-text' : ''}`}>{criticalIssueCount}</dd>
              </div>
              <div className="flex items-baseline gap-1.5">
                <dt className="type-caption">{t(hasMoreIssues ? 'overview.warningIssuesShown' : 'overview.warningIssues')}</dt>
                <dd className={`type-row-title tabular-nums ${warningIssueCount > 0 ? 'text-status-warning-text' : ''}`}>{warningIssueCount}</dd>
              </div>
            </dl>
          </div>
        </div>

        <CollectionState
          phase={issueCollection.phase}
          itemCount={attentionItems.length}
          loading={<div className="px-5 py-5 sm:px-6"><InlineLoadingIndicator label={t('overview.loadingBoard')} /></div>}
          empty={(
            <EmptyState
              embedded
              headingLevel={3}
              className="min-h-0 px-5 py-6 sm:px-6"
              icon={<ICONS.CheckCircle2 />}
              title={t('overview.noAttentionTargetsTitle')}
              description={t('overview.noAttentionTargetsBody')}
            />
          )}
          error={issueLoadError ? <div className="px-5 py-5 sm:px-6">{renderCollectionRecovery(issueLoadError, issueCollection.retry)}</div> : null}
          feedback={issueLoadError
            ? <div className="px-5 py-4 sm:px-6">{renderCollectionRecovery(issueLoadError, issueCollection.retry, 'warning')}</div>
            : isLoadingIssues
              ? <div className="px-5 py-4 sm:px-6"><InlineLoadingIndicator label={t('overview.loadingBoard')} /></div>
              : null}
        >
          <div className="divide-y divide-ui-border">
            {attentionItems.map(renderAttentionIssueRow)}
          </div>
        </CollectionState>
      </section>

      <section data-connected-targets="true" className="mb-6 overflow-hidden rounded-lg border border-ui-border bg-ui-surface xl:grid xl:grid-cols-2">
        {renderConnectedGroup(
          t('overview.connectedClustersTitle'),
          ICONS.Layers,
          t('overview.noConnectedClustersTitle'),
          t('overview.noConnectedClustersBody'),
          connectedClusterCards
        )}
        {renderConnectedGroup(
          t('overview.connectedVirtualMachinesTitle'),
          ICONS.Server,
          t('overview.noConnectedVirtualMachinesTitle'),
          t('overview.noConnectedVirtualMachinesBody'),
          connectedVirtualMachineCards,
          {
            error: virtualMachineLoadError && !hasPriorVirtualMachineData ? virtualMachineLoadError : null,
            isLoading: isLoadingVirtualMachines,
            retainedError: virtualMachineLoadError && hasPriorVirtualMachineData ? virtualMachineLoadError : null,
            retry: virtualMachineCollection.retry
          }
        )}
      </section>
    </PageShell>
  );
};
