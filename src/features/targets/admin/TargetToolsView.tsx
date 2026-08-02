import React from 'react';
import { Search, Wrench } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, CollectionResultSummary } from '@acornops/ui';
import { CollectionState } from '@acornops/ui';
import { DialogFrame } from '@acornops/ui';
import { EmptyState } from '@acornops/ui';
import { DataTableFrame, DataTableHeader, DataTableHeaderCell } from '@acornops/ui';
import { PageHeader, PageShell } from '@acornops/ui';
import { Select } from '@acornops/ui';
import type { SelectOption } from '@acornops/ui';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import type {
  ControlPlaneTargetToolItem,
  ControlPlaneTargetToolsCatalog
} from '@/services/controlPlaneApi';
import { TargetInsightsActivityDialog } from '@/features/targets/admin/TargetInsightsActivityDialog';
import { TargetInsightsDialog } from '@/features/targets/admin/TargetInsightsDialog';
import { TargetInsightsResetDialog } from '@/features/targets/admin/TargetInsightsResetDialog';
import { TargetInsightsSettingsDialog } from '@/features/targets/admin/TargetInsightsSettingsDialog';
import { TargetToolRow } from '@/features/targets/admin/TargetToolRow';
import { TargetCapabilityInventoryLoading } from '@/features/targets/admin/TargetCapabilityInventoryLoading';
import { formatError } from '@/features/targets/admin/targetSkillsViewModel';
import { TextInput, Textarea } from '@acornops/ui';
import { DataTable, DataTableBody, DataTableRow } from '@acornops/ui';
import {
  draftFromTool,
  parseDomainList,
  summarizeDomainFilters,
  summarizeToolConfig,
  targetToolsDataSource,
  toolCapability,
  toolCapabilityLabel,
  toolDomainTextareaClassName,
  toolRuntimeKind,
  toolRuntimeLabel,
  toolSearchInputClassName,
  type TargetInsightsAction,
  type TargetToolsViewProps,
  type ToolDraft
} from '@/features/targets/admin/TargetToolsView.helpers';

export type { TargetToolsDataSource } from '@/features/targets/admin/TargetToolsView.helpers';

