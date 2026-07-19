import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileText, Loader2, Pause, Play, RefreshCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, buttonClassName } from '@/components/common/Button';
import { Select, SelectOption } from '@/components/common/Select';
import { Checkbox } from '@/components/common/Checkbox';
import { formatControlPlaneError } from '@/services/control-plane/errorFormatting';
import { ControlPlanePodLogs } from '@/services/controlPlaneApi';
import { DetailRow, ResourceMetricInline, SidePanel } from '@/features/kubernetes-cluster-detail/components/workloads/resourceExplorerLayout';
import {
  classNames,
  formatOptionalNumber,
  getContainerStatusLabel,
  isHealthyStatus,
  isScalableWorkload,
  WorkloadDetailTab,
  WorkloadExplorerItem
} from '@/features/kubernetes-cluster-detail/components/workloads/workloadExplorerParts';
import { WorkloadsExplorerProps } from '@/features/kubernetes-cluster-detail/components/workloads/workloadExplorerParts';
import { formatUserTime } from '@/utils/dateTime';
import {
  captureLogViewport,
  resolveRestoredLogScrollTop,
  type LogViewportSnapshot
} from '@/features/kubernetes-cluster-detail/components/workloads/podLogViewport';

const FOLLOW_LOGS_INTERVAL_MS = 7000;

interface WorkloadDetailsDrawerProps {
  selectedWorkload: WorkloadExplorerItem | null;
  canReadPodLogs: boolean;
  onClose: () => void;
  onAnalyzePod?: WorkloadsExplorerProps['onAnalyzePod'];
  onLoadPodLogs?: WorkloadsExplorerProps['onLoadPodLogs'];
}

