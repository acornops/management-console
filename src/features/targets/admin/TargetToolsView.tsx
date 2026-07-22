import React from 'react';
import { Search, Wrench } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { Dialog } from '@/components/common/Dialog';
import { EmptyState } from '@/components/common/EmptyState';
import { DataTableStateRow } from '@/components/common/DataTable';
import { InlineLoadingIndicator } from '@/components/common/Loading';
import { Select } from '@/components/common/Select';
import type { SelectOption } from '@/components/common/Select';
import { formInputClassName, formTextareaClassName } from '@/components/common/formControlStyles';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import type {
  ControlPlaneTargetToolItem,
  ControlPlaneTargetToolsCatalog
} from '@/services/controlPlaneApi';
import type { TargetDescriptor } from '@/features/targets/targetDescriptor';
import { TargetInsightsActivityDialog } from '@/features/targets/admin/TargetInsightsActivityDialog';
import { TargetInsightsDialog } from '@/features/targets/admin/TargetInsightsDialog';
import { TargetInsightsResetDialog } from '@/features/targets/admin/TargetInsightsResetDialog';
import { TargetInsightsSettingsDialog } from '@/features/targets/admin/TargetInsightsSettingsDialog';
import { TargetToolRow } from '@/features/targets/admin/TargetToolRow';
import { formatError } from '@/features/targets/admin/targetSkillsViewModel';

interface TargetToolsViewProps {
  target: TargetDescriptor;
  canManageTools?: boolean;
  initialCatalog?: ControlPlaneTargetToolsCatalog | null;
  onCatalogChange?: (catalog: ControlPlaneTargetToolsCatalog) => void;
}

interface ToolDraft {
  enabled: boolean;
  allowedDomainsText: string;
  blockedDomainsText: string;
}

type TargetInsightsAction = 'files' | 'settings' | 'activity' | 'reset';

const toolSearchInputClassName = formInputClassName('py-3 pl-11 pr-4 font-normal');
const toolDomainTextareaClassName = formTextareaClassName('mt-2');

function splitDomainInput(value: string): string[] {
  return value
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeDomain(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!normalized) throw new Error('empty');
  if (
    normalized.includes('://') ||
    normalized.includes('/') ||
    normalized.includes('\\') ||
    normalized.includes(':') ||
    normalized.includes('*') ||
    normalized.includes('?') ||
    normalized.includes('#')
  ) {
    throw new Error('invalid');
  }
  if (normalized.length > 253) throw new Error('invalid');
  const labels = normalized.split('.');
  if (labels.length < 2 || labels.some((label) => !label)) throw new Error('invalid');
  for (const label of labels) {
    if (label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)) {
      throw new Error('invalid');
    }
  }
  return normalized;
}

function parseDomainList(value: string, label: string, t: (key: string, options?: Record<string, unknown>) => string): string[] {
  const seen = new Set<string>();
  return splitDomainInput(value).map((entry) => {
    let normalized: string;
    try {
      normalized = normalizeDomain(entry);
    } catch {
      throw new Error(t('tools.validation.invalidDomain', { label, domain: entry }));
    }
    if (seen.has(normalized)) {
      throw new Error(t('tools.validation.duplicateDomain', { label, domain: normalized }));
    }
    seen.add(normalized);
    return normalized;
  });
}

function getDomainFilters(tool: ControlPlaneTargetToolItem) {
  return {
    allowedDomains: tool.config?.domainFilters?.allowedDomains || [],
    blockedDomains: tool.config?.domainFilters?.blockedDomains || []
  };
}

function draftFromTool(tool: ControlPlaneTargetToolItem): ToolDraft {
  const domainFilters = getDomainFilters(tool);
  return {
    enabled: tool.enabled,
    allowedDomainsText: domainFilters.allowedDomains.join('\n'),
    blockedDomainsText: domainFilters.blockedDomains.join('\n')
  };
}

function summarizeDomainFilters(tool: ControlPlaneTargetToolItem, t: (key: string, options?: Record<string, unknown>) => string): string {
  const domainFilters = getDomainFilters(tool);
  const allowed = domainFilters.allowedDomains.length;
  const blocked = domainFilters.blockedDomains.length;
  if (allowed === 0 && blocked === 0) return t('tools.domainSummaryAllDomains');
  if (allowed > 0 && blocked > 0) return t('tools.domainSummaryAllowedBlocked', { allowed, blocked });
  if (allowed > 0) return t('tools.domainSummaryAllowedOnly', { count: allowed });
  return t('tools.domainSummaryBlockedOnly', { count: blocked });
}

