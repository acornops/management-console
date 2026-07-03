import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Plus, ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type {
  TargetToolCatalog,
  TargetToolCatalogItem,
  TargetToolCatalogServer
} from '@/features/targets/admin/targetMcpCatalogTypes';
import { Button } from '@/components/common/Button';
import { InlineLoadingIndicator } from '@/components/common/Loading';
import { TargetMcpServerTestConnectionResult, controlPlaneApi, CreateTargetMcpServerInput } from '@/services/controlPlaneApi';
import type { TargetDescriptor, TargetMcpToolSummary } from '@/features/targets/targetDescriptor';
import { McpServersInventory } from '@/features/targets/admin/McpServersInventory';
import {
  DeleteMcpServerDialog,
  McpServerFormDialog
} from '@/features/targets/admin/McpServersDialogs';
import { McpServerToolsDialog } from '@/features/targets/admin/McpServerToolsDialog';
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
  onSyncTools?: (tools: TargetMcpToolSummary[]) => void;
}

interface ServerToolsPageState {
  items: TargetToolCatalogItem[];
  nextCursor?: string;
  loadingInitial: boolean;
  loadingMore: boolean;
  error: string | null;
}

function getOptimisticToolEffectiveState(
  server: Pick<TargetToolCatalogServer, 'enabled'>,
  tool: Pick<TargetToolCatalogItem, 'effectiveDisabledReason'>,
  enabledConfigured: boolean
): Pick<TargetToolCatalogItem, 'enabledEffective' | 'effectiveDisabledReason'> {
  if (!enabledConfigured) {
    return { enabledEffective: false, effectiveDisabledReason: null };
  }
  if (!server.enabled) {
    return { enabledEffective: false, effectiveDisabledReason: 'server_disabled' };
  }
  if (tool.effectiveDisabledReason === 'agent_write_disabled') {
    return { enabledEffective: false, effectiveDisabledReason: 'agent_write_disabled' };
  }
  return { enabledEffective: true, effectiveDisabledReason: null };
}

function applyToolCountsDelta(
  counts: TargetToolCatalogServer['toolCounts'],
  previousTool: TargetToolCatalogItem,
  nextTool: TargetToolCatalogItem
): TargetToolCatalogServer['toolCounts'] {
  const delta = (nextValue: boolean, previousValue: boolean) => Number(nextValue) - Number(previousValue);
  const isWrite = previousTool.capability === 'write';
  return {
    ...counts,
    enabledConfigured: counts.enabledConfigured + delta(nextTool.enabledConfigured, previousTool.enabledConfigured),
    enabledEffective: counts.enabledEffective + delta(nextTool.enabledEffective, previousTool.enabledEffective),
    writeConfigured: isWrite
      ? counts.writeConfigured + delta(nextTool.enabledConfigured, previousTool.enabledConfigured)
      : counts.writeConfigured,
    writeEffective: isWrite
      ? counts.writeEffective + delta(nextTool.enabledEffective, previousTool.enabledEffective)
      : counts.writeEffective
  };
}

