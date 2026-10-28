import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@acornops/ui';
import { CollectionState } from '@acornops/ui';
import { CloseButton } from '@acornops/ui';
import { Switch } from '@acornops/ui';
import { CollectionLoadingSkeleton } from '@acornops/ui';
import { DialogFrame } from '@acornops/ui';
import { CollectionResultSummary, TextInput } from '@acornops/ui';
import type { TargetToolCatalogItem, TargetToolCatalogServer } from '@/features/targets/admin/targetMcpCatalogTypes';
import { getToolLabel, isManagedMcpServer } from '@/features/targets/admin/mcpServersCatalog';

export const getBulkConfiguredOverrides = (
  tools: TargetToolCatalogItem[],
  enabled: boolean
): Record<string, boolean> => Object.fromEntries(tools.map((tool) => [tool.name, enabled]));

export const McpServerToolsDialog: React.FC<{
  server: TargetToolCatalogServer;
  canManageTools: boolean;
  canDisableTools?: boolean;
  pendingToolName: string | null;
  isLoadingTools?: boolean;
  isLoadingMoreTools?: boolean;
  toolsError?: string | null;
  hasMoreTools?: boolean;
  loadMoreSentinelRef?: React.RefCallback<HTMLElement>;
  onClose: () => void;
  onToggleTool: (tool: TargetToolCatalogItem, enabled: boolean) => void | Promise<void>;
  onLoadAllTools?: () => Promise<TargetToolCatalogItem[]>;
  onLoadMoreTools?: () => void;
}> = ({
  server,
  canManageTools,
  canDisableTools = canManageTools,
  pendingToolName,
  isLoadingTools = false,
  isLoadingMoreTools = false,
  toolsError = null,
  hasMoreTools = false,
  loadMoreSentinelRef,
  onClose,
  onToggleTool,
  onLoadAllTools,
  onLoadMoreTools
}) => {
  const { t } = useTranslation();
  const [configuredOverrides, setConfiguredOverrides] = React.useState<Record<string, boolean>>({});
  const [bulkLoadedTools, setBulkLoadedTools] = React.useState<TargetToolCatalogItem[]>([]);
  const [bulkLoadingCapability, setBulkLoadingCapability] = React.useState<'read' | 'write' | null>(null);
  const [isSavingTools, setIsSavingTools] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [isLoadingFilterTools, setIsLoadingFilterTools] = React.useState(false);
  const [filterLoadFailed, setFilterLoadFailed] = React.useState(false);
  const filterRequestScope = React.useRef(0);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const searchId = React.useId();
  const hasActiveFilters = Boolean(query.trim());
  const isManagedServer = isManagedMcpServer(server);
  const serverSubtitle = isManagedServer ? t('common.providedByAcornOps') : server.url;
  const toolsPhase = isLoadingTools
    ? 'loading'
    : toolsError
      ? 'error'
      : isLoadingMoreTools
        ? 'loadingMore'
        : 'ready';

  React.useEffect(() => {
    setConfiguredOverrides({});
    setBulkLoadedTools([]);
    setBulkLoadingCapability(null);
    setQuery('');
    setIsLoadingFilterTools(false);
    setFilterLoadFailed(false);
    return () => { filterRequestScope.current += 1; };
  }, [server.id]);

  React.useEffect(() => {
    if (!hasActiveFilters || !hasMoreTools || !onLoadAllTools || isLoadingTools || isLoadingMoreTools || isLoadingFilterTools || filterLoadFailed || bulkLoadingCapability) return;
    const scope = filterRequestScope.current;
    setIsLoadingFilterTools(true);
    void onLoadAllTools().then((completeTools) => {
      if (scope === filterRequestScope.current) setBulkLoadedTools(completeTools);
    }).catch(() => {
      if (scope === filterRequestScope.current) setFilterLoadFailed(true);
    }).finally(() => {
      if (scope === filterRequestScope.current) setIsLoadingFilterTools(false);
    });
  }, [hasActiveFilters, hasMoreTools, onLoadAllTools, isLoadingTools, isLoadingMoreTools, isLoadingFilterTools, filterLoadFailed, bulkLoadingCapability]);

  const tools = React.useMemo(() => {
    const toolsByName = new Map(server.tools.map((tool) => [tool.name, tool]));
    bulkLoadedTools.forEach((tool) => toolsByName.set(tool.name, tool));
    return [...toolsByName.values()];
  }, [bulkLoadedTools, server.tools]);

  const getConfiguredEnabled = React.useCallback((tool: TargetToolCatalogItem) => (
    configuredOverrides[tool.name] ?? tool.enabledConfigured
  ), [configuredOverrides]);

  const changedTools = React.useMemo(() => (
    tools.filter((tool) => configuredOverrides[tool.name] !== undefined && configuredOverrides[tool.name] !== tool.enabledConfigured)
  ), [configuredOverrides, tools]);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredTools = tools.filter((tool) => (
    !normalizedQuery || `${tool.name} ${getToolLabel(tool)}`.toLowerCase().includes(normalizedQuery)
  ));
  const filtersIncomplete = hasActiveFilters && hasMoreTools;
  const clearFilters = () => {
    setQuery('');
    searchRef.current?.focus();
  };
  const getSectionBlockReason = (tools: TargetToolCatalogItem[]) => {
    const configuredTools = tools.filter((tool) => getConfiguredEnabled(tool));
    const blockedTools = configuredTools.filter((tool) => tool.effectiveDisabledReason);
    if (configuredTools.length === 0 || blockedTools.length !== configuredTools.length) return null;
    const reason = blockedTools[0]?.effectiveDisabledReason;
    return reason && blockedTools.every((tool) => tool.effectiveDisabledReason === reason) ? reason : null;
  };
  const globalBlockReason = getSectionBlockReason(server.tools);
  const blockReasonLabel = (reason: TargetToolCatalogItem['effectiveDisabledReason']) => {
    if (reason === 'server_disabled') return t('mcpServers.toolBlockedServerDisabled');
    if (reason === 'agent_disconnected') return t('mcpServers.toolBlockedAgentDisconnected');
    return t('mcpServers.toolBlockedAgentWriteDisabled');
  };

  const getGroupState = (capability: 'read' | 'write', sectionTools: TargetToolCatalogItem[]) => {
    const total = capability === 'read' ? server.toolCounts.readOnly : server.toolCounts.writeCapable;
    const configuredBase = capability === 'read'
      ? server.toolCounts.enabledConfigured - server.toolCounts.writeConfigured
      : server.toolCounts.writeConfigured;
    const configuredDelta = sectionTools.reduce((delta, tool) => {
      const override = configuredOverrides[tool.name];
      return override === undefined ? delta : delta + Number(override) - Number(tool.enabledConfigured);
    }, 0);
    const configured = configuredBase + configuredDelta;
    return { total, configured, allEnabled: total > 0 && configured === total };
  };

  const handleToggleGroup = async (capability: 'read' | 'write', sectionTools: TargetToolCatalogItem[]) => {
    const nextEnabled = !getGroupState(capability, sectionTools).allEnabled;
    if ((nextEnabled ? !canManageTools : !canDisableTools) || bulkLoadingCapability || isSavingTools) return;
    setBulkLoadingCapability(capability);
    try {
      const completeTools = hasMoreTools && onLoadAllTools ? await onLoadAllTools() : tools;
      const completeSectionTools = completeTools.filter((tool) => tool.capability === capability);
      setBulkLoadedTools(completeTools);
      setConfiguredOverrides((current) => ({
        ...current,
        ...getBulkConfiguredOverrides(completeSectionTools, nextEnabled)
      }));
    } catch {
      // The paged collection owns the visible loading error.
    } finally {
      setBulkLoadingCapability(null);
    }
  };

  const handleSaveTools = async () => {
    const canApplyChanges = changedTools.every((tool) => (
      (configuredOverrides[tool.name] ?? tool.enabledConfigured)
        ? canManageTools
        : canDisableTools
    ));
    if (!canApplyChanges || changedTools.length === 0 || isSavingTools) return;
    setIsSavingTools(true);
    try {
      for (const tool of changedTools) {
        await onToggleTool(tool, configuredOverrides[tool.name] ?? tool.enabledConfigured);
      }
      setConfiguredOverrides({});
      onClose();
    } catch {
      // The parent owns the visible error so it can be shared with paged tool loading failures.
    } finally {
      setIsSavingTools(false);
    }
  };

  const renderToolRow = (tool: TargetToolCatalogItem) => {
    const configuredEnabled = getConfiguredEnabled(tool);
    const pending = pendingToolName === tool.name || isSavingTools;
    const canToggleTool = configuredEnabled ? canDisableTools : canManageTools;
    return (
      <div key={tool.name} className={`grid min-w-0 grid-cols-1 gap-3 border-b border-ui-border px-4 py-3 last:border-b-0 lg:grid-cols-[minmax(18rem,1fr)_8rem_auto] lg:items-center ${tool.capability === 'write' ? 'bg-status-warning-soft/35' : 'bg-ui-surface'}`}>
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h4 className="type-row-title truncate" title={getToolLabel(tool)}>{getToolLabel(tool)}</h4>
          </div>
          <p className="type-code mt-1 truncate text-ui-text-muted" title={tool.name}>{tool.name}</p>
        </div>
        <div className="min-w-0">
          <span className={configuredEnabled ? 'type-label text-ui-text' : 'type-label text-ui-text-muted'}>
            {configuredEnabled ? t('mcpServers.enabled') : t('mcpServers.disabled')}
          </span>
          {tool.capability === 'write' && configuredEnabled && (
            <p className="type-caption mt-0.5 text-status-warning-text">{t('mcpServers.approvalPolicyDependent')}</p>
          )}
        </div>
        <Switch
          checked={configuredEnabled}
          disabled={!canToggleTool || pending}
          onCheckedChange={(enabled) => setConfiguredOverrides((current) => ({ ...current, [tool.name]: enabled }))}
          label={t(configuredEnabled ? 'mcpServers.disableToolNamed' : 'mcpServers.enableToolNamed', { name: getToolLabel(tool) })}
        />
      </div>
    );
  };

  const renderToolSection = (capability: 'read' | 'write', title: string, subtitle: string, sectionTools: TargetToolCatalogItem[]) => {
    const blockReason = globalBlockReason ? null : getSectionBlockReason(sectionTools);
    const isBlocked = Boolean(globalBlockReason || blockReason);
    const groupState = getGroupState(capability, sectionTools);
    const groupPending = bulkLoadingCapability !== null || isLoadingMoreTools || isLoadingFilterTools || isSavingTools;
    const canToggleGroup = groupState.allEnabled ? canDisableTools : canManageTools;
    const groupLabel = t(groupState.allEnabled
      ? capability === 'read' ? 'mcpServers.disableAllReadTools' : 'mcpServers.disableAllWriteTools'
      : capability === 'read' ? 'mcpServers.enableAllReadTools' : 'mcpServers.enableAllWriteTools');
    const visibleTools = filteredTools.filter((tool) => tool.capability === capability);
    return (
      <section data-mcp-tool-capability={capability} className={`overflow-hidden rounded-lg border border-ui-border bg-ui-surface ${isBlocked ? 'opacity-70' : ''}`}>
        <div className="flex items-center justify-between gap-3 border-b border-ui-border bg-ui-bg px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="type-row-title">{title}</h3>
              <span className="type-micro-label rounded-full bg-ui-surface px-2 py-1 text-ui-text-muted">{groupState.total}</span>
            </div>
            <p className="type-caption text-ui-text-muted">{subtitle}</p>
            {blockReason && (
              <p className="type-caption mt-1 text-status-warning-text">
                {blockReasonLabel(blockReason)}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="type-caption text-ui-text-muted">
              {bulkLoadingCapability === capability ? t('mcpServers.loadingAllTools') : t('mcpServers.allToolsCount', { count: groupState.total })}
            </span>
            <Switch
              data-mcp-tool-group-switch={capability}
              checked={groupState.allEnabled}
              disabled={!canToggleGroup || groupState.total === 0 || groupPending}
              aria-busy={bulkLoadingCapability === capability}
              onCheckedChange={() => void handleToggleGroup(capability, sectionTools)}
              label={groupLabel}
            />
          </div>
        </div>
        {visibleTools.map(renderToolRow)}
        {visibleTools.length === 0 && !hasActiveFilters && <p className="type-caption px-4 py-4 text-ui-text-muted">{t('mcpServers.noToolsInSection')}</p>}
      </section>
    );
  };

  return (
    <DialogFrame
      unframed
      titleId="mcp-server-tools-title"
      onClose={onClose}
      overlayClassName="bg-ui-text/45 dark:bg-ui-bg/75"
      className="relative flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-2xl"
    >
        <div className="flex items-start justify-between gap-4 border-b border-ui-border bg-ui-bg px-6 py-5">
          <div className="min-w-0">
            <div className="type-micro-label mb-2 flex items-center gap-2 text-ui-text-muted">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {t('mcpServers.configureTools')}
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h2 id="mcp-server-tools-title" className="type-section-title truncate" title={server.name}>{server.name}</h2>
              {isManagedServer && (
                <span className="type-micro-label shrink-0 rounded-full bg-accent-soft/45 px-2 py-0.5 text-accent-readable">
                  {t('common.providedByAcornOps')}
                </span>
              )}
            </div>
            {!isManagedServer && (
              <p className="type-code mt-1 truncate text-ui-text-muted" title={serverSubtitle}>
                {serverSubtitle}
              </p>
            )}
          </div>
          <CloseButton onClick={onClose} aria-label={t('mcpServers.closeTools')} />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6 custom-scrollbar">
          <CollectionState
            phase={toolsPhase}
            itemCount={server.tools.length}
            loading={<CollectionLoadingSkeleton label={t('mcpServers.loadingTools')} rows={3} className="rounded-lg border border-ui-border bg-ui-bg" />}
            empty={<div className="type-caption rounded-lg border border-ui-border bg-ui-bg px-4 py-3">{t('mcpServers.noToolsDiscovered')}</div>}
            error={<div className="type-caption rounded-lg border border-status-danger/25 bg-status-danger-soft px-4 py-3 text-status-danger-text">{toolsError}</div>}
            feedback={toolsError ? (
              <div className="type-caption mt-3 rounded-lg border border-status-danger/25 bg-status-danger-soft px-4 py-3 text-status-danger-text">{toolsError}</div>
            ) : <span className="sr-only">{t('mcpServers.loadingTools')}</span>}
          >
            <div className="space-y-4">
              {globalBlockReason && (
                <div className="type-caption rounded-lg border border-status-warning/25 bg-status-warning-soft px-4 py-3 text-status-warning-text">
                  {blockReasonLabel(globalBlockReason)}
                </div>
              )}
              <section className="overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm">
                <div className="grid grid-cols-2 divide-y divide-ui-border md:grid-cols-[minmax(15rem,1.35fr)_repeat(4,minmax(7rem,1fr))] md:divide-x md:divide-y-0">
                  <div className="col-span-2 px-4 py-3 md:col-span-1 md:px-5 md:py-3.5">
                    <h3 className="type-row-title">{t('mcpServers.toolAccessSummaryTitle')}</h3>
                    <p className="type-caption mt-1 text-ui-text-muted">{t('mcpServers.toolAccessSummaryBody')}</p>
                  </div>
                  <div className="px-4 py-2 md:px-5 md:py-3.5">
                    <p className="type-caption text-ui-text-muted">{t('mcpServers.totalTools')}</p>
                    <p className="type-data mt-0.5">{server.toolCounts.total}</p>
                  </div>
                  <div className="px-4 py-2 md:px-5 md:py-3.5">
                    <p className="type-caption text-ui-text-muted">{t('mcpServers.enabledToolsMetric')}</p>
                    <p className="type-data mt-0.5">{server.toolCounts.enabledEffective}</p>
                  </div>
                  <div className="px-4 py-2 md:px-5 md:py-3.5">
                    <p className="type-caption text-ui-text-muted">{t('mcpServers.readOnlyTools')}</p>
                    <p data-mcp-read-only-count="true" className="type-data mt-0.5 inline-flex items-center gap-2">
                      {server.toolCounts.readOnly}
                      <span className="h-2 w-2 rounded-full bg-status-success" />
                    </p>
                  </div>
                  <div className="px-4 py-2 md:px-5 md:py-3.5">
                    <p className="type-caption text-ui-text-muted">{t('mcpServers.writeCapableTools')}</p>
                    <p data-mcp-write-capable-count="true" className="type-data mt-0.5 inline-flex items-center gap-2">
                      {server.toolCounts.writeCapable}
                      <span className="h-2 w-2 rounded-full bg-status-warning" />
                    </p>
                  </div>
                </div>
              </section>
              <div className="space-y-3">
                <label className="block" htmlFor={searchId}>
                  <span className="type-caption type-emphasis">{t('mcpServers.searchTools')}</span>
                  <TextInput ref={searchRef} id={searchId} type="search" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape' && query) { event.stopPropagation(); setQuery(''); } }} className="mt-1" />
                </label>
                <p className="type-caption text-ui-text-muted">{t('mcpServers.toolFilterScope')}</p>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CollectionResultSummary>{filtersIncomplete
                    ? t(filterLoadFailed || !onLoadAllTools ? 'mcpServers.toolFilterIncomplete' : 'mcpServers.loadingToolsForFilters')
                    : t('mcpServers.showingTools', { count: filteredTools.length, total: server.toolCounts.total })}</CollectionResultSummary>
                  {hasActiveFilters && <Button type="button" variant="tertiary" size="sm" onClick={clearFilters}>{t('mcpServers.clearToolFilters')}</Button>}
                  {filtersIncomplete && filterLoadFailed && <Button type="button" variant="secondary" size="sm" onClick={() => setFilterLoadFailed(false)}>{t('mcpServers.retryToolFilters')}</Button>}
                </div>
              </div>
              {hasActiveFilters && !filtersIncomplete && filteredTools.length === 0 && <p role="status" className="type-caption py-3 text-ui-text-muted">{t('mcpServers.noToolMatches')}</p>}
              {renderToolSection('read', t('mcpServers.readOnlySection'), t('mcpServers.readOnlySectionHelp'), tools.filter((tool) => tool.capability === 'read'))}
              {renderToolSection('write', t('mcpServers.writeSection'), t('mcpServers.writeSectionHelp'), tools.filter((tool) => tool.capability === 'write'))}
              <div ref={hasActiveFilters ? undefined : loadMoreSentinelRef}>
                {hasMoreTools && !hasActiveFilters && (
                  <Button type="button" variant="secondary" size="sm" onClick={onLoadMoreTools} disabled={isLoadingMoreTools} className="w-full">
                    {isLoadingMoreTools ? t('mcpServers.loadingTools') : t('common.loadMore')}
                  </Button>
                )}
              </div>
            </div>
          </CollectionState>

          {!canManageTools && !canDisableTools && (
            <div className="type-caption mt-5 rounded-lg border border-ui-border bg-ui-bg px-4 py-3">{t('mcpServers.manageToolsNoAccess')}</div>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-ui-border bg-ui-bg px-6 py-4">
          <Button type="button" variant="tertiary" onClick={() => setConfiguredOverrides({})} disabled={isSavingTools || changedTools.length === 0} className="control-target type-ui text-ui-text-muted transition-colors hover:text-accent-strong disabled:cursor-not-allowed disabled:opacity-50">
            {t('mcpServers.resetChanges')}
          </Button>
          <div className="flex items-center gap-3">
            <Button onClick={onClose} disabled={isSavingTools} variant="secondary" size="sm">{t('app.cancel')}</Button>
            <Button onClick={() => void handleSaveTools()} disabled={isSavingTools || changedTools.length === 0 || changedTools.some((tool) => (
              (configuredOverrides[tool.name] ?? tool.enabledConfigured) ? !canManageTools : !canDisableTools
            ))} variant="primary" size="sm">
              {isSavingTools ? t('mcpServers.saving') : t('mcpServers.saveChanges')}
            </Button>
          </div>
        </div>
    </DialogFrame>
  );
};
