import React from 'react';
import {
  Edit3,
  ExternalLink,
  Loader2,
  Plus,
  RefreshCcw,
  Server,
  Shield,
  Trash2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Tooltip } from '@/components/common/Tooltip';
import { TargetMcpServerTestConnectionResult } from '@/services/controlPlaneApi';
import { ClusterToolCatalogServer } from '@/types';
import { formatDiscoveryTimestamp } from '@/features/kubernetes-cluster-detail/components/detail/views/mcpServersCatalog';

interface McpServerCardProps {
  server: ClusterToolCatalogServer;
  canEditServers: boolean;
  pendingTestServerId: string | null;
  testResult?: TargetMcpServerTestConnectionResult;
  onManageTools: (serverId: string) => void;
  onTestConnection: (server: ClusterToolCatalogServer) => void;
  onEdit: (server: ClusterToolCatalogServer) => void;
  onDelete: (server: ClusterToolCatalogServer) => void;
}

export const McpServerCard: React.FC<McpServerCardProps> = ({
  server,
  canEditServers,
  pendingTestServerId,
  testResult,
  onManageTools,
  onTestConnection,
  onEdit,
  onDelete
}) => {
  const { t } = useTranslation();
  const healthCheckHelpId = React.useId();
  const isEnabled = server.enabled;
  const canDeleteServer = canEditServers && server.canDelete && !server.isSystem;
  const canEditServer = canEditServers && server.canEditConnection && !server.isSystem;
  const serverTypeLabel = server.type === 'builtin' ? t('mcpServers.builtin') : t('mcpServers.remote');
  const serverEnabledLabel = isEnabled ? t('mcpServers.enabled') : t('mcpServers.disabled');
  const connectionLabel = testResult
    ? t(testResult.connectionStatus === 'ok' ? 'mcpServers.healthCheckPassed' : 'mcpServers.healthCheckFailed')
    : server.type === 'builtin'
      ? t('mcpServers.localServer')
      : t(
          server.connectionStatus === 'ok'
            ? 'mcpServers.connectionOk'
            : server.connectionStatus === 'error'
              ? 'mcpServers.connectionError'
              : 'mcpServers.notChecked'
        );
  const connectionTone = testResult
    ? testResult.connectionStatus === 'ok'
      ? 'text-status-success-text'
      : 'text-status-danger-text'
    : server.connectionStatus === 'ok'
      ? 'text-status-success-text'
      : server.connectionStatus === 'error'
        ? 'text-status-danger-text'
        : 'text-ui-text-muted';
  const metricItems = [
    { label: t('mcpServers.tools'), value: server.toolCounts.total },
    { label: t('mcpServers.enabledTools'), value: server.toolCounts.enabledEffective },
    { label: t('mcpServers.writeTools'), value: server.toolCounts.writeEffective }
  ];

  return (
    <article
      data-mcp-server-card="true"
      className="flex min-w-0 flex-col gap-3 rounded-lg border border-ui-border bg-ui-surface p-4 shadow-sm transition-colors hover:border-accent/30"
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-ui-border bg-ui-bg">
          <Server className="h-4 w-4 text-accent-strong" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h3 className="type-panel-title line-clamp-2 break-words" title={server.name}>{server.name}</h3>
              <p className="type-code mt-1 truncate text-ui-text-muted" title={server.url}>
                {server.url}
              </p>
            </div>
            <div className="type-caption flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 text-ui-text-muted">
              <span>{serverTypeLabel}</span>
              <span aria-hidden="true">·</span>
              <span className={isEnabled ? 'text-status-success-text' : 'text-ui-text-muted'}>{serverEnabledLabel}</span>
            </div>
          </div>
        </div>
      </div>

      <div data-mcp-server-secondary-context="true" className="space-y-2 border-y border-ui-border py-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <span className="flex min-w-0 items-center gap-2">
            <Shield className={`h-4 w-4 shrink-0 ${connectionTone}`} />
            <span className="type-micro-label text-ui-text-muted">{t('mcpServers.connection')}</span>
            <span className={`type-label min-w-0 truncate ${connectionTone}`}>
              {connectionLabel}
            </span>
          </span>
          <span className="type-caption min-w-0 truncate text-ui-text-muted">
            {t('mcpServers.lastDiscovery', { time: formatDiscoveryTimestamp(server.lastDiscoveryAt) })}
          </span>
        </div>
        <dl className="type-caption flex flex-wrap gap-x-3 gap-y-1 text-ui-text-muted">
          {metricItems.map((item) => (
            <div key={item.label} className="inline-flex min-w-0 items-center gap-1">
              <dt className="truncate">{item.label}</dt>
              <dd className="font-semibold text-ui-text">{item.value}</dd>
            </div>
          ))}
        </dl>
        {server.lastDiscoveryError && (
          <p className="type-caption line-clamp-2 text-status-danger-text">{server.lastDiscoveryError}</p>
        )}
      </div>

      {canEditServers && !server.isSystem && (
        <span id={healthCheckHelpId} className="sr-only">
          {t('mcpServers.healthCheckHelp')}
        </span>
      )}

      <div data-mcp-server-primary-actions="true" className="mt-auto flex flex-wrap items-center gap-2 border-t border-ui-border pt-3">
        <button
          type="button"
          onClick={() => onManageTools(server.id)}
          className="type-micro-label inline-flex items-center gap-1 rounded-md border border-ui-border bg-ui-bg px-2.5 py-1.5 text-accent-strong transition-colors hover:bg-accent-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
          aria-label={t('mcpServers.manageToolsNamed', { name: server.name })}
        >
          {t('mcpServers.manageTools')} <ExternalLink className="h-3 w-3" />
        </button>
        {canEditServers && !server.isSystem && (
          <button
            type="button"
            onClick={() => onTestConnection(server)}
            disabled={Boolean(pendingTestServerId)}
            title={t('mcpServers.healthCheck')}
            aria-label={t('mcpServers.healthCheckNamed', { name: server.name })}
            aria-describedby={healthCheckHelpId}
            className="type-micro-label inline-flex items-center gap-1 rounded-md border border-ui-border bg-ui-bg px-2.5 py-1.5 text-ui-text-muted transition-colors hover:text-accent-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pendingTestServerId === server.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCcw className="h-3 w-3" />}
            {t('mcpServers.healthCheck')}
          </button>
        )}
        <div className="ml-auto flex items-center gap-1">
          {canEditServer && (
            <Tooltip content={t('mcpServers.edit')}>
              <button
                type="button"
                onClick={() => onEdit(server)}
                className="rounded-md p-1.5 text-ui-text-muted transition-colors hover:bg-ui-bg hover:text-accent-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
                aria-label={t('mcpServers.editNamed', { name: server.name })}
              >
                <Edit3 className="h-4 w-4" />
              </button>
            </Tooltip>
          )}
          {canDeleteServer && (
            <Tooltip content={t('mcpServers.delete')}>
              <button
                type="button"
                onClick={() => onDelete(server)}
                className="rounded-md p-1.5 text-status-danger-text transition-colors hover:bg-status-danger-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
                aria-label={t('mcpServers.deleteNamed', { name: server.name })}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </Tooltip>
          )}
        </div>
      </div>
    </article>
  );
};

export const AddMcpServerCard: React.FC<{
  onClick: () => void;
}> = ({ onClick }) => {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={onClick}
      className="type-ui flex min-h-28 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-ui-border bg-ui-surface px-4 py-4 text-ui-text-muted transition-colors hover:border-accent/30 hover:bg-ui-bg hover:text-accent-strong"
    >
      <Plus className="h-4 w-4" />
      {t('mcpServers.add')}
    </button>
  );
};
