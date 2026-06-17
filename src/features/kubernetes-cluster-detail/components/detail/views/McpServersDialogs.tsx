import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Eye, EyeOff, Plus, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { InlineLoadingIndicator } from '@/components/common/Loading';
import { Select, SelectOption } from '@/components/common/Select';
import { ClusterToolCatalogItem, ClusterToolCatalogServer } from '@/types';
import { getToolLabel, ServerFormState } from '@/features/kubernetes-cluster-detail/components/detail/views/mcpServersCatalog';
import { modalOverlayMotion, modalPanelMotion } from '@/lib/motion';

export const McpServerToolsDialog: React.FC<{
  server: ClusterToolCatalogServer;
  canManageTools: boolean;
  pendingToolName: string | null;
  isLoadingTools?: boolean;
  isLoadingMoreTools?: boolean;
  toolsError?: string | null;
  hasMoreTools?: boolean;
  onClose: () => void;
  onToggleTool: (tool: ClusterToolCatalogItem) => void;
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

  return (
    <motion.div
      {...modalOverlayMotion}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ui-text/45 p-4 dark:bg-ui-bg/75"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
    <motion.div
      {...modalPanelMotion}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mcp-server-tools-title"
      className="relative flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-ui-border bg-ui-surface shadow-2xl"
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-4 border-b border-ui-border bg-ui-bg px-6 py-5">
        <div className="min-w-0">
          <div className="type-micro-label mb-2 flex items-center gap-2">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {t('mcpServers.mcpServer')}
          </div>
          <h2 id="mcp-server-tools-title" className="type-section-title truncate" title={server.name}>{server.name}</h2>
          <p className="type-code mt-1 truncate text-ui-text-muted" title={server.url}>
            {server.url}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-ui-text-muted transition-colors hover:bg-ui-surface hover:text-accent-strong"
          aria-label={t('mcpServers.closeTools')}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="overflow-y-auto p-6 custom-scrollbar">
        {toolsError && (
          <div className="type-caption mb-3 rounded-lg border border-status-danger/25 bg-status-danger-soft px-4 py-3 text-status-danger-text">
            {toolsError}
          </div>
        )}
        {isLoadingTools ? (
          <InlineLoadingIndicator label={t('mcpServers.loadingTools')} className="bg-ui-bg text-xs" />
        ) : server.tools.length === 0 ? (
          <div className="type-caption rounded-lg border border-ui-border bg-ui-bg px-4 py-3">
            {t('mcpServers.noToolsDiscovered')}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="type-caption rounded-lg border border-ui-border bg-ui-bg px-4 py-3 text-ui-text-muted">
              {t('mcpServers.toolEnablementHelp')}
            </p>
            {server.tools.map((tool) => {
              const pending = pendingToolName === tool.name;
              return (
                <div key={tool.name} className="flex items-center justify-between gap-5 rounded-xl border border-ui-border bg-ui-bg p-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="type-row-title truncate" title={getToolLabel(tool)}>
                        {getToolLabel(tool)}
                      </h3>
                      {tool.enabledEffective && <CheckCircle2 className="h-4 w-4 shrink-0 text-status-success-text" />}
                    </div>
                    <div className="type-micro-label mt-1 flex min-w-0 items-center gap-2">
                      <span className="type-code truncate text-ui-text-muted" title={tool.name}>{tool.name}</span>
                      <span className="h-1 w-1 rounded-full bg-ui-text-muted/30" />
                      <span>{tool.capability}</span>
                      <span className="h-1 w-1 rounded-full bg-ui-text-muted/30" />
                      <span className="truncate">{tool.version}</span>
                    </div>
                    {tool.effectiveDisabledReason === 'server_disabled' && (
                      <p className="type-caption mt-1 text-status-warning-text">{t('mcpServers.toolBlockedServerDisabled')}</p>
                    )}
                    {tool.effectiveDisabledReason === 'agent_write_disabled' && (
                      <p className="type-caption mt-1 text-status-warning-text">{t('mcpServers.toolBlockedAgentWriteDisabled')}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={!canManageTools || pending}
                    onClick={() => onToggleTool(tool)}
                    className={`relative h-7 w-12 shrink-0 rounded-full border transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                      tool.enabledConfigured
                        ? 'border-accent bg-accent'
                        : 'border-ui-border bg-ui-surface'
                    }`}
                    aria-label={t(tool.enabledConfigured ? 'mcpServers.disableToolNamed' : 'mcpServers.enableToolNamed', { name: getToolLabel(tool) })}
                  >
                    <motion.span
                      className="absolute left-1 top-1 h-5 w-5 rounded-full bg-ui-surface shadow-sm"
                      animate={{ x: tool.enabledConfigured ? 18 : 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  </button>
                </div>
              );
            })}
            <div ref={loadMoreToolsRef}>
              {hasMoreTools && (
                <button
                  type="button"
                  onClick={onLoadMoreTools}
                  disabled={isLoadingMoreTools}
                  className="type-label w-full rounded-lg border border-ui-border bg-ui-bg px-4 py-2 text-ui-text-muted transition-colors hover:text-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoadingMoreTools ? t('mcpServers.loadingTools') : t('common.loadMore')}
                </button>
              )}
            </div>
          </div>
        )}

        {!canManageTools && (
          <div className="type-caption mt-5 rounded-lg border border-ui-border bg-ui-bg px-4 py-3">
            {t('mcpServers.manageToolsNoAccess')}
          </div>
        )}
      </div>
    </motion.div>
    </motion.div>
  );
};

export const McpServerFormDialog: React.FC<{
  mode: 'create' | 'edit';
  urlReadOnly: boolean;
  form: ServerFormState;
  mutationError: string | null;
  pending: boolean;
  showSecretValue: boolean;
  isValid: boolean;
  onClose: () => void;
  onFormChange: React.Dispatch<React.SetStateAction<ServerFormState>>;
  onShowSecretValueChange: React.Dispatch<React.SetStateAction<boolean>>;
  onSubmit: () => void;
}> = ({
  mode,
  urlReadOnly,
  form,
  mutationError,
  pending,
  showSecretValue,
  isValid,
  onClose,
  onFormChange,
  onShowSecretValueChange,
  onSubmit
}) => {
  const { t } = useTranslation();
  const authTypeOptions: Array<SelectOption<ServerFormState['authType']>> = [
    { value: 'none', label: t('mcpServers.authNone') },
    { value: 'bearer_token', label: t('mcpServers.authBearer') },
    { value: 'custom_header', label: t('mcpServers.authCustomHeader') }
  ];
  const addPublicHeader = () => {
    onFormChange((current) => ({
      ...current,
      publicHeaders: [
        ...current.publicHeaders,
        { id: `header-${Math.random().toString(36).slice(2)}`, name: '', value: '' }
      ]
    }));
  };
  const updatePublicHeader = (id: string, patch: Partial<ServerFormState['publicHeaders'][number]>) => {
    onFormChange((current) => ({
      ...current,
      publicHeaders: current.publicHeaders.map((header) => (header.id === id ? { ...header, ...patch } : header))
    }));
  };
  const removePublicHeader = (id: string) => {
    onFormChange((current) => ({
      ...current,
      publicHeaders: current.publicHeaders.filter((header) => header.id !== id)
    }));
  };
  return (
    <motion.div
    {...modalOverlayMotion}
    className="fixed inset-0 z-50 flex items-center justify-center bg-ui-text/45 p-4 dark:bg-ui-bg/75"
    onMouseDown={(event) => {
      if (event.target === event.currentTarget && !pending) onClose();
    }}
  >
    <motion.div
      {...modalPanelMotion}
      role="dialog"
      aria-modal="true"
        aria-labelledby="mcp-server-form-title"
      className="w-full max-w-2xl overflow-hidden rounded-xl border border-ui-border bg-ui-surface shadow-2xl"
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div className="flex items-center justify-between border-b border-ui-border bg-ui-bg px-6 py-4">
        <h3 id="mcp-server-form-title" className="type-panel-title">
          {t(mode === 'edit' ? 'mcpServers.edit' : 'mcpServers.add')}
        </h3>
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="rounded-lg p-1.5 text-ui-text-muted transition-colors hover:bg-ui-bg hover:text-accent-strong disabled:opacity-50"
          aria-label={t('mcpServers.closeForm')}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4 p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-1">
            <span className="type-label px-1">{t('mcpServers.serverName')}</span>
            <input
              value={form.name}
              onChange={(event) => onFormChange((current) => ({ ...current, name: event.target.value }))}
              className="w-full rounded-lg border border-ui-border bg-ui-bg px-4 py-3 text-sm text-ui-text outline-none transition-all focus:ring-2 focus:ring-accent/10"
            />
          </label>
          <label className="space-y-1">
            <span className="type-label px-1">{t('mcpServers.serverUrl')}</span>
            <input
              value={form.url}
              onChange={(event) => onFormChange((current) => ({ ...current, url: event.target.value }))}
              placeholder={t('mcpServers.serverUrlPlaceholder')}
              disabled={urlReadOnly}
              className="w-full rounded-lg border border-ui-border bg-ui-bg px-4 py-3 text-sm text-ui-text outline-none transition-all focus:ring-2 focus:ring-accent/10 disabled:cursor-not-allowed disabled:opacity-70"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-1">
            <span className="type-label px-1">{t('mcpServers.authType')}</span>
            <Select<ServerFormState['authType']>
              value={form.authType}
              options={authTypeOptions}
              onChange={(authType) =>
                onFormChange((current) => ({
                  ...current,
                  authType
                }))
              }
              ariaLabel={t('mcpServers.authType')}
            />
          </label>
          <label className="space-y-1">
            <span className="type-label px-1">{t('mcpServers.enabled')}</span>
            <div className="flex h-[44px] items-center">
              <button
                type="button"
                onClick={() => onFormChange((current) => ({ ...current, enabled: !current.enabled }))}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                  form.enabled ? 'bg-accent' : 'bg-ui-text-muted'
                }`}
                role="switch"
                aria-checked={form.enabled}
              >
                <motion.span
                  className="inline-block h-5 w-5 rounded-full bg-ui-surface shadow-sm"
                  animate={{ x: form.enabled ? 24 : 4 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
            </div>
          </label>
        </div>

        {form.authType !== 'none' && (
          <div className="space-y-3">
            <div className={`grid grid-cols-1 gap-4 ${form.authType === 'custom_header' ? 'md:grid-cols-2' : ''}`}>
              {form.authType === 'custom_header' && (
                <label className="space-y-1">
                  <span className="type-label px-1">{t('mcpServers.headerName')}</span>
                  <input
                    value={form.headerName}
                    onChange={(event) => onFormChange((current) => ({ ...current, headerName: event.target.value }))}
                    placeholder={t('mcpServers.headerNamePlaceholder')}
                    className="w-full rounded-lg border border-ui-border bg-ui-bg px-4 py-3 text-sm text-ui-text outline-none transition-all focus:ring-2 focus:ring-accent/10"
                  />
                </label>
              )}
              <label className="space-y-1">
                <span className="type-label px-1">
                  {form.authType === 'bearer_token' ? t('mcpServers.authBearer') : t('mcpServers.headerValue')}
                </span>
                <span className="relative block">
                  <input
                    value={form.secretValue}
                    onChange={(event) => onFormChange((current) => ({ ...current, secretValue: event.target.value }))}
                    type={showSecretValue ? 'text' : 'password'}
                    autoComplete="off"
                    className="w-full rounded-lg border border-ui-border bg-ui-bg px-4 py-3 pr-11 text-sm text-ui-text outline-none transition-all focus:ring-2 focus:ring-accent/10"
                  />
                  <button
                    type="button"
                    onClick={() => onShowSecretValueChange((current) => !current)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-ui-text-muted transition-colors hover:bg-ui-surface hover:text-ui-text"
                    aria-label={showSecretValue ? t('mcpServers.hideSecret') : t('mcpServers.showSecret')}
                    aria-pressed={showSecretValue}
                  >
                    {showSecretValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </span>
              </label>
            </div>
            <p className="type-caption px-1">
              {t(mode === 'edit' ? 'mcpServers.credentialsEditHelp' : 'mcpServers.credentialsHelp')}
            </p>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="type-label px-1">{t('mcpServers.publicHeaders')}</p>
              <p className="type-caption px-1 text-ui-text-muted">{t('mcpServers.publicHeadersHelp')}</p>
            </div>
            <button
              type="button"
              onClick={addPublicHeader}
              className="inline-flex items-center gap-2 rounded-lg border border-ui-border px-3 py-2 text-xs font-semibold text-ui-text transition-colors hover:bg-ui-surface"
            >
              <Plus className="h-3.5 w-3.5" />
              {t('mcpServers.addHeader')}
            </button>
          </div>
          {form.publicHeaders.length > 0 && (
            <div className="space-y-2">
              {form.publicHeaders.map((header) => (
                <div key={header.id} className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                  <input
                    value={header.name}
                    onChange={(event) => updatePublicHeader(header.id, { name: event.target.value })}
                    placeholder={t('mcpServers.publicHeaderNamePlaceholder')}
                    className="min-w-0 rounded-lg border border-ui-border bg-ui-bg px-3 py-2 text-sm text-ui-text outline-none transition-all focus:ring-2 focus:ring-accent/10"
                  />
                  <input
                    value={header.value}
                    onChange={(event) => updatePublicHeader(header.id, { value: event.target.value })}
                    placeholder={t('mcpServers.publicHeaderValuePlaceholder')}
                    className="min-w-0 rounded-lg border border-ui-border bg-ui-bg px-3 py-2 text-sm text-ui-text outline-none transition-all focus:ring-2 focus:ring-accent/10"
                  />
                  <button
                    type="button"
                    onClick={() => removePublicHeader(header.id)}
                    className="rounded-lg border border-ui-border p-2 text-ui-text-muted transition-colors hover:bg-status-danger-soft hover:text-status-danger-text sm:self-center"
                    aria-label={t('mcpServers.removeHeader')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="type-caption rounded-lg border border-ui-border bg-ui-bg p-3">
          {urlReadOnly ? t('mcpServers.editHelp') : t('mcpServers.createHelp')}
        </div>

        {mutationError && (
          <div className="type-caption rounded-lg border border-status-danger/25 bg-status-danger-soft px-4 py-3 text-status-danger-text">
            {mutationError}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 border-t border-ui-border bg-ui-bg px-6 py-4">
        <Button
          onClick={onClose}
          disabled={pending}
          variant="secondary"
          size="sm"
        >
          {t('app.cancel')}
        </Button>
        <Button
          onClick={onSubmit}
          disabled={pending || !isValid}
          variant="primary"
          size="sm"
        >
          {pending ? t('mcpServers.saving') : t('mcpServers.save')}
        </Button>
      </div>
    </motion.div>
    </motion.div>
  );
};

export const DeleteMcpServerDialog: React.FC<{
  server: ClusterToolCatalogServer;
  mutationError: string | null;
  pending: boolean;
  onClose: () => void;
  onDelete: () => void;
}> = ({ server, mutationError, pending, onClose, onDelete }) => {
  const { t } = useTranslation();
  return (
    <motion.div
      {...modalOverlayMotion}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ui-text/45 p-4 dark:bg-ui-bg/75"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onClose();
      }}
    >
      <motion.div
        {...modalPanelMotion}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-mcp-server-title"
        className="w-full max-w-md overflow-hidden rounded-xl border border-ui-border bg-ui-surface shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
      <div className="flex items-center justify-between border-b border-ui-border bg-ui-bg px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-status-danger-soft text-status-danger-text">
            <Trash2 className="h-4 w-4" />
          </span>
          <div>
            <h3 id="delete-mcp-server-title" className="type-panel-title">{t('mcpServers.delete')}</h3>
            <p className="mt-0.5 text-[11px] font-semibold text-ui-text-muted">{t('mcpServers.deleteSubtitle')}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="rounded-lg p-1.5 text-ui-text-muted transition-colors hover:bg-ui-surface hover:text-accent-strong disabled:opacity-50"
          aria-label={t('mcpServers.closeDelete')}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-3 px-6 py-5">
        <p className="type-body">
          {t('mcpServers.deleteBody', { name: server.name })}
        </p>
        <p className="type-caption rounded-lg border border-status-warning/25 bg-status-warning-soft px-3 py-2 text-status-warning-text">
          {t('mcpServers.deleteConsoleBoundary')}
        </p>
        {mutationError && (
          <div className="type-caption rounded-lg border border-status-danger/25 bg-status-danger-soft px-3 py-2 text-status-danger-text">
            {mutationError}
          </div>
        )}
      </div>
      <div className="flex justify-end gap-3 border-t border-ui-border bg-ui-bg px-6 py-4">
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="type-ui rounded-lg border border-ui-border bg-ui-surface px-4 py-2 text-ui-text-muted transition-all hover:bg-ui-bg disabled:opacity-50"
        >
          {t('app.cancel')}
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={pending}
          className="type-ui rounded-lg bg-status-danger px-4 py-2 text-[oklch(0.99_0.004_86)] transition-all hover:bg-status-danger-text disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? t('app.deleting') : t('mcpServers.deleteAction')}
        </button>
      </div>
      </motion.div>
    </motion.div>
  );
};
