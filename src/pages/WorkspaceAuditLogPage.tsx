import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@acornops/ui';
import { CloseButton } from '@acornops/ui';
import { EmptyState } from '@acornops/ui';
import { DataTableHeader, DataTableHeaderCell, DataTableStateRow, TableLoadingRows } from '@acornops/ui';
import { DateTimePicker, PageSearchInput } from '@acornops/ui';
import { PageHeader, PageShell } from '@acornops/ui';
import { DrawerFrame } from '@acornops/ui';
import { Select, SelectOption } from '@acornops/ui';
import { Tooltip } from '@acornops/ui';
import { ICONS } from '@/constants';
import { formatControlPlaneError } from '@/services/control-plane/errorFormatting';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import { useCursorCollection } from '@/hooks/useCursorCollection';
import { Workspace, WorkspaceAuditCategory, WorkspaceAuditEvent } from '@/types';
import { formatUserDateTime } from '@/utils/dateTime';
import { DataTable, DataTableBody, DataTableCell, DataTableRow } from '@acornops/ui';

interface WorkspaceAuditLogPageProps {
  workspace: Workspace;
}

const categoryOptions: Array<SelectOption<WorkspaceAuditCategory | 'all'>> = [
  { value: 'all', label: 'All categories' },
  { value: 'membership', label: 'Membership' },
  { value: 'workspace', label: 'Workspace' },
  { value: 'target', label: 'Deployment targets' },
  { value: 'session', label: 'Sessions' },
  { value: 'run', label: 'Runs' },
  { value: 'approval', label: 'Approvals' },
  { value: 'mcp', label: 'MCP' },
  { value: 'tool', label: 'Tools' }
];

interface AuditFilters {
  category: WorkspaceAuditCategory | 'all';
  eventType: string;
  actorUserId: string;
  objectType: string;
  from: string;
  to: string;
}

const defaultFilters: AuditFilters = {
  category: 'all',
  eventType: '',
  actorUserId: '',
  objectType: '',
  from: '',
  to: ''
};

type AuditTimePreset = 'today' | 'last24h' | 'past7d' | 'past30d';
type AuditTimeSelection = 'anytime' | AuditTimePreset | 'custom';
type AdvancedAuditFilterKey = 'category' | 'eventType' | 'actorUserId' | 'objectType';

const timePresetOptions: AuditTimePreset[] = ['today', 'last24h', 'past7d', 'past30d'];

const eventTypeOptions = [
  'workspace.created.v1',
  'workspace.deleted.v1',
  'workspace.member.added.v1',
  'workspace.member.role_updated.v1',
  'workspace.member.removed.v1',
  'workspace.invitation.created.v1',
  'workspace.invitation.revoked.v1',
  'workspace.ai_settings.updated.v1',
  'workspace.ai_provider_credential.saved.v1',
  'workspace.ai_provider_credential.deleted.v1',
  'workspace.plan.updated.v1',
  'workspace.quotas.updated.v1',
  'target.registered.v1',
  'target.updated.v1',
  'target.deleted.v1',
  'target.status_changed.v1',
  'agent.connected.v1',
  'agent.disconnected.v1',
  'agent.capabilities_changed.v1',
  'agent.key_rotated.v1',
  'session.created.v1',
  'session.deleted.v1',
  'message.received.v1',
  'run.created.v1',
  'run.started.v1',
  'run.completed.v1',
  'run.failed.v1',
  'run.cancelled.v1',
  'run.cancel_requested.v1',
  'run.tool_approval_requested.v1',
  'run.tool_approval_decided.v1',
  'tool.called.v1',
  'tool.catalog.changed.v1',
  'mcp.server.created.v1',
  'mcp.server.updated.v1',
  'mcp.server.deleted.v1',
  'mcp.server.tested.v1'
];

const objectTypeOptions: Array<SelectOption<string>> = [
  { value: 'workspace', label: 'workspace' },
  { value: 'member', label: 'member' },
  { value: 'invitation', label: 'invitation' },
  { value: 'kubernetes', label: 'kubernetes' },
  { value: 'kubernetes_cluster', label: 'kubernetes_cluster' },
  { value: 'virtual_machine', label: 'virtual_machine' },
  { value: 'session', label: 'session' },
  { value: 'run', label: 'run' },
  { value: 'tool_call', label: 'tool_call' },
  { value: 'tool_approval', label: 'tool_approval' },
  { value: 'tool', label: 'tool' },
  { value: 'mcp_server', label: 'mcp_server' }
];

