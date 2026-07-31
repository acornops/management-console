import React from 'react';
import { Filter, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@acornops/ui';
import { DataTableGridHeader, DataTableGridHeaderCell } from '@acornops/ui';
import { createDiscoveryFilterGroup, DiscoveryFilterBar } from '@acornops/ui';
import { EmptyState } from '@acornops/ui';
import { InlineAlert } from '@acornops/ui';
import { InlineLoadingIndicator } from '@acornops/ui';
import { PageHeader, PageShell } from '@acornops/ui';
import {
  WorkflowExecutionRow,
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
  const [page, setPage] = React.useState<WorkflowExecutionPage | null>(null);
  const [items, setItems] = React.useState<WorkflowExecutionSummary[]>([]);
  const [workflows, setWorkflows] = React.useState<WorkflowApiDefinition[]>([]);
  const [phase, setPhase] = React.useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = React.useState('');
  const [loadingMore, setLoadingMore] = React.useState(false);
  const loadRequestRef = React.useRef(0);
  const deferredQuery = React.useDeferredValue(routeState.q || '');

  const replaceState = React.useCallback((patch: Partial<WorkflowActivityRouteState>, options?: { replace?: boolean }) => {
    navigate(AppPaths.workspaceActivity(workspace.id, { ...routeState, ...patch }), options);
  }, [navigate, routeState, workspace.id]);

  const load = React.useCallback(async (cursor?: string) => {
    const requestId = ++loadRequestRef.current;
    if (!cursor) setPhase('loading');
    else setLoadingMore(true);
    setError('');
    try {
      const next = await listWorkspaceWorkflowExecutions(workspace.id, {
        search: deferredQuery,
        state: routeState.state || 'open',
        origin: routeState.origin,
        workflowId: routeState.workflowId,
        sourceIssueId: routeState.issueId,
        limit: 50,
        cursor
      });
      if (requestId !== loadRequestRef.current) return;
      setPage(next);
      setItems((current) => cursor ? [...current, ...next.items] : next.items);
      setPhase('ready');
    } catch (loadError) {
      if (requestId !== loadRequestRef.current) return;
      setError(loadError instanceof Error ? loadError.message : t('workflowActivity.loadError'));
      setPhase(cursor ? 'ready' : 'error');
    } finally {
      if (requestId === loadRequestRef.current) setLoadingMore(false);
    }
  }, [
    deferredQuery,
    routeState.issueId,
    routeState.origin,
    routeState.state,
    routeState.workflowId,
    t,
    workspace.id
  ]);

  React.useEffect(() => {
    void load();
  }, [load, workspaceActivity.revision]);

  React.useEffect(() => {
    let cancelled = false;
    void listWorkspaceWorkflows(workspace.id)
      .then((next) => {
        if (!cancelled) setWorkflows(next);
      })
      .catch(() => {
        if (!cancelled) setWorkflows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [workspace.id]);

  const filterCount = [
    routeState.q,
    routeState.state && routeState.state !== 'open',
    routeState.origin,
    routeState.workflowId,
    routeState.issueId
  ].filter(Boolean).length;
  const activityLedgerFillsAvailableSpace = phase === 'loading' || items.length > 0;

  return (
    <PageShell
      className="lg:overflow-y-hidden"
      contentClassName="lg:flex lg:h-full lg:min-h-0 lg:flex-col"
    >
      <PageHeader
        title={t('app.workflows')}
        description={t('workflowActivity.subtitle', { workspace: workspace.name })}
        actions={(
          <Button size="md" variant="secondary" onClick={() => void load()} disabled={phase === 'loading'}>
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
            searchWidth="fluid"
            filterWidth="compact"
            idPrefix="workflow-runs"
            query={routeState.q || ''}
            queryLabel={t('workflowActivity.filters.search')}
            queryPlaceholder={t('workflowActivity.filters.search')}
            queryClearLabel={t('common.clearSearch')}
            resultSummary={`${t('workflowActivity.openCount', { count: page?.summary.openCount ?? workspaceActivity.openCount })} · ${t('workflowActivity.attentionCount', { count: page?.summary.attentionCount ?? workspaceActivity.attentionCount })}`}
            filters={[
          createDiscoveryFilterGroup<WorkflowActivityStateFilter>({
            id: 'state',
            label: t('workflowActivity.filters.state'),
            value: routeState.state || 'open',
            defaultValue: 'open',
            options: stateOptions.map((option) => ({ value: option.value, label: t(option.labelKey) })),
            onChange: (state) => replaceState({ state: state === 'open' ? undefined : state })
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
              workflowId: undefined,
              issueId: undefined
            })}
        />
        {routeState.issueId && (
          <p className="type-caption mb-4 shrink-0 text-ui-text-muted">
            {t('workflowActivity.filters.issueApplied', { issue: routeState.issueId })}
          </p>
        )}

        {workspaceActivity.error && (
          <InlineAlert tone="warning" className="mb-4 shrink-0">{t('workflowActivity.refreshError')}</InlineAlert>
        )}
        {error && phase === 'ready' && <InlineAlert tone="warning" className="mb-4 shrink-0">{error}</InlineAlert>}

        <section
          aria-label={t('workflowActivity.ledgerLabel')}
          className={`overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm ${activityLedgerFillsAvailableSpace ? 'lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain lg:custom-scrollbar lg:stable-scrollbar-gutter' : ''}`}
        >
        <div className="min-w-0">
          <DataTableGridHeader
            showAt="xl"
            className={`gap-3 ${workflowExecutionLedgerGridClass}`}
            collectionState={{ phase, itemCount: items.length }}
          >
            <DataTableGridHeaderCell>{t('workflowActivity.columns.run')}</DataTableGridHeaderCell>
            <DataTableGridHeaderCell>{t('workflowActivity.columns.target')}</DataTableGridHeaderCell>
            <DataTableGridHeaderCell>{t('workflowActivity.columns.time')}</DataTableGridHeaderCell>
            <DataTableGridHeaderCell>{t('workflowActivity.columns.duration')}</DataTableGridHeaderCell>
            <DataTableGridHeaderCell numeric>{t('workflowActivity.columns.action')}</DataTableGridHeaderCell>
          </DataTableGridHeader>
          {phase === 'loading' ? (
            <div className="flex min-h-48 items-center justify-center px-5 py-10">
              <InlineLoadingIndicator label={t('workflowActivity.loading')} />
            </div>
          ) : phase === 'error' ? (
            <EmptyState
              embedded
              role="alert"
              icon={<RefreshCw />}
              title={t('workflowActivity.loadErrorTitle')}
              description={error}
              actions={<Button variant="secondary" size="sm" onClick={() => void load()}>{t('common.retry')}</Button>}
            />
          ) : items.length === 0 ? (
            <EmptyState
              embedded
              icon={<Filter />}
              title={filterCount ? t('workflowActivity.emptyFilteredTitle') : t('workflowActivity.emptyOpenTitle')}
              description={filterCount ? t('workflowActivity.emptyFilteredDescription') : t('workflowActivity.emptyOpenDescription')}
              actions={filterCount ? <Button variant="secondary" size="sm" onClick={() => navigate(AppPaths.workspaceActivity(workspace.id))}>{t('common.clearFilters')}</Button> : undefined}
            />
          ) : (
            <div className="divide-y divide-ui-border">
              {items.map((execution) => (
                <WorkflowExecutionRow
                  key={execution.id}
                  execution={execution}
                  navigate={navigate}
                />
              ))}
              {page?.nextCursor && (
                <div className="flex justify-center px-4 py-4">
                  <Button variant="secondary" size="sm" onClick={() => void load(page.nextCursor || undefined)} disabled={loadingMore}>
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
