import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { TargetToolCatalog, TargetToolCatalogItem, TargetToolCatalogServer } from '@/features/targets/admin/targetMcpCatalogTypes';
import { Button, CollectionState, PageShell } from '@acornops/ui';
import { TargetMcpServerTestConnectionResult } from '@/services/controlPlaneApi';
import { updateUrlSearch, useUrlSearchState } from '@/hooks/useUrlSearchState';
import { McpServersInventory } from '@/features/targets/admin/McpServersInventory';
import { McpServersCatalogLoading } from '@/features/targets/admin/TargetCapabilityInventoryLoading';
import { DeleteMcpServerDialog, McpServerFormDialog } from '@/features/targets/admin/McpServersDialogs';
import { McpServerToolsDialog } from '@/features/targets/admin/McpServerToolsDialog';
import { useMcpConnections } from '@/features/catalog/useMcpConnections';
import { McpInstallationConnectionDialog } from '@/features/catalog/McpInstallationConnectionDialog';
import { useMcpOAuthReturnFeedback } from '@/features/catalog/useMcpOAuthReturnFeedback';
import { McpServersViewHeader } from '@/features/targets/admin/McpServersViewHeader';
import { applyToolCountsDelta, getOptimisticToolEffectiveState, pendingCatalogServer } from '@/features/targets/admin/McpServersView.helpers';
import { useCursorCollection } from '@/hooks/useCursorCollection';
import { useTargetMcpCredentialModeImpact } from '@/features/targets/admin/useTargetMcpCredentialModeImpact';
import { McpServersNotices } from '@/features/targets/admin/McpServersNotices';
import { parseMcpRecoveryAction } from '@/features/catalog/mcpConnectionActions';
import { useAgentTargetsMcpSettingsDialog } from '@/features/targets/admin/useAgentTargetsMcpSettingsDialog';
import { useMcpServerActionFeedback } from '@/features/targets/admin/useMcpServerActionFeedback';
import {
  buildLocalCatalog,
  publicHeaderRowsFromRecord,
  DEFAULT_SERVER_FORM,
  flattenCatalogTools,
  formatMcpMutationError,
  mcpServerFormSubmission,
  ServerFormState,
} from '@/features/targets/admin/mcpServersCatalog';
import { resolveMcpCatalogPhase, targetMcpServersDataSource, type McpServersViewProps } from '@/features/targets/admin/McpServersView.data';

