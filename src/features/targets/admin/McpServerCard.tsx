import React from 'react';
import { Switch } from '@/components/common/FormControls';
import { createPortal } from 'react-dom';
import {
  Edit3,
  Loader2,
  MoreVertical,
  RefreshCcw,
  Server,
  Settings2,
  Trash2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { menuOptionClassName, menuSurfaceClassName } from '@/components/common/menuStyles';
import { TargetMcpServerTestConnectionResult } from '@/services/controlPlaneApi';
import type { TargetToolCatalogServer } from '@/features/targets/admin/targetMcpCatalogTypes';
import { formatDiscoveryTimestamp, isManagedMcpServer } from '@/features/targets/admin/mcpServersCatalog';

interface McpServerCardProps {
  server: TargetToolCatalogServer;
  canEditServers: boolean;
  pendingTestServerId: string | null;
  pendingToggleServerId: string | null;
  testResult?: TargetMcpServerTestConnectionResult;
  onManageTools: (serverId: string) => void;
  onTestConnection: (server: TargetToolCatalogServer) => void;
  onToggleServer: (server: TargetToolCatalogServer, enabled: boolean) => void;
  onEdit: (server: TargetToolCatalogServer) => void;
  onDelete: (server: TargetToolCatalogServer) => void;
}

type ServerStatusTone = 'success' | 'warning' | 'danger' | 'muted';

interface ServerStatusDisplay {
  labelKey: string;
  tone: ServerStatusTone;
}

export function getMcpServerStatusDisplay(
  server: Pick<TargetToolCatalogServer, 'enabled' | 'type' | 'connectionStatus' | 'lastDiscoveryError'>,
  testResult?: TargetMcpServerTestConnectionResult
): ServerStatusDisplay {
  if (!server.enabled) {
    return { labelKey: 'mcpServers.statusDisabled', tone: 'muted' };
  }

  const connectionStatus = testResult?.connectionStatus || server.connectionStatus;
  if (server.type === 'builtin' || connectionStatus === 'ok') {
    return { labelKey: 'mcpServers.statusConnected', tone: 'success' };
  }

  if (connectionStatus === 'error') {
    const message = server.lastDiscoveryError || testResult?.error || '';
    const needsAuth = /auth|credential|token|secret|401|403|unauthorized|forbidden/i.test(message);
    return needsAuth
      ? { labelKey: 'mcpServers.statusNeedsAuth', tone: 'warning' }
      : { labelKey: 'mcpServers.statusDiscoveryFailed', tone: 'danger' };
  }

  return { labelKey: 'mcpServers.statusNotChecked', tone: 'muted' };
}

const statusToneClasses: Record<ServerStatusTone, { dot: string; text: string }> = {
  success: { dot: 'bg-status-success', text: 'text-status-success-text' },
  warning: { dot: 'bg-status-warning', text: 'text-status-warning-text' },
  danger: { dot: 'bg-status-danger', text: 'text-status-danger-text' },
  muted: { dot: 'bg-ui-text-muted/35', text: 'text-ui-text-muted' }
};

export const McpServerCard: React.FC<McpServerCardProps> = ({
  server,
  canEditServers,
  pendingTestServerId,
  pendingToggleServerId,
  testResult,
  onManageTools,
  onTestConnection,
  onToggleServer,
  onEdit,
  onDelete
}) => {
  const { t } = useTranslation();
  const healthCheckHelpId = React.useId();
  const actionMenuId = React.useId();
  const actionMenuButtonRef = React.useRef<HTMLButtonElement>(null);
  const actionMenuRef = React.useRef<HTMLDivElement>(null);
  const [actionMenuOpen, setActionMenuOpen] = React.useState(false);
  const [actionMenuStyle, setActionMenuStyle] = React.useState<React.CSSProperties | null>(null);
  const canDeleteServer = canEditServers && server.canDelete && !server.isSystem;
  const canEditServer = canEditServers && server.canEditConnection && !server.isSystem;
  const canTestServer = canEditServers && !server.isSystem && server.canToggle;
  const isTogglingServer = pendingToggleServerId === server.id;
  const isBlockedByOtherServerToggle = Boolean(pendingToggleServerId && !isTogglingServer);
  const canToggleServer = canEditServers && server.canToggle && !isBlockedByOtherServerToggle && !isTogglingServer;
  const isManagedServer = isManagedMcpServer(server);
  const serverSubtitle = isManagedServer ? t('mcpServers.managedByAcornOps') : server.url;
  const status = getMcpServerStatusDisplay(server, testResult);
  const statusTone = statusToneClasses[status.tone];
  const writeConfiguredTools = server.toolCounts.writeConfigured;
  const readConfiguredTools = Math.max(0, server.toolCounts.total - writeConfiguredTools);
  const statusDetail = !server.canToggle
    ? t('mcpServers.serverRecordMissing')
    : isManagedServer
      ? t('mcpServers.managed')
      : server.lastDiscoveryError
        ? server.lastDiscoveryError
        : server.lastDiscoveryAt
          ? formatDiscoveryTimestamp(server.lastDiscoveryAt)
          : t('mcpServers.notChecked');
  const statusDetailClassName = server.lastDiscoveryError && !isManagedServer
    ? 'text-status-danger-text'
    : !server.canToggle
      ? 'text-status-warning-text'
      : 'text-ui-text-muted';
  const updateActionMenuPosition = React.useCallback(() => {
    const trigger = actionMenuButtonRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const menuWidth = 224;
    const menuHeight = 188;
    const top = Math.min(rect.bottom + 6, window.innerHeight - menuHeight - 8);
    setActionMenuStyle({
      left: Math.max(8, rect.right - menuWidth),
      top: Math.max(8, top),
      width: menuWidth
    });
  }, []);

  React.useEffect(() => {
    if (!actionMenuOpen) return undefined;

    updateActionMenuPosition();
    const closeMenu = () => setActionMenuOpen(false);
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (actionMenuButtonRef.current?.contains(target) || actionMenuRef.current?.contains(target)) return;
      closeMenu();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu();
    };
    const handleResize = () => updateActionMenuPosition();
    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [actionMenuOpen, updateActionMenuPosition]);

  const closeActionMenu = () => setActionMenuOpen(false);

  const actionMenu = actionMenuOpen && actionMenuStyle && typeof document !== 'undefined'
    ? createPortal(
        <div
          ref={actionMenuRef}
          id={actionMenuId}
          role="menu"
          className={menuSurfaceClassName('fixed z-[130] p-1')}
          style={actionMenuStyle}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              closeActionMenu();
              onManageTools(server.id);
            }}
            className={menuOptionClassName()}
          >
            <Settings2 className="h-4 w-4 shrink-0 text-accent-strong" aria-hidden="true" />
            <span>{t('mcpServers.manageTools')}</span>
          </button>
          {canTestServer && (
            <button
              type="button"
              role="menuitem"
              disabled={Boolean(pendingTestServerId)}
              onClick={() => {
                closeActionMenu();
                onTestConnection(server);
              }}
              className={menuOptionClassName({ disabled: Boolean(pendingTestServerId) })}
              aria-describedby={healthCheckHelpId}
            >
              {pendingTestServerId === server.id ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-ui-text-muted" aria-hidden="true" />
              ) : (
                <RefreshCcw className="h-4 w-4 shrink-0 text-ui-text-muted" aria-hidden="true" />
              )}
              <span>{t('mcpServers.healthCheck')}</span>
            </button>
          )}
          {canEditServer && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                closeActionMenu();
                onEdit(server);
              }}
              className={menuOptionClassName()}
            >
              <Edit3 className="h-4 w-4 shrink-0 text-ui-text-muted" aria-hidden="true" />
              <span>{t('mcpServers.edit')}</span>
            </button>
          )}
          {canDeleteServer && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                closeActionMenu();
                onDelete(server);
              }}
              className={menuOptionClassName({ className: 'text-status-danger-text hover:bg-status-danger-soft' })}
            >
              <Trash2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{t('mcpServers.delete')}</span>
            </button>
          )}
        </div>,
        document.body
      )
    : null;

  return (
    <tr data-mcp-server-row="true" className="group border-b border-ui-bg transition-colors hover:bg-accent-soft/45">
      <td className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-ui-border bg-ui-bg">
            <Server className="h-5 w-5 text-accent-strong" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="type-panel-title truncate" title={server.name}>{server.name}</h3>
            <p
              className={`${isManagedServer ? 'type-caption' : 'type-code'} mt-1 truncate text-ui-text-muted`}
              title={serverSubtitle}
            >
              {serverSubtitle}
            </p>
          </div>
        </div>
      </td>

      <td data-mcp-server-secondary-context="true" className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`h-2 w-2 shrink-0 rounded-full ${statusTone.dot}`} />
          <span className={`type-label truncate ${statusTone.text}`}>{t(status.labelKey)}</span>
        </div>
        <p className={`type-caption mt-0.5 truncate ${statusDetailClassName}`} title={statusDetail}>
          {statusDetail}
        </p>
      </td>

      <td className="px-4 py-6 sm:px-6 lg:px-8">
        <Switch
          checked={server.enabled}
          aria-disabled={!canToggleServer}
          label={t(server.enabled ? 'mcpServers.disableServerNamed' : 'mcpServers.enableServerNamed', { name: server.name })}
          title={!server.canToggle ? t('mcpServers.serverRecordMissing') : undefined}
          disabled={!canEditServers || !server.canToggle}
          onCheckedChange={(enabled) => {
            if (!canToggleServer) return;
            onToggleServer(server, enabled);
          }}
        />
      </td>

      <td className="hidden px-4 py-6 sm:px-6 md:table-cell lg:px-8">
        <div className="min-w-0">
          <p className="type-label text-ui-text">
            {t('mcpServers.enabledOfTotalShort', {
              enabled: server.toolCounts.enabledEffective,
              total: server.toolCounts.total
            })}
          </p>
          <p className="type-caption mt-1 text-ui-text-muted">
            {readConfiguredTools} {t('mcpServers.capabilityRead')} · {writeConfiguredTools} {t('mcpServers.capabilityWrite')}
          </p>
        </div>
      </td>

      <td className="px-4 py-6 text-right sm:px-6 lg:px-8">
        {canTestServer && (
          <span id={healthCheckHelpId} className="sr-only">
            {t('mcpServers.healthCheckHelp')}
          </span>
        )}
        <button
          ref={actionMenuButtonRef}
          data-mcp-server-primary-actions="true"
          type="button"
          onClick={() => setActionMenuOpen((isOpen) => !isOpen)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-transparent bg-transparent text-ui-text-muted transition-colors hover:border-ui-border hover:bg-ui-bg hover:text-ui-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
          aria-haspopup="menu"
          aria-expanded={actionMenuOpen}
          aria-controls={actionMenuOpen ? actionMenuId : undefined}
          aria-label={t('mcpServers.serverActionsNamed', { name: server.name })}
        >
          <MoreVertical className="h-4 w-4" aria-hidden="true" />
        </button>
        {actionMenu}
      </td>
    </tr>
  );
};
