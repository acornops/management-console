import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  ClusterToolCatalog,
  ClusterToolCatalogItem,
  ClusterToolCatalogServer,
  KubernetesCluster
} from '@/types';
import { Button } from '@/components/common/Button';
import { InlineLoadingIndicator } from '@/components/common/Loading';
import { TargetMcpServerTestConnectionResult, TargetType, controlPlaneApi, CreateTargetMcpServerInput } from '@/services/controlPlaneApi';
import { AddMcpServerCard, McpServerCard } from '@/features/kubernetes-cluster-detail/components/detail/views/McpServerCard';
import {
  DeleteMcpServerDialog,
  McpServerFormDialog,
  McpServerToolsDialog
} from '@/features/kubernetes-cluster-detail/components/detail/views/McpServersDialogs';
import {
  buildLocalCatalog,
  computeToolCounts,
  DEFAULT_SERVER_FORM,
  flattenCatalogTools,
  ServerFormState
} from '@/features/kubernetes-cluster-detail/components/detail/views/mcpServersCatalog';

function createPublicHeaderRow(name = '', value = ''): ServerFormState['publicHeaders'][number] {
  return {
    id: `${name || 'header'}-${Math.random().toString(36).slice(2)}`,
    name,
    value
  };
}

function publicHeaderRowsFromRecord(headers: Record<string, string> | undefined): ServerFormState['publicHeaders'] {
  return Object.entries(headers || {}).map(([name, value]) => createPublicHeaderRow(name, value));
}

function publicHeadersFromRows(rows: ServerFormState['publicHeaders']): Record<string, string> | undefined {
  const headers = rows.reduce<Record<string, string>>((acc, row) => {
    const name = row.name.trim();
    if (name) {
      acc[name] = row.value;
    }
    return acc;
  }, {});
  return Object.keys(headers).length > 0 ? headers : undefined;
}

interface McpServersViewProps {
  cluster: KubernetesCluster;
  targetContext?: {
    workspaceId: string;
    targetId: string;
    targetType: TargetType;
  };
  canManageMcp?: boolean;
  canManageTools?: boolean;
  onToggleTool?: (tool: ClusterToolCatalogItem, enabled: boolean) => void | Promise<void>;
  onSyncTools?: (tools: KubernetesCluster['mcpTools']) => void;
}

interface ServerToolsPageState {
  items: ClusterToolCatalogItem[];
  nextCursor?: string;
  loadingInitial: boolean;
  loadingMore: boolean;
  error: string | null;
}