export const McpServersView: React.FC<McpServersViewProps> = ({
  target,
  canManageMcp = false,
  canManageTools = false,
  canRequestWriteRuns = false,
  onSyncTools
}) => {
  const { t } = useTranslation();
  const [catalog, setCatalog] = useState<TargetToolCatalog | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [createReviewServerId, setCreateReviewServerId] = useState<string | null>(null);
  const [pendingToolName, setPendingToolName] = useState<string | null>(null);
  const [serverModalOpen, setServerModalOpen] = useState(false);
  const [serverForm, setServerForm] = useState<ServerFormState>(DEFAULT_SERVER_FORM);
  const [editingServer, setEditingServer] = useState<TargetToolCatalogServer | null>(null);
  const [serverMutationError, setServerMutationError] = useState<string | null>(null);
  const [pendingServerMutation, setPendingServerMutation] = useState(false);
  const [deleteTargetServer, setDeleteTargetServer] = useState<TargetToolCatalogServer | null>(null);
  const [pendingTestServerId, setPendingTestServerId] = useState<string | null>(null);
  const [pendingToggleServerId, setPendingToggleServerId] = useState<string | null>(null);
  const [testResultsByServerId, setTestResultsByServerId] = useState<Record<string, TargetMcpServerTestConnectionResult>>({});
  const [toolsByServerId, setToolsByServerId] = useState<Record<string, ServerToolsPageState>>({});
  const [showSecretValue, setShowSecretValue] = useState(false);
  const onSyncToolsRef = useRef(onSyncTools);
  const serverToolsRequestSeqRef = useRef(0);

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
  const showEmptyCatalog = Boolean(catalog) && servers.length === 0;
  const activeServer = selectedServerId
    ? servers.find((server) => server.id === selectedServerId) || null
    : null;
  const activeServerTools = activeServer ? toolsByServerId[activeServer.id] : undefined;
  const activeServerWithPagedTools = activeServer ? { ...activeServer, tools: activeServerTools?.items || activeServer.tools } : null;
  const createReviewServer = createReviewServerId ? servers.find((server) => server.id === createReviewServerId) || null : null;
  const createReviewServerTools = createReviewServerId ? toolsByServerId[createReviewServerId] : undefined;
  const createReviewServerWithPagedTools = createReviewServer ? { ...createReviewServer, tools: createReviewServerTools?.items || createReviewServer.tools } : null;

  useEffect(() => {
    onSyncToolsRef.current = onSyncTools;
  }, [onSyncTools]);

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
      setCatalog(null);
      return null;
    }
  }, [target.id, target.workspaceId]);

  const loadServerTools = useCallback(async (serverId: string, mode: 'replace' | 'append', cursor?: string) => {
    const requestId = ++serverToolsRequestSeqRef.current;
    setToolsByServerId((current) => ({
      ...current,
      [serverId]: {
        items: mode === 'append' ? current[serverId]?.items || [] : [],
        nextCursor: mode === 'append' ? current[serverId]?.nextCursor : undefined,
        loadingInitial: mode === 'replace',
        loadingMore: mode === 'append',
        error: null
      }
    }));
    try {
      const page = await controlPlaneApi.listMcpServerTools(target.workspaceId, target.id, serverId, {
        limit: 50,
        cursor
      });
      if (requestId !== serverToolsRequestSeqRef.current) return;
      setToolsByServerId((current) => ({
        ...current,
        [serverId]: {
          items: mode === 'append' ? [...(current[serverId]?.items || []), ...page.items] : page.items,
          nextCursor: page.nextCursor,
          loadingInitial: false,
          loadingMore: false,
          error: null
        }
      }));
    } catch (error) {
      if (requestId !== serverToolsRequestSeqRef.current) return;
      setToolsByServerId((current) => ({
        ...current,
        [serverId]: {
          items: mode === 'append' ? current[serverId]?.items || [] : [],
          nextCursor: mode === 'append' ? current[serverId]?.nextCursor : undefined,
          loadingInitial: false,
          loadingMore: false,
          error: formatMcpMutationError(error, t('mcpServers.loadToolsFailed'))
        }
      }));
    }
  }, [target.id, target.workspaceId, t]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    if (!selectedServerId || toolsByServerId[selectedServerId]) return;
    void loadServerTools(selectedServerId, 'replace');
  }, [loadServerTools, selectedServerId, toolsByServerId]);

  useEffect(() => {
    if (!createReviewServerId || toolsByServerId[createReviewServerId]) return;
    void loadServerTools(createReviewServerId, 'replace');
  }, [createReviewServerId, loadServerTools, toolsByServerId]);

  const updateCatalogLocal = (updater: (current: TargetToolCatalog) => TargetToolCatalog) => {
    setCatalog((current) => {
      const next = updater(current || localCatalog);
      onSyncToolsRef.current?.(flattenCatalogTools(next));
      return next;
    });
  };

  const openCreateServerModal = () => {
    if (!canEditServers) return;
    setEditingServer(null);
    setCreateReviewServerId(null);
    setServerForm({ ...DEFAULT_SERVER_FORM, publicHeaders: [] });
    setServerMutationError(null);
    setShowSecretValue(false);
    setServerModalOpen(true);
  };

  const openEditServerModal = (server: TargetToolCatalogServer) => {
    if (!canEditServers || !server.canEditConnection || server.isSystem) return;
    setEditingServer(server);
    setCreateReviewServerId(null);
    setServerForm({
      name: server.name,
      url: server.url,
      enabled: server.enabled,
      authType: server.authType,
      secretValue: '',
      headerName: '',
      publicHeaders: publicHeaderRowsFromRecord(server.publicHeaders)
    });
    setServerMutationError(null);
    setShowSecretValue(false);
    setServerModalOpen(true);
  };

  const closeServerModal = () => {
    setServerModalOpen(false);
    setEditingServer(null);
    setCreateReviewServerId(null);
    setServerMutationError(null);
    setServerForm({ ...DEFAULT_SERVER_FORM, publicHeaders: [] });
  };

  const authWasChanged = Boolean(editingServer && serverForm.authType !== editingServer.authType);
  const shouldValidateCredential = serverForm.authType !== 'none' &&
    (!editingServer || authWasChanged || Boolean(serverForm.secretValue.trim()));
  const shouldValidateHeader = serverForm.authType === 'custom_header' && shouldValidateCredential;
  const publicHeadersValidationError = useMemo(() => {
    const validationKey = validatePublicHeaderRows(serverForm.publicHeaders);
    return validationKey ? t(`mcpServers.${validationKey}`) : null;
  }, [serverForm.publicHeaders, t]);
  const serverFormIsValid =
    Boolean(serverForm.name.trim()) &&
    Boolean(serverForm.url.trim()) &&
    !publicHeadersValidationError &&
    (
      !shouldValidateCredential ||
      (
        Boolean(serverForm.secretValue.trim()) &&
        (!shouldValidateHeader || Boolean(serverForm.headerName.trim()))
      )
  );

  const buildAuthPayload = (): CreateTargetMcpServerInput['auth'] | undefined => {
    if (
      editingServer &&
      serverForm.authType === editingServer.authType &&
      !serverForm.secretValue.trim()
    ) {
      return undefined;
    }
    if (serverForm.authType === 'none') return { type: 'none' };
    const auth: CreateTargetMcpServerInput['auth'] = {
      type: serverForm.authType
    };
    if (serverForm.secretValue.trim()) auth.secretValue = serverForm.secretValue.trim();
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
        setCreateReviewServerId(createdServer.id);
        void loadServerTools(createdServer.id, 'replace');
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
    setToolsByServerId((current) => {
      if (!current[serverId]) return current;
      const { [serverId]: _staleServerTools, ...rest } = current;
      return rest;
    });
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
    try {
      await controlPlaneApi.updateTargetMcpServerTool(target.workspaceId, target.id, server.id, tool.name, {
        enabled: nextEnabled,
        capability: tool.capability
      });
      setToolsByServerId((current) => {
        const page = current[server.id];
        if (!page) return current;
        return {
          ...current,
          [server.id]: {
            ...page,
            items: page.items.map((item) =>
              item.name === tool.name
                ? {
                    ...item,
                    enabledConfigured: nextEnabled,
                    ...getOptimisticToolEffectiveState(server, item, nextEnabled)
                  }
                : item
            )
          }
        };
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
    } catch (error) {
      const message = formatMcpMutationError(error, 'Failed updating MCP tool.');
      setServerMutationError(message);
      setToolsByServerId((current) => current[server.id]
        ? { ...current, [server.id]: { ...current[server.id], error: message } }
        : current);
      throw error;
    } finally {
      setPendingToolName(null);
    }
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-ui-bg px-4 py-6 custom-scrollbar stable-scrollbar-gutter sm:px-6 lg:px-10 lg:py-8">
      <header className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="type-route-title">{t('mcpServers.title')}</h1>
          <p className="type-body mt-2">
            {t('mcpServers.description', { name: target.name })}
          </p>
        </div>
        <Button onClick={openCreateServerModal} disabled={!canEditServers} variant="secondary" size="md" className="whitespace-nowrap">
          <Plus className="h-4 w-4" />
          {t('mcpServers.add')}
        </Button>
        {!canEditServers && (
          <p className="type-caption lg:max-w-xs">
            {t('mcpServers.manageNoAccess')}
          </p>
        )}
      </header>

      {catalogError && (
        <div className="type-caption mb-5 rounded-xl border border-status-danger/25 bg-status-danger-soft px-4 py-3 text-status-danger-text">
          {catalogError}
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

      {showInitialCatalogLoading && (
        <InlineLoadingIndicator label={t('mcpServers.loadingCatalog')} className="mb-5" />
      )}

      {showEmptyCatalog && (
        <div className="rounded-xl border border-ui-border bg-ui-surface p-10 text-center shadow-sm">
          <p className="type-body">{t('mcpServers.empty')}</p>
          {canEditServers && (
            <Button onClick={openCreateServerModal} variant="accent" size="sm" className="mt-6">
              <Plus className="h-4 w-4" />
              {t('mcpServers.addFirst')}
            </Button>
          )}
        </div>
      )}

      {servers.length > 0 && (
        <McpServersInventory
          servers={servers}
          canEditServers={canEditServers}
          pendingTestServerId={pendingTestServerId}
          pendingToggleServerId={pendingToggleServerId}
          testResultsByServerId={testResultsByServerId}
          onManageTools={setSelectedServerId}
          onTestConnection={(targetServer) => void handleTestConnection(targetServer)}
          onToggleServer={(targetServer, enabled) => void handleToggleServer(targetServer, enabled)}
          onEdit={openEditServerModal}
          onDelete={(targetServer) => {
            setServerMutationError(null);
            setDeleteTargetServer(targetServer);
          }}
        />
      )}

      <AnimatePresence>
        {activeServerWithPagedTools && (
          <McpServerToolsDialog
            server={activeServerWithPagedTools}
            canManageTools={Boolean(canManageTools)}
            pendingToolName={pendingToolName}
            isLoadingTools={!activeServerTools || Boolean(activeServerTools.loadingInitial)}
            isLoadingMoreTools={Boolean(activeServerTools?.loadingMore)}
            toolsError={activeServerTools?.error || null}
            hasMoreTools={Boolean(activeServerTools?.nextCursor)}
            onClose={() => setSelectedServerId(null)}
            onToggleTool={(tool, enabled) => handleToggleTool(activeServerWithPagedTools, tool, enabled)}
            onLoadMoreTools={() => {
              if (activeServerTools?.nextCursor && !activeServerTools.loadingMore && !activeServerTools.loadingInitial) {
                void loadServerTools(activeServerWithPagedTools.id, 'append', activeServerTools.nextCursor);
              }
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
            showSecretValue={showSecretValue}
            isValid={serverFormIsValid}
            publicHeadersValidationError={publicHeadersValidationError}
            createStep={createReviewServerId ? 'review' : 'configure'}
            reviewServer={createReviewServerWithPagedTools}
            reviewToolsLoading={pendingServerMutation || Boolean(createReviewServerId && !createReviewServerWithPagedTools && !serverMutationError) || Boolean(createReviewServerTools?.loadingInitial)}
            reviewToolsError={createReviewServerTools?.error || null}
            canManageTools={Boolean(canManageTools)}
            pendingToolName={pendingToolName}
            onClose={closeServerModal}
            onFormChange={setServerForm}
            onShowSecretValueChange={setShowSecretValue}
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
