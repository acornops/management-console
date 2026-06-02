import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowRight, Cpu, Server } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { headerMotion } from '@/lib/motion';
import { HealthStatus, KubernetesCluster, Workspace } from '@/types';
import { getEffectiveHealthStatus } from '@/utils/telemetry';
import { buildInvestigationQueue, getTopInvestigationQueueItem } from '@/lib/workspaceInvestigationQueue';

interface WorkspaceOverviewPageProps {
  workspace: Workspace;
  kubernetesClusters: KubernetesCluster[];
  canManageClusters: boolean;
  onConnectCluster: () => void;
  onOpenVirtualMachines: () => void;
  onOpenInvestigations: () => void;
  onSelectCluster: (cluster: KubernetesCluster) => void;
}

function getResourceCount(kubernetesClusters: KubernetesCluster[]): number {
  return kubernetesClusters.reduce(
    (total, cluster) =>
      total +
      (
        cluster.resourceSummary?.resourceCount ??
        cluster.workloads.length + cluster.services.length + cluster.ingresses.length + cluster.pvcs.length + cluster.nodes.length + cluster.namespaces.length
      ),
    0
  );
}

function getNamespaceCount(kubernetesClusters: KubernetesCluster[]): number {
  return kubernetesClusters.reduce((total, cluster) => total + (cluster.resourceSummary?.namespaceCount ?? cluster.namespaces.length), 0);
}

function getMcpToolCount(kubernetesClusters: KubernetesCluster[]): number {
  return kubernetesClusters.reduce((total, app) => total + app.mcpTools.length, 0);
}

function statusLabel(status: HealthStatus, t: (key: string) => string): string {
  if (status === HealthStatus.GREEN) return t('overview.healthy');
  if (status === HealthStatus.YELLOW) return t('overview.warning');
  return t('overview.critical');
}

function findingSeverityTone(severity: 'critical' | 'warning' | 'info'): string {
  if (severity === 'critical') return 'bg-status-danger-soft text-status-danger-text';
  if (severity === 'warning') return 'bg-status-warning-soft text-status-warning-text';
  return 'bg-ui-bg text-ui-text-muted';
}

function healthStatusBadgeTone(status: HealthStatus): string {
  if (status === HealthStatus.GREEN) return 'bg-status-success-soft text-status-success-text';
  if (status === HealthStatus.YELLOW) return 'bg-status-warning-soft text-status-warning-text';
  return 'bg-status-danger-soft text-status-danger-text';
}

function commandHeaderTone(criticalClusters: number, warningClusters: number): string {
  if (criticalClusters > 0) return 'border-status-danger/20 bg-ui-surface text-ui-text';
  if (warningClusters > 0) return 'border-status-warning/20 bg-ui-surface text-ui-text';
  return 'border-status-success/20 bg-ui-surface text-ui-text';
}