function formatActor(event: WorkspaceAuditEvent): string {
  if (event.actor.type === 'system') return 'System';
  if (event.actor.type === 'admin_token') return event.actor.tokenId || 'Admin token';
  return event.actor.displayName || event.actor.email || event.actor.userId || 'Unknown user';
}

function formatObject(event: WorkspaceAuditEvent): string {
  return event.object.name || event.object.id || event.object.type;
}

function formatMetadata(metadata: Record<string, unknown>): string {
  const entries = Object.entries(metadata).filter(([, value]) => value !== undefined && value !== null && value !== '');
  if (entries.length === 0) return '';
  return entries.map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`).join('\n');
}

function toIsoDateTimeFilter(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function formatOperation(event: WorkspaceAuditEvent, t: ReturnType<typeof useTranslation>['t']): string {
  return event.operation === 'read' ? t('auditLog.operations.read') : t('auditLog.operations.write');
}

function toDateTimeLocalValue(date: Date): string {
  const localTimestamp = date.getTime() - date.getTimezoneOffset() * 60_000;
  return new Date(localTimestamp).toISOString().slice(0, 16);
}

function buildTimePresetFilters(preset: AuditTimePreset, currentFilters: AuditFilters): AuditFilters {
  const now = new Date();
  const from = new Date(now);

  if (preset === 'today') {
    from.setHours(0, 0, 0, 0);
  } else if (preset === 'last24h') {
    from.setHours(from.getHours() - 24);
  } else if (preset === 'past7d') {
    from.setDate(from.getDate() - 7);
  } else {
    from.setDate(from.getDate() - 30);
  }

  return {
    ...currentFilters,
    from: toDateTimeLocalValue(from),
    to: toDateTimeLocalValue(now)
  };
}

function normalizeFilters(filters: AuditFilters): AuditFilters {
  return {
    category: filters.category,
    eventType: filters.eventType.trim(),
    actorUserId: filters.actorUserId.trim(),
    objectType: filters.objectType.trim(),
    from: filters.from,
    to: filters.to
  };
}

function filtersEqual(first: AuditFilters, second: AuditFilters): boolean {
  return (
    first.category === second.category &&
    first.eventType === second.eventType &&
    first.actorUserId === second.actorUserId &&
    first.objectType === second.objectType &&
    first.from === second.from &&
    first.to === second.to
  );
}

export const WorkspaceAuditLogPage: React.FC<WorkspaceAuditLogPageProps> = ({ workspace }) => {
  const { t, i18n } = useTranslation();
  const closeAuditDetailsButtonRef = useRef<HTMLButtonElement>(null);
  const [draftFilters, setDraftFilters] = useState<AuditFilters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<AuditFilters>(defaultFilters);
  const [activeTimePreset, setActiveTimePreset] = useState<AuditTimePreset | undefined>();
  const [isCustomRangeOpen, setIsCustomRangeOpen] = useState(false);
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<WorkspaceAuditEvent | null>(null);
  const dateTimePickerLabels = useMemo(() => ({
    calendar: t('common.dateTimePicker.calendar'),
    clear: t('common.dateTimePicker.clear'),
    done: t('common.dateTimePicker.done'),
    hour: t('common.dateTimePicker.hour'),
    minute: t('common.dateTimePicker.minute'),
    nextMonth: t('common.dateTimePicker.nextMonth'),
    now: t('common.dateTimePicker.now'),
    previousMonth: t('common.dateTimePicker.previousMonth')
  }), [t]);

  const applyNormalizedFilters = useCallback((nextFilters: AuditFilters) => {
    const normalizedFilters = normalizeFilters(nextFilters);
    setAppliedFilters((current) => (filtersEqual(current, normalizedFilters) ? current : normalizedFilters));
  }, []);

  const loadAuditPage = useCallback(
    async ({ cursor, filters, limit, signal }: { cursor?: string; filters: AuditFilters; limit: number; signal: AbortSignal }) => {
      try {
        return await controlPlaneApi.listWorkspaceAuditEvents(workspace.id, {
          limit,
          cursor,
          category: filters.category,
          eventType: filters.eventType.trim() || undefined,
          actorUserId: filters.actorUserId.trim() || undefined,
          objectType: filters.objectType.trim() || undefined,
          from: toIsoDateTimeFilter(filters.from),
          to: toIsoDateTimeFilter(filters.to),
          signal
        });
      } catch (error) {
        throw new Error(formatControlPlaneError(error, t('auditLog.loadFailed')));
      }
    },
    [t, workspace.id]
  );
  const auditCollection = useCursorCollection({
    cacheKey: `workspace:${workspace.id}:audit-events`,
    filters: appliedFilters,
    getKey: (event: WorkspaceAuditEvent) => event.id,
    loadPage: loadAuditPage,
    pageSize: 50,
    strategy: 'sentinel'
  });
  const { items: events, nextCursor, phase: auditPhase, error: errorMessage = '' } = auditCollection;
  const isLoading = auditPhase === 'loading';
  const isInitialAuditLoading = auditPhase === 'loading' && events.length === 0;
  const isLoadingMore = auditPhase === 'loadingMore';

  useEffect(() => {
    const timer = window.setTimeout(() => {
      applyNormalizedFilters(draftFilters);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [applyNormalizedFilters, draftFilters]);

  const visibleCount = useMemo(() => events.length, [events.length]);
  const selectedMetadata = selectedEvent ? formatMetadata(selectedEvent.metadata) : '';
  const timeRangeOptions = useMemo<Array<SelectOption<AuditTimeSelection>>>(
    () => [
      { value: 'anytime', label: t('auditLog.anyTime') },
      ...timePresetOptions.map((value) => ({
        value,
        label: t(`auditLog.timePresets.${value}`)
      })),
      { value: 'custom', label: t('auditLog.customRange') }
    ],
    [t]
  );
  const advancedFilterCount = [
    draftFilters.category !== 'all',
    Boolean(draftFilters.eventType),
    Boolean(draftFilters.actorUserId),
    Boolean(draftFilters.objectType)
  ].filter(Boolean).length;
  const hasAnyFilters = !filtersEqual(normalizeFilters(draftFilters), defaultFilters);
  const selectedTimeRange: AuditTimeSelection = isCustomRangeOpen || (!activeTimePreset && Boolean(draftFilters.from || draftFilters.to))
    ? 'custom'
    : activeTimePreset || 'anytime';
  const activeAdvancedFilters: Array<{ key: AdvancedAuditFilterKey; label: string; value: string }> = [
    ...(draftFilters.category !== 'all'
      ? [{ key: 'category' as const, label: t('auditLog.category'), value: t(`auditLog.categories.${draftFilters.category}`) }]
      : []),
    ...(draftFilters.eventType
      ? [{ key: 'eventType' as const, label: t('auditLog.eventType'), value: draftFilters.eventType }]
      : []),
    ...(draftFilters.actorUserId
      ? [{ key: 'actorUserId' as const, label: t('auditLog.actor'), value: draftFilters.actorUserId }]
      : []),
    ...(draftFilters.objectType
      ? [{ key: 'objectType' as const, label: t('auditLog.object'), value: draftFilters.objectType }]
      : [])
  ];
  const clearFilters = () => {
    setDraftFilters(defaultFilters);
    applyNormalizedFilters(defaultFilters);
    setActiveTimePreset(undefined);
    setIsCustomRangeOpen(false);
    setIsAdvancedFiltersOpen(false);
  };
  const applyTimePreset = (preset: AuditTimePreset) => {
    const nextFilters = buildTimePresetFilters(preset, draftFilters);
    setDraftFilters(nextFilters);
    applyNormalizedFilters(nextFilters);
    setActiveTimePreset(preset);
    setIsCustomRangeOpen(false);
  };
  const changeTimeRange = (selection: AuditTimeSelection) => {
    if (selection === 'custom') {
      setActiveTimePreset(undefined);
      setIsCustomRangeOpen(true);
      return;
    }
    if (selection === 'anytime') {
      const nextFilters = { ...draftFilters, from: '', to: '' };
      setDraftFilters(nextFilters);
      applyNormalizedFilters(nextFilters);
      setActiveTimePreset(undefined);
      setIsCustomRangeOpen(false);
      return;
    }
    applyTimePreset(selection);
  };
  const clearAdvancedFilter = (key: AdvancedAuditFilterKey) => {
    setDraftFilters((current) => {
      if (key === 'category') return { ...current, category: 'all' };
      return { ...current, [key]: '' };
    });
  };

  return (
    <PageShell>
      <PageHeader
        title={t('auditLog.title')}
        description={t('auditLog.description')}
        actions={
          <Button variant="secondary" size="md" onClick={() => void auditCollection.refresh()} disabled={isLoading} className="whitespace-nowrap">
            <ICONS.Clock className="h-4 w-4" />
            {t('auditLog.refresh')}
          </Button>
        }
      />

      {errorMessage && (
        <div className="mb-4 rounded-lg border border-status-danger/25 bg-status-danger-soft px-4 py-3 type-body type-emphasis text-status-danger-text">{errorMessage}</div>
      )}

      <div className="overflow-hidden rounded-xl border border-ui-border bg-ui-surface shadow-sm">
        <form
          className="border-b border-ui-border px-4 py-4 sm:px-6 lg:px-8"
          onSubmit={(event) => {
            event.preventDefault();
            applyNormalizedFilters(draftFilters);
          }}
        >
          <div data-audit-filter-toolbar="true" className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="w-full lg:w-56">
              <label className="sr-only" htmlFor="audit-filter-time-range">{t('auditLog.timeRange')}</label>
              <Select<AuditTimeSelection>
                id="audit-filter-time-range"
                value={selectedTimeRange}
                options={timeRangeOptions}
                onChange={changeTimeRange}
                ariaLabel={t('auditLog.timeRange')}
                className="w-full"
              />
            </div>
            <Button
              variant="secondary"
              size="md"
              type="button"
              onClick={() => setIsAdvancedFiltersOpen((current) => !current)}
              aria-expanded={isAdvancedFiltersOpen}
              aria-controls="audit-advanced-filter-controls"
              className="w-full justify-between lg:w-auto"
            >
              <span>{advancedFilterCount ? t('auditLog.filterCount', { count: advancedFilterCount }) : t('auditLog.filters')}</span>
              <ICONS.ChevronDown className={`h-4 w-4 transition-transform ${isAdvancedFiltersOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
            </Button>
            {hasAnyFilters && (
              <Button variant="tertiary" size="md" onClick={clearFilters} type="button" className="w-full lg:ml-auto lg:w-auto">
                {t('auditLog.clearFilters')}
              </Button>
            )}
          </div>
          {isAdvancedFiltersOpen && (
            <div id="audit-advanced-filter-controls" className="mt-3 grid gap-3 rounded-lg border border-ui-border bg-ui-bg/70 p-3 md:grid-cols-2 xl:grid-cols-4">
              <Select<WorkspaceAuditCategory | 'all'>
                id="audit-filter-category"
                value={draftFilters.category}
                options={categoryOptions.map((option) => ({
                  ...option,
                  label: option.value === 'all' ? t('auditLog.allCategories') : t(`auditLog.categories.${option.value}`)
                }))}
                onChange={(category) => setDraftFilters((current) => ({ ...current, category }))}
                ariaLabel={t('auditLog.filterCategory')}
                className="w-full"
              />
              <Select<string>
                id="audit-filter-event-type"
                value={draftFilters.eventType}
                onChange={(eventType) => setDraftFilters((current) => ({ ...current, eventType }))}
                options={[{ value: '', label: t('auditLog.allEventTypes') }, ...eventTypeOptions.map((value) => ({ value, label: value }))]}
                ariaLabel={t('auditLog.filterEventType')}
                className="w-full"
              />
              <PageSearchInput
                id="audit-filter-actor"
                type="text"
                value={draftFilters.actorUserId}
                onChange={(event) => setDraftFilters((current) => ({ ...current, actorUserId: event.target.value }))}
                placeholder={t('auditLog.filterActor')}
                aria-label={t('auditLog.filterActor')}
                className="w-full"
              />
              <Select<string>
                id="audit-filter-object-type"
                value={draftFilters.objectType}
                onChange={(objectType) => setDraftFilters((current) => ({ ...current, objectType }))}
                options={[{ value: '', label: t('auditLog.allObjectTypes') }, ...objectTypeOptions]}
                ariaLabel={t('auditLog.filterObjectType')}
                className="w-full"
              />
            </div>
          )}
          {isCustomRangeOpen && (
            <div id="audit-custom-range-controls" className="mt-3 grid gap-3 rounded-lg border border-ui-border bg-ui-bg/70 p-3 sm:grid-cols-2 lg:w-[34rem] lg:max-w-full">
              <div className="grid gap-2">
                <span className="type-caption">{t('auditLog.filterFrom')}</span>
                <DateTimePicker
                  id="audit-filter-from"
                  value={draftFilters.from}
                  onChange={(value) => {
                    setActiveTimePreset(undefined);
                    setDraftFilters((current) => ({
                      ...current,
                      from: value
                    }));
                  }}
                  ariaLabel={t('auditLog.filterFrom')}
                  locale={i18n.resolvedLanguage}
                  placeholder={t('auditLog.selectDateTime')}
                  labels={dateTimePickerLabels}
                  className="lg:w-full"
                />
              </div>
              <div className="grid gap-2">
                <span className="type-caption">{t('auditLog.filterTo')}</span>
                <DateTimePicker
                  id="audit-filter-to"
                  value={draftFilters.to}
                  onChange={(value) => {
                    setActiveTimePreset(undefined);
                    setDraftFilters((current) => ({
                      ...current,
                      to: value
                    }));
                  }}
                  ariaLabel={t('auditLog.filterTo')}
                  locale={i18n.resolvedLanguage}
                  placeholder={t('auditLog.selectDateTime')}
                  labels={dateTimePickerLabels}
                  className="lg:w-full"
                />
              </div>
            </div>
          )}
          {activeAdvancedFilters.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2" aria-label={t('auditLog.activeFilters')}>
              {activeAdvancedFilters.map((filter) => (
                <Button
                  key={filter.key}
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => clearAdvancedFilter(filter.key)}
                  aria-label={t('common.removeFilter', { filter: filter.label, value: filter.value })}
                >
                  <span className="max-w-64 truncate">{filter.value}</span>
                  <ICONS.X className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              ))}
            </div>
          )}
        </form>
        <div className="flex items-center justify-between gap-3 border-b border-ui-border px-4 py-3">
          <p className="type-caption text-ui-text-muted">
            {isInitialAuditLoading ? t('auditLog.loading') : t('auditLog.loadedCount', { count: visibleCount })}
          </p>
        </div>
        <div className="min-w-0">
          <DataTable caption={t('auditLog.title')} className="w-full table-fixed text-left" aria-label={t('auditLog.title')}>
            <colgroup>
              <col className="w-[30%] xl:w-[17%]" />
              <col className="w-[58%] xl:w-[31%]" />
              <col className="hidden xl:table-column xl:w-[18%]" />
              <col className="hidden xl:table-column xl:w-[26%]" />
              <col className="w-[12%] xl:w-[8%]" />
            </colgroup>
            <DataTableHeader
              collectionState={{
                phase: isLoading ? 'loading' : errorMessage ? 'error' : 'ready',
                itemCount: events.length,
                showDuringInitialLoading: true
              }}
            >
              <DataTableRow>
                <DataTableHeaderCell>{t('auditLog.time')}</DataTableHeaderCell>
                <DataTableHeaderCell>{t('auditLog.event')}</DataTableHeaderCell>
                <DataTableHeaderCell className="hidden xl:table-cell">{t('auditLog.actor')}</DataTableHeaderCell>
                <DataTableHeaderCell className="hidden xl:table-cell">{t('auditLog.object')}</DataTableHeaderCell>
                <DataTableHeaderCell numeric>{t('auditLog.details')}</DataTableHeaderCell>
              </DataTableRow>
            </DataTableHeader>
            <DataTableBody>
              {events.map((event) => (
                <DataTableRow key={event.id} className="border-b border-ui-bg transition-colors hover:bg-accent-soft/35">
                  <DataTableCell className="px-4 py-5 align-top sm:px-6 lg:px-8 lg:py-6">
                    <span className="type-caption break-words text-ui-text">{formatUserDateTime(event.occurredAt)}</span>
                  </DataTableCell>
                  <DataTableCell className="px-4 py-5 align-top sm:px-6 lg:px-8 lg:py-6">
                    <p className="type-row-title break-words">{event.summary}</p>
                    <p className="type-caption mt-1 break-words">
                      {event.eventType} · {formatOperation(event, t)}
                    </p>
                    <dl className="mt-3 grid gap-1 xl:hidden">
                      <div className="min-w-0">
                        <dt className="type-micro-label">{t('auditLog.actor')}</dt>
                        <dd className="type-caption mt-0.5 break-words text-ui-text">{formatActor(event)}</dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="type-micro-label">{t('auditLog.object')}</dt>
                        <dd className="type-caption mt-0.5 break-words text-ui-text">
                          {formatObject(event)} · {event.object.type}
                        </dd>
                      </div>
                    </dl>
                  </DataTableCell>
                  <DataTableCell className="hidden px-4 py-5 align-top sm:px-6 lg:px-8 lg:py-6 xl:table-cell">
                    <p className="type-ui break-words text-ui-text">{formatActor(event)}</p>
                  </DataTableCell>
                  <DataTableCell className="hidden px-4 py-5 align-top sm:px-6 lg:px-8 lg:py-6 xl:table-cell">
                    <p className="type-ui break-words text-ui-text">{formatObject(event)}</p>
                    <p className="type-caption mt-1 break-words">{event.object.type}</p>
                  </DataTableCell>
                  <DataTableCell className="px-4 py-5 text-right align-top sm:px-6 lg:px-8 lg:py-6">
                    <Tooltip content={t('auditLog.viewDetails')}>
                      <Button
                        type="button"
                        variant="icon"
                        size="icon"
                        onClick={() => setSelectedEvent(event)}
                        className="control-target inline-flex h-9 w-9 items-center justify-center rounded-md border border-ui-border text-ui-text-muted transition-colors hover:border-ui-text-muted/40 hover:bg-ui-bg hover:text-ui-text"
                        aria-label={t('auditLog.viewDetails')}
                      >
                        <ICONS.Eye className="h-4 w-4" />
                      </Button>
                    </Tooltip>
                  </DataTableCell>
                </DataTableRow>
              ))}
              <DataTableStateRow
                columns={5}
                phase={isLoading ? 'loading' : errorMessage ? 'error' : 'ready'}
                itemCount={events.length}
                filtered={Object.values(appliedFilters).some(Boolean)}
                loading={
                  <div role="status" className="p-5 type-body text-ui-text-muted">
                    {t('auditLog.loading')}
                  </div>
                }
                loadingRows={<TableLoadingRows columns={5} label={t('auditLog.loading')} />}
                empty={<EmptyState embedded headingLevel={3} icon={<ICONS.Activity />} title={t('auditLog.emptyTitle')} description={t('auditLog.empty')} />}
                filteredEmpty={<EmptyState embedded headingLevel={3} icon={<ICONS.Search />} title={t('auditLog.emptyTitle')} description={t('auditLog.empty')} />}
                error={<EmptyState embedded headingLevel={3} icon={<ICONS.AlertCircle />} title={t('auditLog.loadFailed')} description={errorMessage} />}
              />
            </DataTableBody>
          </DataTable>
        </div>
        {nextCursor && (
          <div ref={auditCollection.sentinelRef} className="border-t border-ui-border px-4 py-4 text-center">
            <Button variant="secondary" size="md" onClick={() => void auditCollection.loadMore()} disabled={isLoadingMore}>
              {isLoadingMore ? t('auditLog.loadingMore') : t('auditLog.loadMore')}
            </Button>
          </div>
        )}
      </div>
      <DrawerFrame unframed
        isOpen={Boolean(selectedEvent)}
        onClose={() => setSelectedEvent(null)}
        titleId="audit-event-title"
        initialFocusRef={closeAuditDetailsButtonRef}
        className="block overflow-y-auto p-6"
      >
        {selectedEvent && (
          <>
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="type-micro-label">{selectedEvent.category}</p>
                <h2 id="audit-event-title" className="type-section-title mt-2">
                  {selectedEvent.summary}
                </h2>
              </div>
              <CloseButton ref={closeAuditDetailsButtonRef} onClick={() => setSelectedEvent(null)} aria-label={t('auditLog.closeDetails')} />
            </div>
            <dl className="divide-y divide-ui-border border-y border-ui-border">
              {[
                [t('auditLog.time'), formatUserDateTime(selectedEvent.occurredAt)],
                [t('auditLog.eventType'), selectedEvent.eventType],
                [t('auditLog.operation'), formatOperation(selectedEvent, t)],
                [t('auditLog.actor'), formatActor(selectedEvent)],
                [t('auditLog.object'), formatObject(selectedEvent)]
              ].map(([label, value]) => (
                <div key={label} className="grid grid-cols-[9rem,1fr] gap-4 px-1 py-3">
                  <dt className="type-label">{label}</dt>
                  <dd className="type-ui min-w-0 break-words text-ui-text">{value}</dd>
                </div>
              ))}
            </dl>
            {selectedMetadata && <pre className="type-code mt-5 whitespace-pre-wrap break-words border border-ui-border bg-ui-surface p-4 text-ui-text">{selectedMetadata}</pre>}
          </>
        )}
      </DrawerFrame>
    </PageShell>
  );
};
