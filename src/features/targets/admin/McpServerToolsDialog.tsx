import React from 'react';
import { motion } from 'framer-motion';
import { SlidersHorizontal, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { Switch } from '@/components/common/FormControls';
import { InlineLoadingIndicator } from '@/components/common/Loading';
import type { TargetToolCatalogItem, TargetToolCatalogServer } from '@/features/targets/admin/targetMcpCatalogTypes';
import { getToolLabel, isManagedMcpServer } from '@/features/targets/admin/mcpServersCatalog';
import { modalOverlayMotion, modalPanelMotion } from '@/lib/motion';

export const McpServerToolsDialog: React.FC<{
  server: TargetToolCatalogServer;
  canManageTools: boolean;
  pendingToolName: string | null;
  isLoadingTools?: boolean;
  isLoadingMoreTools?: boolean;
  toolsError?: string | null;
  hasMoreTools?: boolean;
  onClose: () => void;
  onToggleTool: (tool: TargetToolCatalogItem, enabled: boolean) => void | Promise<void>;
  onLoadMoreTools?: () => void;
}> = ({
  server,
  canManageTools,
  pendingToolName,
  isLoadingTools = false,
  isLoadingMoreTools = false,
  toolsError = null,
  hasMoreTools = false,
  onClose,
  onToggleTool,
  onLoadMoreTools
}) => {
  const { t } = useTranslation();
  const loadMoreToolsRef = React.useRef<HTMLDivElement>(null);
  const [configuredOverrides, setConfiguredOverrides] = React.useState<Record<string, boolean>>({});
  const [isSavingTools, setIsSavingTools] = React.useState(false);
  const isManagedServer = isManagedMcpServer(server);
  const serverSubtitle = isManagedServer ? t('mcpServers.managedByAcornOps') : server.url;

  React.useEffect(() => {
    setConfiguredOverrides({});
  }, [server.id]);

  React.useEffect(() => {
    const target = loadMoreToolsRef.current;
    if (!target || !hasMoreTools || !onLoadMoreTools) return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting) && !isLoadingTools && !isLoadingMoreTools) {
        onLoadMoreTools();
      }
    }, { rootMargin: '240px' });
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMoreTools, isLoadingMoreTools, isLoadingTools, onLoadMoreTools]);

  const getConfiguredEnabled = React.useCallback((tool: TargetToolCatalogItem) => (
    configuredOverrides[tool.name] ?? tool.enabledConfigured
  ), [configuredOverrides]);

  const changedTools = React.useMemo(() => (
    server.tools.filter((tool) => configuredOverrides[tool.name] !== undefined && configuredOverrides[tool.name] !== tool.enabledConfigured)
  ), [configuredOverrides, server.tools]);

  const readTools = server.tools.filter((tool) => tool.capability === 'read');
  const writeTools = server.tools.filter((tool) => tool.capability === 'write');
  const getSectionBlockReason = (tools: TargetToolCatalogItem[]) => {
    const configuredTools = tools.filter((tool) => getConfiguredEnabled(tool));
    const blockedTools = configuredTools.filter((tool) => tool.effectiveDisabledReason);
    if (configuredTools.length === 0 || blockedTools.length !== configuredTools.length) return null;
    const reason = blockedTools[0]?.effectiveDisabledReason;
    return reason && blockedTools.every((tool) => tool.effectiveDisabledReason === reason) ? reason : null;
  };
  const globalBlockReason = getSectionBlockReason(server.tools);

  const handleSaveTools = async () => {
    if (!canManageTools || changedTools.length === 0 || isSavingTools) return;
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
            <p className="type-caption mt-0.5 text-status-warning-text">{t('mcpServers.approvalRequired')}</p>
          )}
        </div>
        <Switch
          checked={configuredEnabled}
          disabled={!canManageTools || pending}
          onCheckedChange={(enabled) => setConfiguredOverrides((current) => ({ ...current, [tool.name]: enabled }))}
          label={t(configuredEnabled ? 'mcpServers.disableToolNamed' : 'mcpServers.enableToolNamed', { name: getToolLabel(tool) })}
        />
      </div>
    );
  };

  const renderToolSection = (title: string, subtitle: string, tools: TargetToolCatalogItem[]) => {
    const blockReason = globalBlockReason ? null : getSectionBlockReason(tools);
    const isBlocked = Boolean(globalBlockReason || blockReason);
    return (
      <section className={`overflow-hidden rounded-lg border border-ui-border bg-ui-surface ${isBlocked ? 'opacity-70' : ''}`}>
        <div className="flex items-center justify-between gap-3 border-b border-ui-border bg-ui-bg px-4 py-3">
          <div className="min-w-0">
            <h3 className="type-row-title">{title}</h3>
            <p className="type-caption text-ui-text-muted">{subtitle}</p>
            {blockReason && (
              <p className="type-caption mt-1 text-status-warning-text">
                {t(blockReason === 'server_disabled' ? 'mcpServers.toolBlockedServerDisabled' : 'mcpServers.toolBlockedAgentWriteDisabled')}
              </p>
            )}
          </div>
          <span className="type-micro-label rounded-full bg-ui-surface px-2 py-1 text-ui-text-muted">{tools.length}</span>
        </div>
        {tools.length > 0 ? tools.map(renderToolRow) : (
          <p className="type-caption px-4 py-4 text-ui-text-muted">{t('mcpServers.noToolsInSection')}</p>
        )}
      </section>
    );
  };

  return (
    <motion.div {...modalOverlayMotion} className="fixed inset-0 z-50 flex items-center justify-center bg-ui-text/45 p-4 dark:bg-ui-bg/75" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <motion.div {...modalPanelMotion} role="dialog" aria-modal="true" aria-labelledby="mcp-server-tools-title" className="relative flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-ui-border bg-ui-bg px-6 py-5">
          <div className="min-w-0">
            <div className="type-micro-label mb-2 flex items-center gap-2 text-ui-text-muted">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {t('mcpServers.configureTools')}
            </div>
            <h2 id="mcp-server-tools-title" className="type-section-title truncate" title={server.name}>{server.name}</h2>
            <p className={isManagedServer ? 'type-caption mt-1 text-ui-text-muted' : 'type-code mt-1 truncate text-ui-text-muted'} title={serverSubtitle}>
              {serverSubtitle}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-ui-text-muted transition-colors hover:bg-ui-surface hover:text-accent-strong" aria-label={t('mcpServers.closeTools')}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 custom-scrollbar">
          {toolsError && (
            <div className="type-caption mb-3 rounded-lg border border-status-danger/25 bg-status-danger-soft px-4 py-3 text-status-danger-text">{toolsError}</div>
          )}
          {isLoadingTools ? (
            <InlineLoadingIndicator label={t('mcpServers.loadingTools')} className="bg-ui-bg text-xs" />
          ) : server.tools.length === 0 ? (
            <div className="type-caption rounded-lg border border-ui-border bg-ui-bg px-4 py-3">{t('mcpServers.noToolsDiscovered')}</div>
          ) : (
            <div className="space-y-4">
              {globalBlockReason && (
                <div className="type-caption rounded-lg border border-status-warning/25 bg-status-warning-soft px-4 py-3 text-status-warning-text">
                  {t(globalBlockReason === 'server_disabled' ? 'mcpServers.toolBlockedServerDisabled' : 'mcpServers.toolBlockedAgentWriteDisabled')}
                </div>
              )}
              <section className="overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm">
                <div className="grid grid-cols-1 divide-y divide-ui-border md:grid-cols-[minmax(15rem,1.35fr)_repeat(4,minmax(7rem,1fr))] md:divide-x md:divide-y-0">
                  <div className="px-5 py-3.5">
                    <h3 className="type-row-title">{t('mcpServers.toolAccessSummaryTitle')}</h3>
                    <p className="type-caption mt-1 text-ui-text-muted">{t('mcpServers.toolAccessSummaryBody')}</p>
                  </div>
                  <div className="px-5 py-3.5">
                    <p className="type-caption text-ui-text-muted">{t('mcpServers.totalTools')}</p>
                    <p className="mt-0.5 text-xl font-semibold tracking-tight text-ui-text">{server.toolCounts.total}</p>
                  </div>
                  <div className="px-5 py-3.5">
                    <p className="type-caption text-ui-text-muted">{t('mcpServers.enabledToolsMetric')}</p>
                    <p className="mt-0.5 text-xl font-semibold tracking-tight text-ui-text">{server.toolCounts.enabledEffective}</p>
                  </div>
                  <div className="px-5 py-3.5">
                    <p className="type-caption text-ui-text-muted">{t('mcpServers.readOnlyTools')}</p>
                    <p className="mt-0.5 inline-flex items-center gap-2 text-xl font-semibold tracking-tight text-ui-text">
                      {server.toolCounts.total - server.toolCounts.writeConfigured}
                      <span className="h-2 w-2 rounded-full bg-status-success" />
                    </p>
                  </div>
                  <div className="px-5 py-3.5">
                    <p className="type-caption text-ui-text-muted">{t('mcpServers.writeCapableTools')}</p>
                    <p className="mt-0.5 inline-flex items-center gap-2 text-xl font-semibold tracking-tight text-ui-text">
                      {server.toolCounts.writeConfigured}
                      <span className="h-2 w-2 rounded-full bg-status-warning" />
                    </p>
                  </div>
                </div>
              </section>
              {renderToolSection(t('mcpServers.readOnlySection'), t('mcpServers.readOnlySectionHelp'), readTools)}
              {renderToolSection(t('mcpServers.writeSection'), t('mcpServers.writeSectionHelp'), writeTools)}
              <div ref={loadMoreToolsRef}>
                {hasMoreTools && (
                  <button type="button" onClick={onLoadMoreTools} disabled={isLoadingMoreTools} className="type-label w-full rounded-lg border border-ui-border bg-ui-bg px-4 py-2 text-ui-text-muted transition-colors hover:text-accent-strong disabled:cursor-not-allowed disabled:opacity-60">
                    {isLoadingMoreTools ? t('mcpServers.loadingTools') : t('common.loadMore')}
                  </button>
                )}
              </div>
            </div>
          )}

          {!canManageTools && (
            <div className="type-caption mt-5 rounded-lg border border-ui-border bg-ui-bg px-4 py-3">{t('mcpServers.manageToolsNoAccess')}</div>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-ui-border bg-ui-bg px-6 py-4">
          <button type="button" onClick={() => setConfiguredOverrides({})} disabled={isSavingTools || changedTools.length === 0} className="type-label text-ui-text-muted transition-colors hover:text-accent-strong disabled:cursor-not-allowed disabled:opacity-50">
            {t('mcpServers.resetChanges')}
          </button>
          <div className="flex items-center gap-3">
            <Button onClick={onClose} disabled={isSavingTools} variant="secondary" size="sm">{t('app.cancel')}</Button>
            <Button onClick={() => void handleSaveTools()} disabled={!canManageTools || isSavingTools || changedTools.length === 0} variant="primary" size="sm">
              {isSavingTools ? t('mcpServers.saving') : t('mcpServers.saveChanges')}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
