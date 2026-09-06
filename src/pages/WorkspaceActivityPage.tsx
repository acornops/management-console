import React from 'react';
import { RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@acornops/ui';
import { DataTableGridHeader, DataTableGridHeaderCell } from '@acornops/ui';
import { createDiscoveryFilterGroup, DiscoveryFilterBar } from '@acornops/ui';
import { EmptyState } from '@acornops/ui';
import { InlineAlert } from '@acornops/ui';
import { CollectionLoadingSkeleton } from '@acornops/ui';
import { PageHeader, PageShell } from '@acornops/ui';
import {
  WorkflowExecutionRow,
  workflowExecutionActorLabel,
  workflowExecutionLedgerGridClass
} from '@/features/workflow-activity/WorkflowActivityUi';
import { useWorkspaceWorkflowActivity } from '@/features/workflow-activity/WorkspaceWorkflowActivityContext';
import {
  listWorkspaceWorkflowExecutions,
  listWorkspaceWorkflows,
  type WorkflowApiDefinition,
  type WorkflowExecutionPage,
  type WorkflowExecutionSummary
} from '@/services/control-plane/workflowApi';
import type { Workspace } from '@/types';
import {
  AppPaths,
  type WorkflowActivityOriginFilter,
  type WorkflowActivityRouteState,
  type WorkflowActivityStateFilter
} from '@/utils/routes';
import { WorkflowSections } from '@/pages/workflows/WorkflowSections';
import { useSessionCachedState } from '@/hooks/sessionDataCache';
import { useCursorCollection } from '@/hooks/useCursorCollection';
import { ICONS } from '@/constants';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import type { ProjectMember } from '@/types';

interface WorkspaceActivityPageProps {
  workspace: Workspace;
  routeState: WorkflowActivityRouteState;
  navigate: (path: string, options?: { replace?: boolean }) => void;
}

const stateOptions: Array<{ value: WorkflowActivityStateFilter; labelKey: string }> = [
  { value: 'all', labelKey: 'workflowActivity.filters.allStates' },
  { value: 'open', labelKey: 'workflowActivity.filters.open' },
  { value: 'attention', labelKey: 'workflowActivity.filters.attention' },
  { value: 'completed', labelKey: 'workflowActivity.filters.completed' },
  { value: 'failed', labelKey: 'workflowActivity.filters.failed' },
  { value: 'cancelled', labelKey: 'workflowActivity.filters.cancelled' }
];

const originOptions: Array<{ value: 'all' | WorkflowActivityOriginFilter; labelKey: string }> = [
  { value: 'all', labelKey: 'workflowActivity.filters.allOrigins' },
  { value: 'manual', labelKey: 'workflowActivity.origin.manual' },
  { value: 'external_integration', labelKey: 'workflowActivity.origin.external_integration' },
  { value: 'schedule', labelKey: 'workflowActivity.origin.schedule' },
  { value: 'webhook', labelKey: 'workflowActivity.origin.webhook' }
];

export const WorkspaceActivityPage: React.FC<WorkspaceActivityPageProps> = ({
  workspace,
  routeState,
  navigate
}) => {
  const { t } = useTranslation();
  const workspaceActivity = useWorkspaceWorkflowActivity();
  const deferredQuery = React.useDeferredValue(routeState.q || '');
  const activityScope = `${deferredQuery}:${routeState.state || 'all'}:${routeState.origin || 'all'}:${routeState.workflowId || 'all'}`;
  const activityCacheKey = `workspace:${workspace.id}:workflow-activity:${activityScope}`;
  const activityPageCacheKey = `${activityCacheKey}:page`;
  const [page, setPage] = useSessionCachedState<WorkflowExecutionPage | null>(activityPageCacheKey, null);
  const [workflows, setWorkflows] = useSessionCachedState<WorkflowApiDefinition[]>(`workspace:${workspace.id}:workflow-activity:workflows`, []);
  const [activityMembers, setActivityMembers] = useSessionCachedState<ProjectMember[]>(
    `workspace:${workspace.id}:workflow-activity:members`,
    workspace.members || []
  );

  const replaceState = React.useCallback((patch: Partial<WorkflowActivityRouteState>, options?: { replace?: boolean }) => {
    navigate(AppPaths.workspaceActivity(workspace.id, { ...routeState, ...patch }), options);
  }, [navigate, routeState, workspace.id]);

  const collection = useCursorCollection({
    cacheKey: 'workflow-activity',
    clearItemsOnScopeChange: true,
    refreshLoadedPages: true,
    filters: { workspaceId: workspace.id, search: deferredQuery, state: routeState.state || 'all', origin: routeState.origin, workflowId: routeState.workflowId },
    getKey: (execution: WorkflowExecutionSummary) => execution.id,
    loadPage: async ({ cursor, limit, filters, signal }) => {
      const next = await listWorkspaceWorkflowExecutions(filters.workspaceId, { ...filters, cursor, limit });
      if (!signal.aborted) setPage(next);
      return { items: next.items, nextCursor: next.nextCursor || undefined };
    },
    pageSize: 50,
    strategy: 'manual'
  });
  const { items, error } = collection;
  const loadingMore = collection.phase === 'loadingMore' || collection.phase === 'refreshing';
  const phase = collection.phase === 'loading' ? 'loading' : collection.phase === 'error' && items.length === 0 ? 'error' : 'ready';
  const [acknowledgedRevision, setAcknowledgedRevision] = React.useState(workspaceActivity.revision);

  React.useEffect(() => {
    setAcknowledgedRevision(workspaceActivity.revision);
  }, [activityCacheKey]);
  const refreshActivity = () => {
    setAcknowledgedRevision(workspaceActivity.revision);
    void collection.refresh();
  };

  React.useEffect(() => {
    let cancelled = false;
    void listWorkspaceWorkflows(workspace.id)
      .then((next) => {
        if (!cancelled) setWorkflows(next);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [workspace.id]);

  React.useEffect(() => {
    let cancelled = false;
    setActivityMembers((current) => current.length > 0 ? current : workspace.members || []);
    if (workspace.permissions?.read_members !== true) return () => { cancelled = true; };
    void controlPlaneApi.listWorkspaceMembers(workspace.id, { limit: 50 })
      .then((memberPage) => {
        if (!cancelled) setActivityMembers(memberPage.items);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [setActivityMembers, workspace.id, workspace.members, workspace.permissions?.read_members]);

  const actorLabelsByUserId = React.useMemo(() => new Map(
    activityMembers.flatMap((member) => member.userId
      ? [[member.userId, member.name || member.email] as const]
      : [])
  ), [activityMembers]);

  const filterCount = [
    routeState.q,
    routeState.state && routeState.state !== 'all',
    routeState.origin,
    routeState.workflowId
  ].filter(Boolean).length;
  const activityLedgerFillsAvailableSpace = phase === 'loading' || items.length > 0;

  return (
    <PageShell
      className="lg:overflow-y-hidden"
      contentClassName="lg:flex lg:h-full lg:min-h-0 lg:flex-col"
    >
      <PageHeader
        className="mb-5"
        title={t('workflowActivity.title')}
        description={t('workflowActivity.subtitle', { workspace: workspace.name })}
        actions={(
          <Button size="md" variant="secondary" onClick={refreshActivity} disabled={phase === 'loading' || loadingMore}>
            <RefreshCw className={`h-4 w-4 ${phase === 'loading' ? 'animate-spin motion-reduce:animate-none' : ''}`} aria-hidden="true" />
            {t('common.refresh')}
          </Button>
        )}
      />
      <WorkflowSections activeSection="activity" navigate={navigate} workspaceId={workspace.id} />
      <div
        id="workflow-section-activity-panel"
        role="tabpanel"
        aria-labelledby="workflow-section-activity-tab"
        className="lg:flex lg:min-h-0 lg:flex-1 lg:flex-col"
      >
        <DiscoveryFilterBar
            className="mb-4 shrink-0"
            searchWidth="fluid"
            filterWidth="compact"
            denseBreakpoint="xl"
            idPrefix="workflow-runs"
            query={routeState.q || ''}
            queryLabel={t('workflowActivity.filters.search')}
            queryPlaceholder={t('workflowActivity.filters.search')}
            queryClearLabel={t('common.clearSearch')}
            resultSummary={phase === 'loading' && items.length === 0
              ? t('workflowActivity.loading')
              : `${t('workflowActivity.openCount', { count: page?.summary.openCount ?? workspaceActivity.openCount })} · ${t('workflowActivity.attentionCount', { count: page?.summary.attentionCount ?? workspaceActivity.attentionCount })}`}
            filters={[
          createDiscoveryFilterGroup<WorkflowActivityStateFilter>({
            id: 'state',
            label: t('workflowActivity.filters.state'),
            value: routeState.state || 'all',
            defaultValue: 'all',
            options: stateOptions.map((option) => ({ value: option.value, label: t(option.labelKey) })),
            onChange: (state) => replaceState({ state: state === 'all' ? undefined : state })
          }),
          createDiscoveryFilterGroup<'all' | WorkflowActivityOriginFilter>({
            id: 'origin',
            label: t('workflowActivity.filters.origin'),
            value: routeState.origin || 'all',
            defaultValue: 'all',
            options: originOptions.map((option) => ({ value: option.value, label: t(option.labelKey) })),
            onChange: (origin) => replaceState({ origin: origin === 'all' ? undefined : origin })
          }),
          createDiscoveryFilterGroup<string>({
            id: 'workflow',
            label: t('workflowActivity.filters.workflow'),
            value: routeState.workflowId || 'all',
            defaultValue: 'all',
            options: [
              { value: 'all', label: t('workflowActivity.filters.allWorkflows') },
              ...workflows.map((workflow) => ({ value: workflow.id, label: workflow.name }))
            ],
            onChange: (workflowId) => replaceState({ workflowId: workflowId === 'all' ? undefined : workflowId })
          })
            ]}
            clearAllLabel={t('common.clearAll')}
            onQueryChange={(q) => replaceState({ q: q || undefined }, { replace: true })}
            onClearAll={() => replaceState({
              q: undefined,
              state: undefined,
              origin: undefined,
              workflowId: undefined
            })}
        />

        {workspaceActivity.error && (
          <InlineAlert tone="warning" className="mb-4 shrink-0">{t('workflowActivity.refreshError')}</InlineAlert>
        )}
        {workspaceActivity.revision !== acknowledgedRevision && phase !== 'loading' && (
          <InlineAlert tone="neutral" className="mb-4 shrink-0">
            <span>{t('workflowActivity.updatesAvailable')}</span>
            <Button variant="secondary" size="sm" className="ml-3" onClick={refreshActivity} disabled={loadingMore}>{t('common.refresh')}</Button>
          </InlineAlert>
        )}
        {error && phase === 'ready' && <InlineAlert tone="warning" className="mb-4 shrink-0">{error} <Button variant="secondary" size="sm" onClick={() => void collection.retry()}>{t('common.retry')}</Button></InlineAlert>}

        <section
          aria-label={t('workflowActivity.ledgerLabel')}
          className={`overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm ${activityLedgerFillsAvailableSpace ? 'lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain lg:custom-scrollbar lg:stable-scrollbar-gutter' : ''}`}
        >
        <div className="min-w-0">
          <DataTableGridHeader
            showAt="xl"
            density="dense"
            className={`gap-3 ${workflowExecutionLedgerGridClass}`}
            collectionState={{ phase, itemCount: items.length }}
          >
            <DataTableGridHeaderCell>{t('workflowActivity.columns.run')}</DataTableGridHeaderCell>
            <DataTableGridHeaderCell>{t('workflowActivity.columns.runBy')}</DataTableGridHeaderCell>
            <DataTableGridHeaderCell>{t('workflowActivity.columns.time')}</DataTableGridHeaderCell>
            <DataTableGridHeaderCell>{t('workflowActivity.columns.duration')}</DataTableGridHeaderCell>
            <DataTableGridHeaderCell numeric>{t('workflowActivity.columns.action')}</DataTableGridHeaderCell>
          </DataTableGridHeader>
          {phase === 'loading' ? (
            <CollectionLoadingSkeleton label={t('workflowActivity.loading')} />
          ) : phase === 'error' ? (
            <EmptyState
              embedded
              role="alert"
              icon={<RefreshCw />}
              title={t('workflowActivity.loadErrorTitle')}
              description={error}
              actions={<Button variant="secondary" size="sm" onClick={() => void collection.retry()}>{t('common.retry')}</Button>}
            />
          ) : items.length === 0 ? (
            <EmptyState
              embedded
              icon={<ICONS.Activity />}
              title={filterCount ? t('workflowActivity.emptyFilteredTitle') : t('workflowActivity.emptyAllTitle')}
              description={filterCount ? t('workflowActivity.emptyFilteredDescription') : t('workflowActivity.emptyAllDescription')}
              actions={filterCount ? <Button variant="secondary" size="sm" onClick={() => navigate(AppPaths.workspaceActivity(workspace.id))}>{t('common.clearFilters')}</Button> : undefined}
            />
          ) : (
            <div className="divide-y divide-ui-border">
              {items.map((execution) => (
                <WorkflowExecutionRow
                  key={execution.id}
                  execution={execution}
                  actorLabel={workflowExecutionActorLabel(execution.createdBy, actorLabelsByUserId, {
                    acornOps: t('workflowActivity.acornOps'),
                    unavailable: t('workflowActivity.runByUnavailable')
                  })}
                  navigate={navigate}
                />
              ))}
              {collection.nextCursor && (
                <div className="flex justify-center px-4 py-4">
                  <Button variant="secondary" size="sm" onClick={() => void collection.loadMore()} disabled={loadingMore || Boolean(error)}>
                    {loadingMore ? t('common.loading') : t('common.loadMore')}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
        </section>
      </div>
    </PageShell>
  );
};