export const WorkspaceOverviewPage: React.FC<WorkspaceOverviewPageProps> = ({
  workspace,
  kubernetesClusters,
  canManageClusters,
  onConnectCluster,
  onOpenVirtualMachines,
  onOpenInvestigations,
  onSelectCluster
}) => {
  const { t } = useTranslation();
  const healthyClusters = kubernetesClusters.filter((app) => getEffectiveHealthStatus(app) === HealthStatus.GREEN).length;
  const warningClusters = kubernetesClusters.filter((app) => getEffectiveHealthStatus(app) === HealthStatus.YELLOW).length;
  const criticalClusters = kubernetesClusters.filter((app) => getEffectiveHealthStatus(app) === HealthStatus.RED).length;
  const alerts = kubernetesClusters.flatMap((app) => app.alerts.map((alert) => ({ ...alert, clusterName: app.name }))).slice(0, 5);
  const resources = getResourceCount(kubernetesClusters);
  const namespaces = getNamespaceCount(kubernetesClusters);
  const connectedClusters = kubernetesClusters.filter((app) => app.agentConnectionState === 'connected').length;
  const clusterCount = workspace.clusterCount ?? kubernetesClusters.length;
  const virtualMachineCount = workspace.quota?.virtualMachines.used ?? 0;
  const targetCount = clusterCount + virtualMachineCount;
  const hasUnloadedClusters = clusterCount > kubernetesClusters.length;
  const mcpTools = getMcpToolCount(kubernetesClusters);
  const allAlerts = kubernetesClusters.flatMap((app) => app.alerts);
  const summarizedFindingCount = kubernetesClusters.reduce((total, app) => total + (app.resourceSummary?.findingCount ?? app.alerts.length), 0);
  const criticalFindings = kubernetesClusters.reduce(
    (total, app) => total + (app.resourceSummary?.criticalFindingCount ?? app.alerts.filter((alert) => alert.severity === 'critical').length),
    0
  );
  const warningFindings = Math.max(
    summarizedFindingCount - criticalFindings,
    allAlerts.filter((alert) => alert.severity === 'warning').length
  );
  const investigationQueue = buildInvestigationQueue(kubernetesClusters);
  const topInvestigation = getTopInvestigationQueueItem(investigationQueue);
  const supportingQueueItems = investigationQueue.slice(1, 5);
  const estatePosture =
    criticalClusters > 0 ? t('overview.actionRequired') : warningClusters > 0 ? t('overview.needsAttention') : t('overview.optimal');

  const postureTone = criticalClusters > 0
    ? 'border-status-danger/20 bg-status-danger-soft text-status-danger-text'
    : warningClusters > 0
      ? 'border-status-warning/20 bg-status-warning-soft text-status-warning-text'
      : 'border-status-success/20 bg-status-success-soft text-status-success-text';
  const commandHeaderStatusTone = commandHeaderTone(criticalClusters, warningClusters);
  const commandHeaderStats = [
    {
      label: t('overview.criticalFindings'),
      value: criticalFindings,
      tone: criticalFindings > 0 ? 'text-status-danger-text' : 'text-ui-text-muted'
    },
    {
      label: t('overview.warningFindings'),
      value: warningFindings,
      tone: warningFindings > 0 ? 'text-status-warning-text' : 'text-ui-text-muted'
    },
    {
      label: t('overview.telemetryCoverage'),
      value: `${connectedClusters}/${clusterCount}`,
      tone: connectedClusters === clusterCount && clusterCount > 0 ? 'text-status-success-text' : 'text-metric-blue'
    }
  ];
  const inventoryRows = [
    { label: t('overview.targetInventory'), value: targetCount, detail: t('overview.targetBreakdown', { clusters: clusterCount, vms: virtualMachineCount }), icon: Server },
    { label: t('overview.resourceInventory'), value: resources, detail: t('overview.namespacesObserved', { count: namespaces }), icon: Cpu },
    { label: t('overview.openFindings'), value: summarizedFindingCount, detail: t('overview.findingBreakdown', { critical: criticalFindings, warning: warningFindings }), icon: AlertTriangle },
    { label: t('overview.mcpTools'), value: mcpTools, detail: t('overview.mcpToolsConfigured', { count: mcpTools }), icon: Server }
  ];
  const operatingSignals = [
    {
      label: t('overview.reviewFindings'),
      intent: t('overview.reviewFindingsIntent'),
      reason: t('overview.reviewFindingsReason', { critical: criticalFindings, warning: warningFindings }),
      context: t('overview.queueContext'),
      tone: summarizedFindingCount > 0 ? 'text-accent-strong' : 'text-ui-text-muted'
    },
    {
      label: t('overview.inspectTargets'),
      intent: t('overview.inspectTargetsIntent'),
      reason: t('overview.inspectTargetsReason', { critical: criticalClusters, warning: warningClusters, healthy: healthyClusters, vms: virtualMachineCount }),
      context: t('overview.estateContext'),
      tone: criticalClusters > 0 ? 'text-status-danger-text' : warningClusters > 0 ? 'text-status-warning-text' : 'text-status-success-text'
    },
    {
      label: t('overview.connectCoverage'),
      intent: t('overview.connectCoverageIntent'),
      reason: t('overview.connectCoverageReason', { connected: connectedClusters, total: clusterCount, namespaces }),
      context: canManageClusters ? t('overview.coverageContext') : t('overview.coverageReadOnly'),
      tone: 'text-metric-blue'
    }
  ];
  const hasSummaryFindingsWithoutQueueItem = !topInvestigation && summarizedFindingCount > 0;
  const queueSummaryTitle = hasSummaryFindingsWithoutQueueItem
    ? t('overview.queueSummaryTitle')
    : hasUnloadedClusters
      ? t('overview.queuePagedTitle')
      : clusterCount === 0
        ? t('overview.queueConnectTitle')
        : t('overview.queueClearTitle');
  const queueSummaryBody = clusterCount === 0
    ? t('overview.noClustersConnectPrompt')
    : hasSummaryFindingsWithoutQueueItem
      ? t('overview.queueSummaryBody', { count: summarizedFindingCount })
      : hasUnloadedClusters
        ? t('overview.unloadedInvestigationPrompt')
        : t('overview.noInvestigations');
  const queuePrimaryActionLabel = clusterCount === 0 && canManageClusters ? t('app.connectClusterHelm') : t('overview.viewInvestigationQueue');
  const queuePrimaryAction = clusterCount === 0 && canManageClusters ? onConnectCluster : onOpenInvestigations;

  return (
    <div className="min-h-0 w-full max-w-full flex-1 overflow-x-hidden overflow-y-auto bg-ui-bg px-4 py-6 custom-scrollbar stable-scrollbar-gutter sm:px-6 lg:px-10 lg:py-8">
        <motion.header {...headerMotion} className="mb-8 flex min-w-0 flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 max-w-2xl">
            <h1 className="type-route-title">{t('overview.title')}</h1>
            <p className="type-body mt-2 break-words">{t('overview.summaryFor')}</p>
          </div>
          <div className="flex w-full min-w-0 flex-col gap-3 lg:w-auto lg:max-w-2xl lg:flex-row lg:items-center lg:justify-end">
            <div className="flex min-h-11 w-fit items-center gap-2 rounded-md border border-ui-border bg-ui-surface px-4 py-2 shadow-sm">
              <div className={`h-2.5 w-2.5 rounded-full ${criticalClusters > 0 ? 'bg-status-danger' : warningClusters > 0 ? 'bg-status-warning' : 'bg-status-success'}`} />
              <span className="type-label">{estatePosture}</span>
            </div>
          </div>
        </motion.header>

        <section data-workspace-command-center="true" className="mb-6 min-w-0 w-full max-w-full overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm">
          <div
            data-workspace-command-center-header="true"
            className={`grid min-w-0 max-w-full gap-4 rounded-t-lg border-b px-5 py-4 sm:px-6 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)] xl:items-start ${commandHeaderStatusTone}`}
          >
            <div className="flex min-w-0 max-w-full items-start gap-4">
              <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-current/15 bg-ui-surface/70">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="type-row-title">{t('overview.triageQueueTitle')}</h2>
                <p className="mt-1 break-words text-sm leading-6 text-ui-text-muted [overflow-wrap:anywhere]">
                  {t('overview.triageQueueBody', { name: workspace.name, vms: virtualMachineCount })}
                </p>
              </div>
            </div>
            <dl className="grid min-w-0 max-w-full overflow-hidden rounded-md border border-current/10 bg-ui-surface/70 sm:grid-cols-3 lg:min-w-[26rem]">
              {commandHeaderStats.map((item, index) => (
                <div
                  key={item.label}
                  className={`px-4 py-3 ${index < commandHeaderStats.length - 1 ? 'border-b border-ui-border/70 sm:border-b-0 sm:border-r' : ''}`}
                >
                  <dt className="type-caption">{item.label}</dt>
                  <dd className={`type-data mt-1 ${item.tone}`}>{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div data-workspace-command-center-body="true" className="grid min-w-0 max-w-full gap-0 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,26rem)]">
            <div data-priority-queue-panel="true" className="min-w-0 w-full max-w-full border-b border-ui-border xl:border-b-0 xl:border-r">
              <div className="flex flex-col items-start gap-3 border-b border-ui-border bg-ui-bg px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="min-w-0">
                  <h3 className="type-row-title">{t('overview.priorityQueue')}</h3>
                  <p className="type-caption mt-1">{t('overview.priorityQueueBody')}</p>
                </div>
              </div>

              {!topInvestigation ? (
                <div className="grid gap-4 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`type-micro-label rounded-full border px-2.5 py-1 ${summarizedFindingCount > 0 || hasUnloadedClusters ? 'border-status-warning/20 bg-status-warning-soft text-status-warning-text' : 'border-status-success/20 bg-status-success-soft text-status-success-text'}`}>
                        {summarizedFindingCount > 0 || hasUnloadedClusters ? t('overview.queueNeedsReview') : t('overview.queueClearBadge')}
                      </span>
                      {summarizedFindingCount > 0 && (
                        <span className="type-micro-label rounded-full border border-ui-border bg-ui-bg px-2.5 py-1 text-ui-text">
                          {t('overview.findingCountBadge', { count: summarizedFindingCount })}
                        </span>
                      )}
                    </div>
                    <h3 className="type-section-title mt-3 break-words [overflow-wrap:anywhere]">{queueSummaryTitle}</h3>
                    <p className="type-body mt-2 max-w-3xl break-words [overflow-wrap:anywhere]">{queueSummaryBody}</p>
                  </div>
                  <Button
                    data-queue-primary-action="true"
                    data-primary-triage-action="true"
                    onClick={queuePrimaryAction}
                    variant={summarizedFindingCount > 0 || hasUnloadedClusters ? 'accent' : 'secondary'}
                    size="md"
                    className="w-full justify-center sm:w-auto"
                  >
                    {queuePrimaryActionLabel}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="border-b border-ui-border px-5 py-5 sm:px-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="type-micro-label text-accent-strong">
                            {t('overview.nextActionTitle')}
                          </span>
                          <span className={`type-micro-label rounded-full px-2.5 py-1 ${findingSeverityTone(topInvestigation.severity)}`}>
                            {t(`investigations.severity.${topInvestigation.severity}`)}
                          </span>
                        </div>
                        <h3 className="type-section-title mt-3 break-words [overflow-wrap:anywhere]">{topInvestigation.title}</h3>
                        <p className="type-body mt-2 max-w-3xl break-words [overflow-wrap:anywhere]">{topInvestigation.summary}</p>
                        <div className="type-caption mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="min-w-0 max-w-full break-words [overflow-wrap:anywhere]">{topInvestigation.clusterName}</span>
                          <span className="min-w-0 max-w-full break-words [overflow-wrap:anywhere]">{topInvestigation.namespace || t('overview.clusterWide')}</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col gap-2 lg:items-end">
                        <Button
                          data-queue-primary-action="true"
                          data-primary-triage-action="true"
                          onClick={onOpenInvestigations}
                          variant="accent"
                          size="md"
                          className="w-full justify-center sm:w-auto"
                        >
                          {t('overview.openNextAction')}
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                        <p className="type-caption max-w-[14rem] lg:text-right">
                          {t('overview.nextActionBody')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {supportingQueueItems.length === 0 ? (
                    <div className="type-caption px-5 py-4 sm:px-6">
                      {t('overview.noAdditionalInvestigations')}
                    </div>
                  ) : (
                    <div className="divide-y divide-ui-border">
                      {supportingQueueItems.map((item, index) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={onOpenInvestigations}
                          className="grid w-full gap-3 px-5 py-4 text-left transition-colors hover:bg-ui-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 sm:px-6 lg:grid-cols-[3rem_minmax(0,1fr)_auto]"
                        >
                          <span className="type-caption">#{index + 2}</span>
                          <div className="min-w-0">
                            <p className="type-row-title break-words [overflow-wrap:anywhere]">{item.title}</p>
                            <p className="type-caption mt-1 line-clamp-2 break-words [overflow-wrap:anywhere]">{item.summary}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                            <span className={`type-micro-label rounded-full px-2.5 py-1 ${findingSeverityTone(item.severity)}`}>
                              {t(`investigations.severity.${item.severity}`)}
                            </span>
                            <span className="type-caption min-w-0 max-w-full break-words normal-case [overflow-wrap:anywhere]">{item.clusterName}</span>
                            <span className="type-caption min-w-0 max-w-full break-words [overflow-wrap:anywhere]">{item.namespace || t('overview.clusterWide')}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <aside data-operating-signals-panel="true" className="min-w-0 bg-ui-bg/45">
              <div className="border-b border-ui-border px-5 py-4 sm:px-6">
                <h3 className="type-row-title">{t('overview.operatingSignals')}</h3>
                <p className="type-caption mt-1">{t('overview.operatingSignalsBody')}</p>
              </div>
              <div className="divide-y divide-ui-border">
                {operatingSignals.map((item) => {
                  return (
                    <div
                      key={item.label}
                      className="flex items-start justify-between gap-4 px-5 py-4"
                    >
                      <div className="min-w-0 flex-1">
                        <p className={`type-row-title ${item.tone}`}>{item.label}</p>
                        <p className="type-caption mt-1">{item.intent}</p>
                        <p className="type-caption mt-2">{item.reason}</p>
                      </div>
                      <span className="type-caption shrink-0 text-ui-text-muted">
                        {item.context}
                      </span>
                    </div>
                  );
                })}
              </div>
            </aside>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] 2xl:grid-cols-[minmax(0,1fr)_24rem]">
          <section className="overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm">
            <div className="flex flex-col gap-3 border-b border-ui-border px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
              <div className="min-w-0">
                <h2 className="type-section-title">{t('overview.targetEstate')}</h2>
                <p className="type-body mt-1 max-w-2xl">{t('overview.targetEstateBody')}</p>
              </div>
              <div className={`type-label w-fit shrink-0 rounded-full border px-3 py-1 ${postureTone}`}>
                {estatePosture}
              </div>
            </div>

            <div className="divide-y divide-ui-border">
              {clusterCount === 0 && (
                <div className="type-body px-5 py-10 sm:px-6">{t('overview.noKubernetesClusters')}</div>
              )}
              {clusterCount > 0 && kubernetesClusters.length === 0 && (
                <div className="type-body px-5 py-10 sm:px-6">{t('overview.clusterSummariesPaged')}</div>
              )}
              {kubernetesClusters.map((app) => {
                const status = getEffectiveHealthStatus(app);
                return (
                  <motion.button
                    key={app.id}
                    type="button"
                    onClick={() => onSelectCluster(app)}
                    title={app.name}
                    className="grid w-full cursor-pointer gap-3 px-5 py-4 text-left transition-colors hover:bg-accent-soft/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6"
                  >
                    <div className="min-w-0">
                      <h3 className="type-panel-title line-clamp-2 break-words" title={app.name}>{app.name}</h3>
                      <p className="type-label mt-1">
                        {t('overview.clusterCounts', {
                          nodes: app.resourceSummary?.nodeCount ?? app.nodes.length,
                          namespaces: app.resourceSummary?.namespaceCount ?? app.namespaces.length,
                          findings: app.resourceSummary?.findingCount ?? app.alerts.length
                        })}
                      </p>
                    </div>
                    <div className={`type-label w-fit shrink-0 rounded-full px-3 py-1 ${healthStatusBadgeTone(status)}`}>
                      {statusLabel(status, t)}
                    </div>
                  </motion.button>
                );
              })}
              <button
                type="button"
                onClick={onOpenVirtualMachines}
                className="grid w-full cursor-pointer gap-3 bg-ui-bg/45 px-5 py-4 text-left transition-colors hover:bg-accent-soft/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6"
              >
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-ui-border bg-ui-surface text-accent-strong">
                      <Server className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="type-panel-title">{t('overview.virtualMachineEstate')}</h3>
                      <p className="type-label mt-1">
                        {virtualMachineCount > 0
                          ? t('overview.virtualMachineCounts', { count: virtualMachineCount })
                          : t('overview.noVirtualMachines')}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
                  <div className="type-label w-fit rounded-full bg-ui-surface px-3 py-1 text-ui-text">
                    {t('overview.vmTargetType')}
                  </div>
                  <span className="type-caption text-accent-strong">{t('overview.openVirtualMachines')}</span>
                </div>
              </button>
            </div>
          </section>

          <aside className="flex flex-col gap-6">
            <section className="overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm">
              <div className="border-b border-ui-border px-5 py-4">
                <h2 className="type-panel-title">{t('overview.inventoryTitle')}</h2>
                <p className="type-body mt-1">{t('overview.inventoryBody')}</p>
              </div>
              <div className="divide-y divide-ui-border">
                {inventoryRows.map((item) => (
                  <div key={item.label} className="grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-3 px-5 py-4">
                    <item.icon className="h-4 w-4 text-ui-text-muted" />
                    <div className="min-w-0">
                      <p className="type-row-title">{item.label}</p>
                      <p className="type-caption mt-1 line-clamp-2">{item.detail}</p>
                    </div>
                    <p className="type-data text-lg">{item.value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm">
              <div className="flex items-start justify-between gap-4 border-b border-ui-border px-5 py-4">
                <h2 className="type-panel-title">{t('overview.recentEvents')}</h2>
                <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" />
              </div>
              <div className="divide-y divide-ui-border">
                {alerts.length === 0 && (
                  <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 px-5 py-4">
                    <div className="type-label w-fit rounded bg-status-success-soft px-2 py-1 text-status-success-text">
                      {t('overview.ok')}
                    </div>
                    <div className="min-w-0">
                      <div className="type-row-title">{t('overview.noWarningEvents')}</div>
                      <div className="type-label mt-1">{t('overview.workspaceWide')}</div>
                    </div>
                  </div>
                )}
                {alerts.map((alert) => (
                  <div key={alert.id} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 px-5 py-4">
                    <div className={`type-label w-fit rounded px-2 py-1 ${alert.severity === 'critical' ? 'bg-status-danger-soft text-status-danger-text' : 'bg-status-warning-soft text-status-warning-text'}`}>
                      {alert.severity === 'critical' ? t('overview.errorAbbr') : t('overview.warningAbbr')}
                    </div>
                    <div className="min-w-0">
                      <div className="type-row-title">{alert.title}</div>
                      <div className="type-label mt-1">
                        {alert.clusterName} • {alert.namespace || t('overview.clusterWide')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
    </div>
  );
};