export const TargetToolsView: React.FC<TargetToolsViewProps> = ({
  subject,
  canManageTools = false,
  initialCatalog = null,
  onCatalogChange,
  dataSource = targetToolsDataSource
}) => {
  const { t } = useTranslation();

  const [catalog, setCatalog] = React.useState<ControlPlaneTargetToolsCatalog | null>(() => initialCatalog);
  const [catalogLoading, setCatalogLoading] = React.useState(false);
  const [catalogError, setCatalogError] = React.useState<string | null>(null);
  const [editingTool, setEditingTool] = React.useState<ControlPlaneTargetToolItem | null>(null);
  const [targetInsightsAction, setTargetInsightsAction] = React.useState<TargetInsightsAction | null>(null);
  const [draft, setDraft] = React.useState<ToolDraft | null>(null);
  const [validationError, setValidationError] = React.useState<string | null>(null);
  const [savingError, setSavingError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [pendingToolId, setPendingToolId] = React.useState<string | null>(null);
  const [toolSearch, setToolSearch] = React.useState('');
  const [toolFilter, setToolFilter] = React.useState<'all' | 'enabled' | 'disabled' | 'read' | 'write'>('all');

  const canEditTools = Boolean(catalog?.permissions?.canEdit);
  const canEditSelectedTool = Boolean(editingTool && canEditTools && (editingTool.permissions?.canEdit ?? true));
  const showPermissionNotice = catalog ? !canEditTools : !canManageTools;
  const toolFilterOptions: Array<SelectOption<typeof toolFilter>> = [
    { value: 'all', label: t('tools.filterAll') },
    { value: 'enabled', label: t('tools.enabled') },
    { value: 'disabled', label: t('tools.disabled') },
    { value: 'read', label: t('tools.filterReadTools') },
    { value: 'write', label: t('tools.filterWriteTools') }
  ];

  const toolSummary = React.useMemo(() => {
    const items = catalog?.items || [];
    return {
      total: items.length,
      enabled: items.filter((tool) => tool.enabled).length,
      read: items.filter((tool) => toolCapability(tool) === 'read').length,
      write: items.filter((tool) => toolCapability(tool) === 'write').length,
      assistantVisible: items.filter((tool) => (
        tool.enabled && tool.availability?.available !== false && tool.visibility?.appearsInAssistantToolList
      )).length
    };
  }, [catalog]);

  const filteredTools = React.useMemo(() => {
    const items = catalog?.items || [];
    const normalizedSearch = toolSearch.trim().toLowerCase();
    return items.filter((tool) => {
      const searchableText = [
        tool.label,
        tool.id,
        tool.description,
        t('common.providedByAcornOps'),
        tool.enabled ? t('tools.enabled') : t('tools.disabled'),
        toolCapabilityLabel(tool, t),
        toolRuntimeLabel(tool, t),
        summarizeToolConfig(tool, t)
      ].join(' ').toLowerCase();
      const matchesSearch = !normalizedSearch || searchableText.includes(normalizedSearch);
      const matchesFilter =
        toolFilter === 'all' ||
        (toolFilter === 'enabled' && tool.enabled) ||
        (toolFilter === 'disabled' && !tool.enabled) ||
        toolFilter === toolCapability(tool);
      return matchesSearch && matchesFilter;
    });
  }, [catalog, t, toolFilter, toolSearch]);
  const hasActiveFilters = Boolean(toolSearch.trim()) || toolFilter !== 'all';

  const loadCatalog = React.useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      setCatalog(await dataSource.listTools(subject.workspaceId, subject.id));
    } catch (error) {
      setCatalogError(formatError(error, t('tools.loadFailed'), 'targetTools'));
    } finally {
      setCatalogLoading(false);
    }
  }, [dataSource, subject.id, subject.workspaceId, t]);

  React.useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  React.useEffect(() => {
    if (catalog) onCatalogChange?.(catalog);
  }, [catalog, onCatalogChange]);

  const openConfigure = (tool: ControlPlaneTargetToolItem) => {
    setEditingTool(tool);
    setDraft(tool.id === 'target_insights' ? null : draftFromTool(tool));
    setTargetInsightsAction(tool.id === 'target_insights' ? 'files' : null);
    setValidationError(null);
    setSavingError(null);
  };

  const exportTargetInsights = async (tool: ControlPlaneTargetToolItem) => {
    setCatalogError(null);
    try {
      const text = await controlPlaneApi.exportTargetInsights(subject.workspaceId, subject.id);
      const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${tool.id}-${subject.id}.md`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (error) {
      setCatalogError(formatError(error, t('tools.targetInsights.exportFailed'), 'targetInsights'));
    }
  };

  const openTargetInsightsAction = (tool: ControlPlaneTargetToolItem, action: 'files' | 'settings' | 'activity' | 'export' | 'reset') => {
    if (action === 'export') {
      void exportTargetInsights(tool);
      return;
    }
    setEditingTool(tool);
    setDraft(null);
    setTargetInsightsAction(action);
    setValidationError(null);
    setSavingError(null);
  };

  const closeConfigure = () => {
    if (saving) return;
    setEditingTool(null);
    setTargetInsightsAction(null);
    setDraft(null);
    setValidationError(null);
    setSavingError(null);
  };

  const validateDraft = React.useCallback(() => {
    if (!draft) return null;
    if (editingTool?.id === 'http.fetch.get') {
      const allowedUrlPatterns = draft.allowedUrlPatternsText
        .split(/\n+/)
        .map((value) => value.trim())
        .filter(Boolean);
      if (allowedUrlPatterns.length < 1 || allowedUrlPatterns.length > 20) {
        throw new Error('Configure between 1 and 20 allowed HTTPS URL patterns.');
      }
      if (new Set(allowedUrlPatterns).size !== allowedUrlPatterns.length
        || allowedUrlPatterns.some((value) => !value.startsWith('https://'))) {
        throw new Error('Use unique, complete HTTPS URL patterns, one per line.');
      }
      return { enabled: draft.enabled, config: { allowedUrlPatterns } };
    }
    const allowedDomains = parseDomainList(draft.allowedDomainsText, t('tools.allowedDomains'), t);
    const blockedDomains = parseDomainList(draft.blockedDomainsText, t('tools.blockedDomains'), t);
    const blocked = new Set(blockedDomains);
    const overlap = allowedDomains.find((domain) => blocked.has(domain));
    if (overlap) {
      throw new Error(t('tools.validation.overlapDomain', { domain: overlap }));
    }
    return {
      enabled: draft.enabled,
      config: {
        domainFilters: {
          allowedDomains,
          blockedDomains
        }
      }
    };
  }, [draft, editingTool?.id, t]);

  const draftRequest = React.useMemo(() => {
    try {
      const request = validateDraft();
      return { request, error: null };
    } catch (error) {
      return { request: null, error: error instanceof Error ? error.message : t('tools.validation.invalid') };
    }
  }, [t, validateDraft]);

  const saveTool = async () => {
    if (!editingTool || !draft || !canEditSelectedTool) return;
    setSavingError(null);
    setValidationError(draftRequest.error);
    if (!draftRequest.request) return;
    setSaving(true);
    try {
      const updated = await dataSource.updateTool(
        subject.workspaceId,
        subject.id,
        editingTool.id,
        draftRequest.request
      );
      setCatalog((current) => current ? {
        ...current,
        items: current.items.map((item) => item.id === updated.id ? updated : item)
      } : current);
      closeConfigure();
    } catch (error) {
      setSavingError(formatError(error, t('tools.saveFailed'), 'targetTools'));
    } finally {
      setSaving(false);
    }
  };

  const toggleTool = async (tool: ControlPlaneTargetToolItem, enabled: boolean) => {
    const canEditTargetTool = canEditTools && (tool.permissions?.canEdit ?? true);
    if (!canEditTargetTool || pendingToolId || enabled === tool.enabled) return;
    setPendingToolId(tool.id);
    setCatalogError(null);
    try {
      const updated = await dataSource.updateTool(
        subject.workspaceId,
        subject.id,
        tool.id,
        { enabled }
      );
      setCatalog((current) => current ? {
        ...current,
        items: current.items.map((item) => item.id === updated.id ? updated : item)
      } : current);
    } catch (error) {
      setCatalogError(formatError(error, t('tools.saveFailed'), 'targetTools'));
    } finally {
      setPendingToolId(null);
    }
  };

  const dialogError = validationError || draftRequest.error || savingError;
  const dialogDomainSummary = draftRequest.request
    ? summarizeDomainFilters({
        id: editingTool?.id || 'web_search',
        label: editingTool?.label || '',
        description: editingTool?.description || '',
        enabled: draftRequest.request.enabled,
        origin: editingTool?.origin || 'target_setting',
        capability: editingTool?.capability || 'read',
        runtimeKind: editingTool?.runtimeKind || 'provider_native',
        visibility: editingTool?.visibility,
        config: draftRequest.request.config
      }, t)
    : null;

  return (
    <PageShell>
      <PageHeader
        title={t('tools.title')}
        description={t('tools.description', { name: subject.name })}
        actions={showPermissionNotice ? (
          <p className="type-caption max-w-xs type-emphasis text-ui-text-muted sm:text-right">
            {catalog?.permissions?.editableRoles?.length
              ? t('tools.manageNoAccessWithRoles', { roles: catalog.permissions.editableRoles.join(', ') })
              : t('tools.manageNoAccess')}
          </p>
        ) : undefined}
      />

      {catalogError && (
        <div className="type-caption mb-5 rounded-xl border border-status-danger/25 bg-status-danger-soft px-4 py-3 text-status-danger-text">
          {catalogError}
        </div>
      )}

      {catalogLoading && !catalog && (
        <TargetCapabilityInventoryLoading
          caption={t('tools.title')}
          label={t('tools.loading')}
          columns={[
            { label: t('tools.toolColumn') },
            { label: t('tools.capabilityColumn') },
            { label: t('tools.enabledColumn') },
            { label: t('tools.runtimeColumn'), className: 'hidden md:table-cell' },
            { label: t('tools.actionsColumn'), numeric: true }
          ]}
        />
      )}

      {catalog ? (
        <>
          <section data-target-tools-access-summary="true" className="mb-6 overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm">
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-[minmax(15rem,1.35fr)_repeat(5,minmax(7rem,1fr))]">
              <div className="col-span-2 border-b border-ui-border px-5 py-3.5 sm:col-span-3 xl:col-span-1 xl:border-b-0 xl:border-r">
                <h2 className="type-row-title">{t('tools.inventoryTitle')}</h2>
                <p className="type-caption mt-1 min-h-10 text-ui-text-muted">{t('tools.inventoryBody')}</p>
              </div>
              <div className="border-b border-r border-ui-border px-5 py-3.5 sm:border-r xl:border-b-0">
                <p className="type-caption text-ui-text-muted">{t('tools.toolsMetric')}</p>
                <p className="type-data mt-0.5">{toolSummary.total}</p>
              </div>
              <div className="border-b border-ui-border px-5 py-3.5 sm:border-r xl:border-b-0">
                <p className="type-caption text-ui-text-muted">{t('tools.enabledToolsMetric')}</p>
                <p className="type-data mt-0.5">{toolSummary.enabled}</p>
              </div>
              <div className="border-b border-r border-ui-border px-5 py-3.5 sm:border-r xl:border-b-0">
                <p className="type-caption text-ui-text-muted">{t('tools.readOnlyTools')}</p>
                <p className="type-data mt-0.5 inline-flex items-center gap-2">
                  {toolSummary.read}
                  <span className="h-2 w-2 rounded-full bg-status-success" />
                </p>
              </div>
              <div className="border-r border-ui-border px-5 py-3.5 sm:border-r">
                <p className="type-caption text-ui-text-muted">{t('tools.writeCapableTools')}</p>
                <p className="type-data mt-0.5 inline-flex items-center gap-2">
                  {toolSummary.write}
                  <span className="h-2 w-2 rounded-full bg-status-warning" />
                </p>
              </div>
              <div className="px-5 py-3.5">
                <p className="type-caption text-ui-text-muted">{t('tools.assistantVisibleTools')}</p>
                <p className="type-data mt-0.5">{toolSummary.assistantVisible}</p>
              </div>
            </div>
          </section>

          <section data-target-tools-list="true" className="overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm">
            {(catalog.items.length > 0 || hasActiveFilters) && (
              <div className="grid gap-4 border-b border-ui-border px-6 py-6 sm:px-8 xl:grid-cols-[minmax(0,1fr)_12rem_9.5rem] xl:items-center">
                <div className="relative min-w-0">
                  <label htmlFor="target-tool-search" className="sr-only">{t('tools.searchTools')}</label>
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-text-muted" aria-hidden="true" />
                  <TextInput
                    id="target-tool-search"
                    type="text"
                    value={toolSearch}
                    onChange={(event) => setToolSearch(event.target.value)}
                    placeholder={t('tools.searchTools')}
                    className={toolSearchInputClassName}
                  />
                </div>
                <Select<typeof toolFilter>
                  value={toolFilter}
                  options={toolFilterOptions}
                  onChange={setToolFilter}
                  className="w-full"
                  ariaLabel={t('tools.filterTools')}
                />
                <CollectionResultSummary className="xl:justify-end">
                  {t('tools.showingTools', { count: filteredTools.length, total: catalog.items.length })}
                </CollectionResultSummary>
              </div>
            )}
            <div className="min-w-0">
              <CollectionState
                phase="ready"
                itemCount={filteredTools.length}
                filtered={catalog.items.length > 0}
                loading={null}
                empty={<EmptyState embedded headingLevel={3} icon={<Wrench />} title={t('tools.empty')} description={t('tools.emptyHelp')} />}
                filteredEmpty={<EmptyState embedded headingLevel={3} icon={<Search />} title={t('tools.noToolMatches')} description={t('tools.noToolMatchesHelp')} />}
                error={null}
              >
                <DataTableFrame data-target-capability-table-frame="true" className="rounded-none border-0 shadow-none custom-scrollbar">
                  <DataTable caption={t('tools.title')} className="w-full table-fixed text-left" aria-label={t('tools.title')}>
                    <colgroup>
                      <col className="w-[34%]" />
                      <col className="w-[23%]" />
                      <col className="w-[11%]" />
                      <col className="w-[21%]" />
                      <col className="w-[11%]" />
                    </colgroup>
                    <DataTableHeader collectionState={{ phase: 'ready', itemCount: filteredTools.length }}>
                      <DataTableRow>
                        <DataTableHeaderCell>{t('tools.toolColumn')}</DataTableHeaderCell>
                        <DataTableHeaderCell>{t('tools.capabilityColumn')}</DataTableHeaderCell>
                        <DataTableHeaderCell>{t('tools.enabledColumn')}</DataTableHeaderCell>
                        <DataTableHeaderCell className="hidden md:table-cell">{t('tools.runtimeColumn')}</DataTableHeaderCell>
                        <DataTableHeaderCell numeric>{t('tools.actionsColumn')}</DataTableHeaderCell>
                      </DataTableRow>
                    </DataTableHeader>
                    <DataTableBody className="divide-ui-bg">
                      {filteredTools.map((tool) => (
                        <TargetToolRow
                          key={tool.id}
                          tool={tool}
                          runtimeLabel={toolRuntimeLabel(tool, t)}
                          capabilityLabel={toolCapabilityLabel(tool, t)}
                          capability={toolCapability(tool)}
                          canEditTools={canEditTools}
                          pendingToolId={pendingToolId}
                          onConfigure={openConfigure}
                          onTargetInsightsAction={openTargetInsightsAction}
                          onToggleTool={(nextTool, enabled) => void toggleTool(nextTool, enabled)}
                        />
                      ))}
                    </DataTableBody>
                  </DataTable>
                </DataTableFrame>
              </CollectionState>
            </div>
          </section>
        </>
      ) : null}

      {editingTool?.id === 'target_insights' && targetInsightsAction === 'files' && (
        <TargetInsightsDialog workspaceId={subject.workspaceId} targetId={subject.id} tool={editingTool} canEdit={canEditSelectedTool} savingTool={saving} onClose={closeConfigure} />
      )}

      {editingTool?.id === 'target_insights' && targetInsightsAction === 'settings' && (
        <TargetInsightsSettingsDialog
          workspaceId={subject.workspaceId}
          targetId={subject.id}
          tool={editingTool}
          canEdit={canEditSelectedTool}
          savingTool={saving}
          onClose={closeConfigure}
          onToolUpdated={(updatedTool) => {
            setCatalog((current) => current ? {
              ...current,
              items: current.items.map((item) => item.id === updatedTool.id ? updatedTool : item)
            } : current);
            setEditingTool(updatedTool);
          }}
        />
      )}

      {editingTool?.id === 'target_insights' && targetInsightsAction === 'activity' && (
        <TargetInsightsActivityDialog
          workspaceId={subject.workspaceId}
          targetId={subject.id}
          targetType={subject.targetType}
          tool={editingTool}
          onClose={closeConfigure}
        />
      )}

      {editingTool?.id === 'target_insights' && targetInsightsAction === 'reset' && (
        <TargetInsightsResetDialog workspaceId={subject.workspaceId} targetId={subject.id} tool={editingTool} canEdit={canEditSelectedTool} onClose={closeConfigure} />
      )}

      {editingTool && editingTool.id !== 'target_insights' && draft && (
        <DialogFrame unframed
          className="w-full max-w-2xl rounded-2xl border border-ui-border bg-ui-surface p-0 shadow-2xl"
          titleId="target-tool-config-title"
          closeDisabled={saving}
          onClose={closeConfigure}
        >
          <div className="border-b border-ui-border px-6 py-5">
            <h2 id="target-tool-config-title" className="type-section-title">
              {t(canEditSelectedTool ? 'tools.configureTitle' : 'tools.viewTitle', { tool: editingTool.label })}
            </h2>
            <p className="type-caption mt-1 text-ui-text-muted">
              {editingTool.description}
            </p>
            <p className="type-caption mt-2 text-ui-text-muted">
              {t(toolRuntimeKind(editingTool) === 'provider_native'
                ? 'tools.runtimeProviderNativeHelp'
                : 'tools.runtimeFunctionHelp')}
            </p>
          </div>
          <div className="space-y-5 px-6 py-5">
            {dialogError && (
              <div className="type-caption rounded-lg border border-status-danger/25 bg-status-danger-soft px-4 py-3 text-status-danger-text">
                {dialogError}
              </div>
            )}

            {editingTool.id === 'http.fetch.get' ? (
              <section className="space-y-3">
                <div>
                  <h3 className="type-row-title">Allowed URL patterns</h3>
                  <p className="type-caption mt-1 text-ui-text-muted">Enter one complete HTTPS URL pattern per line. Wildcards are allowed only in the path or query.</p>
                </div>
                <Textarea
                  id="tool-allowed-url-patterns"
                  rows={8}
                  className={toolDomainTextareaClassName}
                  value={draft.allowedUrlPatternsText}
                  disabled={saving}
                  readOnly={!canEditSelectedTool}
                  placeholder={'https://status.example.com/api/*\nhttps://api.example.com/v1/health'}
                  onChange={(event) => {
                    if (!canEditSelectedTool) return;
                    setDraft((current) => current ? { ...current, allowedUrlPatternsText: event.target.value } : current);
                    setValidationError(null);
                    setSavingError(null);
                  }}
                />
              </section>
            ) : (
            <section className="space-y-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="type-row-title">{t('tools.domainFilters')}</h3>
                  <p className="type-caption mt-1 text-ui-text-muted">{t('tools.domainFiltersHelp')}</p>
                  <p className="type-caption mt-1 text-ui-text-muted">{t('tools.domainFormatHelp')}</p>
                </div>
                {dialogDomainSummary && (
                  <CollectionResultSummary>
                    {dialogDomainSummary}
                  </CollectionResultSummary>
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="tool-allowed-domains" className="type-label">{t('tools.allowedDomains')}</label>
                  <p className="type-caption mt-1 text-ui-text-muted">{t('tools.allowedDomainsHelp')}</p>
                  <Textarea
                    id="tool-allowed-domains"
                    rows={6}
                    className={toolDomainTextareaClassName}
                    value={draft.allowedDomainsText}
                    disabled={saving}
                    readOnly={!canEditSelectedTool}
                    placeholder={t('tools.allowedDomainsPlaceholder')}
                    onChange={(event) => {
                      if (!canEditSelectedTool) return;
                      setDraft((current) => current ? { ...current, allowedDomainsText: event.target.value } : current);
                      setValidationError(null);
                      setSavingError(null);
                    }}
                  />
                </div>
                <div>
                  <label htmlFor="tool-blocked-domains" className="type-label">{t('tools.blockedDomains')}</label>
                  <p className="type-caption mt-1 text-ui-text-muted">{t('tools.blockedDomainsHelp')}</p>
                  <Textarea
                    id="tool-blocked-domains"
                    rows={6}
                    className={toolDomainTextareaClassName}
                    value={draft.blockedDomainsText}
                    disabled={saving}
                    readOnly={!canEditSelectedTool}
                    placeholder={t('tools.blockedDomainsPlaceholder')}
                    onChange={(event) => {
                      if (!canEditSelectedTool) return;
                      setDraft((current) => current ? { ...current, blockedDomainsText: event.target.value } : current);
                      setValidationError(null);
                      setSavingError(null);
                    }}
                  />
                </div>
              </div>
            </section>
            )}
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-ui-border px-6 py-4">
            {canEditSelectedTool ? (
              <>
                <Button variant="tertiary" onClick={closeConfigure} disabled={saving}>
                  {t('common.cancel')}
                </Button>
                <Button variant="primary" onClick={() => void saveTool()} disabled={saving || Boolean(draftRequest.error)}>
                  {saving ? t('tools.saving') : t('tools.save')}
                </Button>
              </>
            ) : (
              <Button variant="secondary" onClick={closeConfigure}>
                {t('common.close')}
              </Button>
            )}
          </div>
        </DialogFrame>
      )}
    </PageShell>
  );
};