export const WorkloadDetailsDrawer: React.FC<WorkloadDetailsDrawerProps> = ({
  selectedWorkload,
  canReadPodLogs,
  onClose,
  onAnalyzePod,
  onLoadPodLogs
}) => {
  const { t } = useTranslation();
  const [activeDetailTab, setActiveDetailTab] = useState<WorkloadDetailTab>('details');
  const [podLogs, setPodLogs] = useState<ControlPlanePodLogs | null>(null);
  const [podLogsError, setPodLogsError] = useState<string | null>(null);
  const [isPodLogsLoading, setIsPodLogsLoading] = useState(false);
  const [isFollowingLogs, setIsFollowingLogs] = useState(false);
  const [logContainer, setLogContainer] = useState('');
  const [logTailLines, setLogTailLines] = useState(200);
  const [logPrevious, setLogPrevious] = useState(false);
  const logsRequestIdRef = useRef(0);
  const followFailuresRef = useRef(0);
  const followInFlightRef = useRef(false);
  const logViewportRef = useRef<HTMLPreElement>(null);
  const pendingLogViewportRef = useRef<LogViewportSnapshot | null>(null);

  const selectedPodContainers = useMemo(
    () => selectedWorkload?.type === 'Pod' ? selectedWorkload.containers || [] : [],
    [selectedWorkload]
  );
  const canShowLogs = Boolean(selectedWorkload?.type === 'Pod' && canReadPodLogs && onLoadPodLogs);
  const logContainerOptions: Array<SelectOption<string>> = selectedPodContainers.length === 0
    ? [{ value: '', label: t('workloads.defaultContainer') }]
    : selectedPodContainers.map((container) => ({ value: container, label: container }));
  const logTailLineOptions: Array<SelectOption<number>> = [100, 200, 500, 1000].map((count) => ({
    value: count,
    label: t('workloads.lines', { count })
  }));

  const loadPodLogs = useCallback(async (mode: 'manual' | 'follow' = 'manual') => {
    if (!selectedWorkload || selectedWorkload.type !== 'Pod' || !onLoadPodLogs) return;
    if (mode === 'follow' && followInFlightRef.current) return;

    const requestId = logsRequestIdRef.current + 1;
    logsRequestIdRef.current = requestId;
    if (mode === 'follow') {
      followInFlightRef.current = true;
    } else {
      setIsPodLogsLoading(true);
    }
    setPodLogsError(null);

    try {
      const result = await onLoadPodLogs(selectedWorkload, {
        container: logContainer || undefined,
        tailLines: logTailLines,
        previous: logPrevious
      });
      if (logsRequestIdRef.current !== requestId) return;
      followFailuresRef.current = 0;
      pendingLogViewportRef.current = logViewportRef.current
        ? captureLogViewport(logViewportRef.current, mode === 'follow')
        : null;
      setPodLogs(result);
    } catch (error) {
      if (logsRequestIdRef.current !== requestId) return;
      const message = formatControlPlaneError(error, t('workloads.logLoadFailed'), { area: 'cluster' });
      setPodLogsError(message);
      if (mode === 'follow') {
        followFailuresRef.current += 1;
        if (followFailuresRef.current >= 3) {
          setIsFollowingLogs(false);
          setPodLogsError(t('workloads.followStopped', { message }));
        }
      }
    } finally {
      if (mode === 'follow') {
        followInFlightRef.current = false;
      } else {
        setIsPodLogsLoading(false);
      }
    }
  }, [logContainer, logPrevious, logTailLines, onLoadPodLogs, selectedWorkload, t]);

  useLayoutEffect(() => {
    const viewport = logViewportRef.current;
    const snapshot = pendingLogViewportRef.current;
    pendingLogViewportRef.current = null;
    if (!viewport || !snapshot) return;
    viewport.scrollTop = resolveRestoredLogScrollTop(snapshot, viewport);
  }, [podLogs]);

  useEffect(() => {
    setActiveDetailTab('details');
    setPodLogs(null);
    setPodLogsError(null);
    setIsPodLogsLoading(false);
    setIsFollowingLogs(false);
    setLogTailLines(200);
    setLogPrevious(false);
    setLogContainer(selectedPodContainers[0] || '');
    followFailuresRef.current = 0;
    pendingLogViewportRef.current = null;
  }, [selectedPodContainers, selectedWorkload]);

  useEffect(() => {
    setPodLogs(null);
    setPodLogsError(null);
    followFailuresRef.current = 0;
    pendingLogViewportRef.current = null;
    if (activeDetailTab === 'logs' && canShowLogs) {
      void loadPodLogs('manual');
    }
  }, [activeDetailTab, canShowLogs, loadPodLogs, logContainer, logPrevious, logTailLines]);

  useEffect(() => {
    if (!isFollowingLogs || activeDetailTab !== 'logs' || !canShowLogs) return;
    const intervalId = window.setInterval(() => {
      void loadPodLogs('follow');
    }, FOLLOW_LOGS_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [activeDetailTab, canShowLogs, isFollowingLogs, loadPodLogs]);

  const closeDrawer = () => {
    setIsFollowingLogs(false);
    onClose();
  };

  return (
    <SidePanel
      isOpen={Boolean(selectedWorkload)}
      onClose={closeDrawer}
      title={t('workloads.drawerTitle', { name: selectedWorkload?.name || '' })}
    >
      <div className="space-y-6">
        {selectedWorkload?.type === 'Pod' && (
          <div className="flex border-y border-ui-border bg-ui-bg/60 p-1">
            {(['details', 'logs'] as WorkloadDetailTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveDetailTab(tab)}
                className={`control-target ${classNames(
                  'flex-1 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all',
                  activeDetailTab === tab
                    ? 'bg-ui-surface text-accent-strong shadow-sm'
                    : 'text-ui-text-muted hover:text-ui-text'
                )}`}
              >
                {tab === 'details' ? t('workloads.details') : t('workloads.logs')}
              </button>
            ))}
          </div>
        )}

        {activeDetailTab === 'details' && (
          <>
            <section className="border-t border-ui-border pt-5 first:border-t-0 first:pt-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-ui-text-muted">{t('workloads.metadata')}</span>
                <div
                  className={classNames(
                    'rounded-md px-2 py-1 text-xs font-bold uppercase',
                    selectedWorkload && isHealthyStatus(selectedWorkload.status)
                      ? 'bg-status-success-soft text-status-success-text'
                      : 'bg-status-warning-soft text-status-warning-text'
                  )}
                >
                  {selectedWorkload?.status || t('common.unknown')}
                </div>
              </div>
              <div className="mt-3">
                <DetailRow label={t('workloads.cluster')} value={selectedWorkload?.clusterName || '-'} />
                <DetailRow label={t('workloads.namespace')} value={selectedWorkload?.namespace || '-'} />
                <DetailRow label={t('workloads.status')} value={selectedWorkload?.status || '-'} />
                <DetailRow label={t('workloads.uid')} value={selectedWorkload?.uid || selectedWorkload?.id || '-'} />
                {selectedWorkload && isScalableWorkload(selectedWorkload.type) && (
                  <>
                    <DetailRow label={t('workloads.desiredReplicas')} value={formatOptionalNumber(selectedWorkload.desiredReplicas)} />
                    <DetailRow label={t('workloads.readyReplicas')} value={formatOptionalNumber(selectedWorkload.readyReplicas)} />
                    <DetailRow label={t('workloads.availableReplicas')} value={formatOptionalNumber(selectedWorkload.availableReplicas)} />
                  </>
                )}
                {selectedWorkload?.type === 'CronJob' && (
                  <>
                    <DetailRow label={t('workloads.schedule')} value={selectedWorkload.schedule || '-'} />
                    <DetailRow label={t('workloads.lastRun')} value={selectedWorkload.lastRun || '-'} />
                  </>
                )}
                {selectedWorkload?.type === 'Job' && (
                  <>
                    <DetailRow label={t('workloads.completions')} value={selectedWorkload.completions || '-'} />
                    <DetailRow label={t('workloads.duration')} value={selectedWorkload.duration || '-'} />
                  </>
                )}
                {selectedWorkload?.type === 'Pod' && (
                  <>
                    <DetailRow label={t('workloads.node')} value={selectedWorkload.node || '-'} />
                    <DetailRow label={t('workloads.restarts')} value={String(selectedWorkload.restarts ?? 0)} />
                    <DetailRow
                      label={t('workloads.containers')}
                      value={selectedPodContainers.length > 0 ? selectedPodContainers.join(', ') : '-'}
                    />
                  </>
                )}
              </div>
            </section>

            <div className="flex gap-4">
              {selectedWorkload?.type === 'Pod' && onAnalyzePod && (
                <Button
                  onClick={() => {
                    onAnalyzePod(selectedWorkload);
                    closeDrawer();
                  }}
                  variant="primary"
                  size="lg"
                  className="flex-1 py-4 text-xs uppercase tracking-widest"
                >
                  {t('workloads.analyzePod')}
                </Button>
              )}
            </div>

            {selectedWorkload?.type === 'Pod' && selectedWorkload.containerStatuses && selectedWorkload.containerStatuses.length > 0 && (
              <section className="border-t border-ui-border pt-5">
                <span className="text-xs font-bold uppercase tracking-widest text-ui-text-muted">{t('workloads.containerRuntime')}</span>
                <div className="mt-3 divide-y divide-ui-border">
                  {selectedWorkload.containerStatuses.map((container) => (
                    <div key={container.name} className="py-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-ui-text" title={container.name}>{container.name}</p>
                          <p className="mt-1 text-xs font-medium capitalize text-ui-text-muted">{getContainerStatusLabel(container)}</p>
                        </div>
                        <span
                          className={classNames(
                            'shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider',
                            container.ready
                              ? 'bg-status-success-soft text-status-success-text'
                              : 'bg-status-warning-soft text-status-warning-text'
                          )}
                        >
                          {container.ready ? t('workloads.ready') : t('workloads.notReady')}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <ResourceMetricInline label={t('workloads.restarts')} value={String(container.restartCount ?? 0)} />
                        <ResourceMetricInline label={t('workloads.state')} value={container.state || t('common.unknown')} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {activeDetailTab === 'logs' && selectedWorkload?.type === 'Pod' && (
          <div className="space-y-5">
            {!canShowLogs && (
              <div className="rounded-xl border border-status-warning/25 bg-status-warning-soft p-4 text-sm font-semibold leading-6 text-status-warning-text">
                {canReadPodLogs ? t('workloads.logsUnavailable') : t('workloads.logsNoAccess')}
              </div>
            )}

            {canShowLogs && (
              <>
                <div className="border-y border-ui-border bg-ui-bg/60 px-4 py-3">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-ui-text-muted">{t('workloads.container')}</label>
                      <Select<string>
                        value={logContainer}
                        options={logContainerOptions}
                        onChange={setLogContainer}
                        disabled={selectedPodContainers.length === 0 || isPodLogsLoading}
                        size="sm"
                        ariaLabel={t('workloads.container')}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-ui-text-muted">{t('workloads.tail')}</label>
                      <Select<number>
                        value={logTailLines}
                        options={logTailLineOptions}
                        onChange={setLogTailLines}
                        disabled={isPodLogsLoading}
                        size="sm"
                        ariaLabel={t('workloads.tail')}
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <label className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-ui-text-muted">
                      <Checkbox
                        checked={logPrevious}
                        onChange={(event) => setLogPrevious(event.target.checked)}
                        disabled={isPodLogsLoading}
                      />
                      {t('workloads.previousContainer')}
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void loadPodLogs('manual')}
                        disabled={isPodLogsLoading}
                        className="control-target inline-flex items-center gap-2 rounded-lg border border-ui-border bg-ui-surface px-3 py-2 text-xs font-bold uppercase tracking-widest text-ui-text transition-colors hover:bg-ui-bg disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isPodLogsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                        {t('workloads.refresh')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          followFailuresRef.current = 0;
                          setIsFollowingLogs((value) => !value);
                          if (!isFollowingLogs) void loadPodLogs('follow');
                        }}
                        className={buttonClassName({
                          variant: isFollowingLogs ? 'primary' : 'secondary',
                          size: 'sm',
                          className: 'uppercase tracking-widest'
                        })}
                      >
                        {isFollowingLogs ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        {isFollowingLogs ? t('workloads.following') : t('workloads.follow')}
                      </button>
                    </div>
                  </div>
                </div>

                {podLogsError && (
                  <div className="flex gap-3 border-y border-status-danger/25 bg-status-danger-soft px-4 py-3 text-sm font-semibold leading-6 text-status-danger-text">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{podLogsError}</span>
                  </div>
                )}

                <div className="overflow-hidden rounded-xl border border-ui-border bg-code-bg shadow-sm">
                  <div className="flex items-center justify-between gap-3 border-b border-code-text/10 px-4 py-3">
                    <div className="inline-flex min-w-0 items-center gap-2 text-xs font-bold uppercase tracking-widest text-code-text">
                      <FileText className="h-4 w-4 text-accent-strong" />
                      <span className="truncate">{selectedWorkload.name}</span>
                    </div>
                    <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-code-text/70">
                      {isFollowingLogs && <CheckCircle2 className="h-3.5 w-3.5 text-status-success-text" />}
                      {podLogs?.fetchedAt ? t('workloads.fetchedAt', { time: formatUserTime(podLogs.fetchedAt, { includeTimeZone: true }) }) : t('workloads.notLoaded')}
                    </div>
                  </div>
                  <pre ref={logViewportRef} className="max-h-[420px] min-h-[220px] overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-xs leading-5 text-code-text custom-scrollbar">
                    {isPodLogsLoading && !podLogs
                      ? t('workloads.loadingLogs')
                      : podLogs?.logs?.trim()
                        ? podLogs.logs
                        : t('workloads.noLogs')}
                  </pre>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </SidePanel>
  );
};
