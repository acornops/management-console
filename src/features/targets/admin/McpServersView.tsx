import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Plus, ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TargetToolCatalog, TargetToolCatalogItem, TargetToolCatalogServer } from '@/features/targets/admin/targetMcpCatalogTypes';
import { Button } from '@/components/common/Button';
import { CollectionState } from '@/components/common/CollectionState';
import { EmptyState } from '@/components/common/EmptyState';
import { InlineLoadingIndicator } from '@/components/common/Loading';
import { TargetMcpServerTestConnectionResult, controlPlaneApi, CreateTargetMcpServerInput } from '@/services/controlPlaneApi';
import { updateUrlSearch, useUrlSearchState } from '@/hooks/useUrlSearchState';
import type { TargetDescriptor, TargetMcpToolSummary } from '@/features/targets/targetDescriptor';
import { McpServersInventory } from '@/features/targets/admin/McpServersInventory';
import { DeleteMcpServerDialog, McpServerFormDialog } from '@/features/targets/admin/McpServersDialogs';
import { McpServerToolsDialog } from '@/features/targets/admin/McpServerToolsDialog';
import { useTargetMcpPersonalConnections } from '@/features/targets/admin/useTargetMcpPersonalConnections';
import { TargetMcpPatDialog } from '@/features/targets/admin/TargetMcpPatDialog';
import { McpServersViewHeader } from '@/features/targets/admin/McpServersViewHeader';
import { applyToolCountsDelta, getOptimisticToolEffectiveState, pendingCatalogServer } from '@/features/targets/admin/McpServersView.helpers';
import { useCursorCollection } from '@/hooks/useCursorCollection';
import {
  buildLocalCatalog,
  publicHeaderRowsFromRecord,
  publicHeadersFromRows,
  DEFAULT_SERVER_FORM,
  flattenCatalogTools,
  formatMcpMutationError,
  ServerFormState,
  validatePublicHeaderRows
} from '@/features/targets/admin/mcpServersCatalog';