function summarizeToolConfig(tool: ControlPlaneTargetToolItem, t: (key: string, options?: Record<string, unknown>) => string): string {
  if (tool.origin === 'platform_native') return t('tools.platformNativeSummary');
  if (tool.id !== 'target_insights') return summarizeDomainFilters(tool, t);
  if (tool.readiness && !tool.readiness.learningAvailable) return 'Learning paused';
  const maxSnippets = tool.config.retrieval?.maxSnippetsPerRetrieval || 4;
  return `Retrieves up to ${maxSnippets} snippets`;
}

function toolRuntimeKind(tool: ControlPlaneTargetToolItem): 'provider_native' | 'function' {
  return tool.runtimeKind || 'function';
}

function toolRuntimeLabel(tool: ControlPlaneTargetToolItem, t: (key: string) => string): string {
  return t(toolRuntimeKind(tool) === 'provider_native' ? 'tools.runtimeProviderNative' : 'tools.runtimeFunction');
}

function toolCapability(tool: ControlPlaneTargetToolItem): 'read' | 'write' {
  return tool.capability === 'write' ? 'write' : 'read';
}

function toolCapabilityLabel(tool: ControlPlaneTargetToolItem, t: (key: string) => string): string {
  return t(toolCapability(tool) === 'write' ? 'tools.capabilityWrite' : 'tools.capabilityRead');
}

