import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { TableLoadingRows } from '@/components/common/Loading';
import { PageSearchInput, pageSearchInputClassName } from '@/components/common/PageSearchInput';
import { RightSidePanel } from '@/components/common/RightSidePanel';
import { Select, SelectOption } from '@/components/common/Select';
import { Tooltip } from '@/components/common/Tooltip';
import { ICONS } from '@/constants';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import { Workspace, WorkspaceAuditCategory, WorkspaceAuditEvent } from '@/types';

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

const objectTypeOptions = [
  'workspace',
  'member',
  'invitation',
  'kubernetes_cluster',
  'virtual_machine',
  'session',
  'run',
  'tool_call',
  'tool_approval',
  'tool',
  'mcp_server'
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
  return entries
    .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`)
    .join('\n');
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
  const { t } = useTranslation();
  const closeAuditDetailsButtonRef = useRef<HTMLButtonElement>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);
  const requestSeqRef = useRef(0);
  const [events, setEvents] = useState<WorkspaceAuditEvent[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [draftFilters, setDraftFilters] = useState<AuditFilters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<AuditFilters>(defaultFilters);
  const [activeTimePreset, setActiveTimePreset] = useState<AuditTimePreset | undefined>();
  const [isCustomRangeOpen, setIsCustomRangeOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<WorkspaceAuditEvent | null>(null);

  const applyNormalizedFilters = useCallback((nextFilters: AuditFilters) => {
    const normalizedFilters = normalizeFilters(nextFilters);
    setAppliedFilters((current) => filtersEqual(current, normalizedFilters) ? current : normalizedFilters);
  }, []);

  const loadEvents = useCallback(async (cursor?: string) => {
    const requestId = ++requestSeqRef.current;
    if (cursor) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setErrorMessage('');
    }
    try {
      const page = await controlPlaneApi.listWorkspaceAuditEvents(workspace.id, {
        limit: 50,
        cursor,
        category: appliedFilters.category,
        eventType: appliedFilters.eventType.trim() || undefined,
        actorUserId: appliedFilters.actorUserId.trim() || undefined,
        objectType: appliedFilters.objectType.trim() || undefined,
        from: toIsoDateTimeFilter(appliedFilters.from),
        to: toIsoDateTimeFilter(appliedFilters.to)
      });
      if (requestId !== requestSeqRef.current) return;
      setEvents((current) => cursor ? [...current, ...page.items] : page.items);
      setNextCursor(page.nextCursor);
    } catch (error) {
      if (requestId !== requestSeqRef.current) return;
      setErrorMessage(error instanceof Error ? error.message : t('auditLog.loadFailed'));
    } finally {
      if (requestId === requestSeqRef.current) {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    }
  }, [appliedFilters, t, workspace.id]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      applyNormalizedFilters(draftFilters);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [applyNormalizedFilters, draftFilters]);

  useEffect(() => {
    if (!nextCursor || isLoading || isLoadingMore || typeof IntersectionObserver === 'undefined') return;
    const trigger = loadMoreTriggerRef.current;
    if (!trigger) return;

    let isActive = true;
    const observer = new IntersectionObserver((entries) => {
      if (!isActive || !entries.some((entry) => entry.isIntersecting)) return;
      isActive = false;
      void loadEvents(nextCursor);
    }, { rootMargin: '240px 0px' });
    observer.observe(trigger);
    return () => {
      isActive = false;
      observer.disconnect();
    };
  }, [isLoading, isLoadingMore, loadEvents, nextCursor]);

  const visibleCount = useMemo(() => events.length, [events.length]);
  const selectedMetadata = selectedEvent ? formatMetadata(selectedEvent.metadata) : '';
  const clearFilters = () => {
    setDraftFilters(defaultFilters);
    applyNormalizedFilters(defaultFilters);
    setActiveTimePreset(undefined);
    setIsCustomRangeOpen(false);
  };
  const applyTimePreset = (preset: AuditTimePreset) => {
    const nextFilters = buildTimePresetFilters(preset, draftFilters);
    setDraftFilters(nextFilters);
    applyNormalizedFilters(nextFilters);
    setActiveTimePreset(preset);
    setIsCustomRangeOpen(false);
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-ui-bg px-4 py-6 custom-scrollbar stable-scrollbar-gutter sm:px-6 lg:px-10 lg:py-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="type-route-title">{t('auditLog.title')}</h1>
            <p className="type-body mt-2">{t('auditLog.description')}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button variant="secondary" size="md" onClick={() => loadEvents()} disabled={isLoading} className="whitespace-nowrap">
              <ICONS.Clock className="h-4 w-4" />
              {t('auditLog.refresh')}
            </Button>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-lg border border-status-danger/25 bg-status-danger-soft px-4 py-3 text-sm font-semibold text-status-danger-text">
            {errorMessage}
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-ui-border bg-ui-surface shadow-sm">
          <form
            className="border-b border-ui-border px-4 py-4 sm:px-6 lg:px-8"
            onSubmit={(event) => {
              event.preventDefault();
              applyNormalizedFilters(draftFilters);
            }}
          >
            <div data-audit-filter-toolbar="true" className="grid gap-3 xl:grid-cols-[minmax(11rem,13rem)_minmax(14rem,1.15fr)_repeat(2,minmax(10rem,0.8fr))]">
              <div className="min-w-0">
                <label className="sr-only" htmlFor="audit-filter-category">{t('auditLog.category')}</label>
                <Select<WorkspaceAuditCategory | 'all'>
                  id="audit-filter-category"
                  value={draftFilters.category}
                  options={categoryOptions.map((option) => ({
                    ...option,
                    label: option.value === 'all' ? t('auditLog.allCategories') : t(`auditLog.categories.${option.value}`)
                  }))}
                  onChange={(value) => setDraftFilters((current) => ({ ...current, category: value }))}
                  ariaLabel={t('auditLog.filterCategory')}
                  className="w-full"
                />
              </div>
              <div className="min-w-0">
                <label className="sr-only" htmlFor="audit-filter-event-type">{t('auditLog.eventType')}</label>
                <Select<string>
                  id="audit-filter-event-type"
                  value={draftFilters.eventType}
                  onChange={(value) => setDraftFilters((current) => ({ ...current, eventType: value }))}
                  options={[
                    { value: '', label: t('auditLog.allEventTypes') },
                    ...eventTypeOptions.map((value) => ({ value, label: value }))
                  ]}
                  ariaLabel={t('auditLog.filterEventType')}
                  className="w-full"
                />
              </div>
              <label className="min-w-0" htmlFor="audit-filter-actor">
                <span className="sr-only">{t('auditLog.actor')}</span>
                <PageSearchInput
                  id="audit-filter-actor"
                  type="text"
                  value={draftFilters.actorUserId}
                  onChange={(event) => setDraftFilters((current) => ({ ...current, actorUserId: event.target.value }))}
                  placeholder={t('auditLog.filterActor')}
                  aria-label={t('auditLog.filterActor')}
                  className="lg:w-full"
                />
              </label>
              <div className="min-w-0">
                <label className="sr-only" htmlFor="audit-filter-object-type">{t('auditLog.object')}</label>
                <Select<string>
                  id="audit-filter-object-type"
                  value={draftFilters.objectType}
                  onChange={(value) => setDraftFilters((current) => ({ ...current, objectType: value }))}
                  options={[
                    { value: '', label: t('auditLog.allObjectTypes') },
                    ...objectTypeOptions.map((value) => ({ value, label: value }))
                  ]}
                  ariaLabel={t('auditLog.filterObjectType')}
                  className="w-full"
                />
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-3 border-t border-ui-border/70 pt-3 lg:flex-row lg:items-start lg:justify-between">
              <fieldset className="min-w-0">
                <legend className="sr-only">{t('auditLog.timeRange')}</legend>
                <div className="flex flex-wrap gap-2">
                  {timePresetOptions.map((preset) => {
                    const isActive = activeTimePreset === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => applyTimePreset(preset)}
                        className={`type-label min-h-9 rounded-md border px-3 py-1.5 transition-colors ${
                          isActive
                            ? 'border-accent/40 bg-accent-soft text-accent-strong'
                            : 'border-ui-border bg-ui-surface text-ui-text-muted hover:border-accent/30 hover:bg-ui-bg hover:text-ui-text'
                        }`}
                        aria-pressed={isActive}
                      >
                        {t(`auditLog.timePresets.${preset}`)}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setIsCustomRangeOpen((current) => !current)}
                    className={`type-label inline-flex min-h-9 items-center gap-2 rounded-md border px-3 py-1.5 transition-colors ${
                      isCustomRangeOpen || (!activeTimePreset && (draftFilters.from || draftFilters.to))
                        ? 'border-accent/40 bg-accent-soft text-accent-strong'
                        : 'border-ui-border bg-ui-surface text-ui-text-muted hover:border-accent/30 hover:bg-ui-bg hover:text-ui-text'
                    }`}
                    aria-expanded={isCustomRangeOpen}
                    aria-controls="audit-custom-range-controls"
                  >
                    <ICONS.Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('auditLog.customRange')}
                    <ICONS.ChevronDown className={`h-3.5 w-3.5 transition-transform ${isCustomRangeOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                  </button>
                </div>
              </fieldset>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="secondary" size="md" onClick={clearFilters} type="button">
                  {t('auditLog.clearFilters')}
                </Button>
              </div>
            </div>
            {isCustomRangeOpen && (
              <div id="audit-custom-range-controls" className="mt-3 grid gap-3 rounded-lg border border-ui-border bg-ui-bg/70 p-3 sm:grid-cols-2 lg:w-[34rem] lg:max-w-full">
                <label className="grid gap-2" htmlFor="audit-filter-from">
                  <span className="type-caption">{t('auditLog.filterFrom')}</span>
                  <input
                    id="audit-filter-from"
                    type="datetime-local"
                    value={draftFilters.from}
                    onChange={(event) => {
                      setActiveTimePreset(undefined);
                      setDraftFilters((current) => ({ ...current, from: event.target.value }));
                    }}
                    aria-label={t('auditLog.filterFrom')}
                    className={pageSearchInputClassName('lg:w-full')}
                  />
                </label>
                <label className="grid gap-2" htmlFor="audit-filter-to">
                  <span className="type-caption">{t('auditLog.filterTo')}</span>
                  <input
                    id="audit-filter-to"
                    type="datetime-local"
                    value={draftFilters.to}
                    onChange={(event) => {
                      setActiveTimePreset(undefined);
                      setDraftFilters((current) => ({ ...current, to: event.target.value }));
                    }}
                    aria-label={t('auditLog.filterTo')}
                    className={pageSearchInputClassName('lg:w-full')}
                  />
                </label>
              </div>
            )}
          </form>
          <div className="flex items-center justify-between gap-3 border-b border-ui-border px-4 py-3">
            <p className="type-caption text-ui-text-muted">
              {t('auditLog.loadedCount', { count: visibleCount })}
            </p>
          </div>
          <div className="min-w-0">
            <table className="w-full table-fixed text-left" aria-label={t('auditLog.title')}>
              <thead className="bg-ui-bg">
                <tr>
                  <th className="type-label px-3 py-4 sm:px-5">{t('auditLog.time')}</th>
                  <th className="type-label px-3 py-4 sm:px-5">{t('auditLog.event')}</th>
                  <th className="type-label hidden px-3 py-4 sm:px-5 md:table-cell">{t('auditLog.actor')}</th>
                  <th className="type-label hidden px-3 py-4 sm:px-5 md:table-cell">{t('auditLog.object')}</th>
                  <th className="type-label px-3 py-4 text-right sm:px-5">{t('auditLog.details')}</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-b border-ui-bg transition-colors hover:bg-accent-soft/35">
                    <td className="px-3 py-4 align-top sm:px-5">
                      <span className="type-caption break-words text-ui-text">{new Date(event.occurredAt).toLocaleString()}</span>
                    </td>
                    <td className="px-3 py-4 align-top sm:px-5">
                      <p className="type-row-title break-words">{event.summary}</p>
                      <p className="type-caption mt-1 break-words">{event.eventType} · {formatOperation(event, t)}</p>
                      <dl className="mt-3 grid gap-1 md:hidden">
                        <div className="min-w-0">
                          <dt className="type-micro-label">{t('auditLog.actor')}</dt>
                          <dd className="type-caption mt-0.5 break-words text-ui-text">{formatActor(event)}</dd>
                        </div>
                        <div className="min-w-0">
                          <dt className="type-micro-label">{t('auditLog.object')}</dt>
                          <dd className="type-caption mt-0.5 break-words text-ui-text">{formatObject(event)} · {event.object.type}</dd>
                        </div>
                      </dl>
                    </td>
                    <td className="hidden px-3 py-4 align-top sm:px-5 md:table-cell">
                      <p className="type-ui break-words text-ui-text">{formatActor(event)}</p>
                    </td>
                    <td className="hidden px-3 py-4 align-top sm:px-5 md:table-cell">
                      <p className="type-ui break-words text-ui-text">{formatObject(event)}</p>
                      <p className="type-caption mt-1 break-words">{event.object.type}</p>
                    </td>
                    <td className="px-3 py-4 text-right align-top sm:px-5">
                      <Tooltip content={t('auditLog.viewDetails')}>
                        <button
                          type="button"
                          onClick={() => setSelectedEvent(event)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-ui-border text-ui-text-muted transition-colors hover:border-ui-text-muted/40 hover:bg-ui-bg hover:text-ui-text"
                          aria-label={t('auditLog.viewDetails')}
                        >
                          <ICONS.Eye className="h-4 w-4" />
                        </button>
                      </Tooltip>
                    </td>
                  </tr>
                ))}
                {events.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center type-body">
                      {t('auditLog.empty')}
                    </td>
                  </tr>
                )}
                {isLoading && (
                  <TableLoadingRows
                    columns={5}
                    label={t('auditLog.loading')}
                    rows={5}
                    cellClassName="px-3 py-4 sm:px-5"
                    columnClassNames={['', '', 'hidden md:table-cell', 'hidden md:table-cell', 'text-right']}
                  />
                )}
              </tbody>
            </table>
          </div>
          {nextCursor && (
            <div ref={loadMoreTriggerRef} className="border-t border-ui-border px-4 py-4 text-center">
              <Button variant="secondary" size="md" onClick={() => loadEvents(nextCursor)} disabled={isLoadingMore}>
                {isLoadingMore ? t('auditLog.loadingMore') : t('auditLog.loadMore')}
              </Button>
            </div>
          )}
        </div>
        <RightSidePanel
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
                  <h2 id="audit-event-title" className="type-section-title mt-2">{selectedEvent.summary}</h2>
                </div>
                <button
                  ref={closeAuditDetailsButtonRef}
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-ui-border text-ui-text-muted hover:bg-ui-surface hover:text-ui-text"
                  aria-label={t('auditLog.closeDetails')}
                >
                  <ICONS.X className="h-4 w-4" />
                </button>
              </div>
              <dl className="divide-y divide-ui-border border-y border-ui-border">
                {[
                  [t('auditLog.time'), new Date(selectedEvent.occurredAt).toLocaleString()],
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
              {selectedMetadata && (
                <pre className="type-code mt-5 whitespace-pre-wrap break-words border border-ui-border bg-ui-surface p-4 text-ui-text">
                  {selectedMetadata}
                </pre>
              )}
            </>
          )}
        </RightSidePanel>
      </div>
  );
};