export type { McpServersDataSource } from '@/features/targets/admin/McpServersView.data';
export const McpServersView: React.FC<McpServersViewProps> = ({
  subject,
  canManageMcp = false,
  canManageTools = false,
  canRequestWriteRuns = false,
  initialCatalog = null,
  onCatalogChange,
  onSyncTools,
  dataSource = targetMcpServersDataSource,
  connectionDestination = { kind: 'target', id: subject.id },
  catalogDestination,
  scheduleCount, targetAccessSettings
}) => {
  const { t } = useTranslation();
  const actionFeedback = useMcpServerActionFeedback(t);
  const urlSearch = useUrlSearchState();
  const recoveryServerId = urlSearch.get('mcpServer');
  const requestedMcpAction = urlSearch.get('mcpAction');
  const oauthResult = urlSearch.get('mcpOAuthResult');
  const recoveryAction = parseMcpRecoveryAction(requestedMcpAction);
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
  const credentialModeImpact = useTargetMcpCredentialModeImpact(subject.workspaceId, subject.id, scheduleCount);
  const [toolRefreshError, setToolRefreshError] = useState<string | null>(null);
  const [toolRefreshServer, setToolRefreshServer] = useState<TargetToolCatalogServer | null>(null);
  const [credentialDialogServer, setCredentialDialogServer] = useState<TargetToolCatalogServer | null>(null);
  const [pendingAuthenticatedCreateServerId, setPendingAuthenticatedCreateServerId] = useState<string | null>(null);
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
  const servers = activeCatalog.servers;
  const hasConfiguredWriteTools = servers.some((server) => server.toolCounts.writeConfigured > 0);
  const hasAgentWriteBlockedTools = servers.some(
    (server) => server.enabled && server.toolCounts.writeConfigured > server.toolCounts.writeEffective
  );
  const hasLocalFallbackServers = localCatalog.servers.length > 0;
  const catalogPhase = resolveMcpCatalogPhase(catalog, catalogError, hasLocalFallbackServers);
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
      return await dataSource.listServerTools(subject.workspaceId, subject.id, filters.serverId, {
        limit,
        cursor,
        signal
      });
    } catch (error) {
      throw new Error(formatMcpMutationError(error, t('mcpServers.loadToolsFailed')));
    }
  }, [dataSource, subject.id, subject.workspaceId, t]);
  const serverToolsCollection = useCursorCollection({
    cacheKey: `workspace:${subject.workspaceId}:target:${subject.id}:mcp-server-tools`,
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
    if (!loadedCatalog) throw new Error('MCP tool refresh failed');
    if (pendingAuthenticatedCreateServerId === server.id) {
      setPendingAuthenticatedCreateServerId(null);
      setCreateReviewServerId(server.id);
      setServerModalOpen(true);
      setToolRefreshServer(null);
    }
  }, [loadCatalog, pendingAuthenticatedCreateServerId]);
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
    successMessage: t('mcpServers.oauthConnected'),
    failureMessage: t('mcpServers.oauthAuthorizationFailed'),
    verificationMessages: {
      authenticationRejected: t('mcpServers.oauthAuthenticationRejected'),
      discoveryResponseTooLarge: t('mcpServers.oauthDiscoveryResponseTooLarge'),
      discoveryTimeout: t('mcpServers.oauthDiscoveryTimeout'),
      egressBlocked: t('mcpServers.oauthEgressBlocked'),
      endpointNotFound: t('mcpServers.oauthEndpointNotFound'),
      endpointUnavailable: t('mcpServers.oauthEndpointUnavailable'),
      protocolError: t('mcpServers.oauthProtocolError'),
      toolDiscoveryFailed: t('mcpServers.oauthVerificationFailed')
    },
    setNotice: actionFeedback.setNotice,
    setError: actionFeedback.setError,
    onConnected: () => loadCatalog({ syncParent: true }).then(() => undefined),
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

  const openCreateServerModal = () => {
    if (!canEditServers) return;
    setEditingServer(null);
    setCreateReviewServerId(null);
    setServerForm({ ...DEFAULT_SERVER_FORM, publicHeaders: [] });
    setServerMutationError(null);
    actionFeedback.setNotice(null);
    credentialModeImpact.clear();
    setServerModalOpen(true);
  };

  useEffect(() => {
    if (requestedMcpAction !== 'connect_by_url' || !canEditServers) return;
    setEditingServer(null);
    setCreateReviewServerId(null);
    setServerForm({ ...DEFAULT_SERVER_FORM, publicHeaders: [] });
    setServerMutationError(null);
    credentialModeImpact.clear();
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
      credentialMode: server.credentialMode,
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
    credentialModeImpact.clear();
    setServerForm({ ...DEFAULT_SERVER_FORM, publicHeaders: [] });
  };

  const {
    publicHeadersValidationError,
    serverFormIsValid,
    buildAuthPayload,
    buildPublicHeadersPayload
  } = mcpServerFormSubmission(serverForm, editingServer, t);

  const handleSubmitServer = async (credentialModeChangeConfirmed = false) => {
    if (!canEditServers || pendingServerMutation || credentialModeImpact.loading) return;
    const modeChanged = Boolean(
      editingServer && serverForm.credentialMode !== editingServer.credentialMode
    );
    if (modeChanged && !credentialModeChangeConfirmed) {
      setServerMutationError(null);
      try {
        await credentialModeImpact.prepare(editingServer!.id, serverForm.credentialMode === 'workspace' ? 'workspace' : 'individual');
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
          credentialMode: serverForm.authType === 'none'
            ? 'none'
            : serverForm.authType === 'oauth' ? 'individual' : serverForm.credentialMode,
          auth: buildAuthPayload(),
          expectedRevision: editingServer.revision
        });
        closeServerModal();
        const loadedCatalog = await loadCatalog({ syncParent: true });
        if (modeChanged && updatedServer.credentialMode !== 'none') {
          const affectedScheduleCount = credentialModeImpact.impact?.affectedScheduleCount || 0;
          actionFeedback.setNotice(affectedScheduleCount > 0
            ? t('mcpServers.credentialModeChangedSchedulesPaused', { count: affectedScheduleCount })
            : t('mcpServers.credentialModeChanged'));
          const loadedServer = loadedCatalog?.servers.find((server) => server.id === updatedServer.id);
          setCredentialDialogServer(loadedServer || pendingCatalogServer(updatedServer));
        }
      } else {
        const createdServer = await dataSource.createServer(subject.workspaceId, subject.id, {
          name: serverForm.name.trim(),
          url: serverForm.url.trim(),
          enabled: serverForm.enabled,
          publicHeaders: buildPublicHeadersPayload(),
          credentialMode: serverForm.authType === 'none'
            ? 'none'
            : serverForm.authType === 'oauth' ? 'individual' : serverForm.credentialMode,
          auth: buildAuthPayload()
        });
        const loadedCatalog = await loadCatalog({ syncParent: true });
        const loadedServer = loadedCatalog?.servers.find((server) => server.id === createdServer.id);
        if (serverForm.authType !== 'none') {
          closeServerModal();
          setPendingAuthenticatedCreateServerId(createdServer.id);
          setCredentialDialogServer(loadedServer || pendingCatalogServer(createdServer));
          if (!loadedServer) {
            setToolRefreshError('The authenticated installation was created, but its catalog entry could not be refreshed. Continue connecting the credential, then retry the catalog refresh if tools remain stale.');
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
    if (!canManageTools || pendingToolName) return;
    const nextEnabled = requestedEnabled ?? !tool.enabledConfigured;
    const nextCapability = requestedCapability ?? tool.capability;
    if (nextEnabled === tool.enabledConfigured && nextCapability === tool.capability) return;
    setPendingToolName(tool.name);
    setToolMutationError(null);
    try {
      await dataSource.updateServerTool(subject.workspaceId, subject.id, server.id, tool.name, {
        enabled: nextEnabled,
        capability: nextCapability
      });
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
        catalogDestination={catalogDestination}
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
      <CollectionState
        phase={catalogPhase}
        itemCount={servers.length}
        loading={<McpServersCatalogLoading caption={t('mcpServers.title')} label={t('mcpServers.loadingCatalog')}
          labels={{ server: t('mcpServers.server'), status: t('mcpServers.status'), enabled: t('mcpServers.enabled'), tools: t('mcpServers.tools'), actions: t('mcpServers.actions') }}
        />}
        empty={inventory}
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
        {inventory}
      </CollectionState>
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
            credentialModeConfirmation={credentialModeImpact.impact && editingServer ? {
              serverName: editingServer.name,
              credentialMode: serverForm.credentialMode === 'workspace' ? 'workspace' : 'individual',
              affectedScheduleCount: credentialModeImpact.impact.affectedScheduleCount,
              onCancel: credentialModeImpact.clear,
              onConfirm: () => {
                credentialModeImpact.clear();
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
    </PageShell>
  );
};