export const TargetToolsView: React.FC<TargetToolsViewProps> = ({
  target,
  canManageTools = false,
  initialCatalog = null,
  onCatalogChange
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
      assistantVisible: items.filter((tool) => tool.enabled && tool.visibility?.appearsInAssistantToolList).length
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

  const loadCatalog = React.useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      setCatalog(await controlPlaneApi.listTargetTools(target.workspaceId, target.id));
    } catch (error) {
      setCatalogError(formatError(error, t('tools.loadFailed'), 'targetTools'));
    } finally {
      setCatalogLoading(false);
    }
  }, [target.id, target.workspaceId, t]);

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
      const text = await controlPlaneApi.exportTargetInsights(target.workspaceId, target.id);
      const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${tool.id}-${target.id}.md`;
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
  }, [draft, t]);

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
      const updated = await controlPlaneApi.updateTargetTool(
        target.workspaceId,
        target.id,
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
      const updated = await controlPlaneApi.updateTargetTool(
        target.workspaceId,
        target.id,
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
    <div className="min-h-0 flex-1 overflow-y-auto bg-ui-bg px-4 py-6 custom-scrollbar stable-scrollbar-gutter sm:px-6 lg:px-10 lg:py-8">
      <header className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="type-route-title">{t('tools.title')}</h1>
          <p className="type-body mt-2">
            {t('tools.description', { name: target.name })}
          </p>
        </div>
        {showPermissionNotice && (
          <p className="type-caption lg:max-w-xs">
            {catalog?.permissions?.editableRoles?.length
              ? t('tools.manageNoAccessWithRoles', { roles: catalog.permissions.editableRoles.join(', ') })
              : t('tools.manageNoAccess')}
          </p>
        )}
      </header>

      {catalogError && (
        <div className="type-caption mb-5 rounded-xl border border-status-danger/25 bg-status-danger-soft px-4 py-3 text-status-danger-text">
          {catalogError}
        </div>
      )}

      {catalogLoading && !catalog && (
        <InlineLoadingIndicator label={t('tools.loading')} className="mb-5" />
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
                <p className="mt-0.5 text-xl font-semibold tracking-tight text-ui-text">{toolSummary.total}</p>
              </div>
              <div className="border-b border-ui-border px-5 py-3.5 sm:border-r xl:border-b-0">
                <p className="type-caption text-ui-text-muted">{t('tools.enabledToolsMetric')}</p>
                <p className="mt-0.5 text-xl font-semibold tracking-tight text-ui-text">{toolSummary.enabled}</p>
              </div>
              <div className="border-b border-r border-ui-border px-5 py-3.5 sm:border-r xl:border-b-0">
                <p className="type-caption text-ui-text-muted">{t('tools.readOnlyTools')}</p>
                <p className="mt-0.5 inline-flex items-center gap-2 text-xl font-semibold tracking-tight text-ui-text">
                  {toolSummary.read}
                  <span className="h-2 w-2 rounded-full bg-status-success" />
                </p>
              </div>
              <div className="border-r border-ui-border px-5 py-3.5 sm:border-r">
                <p className="type-caption text-ui-text-muted">{t('tools.writeCapableTools')}</p>
                <p className="mt-0.5 inline-flex items-center gap-2 text-xl font-semibold tracking-tight text-ui-text">
                  {toolSummary.write}
                  <span className="h-2 w-2 rounded-full bg-status-warning" />
                </p>
              </div>
              <div className="px-5 py-3.5">
                <p className="type-caption text-ui-text-muted">{t('tools.assistantVisibleTools')}</p>
                <p className="mt-0.5 text-xl font-semibold tracking-tight text-ui-text">{toolSummary.assistantVisible}</p>
              </div>
            </div>
          </section>

          <section data-target-tools-list="true" className="overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm">
            <div className="grid gap-4 border-b border-ui-border px-6 py-6 sm:px-8 xl:grid-cols-[minmax(0,1fr)_12rem_9.5rem] xl:items-center">
              <div className="relative min-w-0">
                <label htmlFor="target-tool-search" className="sr-only">{t('tools.searchTools')}</label>
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-text-muted" aria-hidden="true" />
                <input
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
              <span className="type-label flex h-11 items-center justify-center whitespace-nowrap rounded-full border border-ui-border bg-ui-bg px-3 text-ui-text-muted">
                {t('tools.showingTools', { count: filteredTools.length, total: catalog.items.length })}
              </span>
            </div>
            <div className="min-w-0">
              <table className="w-full table-fixed text-left" aria-label={t('tools.title')}>
                <caption className="sr-only">{t('tools.title')}</caption>
                <colgroup>
                  <col className="w-[34%]" />
                  <col className="w-[23%]" />
                  <col className="w-[11%]" />
                  <col className="w-[21%]" />
                  <col className="w-[11%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-ui-border">
                    <th scope="col" className="type-label px-4 py-5 sm:px-6 lg:px-8">{t('tools.toolColumn')}</th>
                    <th scope="col" className="type-label px-4 py-5 sm:px-6 lg:px-8">{t('tools.capabilityColumn')}</th>
                    <th scope="col" className="type-label px-4 py-5 sm:px-6 lg:px-8">{t('tools.enabledColumn')}</th>
                    <th scope="col" className="type-label hidden px-4 py-5 sm:px-6 md:table-cell lg:px-8">{t('tools.runtimeColumn')}</th>
                    <th scope="col" className="type-label px-4 py-5 text-right sm:px-6 lg:px-8">{t('tools.actionsColumn')}</th>
                  </tr>
                </thead>
                <tbody>
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
                  <DataTableStateRow
                    columns={5}
                    phase="ready"
                    itemCount={filteredTools.length}
                    filtered={catalog.items.length > 0}
                    loading={null}
                    empty={<EmptyState embedded headingLevel={3} icon={<Wrench />} title={t('tools.empty')} description={t('tools.emptyHelp')} />}
                    filteredEmpty={<EmptyState embedded headingLevel={3} icon={<Search />} title={t('tools.noToolMatches')} description={t('tools.noToolMatchesHelp')} />}
                    error={null}
                  />
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}

      {editingTool?.id === 'target_insights' && targetInsightsAction === 'files' && (
        <TargetInsightsDialog workspaceId={target.workspaceId} targetId={target.id} tool={editingTool} canEdit={canEditSelectedTool} savingTool={saving} onClose={closeConfigure} />
      )}

      {editingTool?.id === 'target_insights' && targetInsightsAction === 'settings' && (
        <TargetInsightsSettingsDialog
          workspaceId={target.workspaceId}
          targetId={target.id}
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
        <TargetInsightsActivityDialog workspaceId={target.workspaceId} targetId={target.id} tool={editingTool} onClose={closeConfigure} />
      )}

      {editingTool?.id === 'target_insights' && targetInsightsAction === 'reset' && (
        <TargetInsightsResetDialog workspaceId={target.workspaceId} targetId={target.id} tool={editingTool} canEdit={canEditSelectedTool} onClose={closeConfigure} />
      )}

      {editingTool && editingTool.id !== 'target_insights' && draft && (
        <Dialog
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

            <section className="space-y-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="type-row-title">{t('tools.domainFilters')}</h3>
                  <p className="type-caption mt-1 text-ui-text-muted">{t('tools.domainFiltersHelp')}</p>
                  <p className="type-caption mt-1 text-ui-text-muted">{t('tools.domainFormatHelp')}</p>
                </div>
                {dialogDomainSummary && (
                  <span className="type-label rounded-full border border-ui-border bg-ui-bg px-3 py-2 text-ui-text-muted">
                    {dialogDomainSummary}
                  </span>
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="tool-allowed-domains" className="type-label">{t('tools.allowedDomains')}</label>
                  <p className="type-caption mt-1 text-ui-text-muted">{t('tools.allowedDomainsHelp')}</p>
                  <textarea
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
                  <textarea
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
        </Dialog>
      )}
    </div>
  );
};