interface McpServersViewProps {
  target: TargetDescriptor;
  canManageMcp?: boolean;
  canManageTools?: boolean;
  canRequestWriteRuns?: boolean;
  canUsePersonalConnections?: boolean;
  initialCatalog?: TargetToolCatalog | null;
  onCatalogChange?: (catalog: TargetToolCatalog) => void;
  onSyncTools?: (tools: TargetMcpToolSummary[]) => void;
}
export const McpServersView: React.FC<McpServersViewProps> = ({
  target,
  canManageMcp = false,
  canManageTools = false,
  canRequestWriteRuns = false,
  canUsePersonalConnections = false,
  initialCatalog = null,
  onCatalogChange,
  onSyncTools
}) => {
  const { t } = useTranslation();
  const urlSearch = useUrlSearchState();
  const recoveryServerId = urlSearch.get('mcpServer');
  const requestedMcpAction = urlSearch.get('mcpAction');
  const recoveryAction = requestedMcpAction === 'connect_mcp_server' || requestedMcpAction === 'verify_mcp_server'
    ? requestedMcpAction as 'connect_mcp_server' | 'verify_mcp_server'
    : undefined;
  const [catalog, setCatalog] = useState<TargetToolCatalog | null>(() => initialCatalog);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [createReviewServerId, setCreateReviewServerId] = useState<string | null>(null);
  const [pendingToolName, setPendingToolName] = useState<string | null>(null);
  const [toolMutationError, setToolMutationError] = useState<string | null>(null);
  const [serverModalOpen, setServerModalOpen] = useState(false);
  const [serverForm, setServerForm] = useState<ServerFormState>(DEFAULT_SERVER_FORM);
  const [editingServer, setEditingServer] = useState<TargetToolCatalogServer | null>(null);
  const [serverMutationError, setServerMutationError] = useState<string | null>(null);
  const [toolRefreshError, setToolRefreshError] = useState<string | null>(null);
  const [toolRefreshServer, setToolRefreshServer] = useState<TargetToolCatalogServer | null>(null);
  const [patDialogServer, setPatDialogServer] = useState<TargetToolCatalogServer | null>(null);
  const [pendingAuthenticatedCreateServerId, setPendingAuthenticatedCreateServerId] = useState<string | null>(null);
  const [pendingServerMutation, setPendingServerMutation] = useState(false);
  const [deleteTargetServer, setDeleteTargetServer] = useState<TargetToolCatalogServer | null>(null);
  const [pendingTestServerId, setPendingTestServerId] = useState<string | null>(null);
  const [pendingToggleServerId, setPendingToggleServerId] = useState<string | null>(null);
  const [testResultsByServerId, setTestResultsByServerId] = useState<Record<string, TargetMcpServerTestConnectionResult>>({});
  const onSyncToolsRef = useRef(onSyncTools);

  const localCatalog = useMemo(() => buildLocalCatalog(target, canManageMcp), [target, canManageMcp]);
  const activeCatalog = catalog || localCatalog;
  const canEditServers = canManageMcp && activeCatalog.permissions.canEdit;
  const servers = activeCatalog.servers;
  const hasConfiguredWriteTools = servers.some((server) => server.toolCounts.writeConfigured > 0);
  const hasAgentWriteBlockedTools = servers.some(
    (server) => server.enabled && server.toolCounts.writeConfigured > server.toolCounts.writeEffective
  );
  const hasLocalFallbackServers = localCatalog.servers.length > 0;
  const showInitialCatalogLoading = !catalog && !catalogError && !hasLocalFallbackServers;
  const catalogPhase = showInitialCatalogLoading
    ? 'loading'
    : catalogError
      ? 'error'
      : catalog
        ? 'ready'
        : 'refreshing';
  const activeServer = selectedServerId
    ? servers.find((server) => server.id === selectedServerId) || null
    : null;
  const createReviewServer = createReviewServerId ? servers.find((server) => server.id === createReviewServerId) || null : null;
  const toolsServerId = selectedServerId || createReviewServerId || toolRefreshServer?.id || '';
  const loadServerToolsPage = useCallback(async ({ cursor, limit, filters, signal }: {
    cursor?: string;
    limit: number;
    filters: { serverId: string };
    signal: AbortSignal;
  }) => {
    if (!filters.serverId) return { items: [], nextCursor: undefined };
    try {
      return await controlPlaneApi.listMcpServerTools(target.workspaceId, target.id, filters.serverId, {
        limit,
        cursor,
        signal
      });
    } catch (error) {
      throw new Error(formatMcpMutationError(error, t('mcpServers.loadToolsFailed')));
    }
  }, [target.id, target.workspaceId, t]);
  const serverToolsCollection = useCursorCollection({
    filters: { serverId: toolsServerId },
    getKey: (tool: TargetToolCatalogItem) => tool.name,
    loadPage: loadServerToolsPage,
    pageSize: 50,
    strategy: 'sentinel'
  });
  const activeServerTools = activeServer && toolsServerId === activeServer.id ? serverToolsCollection : undefined;
  const activeServerWithPagedTools = activeServer
    ? { ...activeServer, tools: activeServerTools?.items || activeServer.tools }
    : null;
  const createReviewServerTools = createReviewServer && toolsServerId === createReviewServer.id ? serverToolsCollection : undefined;
  const createReviewServerWithPagedTools = createReviewServer
    ? { ...createReviewServer, tools: createReviewServerTools?.items || createReviewServer.tools }
    : null;
  useEffect(() => {
    onSyncToolsRef.current = onSyncTools;
  }, [onSyncTools]);

  useEffect(() => {
    setToolMutationError(null);
  }, [toolsServerId]);

  useEffect(() => {
    if (
      toolRefreshServer
      && toolsServerId === toolRefreshServer.id
      && serverToolsCollection.phase === 'error'
    ) {
      setToolRefreshError(serverToolsCollection.error || 'The PAT is connected, but tools may be stale. Refresh the MCP catalog to retry discovery.');
    }
  }, [serverToolsCollection.error, serverToolsCollection.phase, toolRefreshServer, toolsServerId]);

  const loadCatalog = useCallback(async (options?: { syncParent?: boolean }) => {
    setCatalogError(null);
    try {
      const loadedCatalog = await controlPlaneApi.getTargetMcpCatalog(target.workspaceId, target.id);
      setCatalog(loadedCatalog);
      if (options?.syncParent) {
        onSyncToolsRef.current?.(flattenCatalogTools(loadedCatalog));
      }
      return loadedCatalog;
    } catch (error) {
      const message = formatMcpMutationError(error, 'Failed loading MCP server catalog.');
      setCatalogError(message);
      return null;
    }
  }, [target.id, target.workspaceId]);

  const refreshConnectedServer = useCallback(async (server: TargetToolCatalogServer) => {
    setToolRefreshError(null);
    setToolRefreshServer(server);
    const loadedCatalog = await loadCatalog({ syncParent: true });
    if (!loadedCatalog) throw new Error('MCP tool refresh failed');
    if (pendingAuthenticatedCreateServerId === server.id) {
      setPendingAuthenticatedCreateServerId(null);
      setCreateReviewServerId(server.id);
      setServerModalOpen(true);
      setToolRefreshServer(null);
    }
  }, [loadCatalog, pendingAuthenticatedCreateServerId]);

  const {
    connectPersonal,
    disconnectPersonal,
    verifyPersonal,
    retryPersonal,
    pendingConnectionServerId,
    personalConnections,
    personalConnectionErrors,
    retryAfterSecondsFor
  } = useTargetMcpPersonalConnections({
    servers,
    target,
    connectionFailedMessage: t('mcpServers.connectionFailed'),
    disconnectFailedMessage: t('mcpServers.disconnectFailed'),
    onError: setServerMutationError,
    onConnectionReady: refreshConnectedServer,
    onRefreshError: setToolRefreshError
  });

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    if (catalog) onCatalogChange?.(catalog);
  }, [catalog, onCatalogChange]);

  const updateCatalogLocal = (updater: (current: TargetToolCatalog) => TargetToolCatalog) => {
    setCatalog((current) => {
      const next = updater(current || localCatalog);
      onSyncToolsRef.current?.(flattenCatalogTools(next));
      return next;
    });
  };

  const clearSuccessfulRecovery = (serverId: string) => {
    if (recoveryServerId !== serverId) return;
    updateUrlSearch({ mcpServer: null, mcpAction: null }, { replace: true });
  };

  const openCreateServerModal = () => {
    if (!canEditServers) return;
    setEditingServer(null);
    setCreateReviewServerId(null);
    setServerForm({ ...DEFAULT_SERVER_FORM, publicHeaders: [] });
    setServerMutationError(null);
    setServerModalOpen(true);
  };

  useEffect(() => {
    if (requestedMcpAction !== 'connect_by_url' || !canEditServers) return;
    setEditingServer(null);
    setCreateReviewServerId(null);
    setServerForm({ ...DEFAULT_SERVER_FORM, publicHeaders: [] });
    setServerMutationError(null);
    setServerModalOpen(true);
    updateUrlSearch({ mcpAction: null }, { replace: true });
  }, [canEditServers, requestedMcpAction]);

  const openEditServerModal = (server: TargetToolCatalogServer) => {
    if (!canEditServers || !server.canEditConnection || server.isSystem) return;
    setEditingServer(server);
    setCreateReviewServerId(null);
    setServerForm({
      name: server.name,
      url: server.url,
      enabled: server.enabled,
      authType: server.authType,
      headerName: server.authHeaderName || '',
      publicHeaders: publicHeaderRowsFromRecord(server.publicHeaders)
    });
    setServerMutationError(null);
    setServerModalOpen(true);
  };

  const closeServerModal = () => {
    setServerModalOpen(false);
    setEditingServer(null);
    setCreateReviewServerId(null);
    setServerMutationError(null);
    setServerForm({ ...DEFAULT_SERVER_FORM, publicHeaders: [] });
  };

  const authWasChanged = Boolean(editingServer && (
    serverForm.authType !== editingServer.authType
    || (serverForm.authType === 'custom_header' && serverForm.headerName.trim() !== (editingServer.authHeaderName || ''))
  ));
  const publicHeadersValidationError = useMemo(() => {
    const validationKey = validatePublicHeaderRows(serverForm.publicHeaders);
    return validationKey ? t(`mcpServers.${validationKey}`) : null;
  }, [serverForm.publicHeaders, t]);
  const serverFormIsValid =
    Boolean(serverForm.name.trim()) &&
    serverForm.url.trim().startsWith('https://') &&
    !publicHeadersValidationError &&
    (serverForm.authType !== 'custom_header' || Boolean(serverForm.headerName.trim()));

  const buildAuthPayload = (): CreateTargetMcpServerInput['auth'] | undefined => {
    if (
      editingServer &&
      !authWasChanged
    ) {
      return undefined;
    }
    if (serverForm.authType === 'none') return { type: 'none' };
    const auth: CreateTargetMcpServerInput['auth'] = {
      type: serverForm.authType
    };
    if (serverForm.authType === 'bearer_token') {
      auth.headerName = 'Authorization';
      auth.headerPrefix = 'Bearer ';
    }
    if (serverForm.authType === 'custom_header' && serverForm.headerName.trim()) {
      auth.headerName = serverForm.headerName.trim();
    }
    return auth;
  };
  const buildPublicHeadersPayload = (
    includeEmpty = false
  ): CreateTargetMcpServerInput['publicHeaders'] | undefined => publicHeadersFromRows(serverForm.publicHeaders) || (includeEmpty ? {} : undefined);

  const handleSubmitServer = async () => {
    if (!canEditServers || pendingServerMutation) return;
    setPendingServerMutation(true);
    setServerMutationError(null);
    try {
      if (editingServer) {
        await controlPlaneApi.updateTargetMcpServer(target.workspaceId, target.id, editingServer.id, {
          name: serverForm.name.trim(),
          enabled: serverForm.enabled,
          publicHeaders: buildPublicHeadersPayload(true),
          auth: buildAuthPayload()
        });
        closeServerModal();
        await loadCatalog({ syncParent: true });
      } else {
        const createdServer = await controlPlaneApi.createTargetMcpServer(target.workspaceId, target.id, {
          name: serverForm.name.trim(),
          url: serverForm.url.trim(),
          enabled: serverForm.enabled,
          publicHeaders: buildPublicHeadersPayload(),
          auth: buildAuthPayload()
        });
        const loadedCatalog = await loadCatalog({ syncParent: true });
        const loadedServer = loadedCatalog?.servers.find((server) => server.id === createdServer.id);
        if (serverForm.authType !== 'none') {
          closeServerModal();
          setPendingAuthenticatedCreateServerId(createdServer.id);
          setPatDialogServer(loadedServer || pendingCatalogServer(createdServer));
          if (!loadedServer) {
            setToolRefreshError('The authenticated installation was created, but its catalog entry could not be refreshed. Continue connecting the PAT, then retry the catalog refresh if tools remain stale.');
          }
        } else {
          setCreateReviewServerId(createdServer.id);
        }
        if (!loadedCatalog?.servers.some((server) => server.id === createdServer.id)) {
          setServerMutationError(t('mcpServers.reviewToolsRefreshPending'));
        }
      }
    } catch (error) {
      const message = formatMcpMutationError(error, editingServer ? 'Failed updating MCP server.' : 'Failed adding MCP server.');
      setServerMutationError(message);
    } finally {
      setPendingServerMutation(false);
    }
  };

  const handleDeleteServer = async () => {
    if (!deleteTargetServer || !canEditServers || pendingServerMutation) return;
    setPendingServerMutation(true);
    setServerMutationError(null);
    try {
      await controlPlaneApi.deleteTargetMcpServer(target.workspaceId, target.id, deleteTargetServer.id);
      if (selectedServerId === deleteTargetServer.id) {
        setSelectedServerId(null);
      }
      setDeleteTargetServer(null);
      await loadCatalog({ syncParent: true });
    } catch (error) {
      const message = formatMcpMutationError(error, 'Failed deleting MCP server.');
      setServerMutationError(message);
    } finally {
      setPendingServerMutation(false);
    }
  };

  const handleTestConnection = async (server: TargetToolCatalogServer) => {
    if (!canEditServers || pendingTestServerId) return;
    setPendingTestServerId(server.id);
    setServerMutationError(null);
    try {
      const result = await controlPlaneApi.testTargetMcpServerConnection(target.workspaceId, target.id, server.id);
      setTestResultsByServerId((current) => ({ ...current, [server.id]: result }));
      await loadCatalog({ syncParent: true });
    } catch (error) {
      setServerMutationError(formatMcpMutationError(error, t('mcpServers.healthCheckFailedMessage')));
    } finally {
      setPendingTestServerId(null);
    }
  };

  const applyServerEnabledState = (serverId: string, enabled: boolean) => {
    updateCatalogLocal((current) => ({
      ...current,
      servers: current.servers.map((candidate) => {
        if (candidate.id !== serverId) return candidate;
        const tools = candidate.tools.map((tool) => ({
          ...tool,
          enabledEffective: enabled && tool.enabledConfigured && tool.effectiveDisabledReason !== 'agent_write_disabled',
          effectiveDisabledReason: enabled
            ? tool.effectiveDisabledReason === 'server_disabled'
              ? null
              : tool.effectiveDisabledReason
            : tool.enabledConfigured
              ? 'server_disabled' as const
              : null
        }));
        return {
          ...candidate,
          enabled,
          toolCounts: {
            ...candidate.toolCounts,
            enabledEffective: tools.filter((tool) => tool.enabledEffective).length,
            writeEffective: tools.filter((tool) => tool.capability === 'write' && tool.enabledEffective).length
          },
          tools
        };
      })
    }));
  };

  const handleToggleServer = async (server: TargetToolCatalogServer, enabled: boolean) => {
    if (!canEditServers || pendingToggleServerId || pendingServerMutation) return;
    if (!server.canToggle) return;
    if (server.enabled === enabled) return;
    setPendingToggleServerId(server.id);
    setServerMutationError(null);
    applyServerEnabledState(server.id, enabled);
    try {
      await controlPlaneApi.updateTargetMcpServer(target.workspaceId, target.id, server.id, {
        enabled
      });
      await loadCatalog({ syncParent: true });
    } catch (error) {
      applyServerEnabledState(server.id, server.enabled);
      setServerMutationError(formatMcpMutationError(error, 'Failed updating MCP server.'));
    } finally {
      setPendingToggleServerId(null);
    }
  };

  const handleToggleTool = async (server: TargetToolCatalogServer, tool: TargetToolCatalogItem, requestedEnabled?: boolean) => {
    if (!canManageTools || pendingToolName) return;
    const nextEnabled = requestedEnabled ?? !tool.enabledConfigured;
    if (nextEnabled === tool.enabledConfigured) return;
    setPendingToolName(tool.name);
    setToolMutationError(null);
    try {
      await controlPlaneApi.updateTargetMcpServerTool(target.workspaceId, target.id, server.id, tool.name, {
        enabled: nextEnabled,
        capability: tool.capability
      });
      updateCatalogLocal((current) => ({
        ...current,
        servers: current.servers.map((candidate) => {
          if (candidate.id !== server.id) return candidate;
          const nextTool = {
            ...tool,
            enabledConfigured: nextEnabled,
            ...getOptimisticToolEffectiveState(candidate, tool, nextEnabled)
          };
          const tools: TargetToolCatalogItem[] = candidate.tools.map((item) =>
            item.name === tool.name
              ? nextTool
              : item
          );
          return {
            ...candidate,
            toolCounts: applyToolCountsDelta(candidate.toolCounts, tool, nextTool),
            tools
          };
        })
      }));
      if (toolsServerId === server.id) await serverToolsCollection.refresh();
    } catch (error) {
      const message = formatMcpMutationError(error, 'Failed updating MCP tool.');
      setServerMutationError(message);
      setToolMutationError(message);
      throw error;
    } finally {
      setPendingToolName(null);
    }
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-ui-bg px-4 py-6 custom-scrollbar stable-scrollbar-gutter sm:px-6 lg:px-10 lg:py-8">
      <McpServersViewHeader
        target={target}
        canEditServers={canEditServers}
        onConnectByUrl={openCreateServerModal}
      />

      {toolRefreshError && (
        <div className="type-caption mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-status-warning/25 bg-status-warning-soft px-4 py-3 text-status-warning-text">
          <span>{toolRefreshError}</span>
          <Button size="sm" variant="secondary" onClick={() => toolRefreshServer ? void refreshConnectedServer(toolRefreshServer).catch(() => setToolRefreshError('The PAT is connected, but tools may be stale. Refresh the MCP catalog to retry discovery.')) : void loadCatalog({ syncParent: true })}>{t('common.retry')}</Button>
        </div>
      )}

      {hasAgentWriteBlockedTools && (
        <section className="mb-5 rounded-lg border border-status-warning/30 bg-status-warning-soft px-4 py-3 text-status-warning-text">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 gap-3">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="min-w-0">
                <h2 className="type-row-title">{t('mcpServers.agentWriteModeNoticeTitle')}</h2>
                <p className="type-caption mt-1">{t('mcpServers.agentWriteModeNoticeBody')}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {hasConfiguredWriteTools && !canRequestWriteRuns && (
        <div className="type-caption mb-5 rounded-lg border border-ui-border bg-ui-surface px-4 py-3 text-ui-text-muted">
          {t('mcpServers.roleWriteNotice')}
        </div>
      )}

      <CollectionState
        phase={catalogPhase}
        itemCount={servers.length}
        loading={<InlineLoadingIndicator label={t('mcpServers.loadingCatalog')} className="mb-5" />}
        empty={<EmptyState icon={<Plus />} title={t('mcpServers.empty')} description={t('mcpServers.emptyHelp')} />}
        error={(
          <div className="type-caption mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-status-danger/25 bg-status-danger-soft px-4 py-3 text-status-danger-text">
            <span>{catalogError}</span>
            <Button size="sm" variant="secondary" onClick={() => void loadCatalog({ syncParent: true })}>{t('common.retry')}</Button>
          </div>
        )}
        feedback={catalogError ? (
          <div className="type-caption mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-status-danger/25 bg-status-danger-soft px-4 py-3 text-status-danger-text">
            <span>{catalogError}</span>
            <Button size="sm" variant="secondary" onClick={() => void loadCatalog({ syncParent: true })}>{t('common.retry')}</Button>
          </div>
        ) : <span className="sr-only">{t('mcpServers.loadingCatalog')}</span>}
      >
        <McpServersInventory
          servers={servers}
          canEditServers={canEditServers}
          pendingTestServerId={pendingTestServerId}
          pendingToggleServerId={pendingToggleServerId}
          testResultsByServerId={testResultsByServerId}
          personalConnections={personalConnections}
          personalConnectionErrors={personalConnectionErrors}
          canConnectPersonal={canUsePersonalConnections}
          pendingConnectionServerId={pendingConnectionServerId}
          retryAfterSecondsFor={retryAfterSecondsFor}
          recoveryServerId={recoveryServerId}
          recoveryAction={recoveryAction}
          onManageTools={setSelectedServerId}
          onTestConnection={(targetServer) => void handleTestConnection(targetServer)}
          onToggleServer={(targetServer, enabled) => void handleToggleServer(targetServer, enabled)}
          onEdit={openEditServerModal}
          onDelete={(targetServer) => {
            setServerMutationError(null);
            setDeleteTargetServer(targetServer);
          }}
          onConnectPersonal={setPatDialogServer}
          onVerifyPersonal={(targetServer) => void verifyPersonal(targetServer).then((connection) => {
            if (connection?.status === 'connected') clearSuccessfulRecovery(targetServer.id);
          })}
          onDisconnectPersonal={(targetServer) => void disconnectPersonal(targetServer)}
          onRetryPersonal={(targetServer) => void retryPersonal(targetServer)}
        />
      </CollectionState>
      <TargetMcpPatDialog server={patDialogServer} connection={patDialogServer ? personalConnections[patDialogServer.id] : undefined} retryAfterSeconds={patDialogServer ? retryAfterSecondsFor(patDialogServer.id) : 0} onClose={() => setPatDialogServer(null)} onSubmit={async (credential) => { if (!patDialogServer) return; const connection = await connectPersonal(patDialogServer, credential); if (connection?.status === 'connected') clearSuccessfulRecovery(patDialogServer.id); setPatDialogServer(null); }} />
      <AnimatePresence>
        {activeServerWithPagedTools && (
          <McpServerToolsDialog
            server={activeServerWithPagedTools}
            canManageTools={Boolean(canManageTools)}
            pendingToolName={pendingToolName}
            isLoadingTools={!activeServerTools || activeServerTools.phase === 'loading'}
            isLoadingMoreTools={activeServerTools?.phase === 'loadingMore'}
            toolsError={toolMutationError || activeServerTools?.error || null}
            hasMoreTools={Boolean(activeServerTools?.nextCursor)}
            loadMoreSentinelRef={activeServerTools?.sentinelRef}
            onClose={() => setSelectedServerId(null)}
            onToggleTool={(tool, enabled) => handleToggleTool(activeServerWithPagedTools, tool, enabled)}
            onLoadMoreTools={() => {
              if (activeServerTools?.nextCursor) void activeServerTools.loadMore();
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {serverModalOpen && (
          <McpServerFormDialog
            mode={editingServer ? 'edit' : 'create'}
            urlReadOnly={Boolean(editingServer)}
            form={serverForm}
            mutationError={serverMutationError}
            pending={pendingServerMutation}
            isValid={serverFormIsValid}
            publicHeadersValidationError={publicHeadersValidationError}
            createStep={createReviewServerId ? 'review' : 'configure'}
            reviewServer={createReviewServerWithPagedTools}
            reviewToolsLoading={pendingServerMutation || Boolean(createReviewServerId && !createReviewServerWithPagedTools && !serverMutationError) || createReviewServerTools?.phase === 'loading'}
            reviewToolsError={createReviewServerTools?.error || null}
            canManageTools={Boolean(canManageTools)}
            pendingToolName={pendingToolName}
            onClose={closeServerModal}
            onFormChange={setServerForm}
            onSubmit={() => void handleSubmitServer()}
            onToggleReviewTool={(tool, enabled) => {
              if (createReviewServerWithPagedTools) void handleToggleTool(createReviewServerWithPagedTools, tool, enabled).catch(() => undefined);
            }}
            onFinishReview={closeServerModal}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTargetServer && (
          <DeleteMcpServerDialog
            server={deleteTargetServer}
            mutationError={serverMutationError}
            pending={pendingServerMutation}
            onClose={() => setDeleteTargetServer(null)}
            onDelete={() => void handleDeleteServer()}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
