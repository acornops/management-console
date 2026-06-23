import React from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Clock3
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { InlineLoadingIndicator } from '@/components/common/Loading';
import { ICONS } from '@/constants';
import { headerMotion } from '@/lib/motion';
import { controlPlaneApi, type ControlPlaneInvestigationItem, type ControlPlaneVirtualMachine } from '@/services/controlPlaneApi';
import { type KubernetesCluster, type Workspace } from '@/types';
import { readRecentInvestigation } from '@/pages/workspace-overview/recentInvestigation';
import {
  buildWorkspaceOverviewCards,
  type WorkspaceOverviewAttentionItem,
  type WorkspaceOverviewTargetCard
} from '@/pages/workspace-overview/workspaceOverviewModel';

interface WorkspaceOverviewPageProps {
  currentUserId: string;
  workspace: Workspace;
  kubernetesClusters: KubernetesCluster[];
  virtualMachines: ControlPlaneVirtualMachine[];
  hasLoadedWorkspaceVirtualMachines: boolean;
  onReplaceWorkspaceVirtualMachines: (workspaceId: string, nextVirtualMachines: ControlPlaneVirtualMachine[]) => void;
  onResumeRecentInvestigation: (path: string) => void;
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

async function loadAllWorkspaceInvestigations(workspaceId: string): Promise<ControlPlaneInvestigationItem[]> {
  const items: ControlPlaneInvestigationItem[] = [];
  let cursor: string | undefined;

  do {
    const page = await controlPlaneApi.listWorkspaceInvestigations(workspaceId, { limit: 100, cursor });
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

async function loadAllVirtualMachineFindings(workspaceId: string, vmId: string): Promise<Record<string, unknown>[]> {
  const items: Record<string, unknown>[] = [];
  let cursor: string | undefined;

  do {
    const page = await controlPlaneApi.listVirtualMachineFindings(workspaceId, vmId, { limit: 100, cursor });
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
  onSelectCluster,
  onSelectVirtualMachine
}) => {
  const { t } = useTranslation();
  const [workspaceVirtualMachines, setWorkspaceVirtualMachines] = React.useState(virtualMachines);
  const [clusterInvestigations, setClusterInvestigations] = React.useState<ControlPlaneInvestigationItem[]>([]);
  const [vmFindingsById, setVmFindingsById] = React.useState<Record<string, Record<string, unknown>[]>>({});
  const [isLoadingInvestigations, setIsLoadingInvestigations] = React.useState(true);
  const [isLoadingVirtualMachines, setIsLoadingVirtualMachines] = React.useState(
    !hasLoadedWorkspaceVirtualMachines && virtualMachines.length === 0
  );
  const [isLoadingVmFindings, setIsLoadingVmFindings] = React.useState(false);
  const [clusterLoadError, setClusterLoadError] = React.useState<string | null>(null);
  const [vmFindingsLoadErrorCount, setVmFindingsLoadErrorCount] = React.useState(0);
  const clusterRequestSeqRef = React.useRef(0);
  const vmListRequestSeqRef = React.useRef(0);
  const vmFindingsRequestSeqRef = React.useRef(0);

  React.useEffect(() => {
    if (hasLoadedWorkspaceVirtualMachines || virtualMachines.length > 0) {
      setWorkspaceVirtualMachines(virtualMachines);
      setIsLoadingVirtualMachines(false);
    }
  }, [hasLoadedWorkspaceVirtualMachines, virtualMachines]);

  React.useEffect(() => {
    const requestId = ++clusterRequestSeqRef.current;
    setIsLoadingInvestigations(true);
    setClusterLoadError(null);

    void loadAllWorkspaceInvestigations(workspace.id)
      .then((items) => {
        if (requestId !== clusterRequestSeqRef.current) return;
        setClusterInvestigations(items);
      })
      .catch((error) => {
        console.error('Failed loading workspace investigations', error);
        if (requestId !== clusterRequestSeqRef.current) return;
        setClusterInvestigations([]);
        setClusterLoadError(error instanceof Error ? error.message : t('overview.clusterIssuesUnavailable'));
      })
      .finally(() => {
        if (requestId !== clusterRequestSeqRef.current) return;
        setIsLoadingInvestigations(false);
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

  React.useEffect(() => {
    const connectedVirtualMachines = workspaceVirtualMachines.filter((vm) => vm.status === 'online' || vm.status === 'degraded');
    if (connectedVirtualMachines.length === 0) {
      setVmFindingsById({});
      setVmFindingsLoadErrorCount(0);
      setIsLoadingVmFindings(false);
      return undefined;
    }

    const requestId = ++vmFindingsRequestSeqRef.current;
    setIsLoadingVmFindings(true);
    setVmFindingsLoadErrorCount(0);

    void Promise.allSettled(
      connectedVirtualMachines.map(async (vm) => [vm.id, await loadAllVirtualMachineFindings(workspace.id, vm.id)] as const)
    ).then((results) => {
      if (requestId !== vmFindingsRequestSeqRef.current) return;
      const nextFindingsById: Record<string, Record<string, unknown>[]> = {};
      let failedCount = 0;

      results.forEach((result, index) => {
        const vm = connectedVirtualMachines[index];
        if (result.status === 'fulfilled') {
          nextFindingsById[result.value[0]] = result.value[1];
          return;
        }
        console.error('Failed loading virtual machine findings', result.reason);
        failedCount += 1;
        nextFindingsById[vm.id] = [];
      });

      setVmFindingsById(nextFindingsById);
      setVmFindingsLoadErrorCount(failedCount);
      setIsLoadingVmFindings(false);
    });

    return () => {
      vmFindingsRequestSeqRef.current += 1;
    };
  }, [workspace.id, workspaceVirtualMachines]);

  const recentInvestigation = React.useMemo(
    () => readRecentInvestigation(workspace.id, currentUserId),
    [currentUserId, workspace.id]
  );
  const { attentionItems, connectedClusterCards, connectedVirtualMachineCards, criticalIssueCount, warningIssueCount } = React.useMemo(
    () =>
      buildWorkspaceOverviewCards({
        kubernetesClusters,
        clusterInvestigations,
        virtualMachines: workspaceVirtualMachines,
        vmFindingsById,
        t
      }),
    [clusterInvestigations, kubernetesClusters, t, vmFindingsById, workspaceVirtualMachines]
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

  const isLoadingBoard = isLoadingInvestigations || isLoadingVirtualMachines || isLoadingVmFindings;
  const boardWarnings = [clusterLoadError, vmFindingsLoadErrorCount > 0 ? t('overview.vmIssuesUnavailable', { count: vmFindingsLoadErrorCount }) : null]
    .filter((warning): warning is string => Boolean(warning));

  const openCard = (card: { targetId: string; targetType: 'kubernetes' | 'virtual_machine' }) => {
    if (card.targetType === 'kubernetes') {
      onSelectCluster(card.targetId);
      return;
    }
    onSelectVirtualMachine(card.targetId);
  };

  const renderConnectedPanel = (
    title: string,
    Icon: typeof ICONS.Layers,
    emptyTitle: string,
    emptyBody: string,
    cards: WorkspaceOverviewTargetCard[]
  ) => (
    <section className="rounded-lg border border-ui-border bg-ui-surface shadow-sm">
      <div className="border-b border-ui-border px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-ui-border bg-ui-bg text-accent-strong">
            <Icon className="h-5 w-5" />
          </span>
          <h2 className="type-row-title">{title}</h2>
        </div>
      </div>
      <div className="px-5 py-5 sm:px-6">
        {cards.length === 0 ? (
          <div className="rounded-md border border-ui-border bg-ui-bg px-4 py-4">
            <p className="type-row-title">{emptyTitle}</p>
            <p className="type-body mt-1 text-ui-text-muted">{emptyBody}</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {cards.map((card) => (
              <button
                key={`${card.targetType}-${card.targetId}`}
                type="button"
                onClick={() => openCard(card)}
                className="group flex items-center justify-between gap-4 rounded-lg border border-ui-border bg-ui-bg px-4 py-4 text-left transition-colors hover:border-accent/40 hover:bg-accent-soft/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
              >
                <div className="min-w-0">
                  <h3 className="type-row-title break-words text-ui-text">{card.name}</h3>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={`type-micro-label rounded-full px-2.5 py-1 ${card.postureTone}`}>
                      {card.postureLabel}
                    </span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-ui-text-muted transition-colors group-hover:text-accent-strong" />
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );

  const renderAttentionIssueCard = (item: WorkspaceOverviewAttentionItem) => {
    const issue = item.issue;
    return (
      <button
        key={`${issue.id}-${item.targetType}-${item.targetId}`}
        type="button"
        onClick={() => openCard(item)}
        className="group w-full rounded-lg border border-ui-border bg-ui-bg p-4 text-left transition-colors hover:border-accent/40 hover:bg-accent-soft/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
      >
        <div data-primary-issue-card="true" className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="type-micro-label rounded-full border border-status-danger/20 bg-status-danger-soft px-2.5 py-1 text-status-danger-text">
                {t('overview.issueRank', { count: 1 })}
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
                {t(`investigations.severity.${issue.severity}`)}
              </span>
              <span className="type-micro-label rounded-full border border-ui-border bg-ui-surface px-2.5 py-1 text-ui-text-muted">
                {item.targetTypeLabel}
              </span>
              <span className="type-caption text-ui-text-muted">
                {issue.detail} · {formatRelativeTime(issue.timestamp, t)}
              </span>
            </div>
            <h3 className="mt-3 type-panel-title break-words">{issue.title}</h3>
          </div>
          <div className="mt-1 flex shrink-0 items-center gap-2">
            <span className="type-micro-label rounded-full border border-ui-border bg-ui-surface px-2.5 py-1 text-ui-text">
              {item.targetName}
            </span>
            <ArrowRight className="h-4 w-4 text-ui-text-muted transition-colors group-hover:text-accent-strong" />
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="min-h-0 w-full max-w-full flex-1 overflow-x-hidden overflow-y-auto bg-ui-bg px-4 py-6 custom-scrollbar stable-scrollbar-gutter sm:px-6 lg:px-10 lg:py-8">
      <motion.header {...headerMotion} className="mb-8 flex min-w-0 flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 max-w-3xl">
          <h1 className="type-route-title">{t('overview.title')}</h1>
          <p className="type-body mt-2 break-words">{t('overview.summaryFor')}</p>
        </div>
        <dl className="grid min-w-0 gap-3 sm:grid-cols-2 lg:min-w-[22rem]">
          {summaryStats.map((item) => (
            <div key={item.label} className="rounded-lg border border-ui-border bg-ui-surface px-4 py-3 shadow-sm">
              <dt className="type-caption">{item.label}</dt>
              <dd className={`type-data mt-1 ${item.tone}`}>{item.value}</dd>
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
            <p className="type-row-title mt-2">{t('overview.quickActionsBody')}</p>
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
            {attentionItems.map((item) => renderAttentionIssueCard(item))}
          </div>
        )}
      </section>
    </div>
  );
};
