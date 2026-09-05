import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { TargetToolCatalog, TargetToolCatalogItem, TargetToolCatalogServer } from '@/features/targets/admin/targetMcpCatalogTypes';
import { PageShell } from '@acornops/ui';
import { TargetMcpServerTestConnectionResult } from '@/services/controlPlaneApi';
import { updateUrlSearch, useUrlSearchState } from '@/hooks/useUrlSearchState';
import { McpServersInventory } from '@/features/targets/admin/McpServersInventory';
import { DeleteMcpServerDialog, McpServerFormDialog } from '@/features/targets/admin/McpServersDialogs';
import { McpServerToolsDialog } from '@/features/targets/admin/McpServerToolsDialog';
import { useMcpConnections } from '@/features/catalog/useMcpConnections';
import { McpInstallationConnectionDialog } from '@/features/catalog/McpInstallationConnectionDialog';
import {
  mcpOAuthVerificationMessages,
  useMcpOAuthReturnFeedback
} from '@/features/catalog/useMcpOAuthReturnFeedback';
import { McpServersViewHeader } from '@/features/targets/admin/McpServersViewHeader';
import { McpServersCatalogState } from '@/features/targets/admin/McpServersCatalogState';
import {
  applyToolCountsDelta,
  buildMcpToolUpdateInput,
  completeMcpOAuthConnection,
  findMcpCatalogServer,
  findMcpOAuthCallbackServer,
  getOptimisticToolEffectiveState,
  mcpOAuthCallbackMatchesServer,
  mcpToolCollectionStrategy,
  pendingCatalogServer
} from '@/features/targets/admin/McpServersView.helpers';
import { useCursorCollection } from '@/hooks/useCursorCollection';
import { useTargetMcpCredentialModeImpact } from '@/features/targets/admin/useTargetMcpCredentialModeImpact';
import { McpServersNotices } from '@/features/targets/admin/McpServersNotices';
import { parseMcpRecoveryAction } from '@/features/catalog/mcpConnectionActions';
import { useAgentTargetsMcpSettingsDialog } from '@/features/targets/admin/useAgentTargetsMcpSettingsDialog';
import { useMcpServerActionFeedback } from '@/features/targets/admin/useMcpServerActionFeedback';
import {
  buildLocalCatalog, computeToolCounts,
  flattenCatalogTools,
  formatMcpMutationError, isMcpCredentialCleanupIncomplete,
} from '@/features/targets/admin/mcpServersCatalog';
import { useMcpServerFormState } from '@/features/targets/admin/useMcpServerFormState';
import { createMcpServerToolsPageLoader, resolveMcpCatalogPhase, targetMcpServersDataSource, type McpServersViewProps } from '@/features/targets/admin/McpServersView.data';
export type { McpServersDataSource } from '@/features/targets/admin/McpServersView.data';
export const McpServersView: React.FC<McpServersViewProps> = ({
  subject,
  canManageMcp = false,
  canRemoveMcp,
  canManageTools = false,
  canDisableTools,
  canRequestWriteRuns = false,
  initialCatalog = null,
  onCatalogChange,
  onSyncTools,
  dataSource = targetMcpServersDataSource,
  connectionDestination = { kind: 'target', id: subject.id },
  scheduleCount, targetAccessSettings
}) => {
  const { t } = useTranslation();
  const actionFeedback = useMcpServerActionFeedback(t);
  const urlSearch = useUrlSearchState();
  const recoveryServerId = urlSearch.get('mcpServer');
  const requestedMcpAction = urlSearch.get('mcpAction');
  const oauthResult = urlSearch.get('mcpOAuthResult');
  const oauthServerId = urlSearch.get('mcpOAuthServerId');
  const recoveryAction = parseMcpRecoveryAction(requestedMcpAction);
  const [catalog, setCatalog] = useState<TargetToolCatalog | null>(() => initialCatalog);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [pendingToolName, setPendingToolName] = useState<string | null>(null);
  const [toolMutationError, setToolMutationError] = useState<string | null>(null);
  const credentialModeImpact = useTargetMcpCredentialModeImpact(subject.workspaceId, subject.id, scheduleCount);
  const [toolRefreshError, setToolRefreshError] = useState<string | null>(null);
  const [toolRefreshServer, setToolRefreshServer] = useState<TargetToolCatalogServer | null>(null);
  const [credentialDialogServer, setCredentialDialogServer] = useState<TargetToolCatalogServer | null>(null);
  const [pendingCreateServer, setPendingCreateServer] = useState<TargetToolCatalogServer | null>(null);
  const [pendingServerMutation, setPendingServerMutation] = useState(false);
  const [deleteTargetServer, setDeleteTargetServer] = useState<TargetToolCatalogServer | null>(null);
  const [pendingTestServerId, setPendingTestServerId] = useState<string | null>(null);
  const [pendingToggleServerId, setPendingToggleServerId] = useState<string | null>(null);
  const [testResultsByServerId, setTestResultsByServerId] = useState<Record<string, TargetMcpServerTestConnectionResult>>({});
  const onSyncToolsRef = useRef(onSyncTools);
  const localCatalog = useMemo(() => buildLocalCatalog(subject, canManageMcp), [subject, canManageMcp]);
  const [openTargetAccessSettings, targetAccessSettingsDialog] = useAgentTargetsMcpSettingsDialog(subject, targetAccessSettings);
  const activeCatalog = catalog || localCatalog;
  const canEditServers = canManageMcp && activeCatalog.permissions.canEdit;
  const canRemoveServers = canRemoveMcp ?? canEditServers;
  const canDisableServerTools = canDisableTools ?? canManageTools;
  const clearServerNotice = useCallback(() => actionFeedback.setNotice(null), [actionFeedback.setNotice]);
  const {
    buildAuthPayload, buildPublicHeadersPayload, changeServerForm, closeServerModal,
    connectionSettingsChanged, connectionSettingsConfirmation, createReviewServerId,
    editingServer, openCreateServerModal, openEditServerModal, publicHeadersValidationError,
    refreshEditingServer,
    authHeaderValidationError, serverForm, serverFormIsValid, serverModalOpen, serverMutationError, serverUrlValidationError,
    setConnectionSettingsConfirmation, setCreateReviewServerId, setServerModalOpen,
    setServerMutationError
  } = useMcpServerFormState({
    canEditServers,
    clearCredentialModeImpact: credentialModeImpact.clear,
    clearNotice: clearServerNotice,
    t
  });
  const servers = activeCatalog.servers;
  const hasConfiguredWriteTools = servers.some((server) => server.toolCounts.writeConfigured > 0);
  const hasAgentWriteBlockedTools = servers.some(
    (server) => server.enabled && server.toolCounts.writeConfigured > server.toolCounts.writeEffective
  );
  const hasLocalFallbackServers = localCatalog.servers.length > 0;
  const catalogPhase = resolveMcpCatalogPhase(catalog, catalogError, hasLocalFallbackServers);
  const activeServer = findMcpCatalogServer(servers, selectedServerId);
  const catalogCreateReviewServer = findMcpCatalogServer(servers, createReviewServerId);
  const createReviewServer = findMcpCatalogServer(servers, createReviewServerId, pendingCreateServer);
  const toolsServerId = selectedServerId || createReviewServerId || toolRefreshServer?.id || '';
  const loadServerToolsPage = useMemo(() => createMcpServerToolsPageLoader({
    dataSource,
    workspaceId: subject.workspaceId,
    subjectId: subject.id,
    errorMessage: t('mcpServers.loadToolsFailed')
  }), [dataSource, subject.id, subject.workspaceId, t]);
  const serverToolsCollection = useCursorCollection({
    cacheKey: `workspace:${subject.workspaceId}:target:${subject.id}:mcp-server-tools`,
    clearItemsOnScopeChange: true,
    filters: { serverId: toolsServerId },
    getKey: (tool: TargetToolCatalogItem) => tool.name,
    loadPage: loadServerToolsPage,
    pageSize: 50,
    strategy: mcpToolCollectionStrategy(createReviewServerId, toolsServerId)
  });
  const activeServerTools = activeServer && toolsServerId === activeServer.id ? serverToolsCollection : undefined;
  const activeServerWithPagedTools = activeServer
    ? { ...activeServer, tools: activeServerTools?.items || activeServer.tools }
    : null;
  const createReviewServerTools = createReviewServer && toolsServerId === createReviewServer.id ? serverToolsCollection : undefined;
  const createReviewServerWithPagedTools = createReviewServer
    ? { ...createReviewServer,
      toolCounts: catalogCreateReviewServer?.toolCounts || computeToolCounts(createReviewServerTools?.items || createReviewServer.tools),
      tools: createReviewServerTools?.items || createReviewServer.tools }
    : null;
  useEffect(() => { onSyncToolsRef.current = onSyncTools; }, [onSyncTools]);
  useEffect(() => {
    setToolMutationError(null);
  }, [toolsServerId]);
  useEffect(() => {
    if (
      toolRefreshServer
      && toolsServerId === toolRefreshServer.id
      && serverToolsCollection.phase === 'error'
    ) {
      setToolRefreshError(serverToolsCollection.error || 'The credential is connected, but tools may be stale. Refresh the MCP catalog to retry discovery.');
    }
  }, [serverToolsCollection.error, serverToolsCollection.phase, toolRefreshServer, toolsServerId]);
  const loadCatalog = useCallback(async (options?: { syncParent?: boolean }) => {
    setCatalogError(null);
    try {
      const loadedCatalog = await dataSource.getCatalog(subject.workspaceId, subject.id);
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
  }, [dataSource, subject.id, subject.workspaceId]);
  const refreshConnectedServer = useCallback(async (server: TargetToolCatalogServer) => {
    setToolRefreshError(null);
    setToolRefreshServer(server);
    const loadedCatalog = await loadCatalog({ syncParent: true });
    if (pendingCreateServer?.id === server.id) {
      setSelectedServerId(null);
      setCreateReviewServerId(server.id);
      setServerModalOpen(true);
    }
    setToolRefreshServer(null);
    if (!loadedCatalog) throw new Error('MCP tool refresh failed');
  }, [loadCatalog, pendingCreateServer]);
  const {
    connect,
    prepareOAuth,
    startOAuth,
    disconnect,
    verify,
    retry,
    reloadConnections,
    pendingServerId: pendingConnectionServerId,
    connections,
    connectionErrors,
    retryAfterSecondsFor
  } = useMcpConnections({
    installations: servers,
    workspaceId: subject.workspaceId,
    destination: connectionDestination,
    onError: actionFeedback.setError,
    onConnectionReady: refreshConnectedServer,
    onRefreshError: (_server, message) => setToolRefreshError(message)
  });
  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);
  const oauthReturnPath = useMcpOAuthReturnFeedback({
    result: oauthResult,
    serverId: oauthServerId,
    successMessage: t('mcpServers.oauthConnected'),
    failureMessage: t('mcpServers.oauthAuthorizationFailed'),
    verificationMessages: mcpOAuthVerificationMessages(t),
    setNotice: actionFeedback.setNotice,
    setError: (message, callbackServerId) => {
      actionFeedback.setError(message);
      if (!message) return;
      if (mcpOAuthCallbackMatchesServer(callbackServerId, credentialDialogServer)) setCredentialDialogServer(null);
      else if (credentialDialogServer) setToolRefreshError(message);
    },
    onConnected: (callbackServerId) => completeMcpOAuthConnection({
      server: findMcpOAuthCallbackServer(servers, callbackServerId, pendingCreateServer),
      closeDialog: () => {
        if (mcpOAuthCallbackMatchesServer(callbackServerId, credentialDialogServer)) setCredentialDialogServer(null);
      },
      reloadConnections,
      refreshConnectedServer,
      refreshCatalog: async () => {
        if (!await loadCatalog({ syncParent: true })) throw new Error('MCP catalog refresh failed');
      },
      onRefreshError: () => {
        actionFeedback.setNotice('');
        setToolRefreshError(t('mcpServers.oauthRefreshFailed'));
      }
    }),
    onVerificationFailed: reloadConnections
  });
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
  useEffect(() => {
    if (requestedMcpAction !== 'connect_by_url' || !canEditServers) return;
    openCreateServerModal();
    updateUrlSearch({ mcpAction: null }, { replace: true });
  }, [canEditServers, openCreateServerModal, requestedMcpAction]);

  const effectiveCredentialMode = serverForm.authType === 'none'
    ? 'none'
    : serverForm.authType === 'oauth' ? 'individual' : serverForm.credentialMode;
  const handleSubmitServer = async (connectionChangeConfirmed = false) => {
    if (!canEditServers || pendingServerMutation || credentialModeImpact.loading) return;
    const modeChanged = Boolean(
      editingServer && effectiveCredentialMode !== editingServer.credentialMode
    );
    const ownershipModeChanged = Boolean(
      editingServer
      && modeChanged
      && editingServer.credentialMode !== 'none'
      && effectiveCredentialMode !== 'none'
    );
    const requiresCredentialReconnect = Boolean(
      editingServer && (connectionSettingsChanged || editingServer.credentialTransitioning)
    );
    if (editingServer && connectionSettingsChanged && !connectionChangeConfirmed) {
      setServerMutationError(null);
      setConnectionSettingsConfirmation(false);
      if (!ownershipModeChanged) {
        credentialModeImpact.clear();
        setConnectionSettingsConfirmation(true);
        return;
      }
      try {
        await credentialModeImpact.prepare(
          editingServer.id,
          effectiveCredentialMode === 'workspace' ? 'workspace' : 'individual'
        );
      } catch (error) {
        setServerMutationError(formatMcpMutationError(error, t('mcpServers.credentialModeImpactFailed')));
      }
      return;
    }
    setPendingServerMutation(true);
    setServerMutationError(null);
    try {
      if (editingServer) {
        const updatedServer = await dataSource.updateServer(subject.workspaceId, subject.id, editingServer.id, {
          name: serverForm.name.trim(),
          enabled: serverForm.enabled,
          publicHeaders: buildPublicHeadersPayload(true),
          credentialMode: effectiveCredentialMode,
          auth: buildAuthPayload(),
          expectedRevision: editingServer.revision
        });
        closeServerModal();
        const loadedCatalog = await loadCatalog({ syncParent: true });
        if (requiresCredentialReconnect && updatedServer.credentialMode !== 'none') {
          const affectedScheduleCount = credentialModeImpact.impact?.affectedScheduleCount || 0;
          actionFeedback.setNotice(ownershipModeChanged && affectedScheduleCount > 0
            ? t('mcpServers.credentialModeChangedSchedulesPaused', { count: affectedScheduleCount })
            : ownershipModeChanged
              ? t('mcpServers.credentialModeChanged')
              : t('mcpServers.connectionSettingsChangedReconnect'));
          const loadedServer = loadedCatalog?.servers.find((server) => server.id === updatedServer.id);
          setCredentialDialogServer(loadedServer || pendingCatalogServer(updatedServer));
        } else if (requiresCredentialReconnect) {
          actionFeedback.setNotice(t('mcpServers.connectionSettingsChangedVerify'));
        }
      } else {
        const createdServer = await dataSource.createServer(subject.workspaceId, subject.id, {
          name: serverForm.name.trim(),
          url: serverForm.url.trim(),
          enabled: serverForm.enabled,
          publicHeaders: buildPublicHeadersPayload(),
          credentialMode: effectiveCredentialMode,
          auth: buildAuthPayload()
        });
        const pendingServer = pendingCatalogServer(createdServer);
        setPendingCreateServer(pendingServer);
        const loadedCatalog = await loadCatalog({ syncParent: true });
        const loadedServer = loadedCatalog?.servers.find((server) => server.id === createdServer.id);
        if (serverForm.authType !== 'none') {
          closeServerModal();
          setCredentialDialogServer(loadedServer || pendingServer);
          if (!loadedServer) {
            setToolRefreshError('The authenticated installation was created, but its catalog entry could not be refreshed. Continue connecting the credential, then retry the catalog refresh if tools remain stale.');
          }
        } else {
          setCreateReviewServerId(createdServer.id);
        }
      }
    } catch (error) {
      if (editingServer && isMcpCredentialCleanupIncomplete(error)) {
        const refreshedCatalog = await loadCatalog({ syncParent: true });
        const refreshedServer = refreshedCatalog?.servers.find(
          (server) => server.id === editingServer.id
        );
        if (refreshedServer) refreshEditingServer(refreshedServer);
        setServerMutationError(t('mcpServers.credentialCleanupIncomplete'));
        return;
      }
      const message = formatMcpMutationError(error, editingServer ? 'Failed updating MCP server.' : 'Failed adding MCP server.');
      setServerMutationError(message);
    } finally {
      setPendingServerMutation(false);
    }
  };

  const handleDeleteServer = async () => {
    if (!deleteTargetServer || !canRemoveServers || pendingServerMutation) return;
    setPendingServerMutation(true);
    setServerMutationError(null);
    try {
      await dataSource.deleteServer(subject.workspaceId, subject.id, deleteTargetServer.id);
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
    actionFeedback.clear();
    try {
      const result = await dataSource.testServer(subject.workspaceId, subject.id, server.id);
      setTestResultsByServerId((current) => ({ ...current, [server.id]: result }));
      await loadCatalog({ syncParent: true });
      actionFeedback.reportRefreshResult(result);
    } catch (error) {
      actionFeedback.setError(formatMcpMutationError(error, t('mcpServers.refreshToolsFailedMessage')));
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
          enabledEffective: enabled
            && tool.enabledConfigured
            && tool.effectiveDisabledReason !== 'agent_disconnected'
            && tool.effectiveDisabledReason !== 'agent_write_disabled',
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
    if ((enabled ? !canEditServers : !canRemoveServers) || pendingToggleServerId || pendingServerMutation) return;
    if (!server.canToggle) return;
    if (server.enabled === enabled) return;
    setPendingToggleServerId(server.id);
    actionFeedback.setError(null);
    applyServerEnabledState(server.id, enabled);
    try {
      await dataSource.updateServer(subject.workspaceId, subject.id, server.id, {
        enabled
      });
      await loadCatalog({ syncParent: true });
    } catch (error) {
      applyServerEnabledState(server.id, server.enabled);
      actionFeedback.setError(formatMcpMutationError(error, 'Failed updating MCP server.'));
    } finally {
      setPendingToggleServerId(null);
    }
  };
  const handleToggleTool = async (
    server: TargetToolCatalogServer,
    tool: TargetToolCatalogItem,
    requestedEnabled?: boolean,
    requestedCapability?: 'read' | 'write'
  ) => {
    const nextEnabled = requestedEnabled ?? !tool.enabledConfigured;
    const nextCapability = requestedCapability ?? tool.capability;
    const changesCapability = nextCapability !== tool.capability;
    if ((nextEnabled || changesCapability ? !canManageTools : !canDisableServerTools) || pendingToolName) return;
    if (nextEnabled === tool.enabledConfigured && nextCapability === tool.capability) return;
    setPendingToolName(tool.name);
    setToolMutationError(null);
    try {
      await dataSource.updateServerTool(
        subject.workspaceId,
        subject.id,
        server.id,
        tool.name,
        buildMcpToolUpdateInput(server, tool, nextEnabled, nextCapability)
      );
      updateCatalogLocal((current) => ({
        ...current,
        servers: current.servers.map((candidate) => {
          if (candidate.id !== server.id) return candidate;
          const nextToolBasis = {
            ...tool,
            capability: nextCapability
          };
          const nextTool = {
            ...nextToolBasis,
            enabledConfigured: nextEnabled,
            ...getOptimisticToolEffectiveState(candidate, nextToolBasis, nextEnabled)
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
  const inventory = (
    <McpServersInventory
      servers={servers}
      canEditServers={canEditServers}
      canRemoveServers={canRemoveServers}
      pendingTestServerId={pendingTestServerId}
      pendingToggleServerId={pendingToggleServerId}
      testResultsByServerId={testResultsByServerId}
      connections={connections}
      connectionErrors={connectionErrors}
      pendingConnectionServerId={pendingConnectionServerId}
      retryAfterSecondsFor={retryAfterSecondsFor}
      recoveryServerId={recoveryServerId}
      recoveryAction={recoveryAction}
      onManageTools={setSelectedServerId}
      onOpenSettings={targetAccessSettings ? openTargetAccessSettings : undefined}
      onTestConnection={(targetServer) => void handleTestConnection(targetServer)}
      onToggleServer={(targetServer, enabled) => void handleToggleServer(targetServer, enabled)}
      onEdit={openEditServerModal}
      onDelete={(targetServer) => {
        setServerMutationError(null);
        setDeleteTargetServer(targetServer);
      }}
      onConnect={setCredentialDialogServer}
      onVerify={(targetServer) => void actionFeedback.verifyConnection(targetServer, verify, () => clearSuccessfulRecovery(targetServer.id))}
      onDisconnect={(targetServer) => void actionFeedback.disconnectCredential(targetServer, disconnect)}
      onRetry={(targetServer) => void retry(targetServer)}
    />
  );
  return (
    <PageShell>
      <McpServersViewHeader
        subject={subject}
        canEditServers={canEditServers}
        onConnectByUrl={openCreateServerModal}
      />
      <McpServersNotices
        toolRefreshError={toolRefreshError}
        hasAgentWriteBlockedTools={hasAgentWriteBlockedTools}
        hasConfiguredWriteTools={hasConfiguredWriteTools}
        canRequestWriteRuns={canRequestWriteRuns}
        mutationNotice={actionFeedback.notice}
        mutationError={credentialDialogServer ? null : actionFeedback.error}
        onRetryToolRefresh={() => toolRefreshServer
          ? void refreshConnectedServer(toolRefreshServer).catch(() => setToolRefreshError('The credential is connected, but tools may be stale. Refresh the MCP catalog to retry discovery.'))
          : void loadCatalog({ syncParent: true })}
      />
      <McpServersCatalogState phase={catalogPhase} itemCount={servers.length} error={catalogError}
        onRetry={() => void loadCatalog({ syncParent: true })}>{inventory}</McpServersCatalogState>
      <McpInstallationConnectionDialog
        installation={credentialDialogServer}
        connection={credentialDialogServer ? connections[credentialDialogServer.id] : undefined}
        returnPath={oauthReturnPath}
        retryAfterSeconds={credentialDialogServer ? retryAfterSecondsFor(credentialDialogServer.id) : 0}
        onClose={() => { setCredentialDialogServer(null); actionFeedback.setError(null); }}
        onCredentialSubmit={async (credential) => { if (!credentialDialogServer) return; const server = credentialDialogServer; await actionFeedback.connectCredential(server, credential, connect, () => { clearSuccessfulRecovery(server.id); setCredentialDialogServer(null); }); }}
        onPrepareOAuth={async (returnPath) => credentialDialogServer ? prepareOAuth(credentialDialogServer, returnPath) : undefined}
        onStartOAuth={async (preparationHandle, issuer) => credentialDialogServer ? startOAuth(credentialDialogServer, preparationHandle, issuer) : undefined}
      />
      {targetAccessSettingsDialog}
      <AnimatePresence>
        {activeServerWithPagedTools && (
          <McpServerToolsDialog
            server={activeServerWithPagedTools}
            canManageTools={Boolean(canManageTools)}
            canDisableTools={Boolean(canDisableServerTools)}
            pendingToolName={pendingToolName}
            isLoadingTools={!activeServerTools || activeServerTools.phase === 'loading'}
            isLoadingMoreTools={activeServerTools?.phase === 'loadingMore'}
            toolsError={toolMutationError || activeServerTools?.error || null}
            hasMoreTools={Boolean(activeServerTools?.nextCursor)}
            loadMoreSentinelRef={activeServerTools?.sentinelRef}
            onClose={() => setSelectedServerId(null)}
            onToggleTool={(tool, enabled) => handleToggleTool(activeServerWithPagedTools, tool, enabled)}
            onLoadAllTools={activeServerTools?.loadAll}
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
            pending={pendingServerMutation || credentialModeImpact.loading}
            isValid={serverFormIsValid}
            authHeaderValidationError={authHeaderValidationError} publicHeadersValidationError={publicHeadersValidationError} serverUrlValidationError={serverUrlValidationError}
            createStep={createReviewServerId ? 'review' : 'configure'}
            reviewServer={createReviewServerWithPagedTools}
            reviewToolsLoading={pendingServerMutation || Boolean(createReviewServerId && !createReviewServerWithPagedTools && !serverMutationError) || createReviewServerTools?.phase === 'loading'}
            reviewToolsError={createReviewServerTools?.error || null}
            onRetryReviewTools={() => void createReviewServerTools?.retry()}
            canManageTools={Boolean(canManageTools)}
            pendingToolName={pendingToolName}
            onClose={() => { setPendingCreateServer(null); closeServerModal(); }}
            onFormChange={changeServerForm}
            onSubmit={() => void handleSubmitServer()}
            credentialModeConfirmation={credentialModeImpact.impact && editingServer ? {
              serverName: editingServer.name,
              destinationKind: connectionDestination.kind,
              credentialMode: effectiveCredentialMode === 'workspace' ? 'workspace' : 'individual',
              affectedScheduleCount: credentialModeImpact.impact.affectedScheduleCount,
              onCancel: credentialModeImpact.clear,
              onConfirm: () => {
                credentialModeImpact.clear();
                void handleSubmitServer(true);
              }
            } : null}
            connectionSettingsConfirmation={connectionSettingsConfirmation && editingServer ? {
              serverName: editingServer.name,
              credentialRequired: effectiveCredentialMode !== 'none',
              onCancel: () => setConnectionSettingsConfirmation(false),
              onConfirm: () => {
                setConnectionSettingsConfirmation(false);
                void handleSubmitServer(true);
              }
            } : null}
            onToggleReviewTool={(tool, enabled) => {
              if (createReviewServerWithPagedTools) void handleToggleTool(createReviewServerWithPagedTools, tool, enabled).catch(() => undefined);
            }}
            onChangeReviewToolCapability={(tool, capability) => {
              if (createReviewServerWithPagedTools) {
                void handleToggleTool(
                  createReviewServerWithPagedTools,
                  tool,
                  tool.enabledConfigured,
                  capability
                ).catch(() => undefined);
              }
            }}
            onFinishReview={() => { setPendingCreateServer(null); closeServerModal(); }}
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
    </PageShell>
  );
};