export const McpServersView: React.FC<McpServersViewProps> = ({
  cluster,
  targetContext,
  canManageMcp = false,
  canManageTools = false,
  onToggleTool,
  onSyncTools
}) => {
  const { t } = useTranslation();
  const [catalog, setCatalog] = useState<ClusterToolCatalog | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [showCatalogLoadingNotice, setShowCatalogLoadingNotice] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [pendingToolName, setPendingToolName] = useState<string | null>(null);
  const [serverModalOpen, setServerModalOpen] = useState(false);
  const [serverForm, setServerForm] = useState<ServerFormState>(DEFAULT_SERVER_FORM);
  const [editingServer, setEditingServer] = useState<ClusterToolCatalogServer | null>(null);
  const [serverMutationError, setServerMutationError] = useState<string | null>(null);
  const [pendingServerMutation, setPendingServerMutation] = useState(false);
  const [deleteTargetServer, setDeleteTargetServer] = useState<ClusterToolCatalogServer | null>(null);
  const [pendingTestServerId, setPendingTestServerId] = useState<string | null>(null);
  const [testResultsByServerId, setTestResultsByServerId] = useState<Record<string, TargetMcpServerTestConnectionResult>>({});
  const [toolsByServerId, setToolsByServerId] = useState<Record<string, ServerToolsPageState>>({});
  const [showSecretValue, setShowSecretValue] = useState(false);
  const onSyncToolsRef = useRef(onSyncTools);
  const serverToolsRequestSeqRef = useRef(0);
  const activeTarget = targetContext || {
    workspaceId: cluster.workspaceId,
    targetId: cluster.id,
    targetType: 'kubernetes' as const
  };

  const localCatalog = useMemo(() => buildLocalCatalog(cluster, canManageMcp), [cluster, canManageMcp]);
  const activeCatalog = catalog || localCatalog;
  const canEditServers = canManageMcp && activeCatalog.permissions.canEdit;
  const servers = activeCatalog.servers;
  const showInitialCatalogLoading = showCatalogLoadingNotice && !catalog && localCatalog.servers.length === 0;
  const activeServer = selectedServerId
    ? servers.find((server) => server.id === selectedServerId) || null
    : null;
  const activeServerTools = activeServer ? toolsByServerId[activeServer.id] : undefined;
  const activeServerWithPagedTools = activeServer
    ? {
        ...activeServer,
        tools: activeServerTools?.items || []
      }
    : null;

  useEffect(() => {
    onSyncToolsRef.current = onSyncTools;
  }, [onSyncTools]);

  useEffect(() => {
    if (!catalogLoading) {
      setShowCatalogLoadingNotice(false);
      return;
    }
    const timeoutId = window.setTimeout(() => setShowCatalogLoadingNotice(true), 350);
    return () => window.clearTimeout(timeoutId);
  }, [catalogLoading]);

  const formatMutationError = (error: unknown, fallback: string): string => {
    const raw = error instanceof Error ? error.message : fallback;
    return raw.replace(/^Control plane request failed \(\d+\):\s*/i, '') || fallback;
  };

  const loadCatalog = useCallback(async (options?: { syncParent?: boolean }) => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const loadedCatalog = await controlPlaneApi.getTargetToolsCatalog(activeTarget.workspaceId, activeTarget.targetId);
      setCatalog(loadedCatalog);
      if (options?.syncParent) {
        onSyncToolsRef.current?.(flattenCatalogTools(loadedCatalog));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed loading MCP server catalog.';
      setCatalogError(message);
      setCatalog(null);
    } finally {
      setCatalogLoading(false);
    }
  }, [activeTarget.targetId, activeTarget.workspaceId]);

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
      const page = await controlPlaneApi.listMcpServerTools(activeTarget.workspaceId, activeTarget.targetId, serverId, {
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
          error: error instanceof Error ? error.message : t('mcpServers.loadToolsFailed')
        }
      }));
    }
  }, [activeTarget.targetId, activeTarget.workspaceId, t]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    if (!selectedServerId || toolsByServerId[selectedServerId]) return;
    void loadServerTools(selectedServerId, 'replace');
  }, [loadServerTools, selectedServerId, toolsByServerId]);

  const updateCatalogLocal = (updater: (current: ClusterToolCatalog) => ClusterToolCatalog) => {
    setCatalog((current) => {
      const next = updater(current || localCatalog);
      onSyncToolsRef.current?.(flattenCatalogTools(next));
      return next;
    });
  };

  const openCreateServerModal = () => {
    if (!canEditServers) return;
    setEditingServer(null);
    setServerForm({ ...DEFAULT_SERVER_FORM, publicHeaders: [] });
    setServerMutationError(null);
    setShowSecretValue(false);
    setServerModalOpen(true);
  };

  const openEditServerModal = (server: ClusterToolCatalogServer) => {
    if (!canEditServers || !server.canEditConnection || server.isSystem) return;
    setEditingServer(server);
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

  const authWasChanged = Boolean(editingServer && serverForm.authType !== editingServer.authType);
  const shouldValidateCredential = serverForm.authType !== 'none' &&
    (!editingServer || authWasChanged || Boolean(serverForm.secretValue.trim()));
  const shouldValidateHeader = serverForm.authType === 'custom_header' && shouldValidateCredential;
  const serverFormIsValid =
    Boolean(serverForm.name.trim()) &&
    Boolean(serverForm.url.trim()) &&
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
        await controlPlaneApi.updateTargetMcpServer(activeTarget.workspaceId, activeTarget.targetId, editingServer.id, {
          name: serverForm.name.trim(),
          enabled: serverForm.enabled,
          publicHeaders: buildPublicHeadersPayload(true),
          auth: buildAuthPayload()
        });
      } else {
        await controlPlaneApi.createTargetMcpServer(activeTarget.workspaceId, activeTarget.targetId, {
          name: serverForm.name.trim(),
          url: serverForm.url.trim(),
          enabled: serverForm.enabled,
          publicHeaders: buildPublicHeadersPayload(),
          auth: buildAuthPayload()
        });
      }
      setServerModalOpen(false);
      setEditingServer(null);
      setServerForm({ ...DEFAULT_SERVER_FORM, publicHeaders: [] });
      await loadCatalog({ syncParent: true });
    } catch (error) {
      const message = formatMutationError(error, editingServer ? 'Failed updating MCP server.' : 'Failed adding MCP server.');
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
      await controlPlaneApi.deleteTargetMcpServer(activeTarget.workspaceId, activeTarget.targetId, deleteTargetServer.id);
      if (selectedServerId === deleteTargetServer.id) {
        setSelectedServerId(null);
      }
      setDeleteTargetServer(null);
      await loadCatalog({ syncParent: true });
    } catch (error) {
      const message = formatMutationError(error, 'Failed deleting MCP server.');
      setServerMutationError(message);
    } finally {
      setPendingServerMutation(false);
    }
  };

  const handleTestConnection = async (server: ClusterToolCatalogServer) => {
    if (!canEditServers || pendingTestServerId) return;
    setPendingTestServerId(server.id);
    setServerMutationError(null);
    try {
      const result = await controlPlaneApi.testTargetMcpServerConnection(activeTarget.workspaceId, activeTarget.targetId, server.id);
      setTestResultsByServerId((current) => ({ ...current, [server.id]: result }));
      await loadCatalog({ syncParent: true });
    } catch (error) {
      setServerMutationError(formatMutationError(error, t('mcpServers.healthCheckFailedMessage')));
    } finally {
      setPendingTestServerId(null);
    }
  };

  const handleToggleTool = async (server: ClusterToolCatalogServer, tool: ClusterToolCatalogItem) => {
    if (!onToggleTool || !canManageTools || pendingToolName) return;
    const nextEnabled = !tool.enabledConfigured;
    setPendingToolName(tool.name);
    try {
      await onToggleTool(tool, nextEnabled);
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
                    enabledEffective: server.enabled && nextEnabled,
                    effectiveDisabledReason: !server.enabled && nextEnabled ? 'server_disabled' : null
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
          const tools: ClusterToolCatalogItem[] = candidate.tools.map((item) =>
            item.name === tool.name
              ? {
                  ...item,
                  enabledConfigured: nextEnabled,
                  enabledEffective: candidate.enabled && nextEnabled,
                  effectiveDisabledReason: !candidate.enabled && nextEnabled ? 'server_disabled' : null
                }
              : item
          );
          return {
            ...candidate,
            toolCounts: computeToolCounts(tools),
            tools
          };
        })
      }));
    } catch (error) {
      setServerMutationError(formatMutationError(error, 'Failed updating MCP tool.'));
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
            {t('mcpServers.description', { name: cluster.name })}
          </p>
        </div>
        <Button onClick={openCreateServerModal} disabled={!canEditServers} variant="secondary" size="md">
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

      {showInitialCatalogLoading && (
        <InlineLoadingIndicator label={t('mcpServers.loadingCatalog')} className="mb-5" />
      )}

      {!showInitialCatalogLoading && servers.length === 0 && (
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
        <div data-mcp-server-card-grid="true" className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {servers.map((server) => (
            <McpServerCard
              key={server.id}
              server={server}
              canEditServers={canEditServers}
              pendingTestServerId={pendingTestServerId}
              testResult={testResultsByServerId[server.id]}
              onManageTools={setSelectedServerId}
              onTestConnection={(targetServer) => void handleTestConnection(targetServer)}
              onEdit={openEditServerModal}
              onDelete={(targetServer) => {
                setServerMutationError(null);
                setDeleteTargetServer(targetServer);
              }}
            />
          ))}

          {canEditServers && servers.length > 0 && (
            <AddMcpServerCard onClick={openCreateServerModal} />
          )}
        </div>
      )}

      <AnimatePresence>
        {activeServerWithPagedTools && (
          <McpServerToolsDialog
            server={activeServerWithPagedTools}
            canManageTools={Boolean(canManageTools && onToggleTool)}
            pendingToolName={pendingToolName}
            isLoadingTools={Boolean(activeServerTools?.loadingInitial)}
            isLoadingMoreTools={Boolean(activeServerTools?.loadingMore)}
            toolsError={activeServerTools?.error || null}
            hasMoreTools={Boolean(activeServerTools?.nextCursor)}
            onClose={() => setSelectedServerId(null)}
            onToggleTool={(tool) => void handleToggleTool(activeServerWithPagedTools, tool)}
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
            onClose={() => {
              setServerModalOpen(false);
              setEditingServer(null);
            }}
            onFormChange={setServerForm}
            onShowSecretValueChange={setShowSecretValue}
            onSubmit={() => void handleSubmitServer()}
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
