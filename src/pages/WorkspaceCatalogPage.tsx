import React from 'react';
import { hasWorkspacePermission } from '@/app/workspacePermissions';
import { RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, buttonClassName } from '@/components/common/Button';
import { CollectionState } from '@/components/common/CollectionState';
import { createDiscoveryFilterGroup, DiscoveryFilterBar } from '@/components/common/DiscoveryFilterBar';
import { EmptyState } from '@/components/common/EmptyState';
import { MasterDetailEmptyState, MasterDetailLayout, MasterDetailListHeader, MasterDetailLoading, MasterDetailPaneBody, MasterDetailPaneHeader, MasterDetailRow, masterDetailDiscoverySpacingClass } from '@/components/common/MasterDetailLayout';
import { PageHeader, PageShell } from '@/components/common/PageComposition';
import { Select } from '@/components/common/Select';
import { StatusBadge } from '@/components/common/StatusBadge';
import { AgentCatalogReturnLink, resolveAgentCatalogReturnNavigation } from '@/features/catalog/AgentCatalogReturnNavigation';
import { McpPatDialog } from '@/features/catalog/McpPatDialog';
import { useMcpRateLimit } from '@/features/catalog/useMcpRateLimit';
import {
  listAgentMcpServers,
  listWorkspaceAgents,
  type AgentMcpServerApi
} from '@/services/control-plane/agentApi';
import {
  catalogApi,
  type CatalogArtifact,
  type CatalogArtifactEndpoint,
  type CatalogSource,
  type McpPersonalConnection
} from '@/services/control-plane/catalogApi';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import type { TargetMcpServer } from '@/services/control-plane/targetMcpLegacyTypes';
import type { Workspace } from '@/types';
import { AppPaths, type McpCatalogRouteState } from '@/utils/routes';
import { useCursorCollection } from '@/hooks/useCursorCollection';

type Navigate = (path: string, options?: { replace?: boolean }) => void;
type Destination = {
  key: string;
  scopeType: 'agent' | 'target';
  id: string;
  name: string;
  kind: string;
  status: string;
  inactive: boolean;
  targetType?: 'kubernetes' | 'virtual_machine';
};

type InstalledServer = {
  id: string;
  name: string;
  revision: number;
  authScope?: 'none' | 'personal';
  authType?: string;
  authHeaderName?: string;
  url: string;
  provenance?: { sourceId: string; artifactName: string; version: string; digest: string };
};

interface WorkspaceCatalogPageProps {
  workspace: Workspace;
  routeState: McpCatalogRouteState;
  navigate: Navigate;
}

const destinationKey = (scopeType: Destination['scopeType'], id: string) => `${scopeType}:${id}`;

function sourceName(sources: CatalogSource[], sourceId: string): string {
  return sources.find((source) => source.id === sourceId)?.displayName || 'Catalog source';
}

function supportedEndpoint(artifact: CatalogArtifact, selected?: string): CatalogArtifactEndpoint | undefined {
  return artifact.remoteEndpoints.find((endpoint) => endpoint.url === selected)
    || artifact.remoteEndpoints.find((endpoint) => endpoint.supported !== false);
}

function destinationHref(
  workspaceId: string,
  destination: Destination,
  action?: 'connect_by_url'
): string {
  return destination.scopeType === 'agent'
    ? AppPaths.workspaceAgentMcp(workspaceId, destination.id, action)
    : AppPaths.workspaceTargetMcp(
        workspaceId,
        destination.id,
        destination.targetType || 'kubernetes',
        action
      );
}

export function clearMcpCatalogDiscoveryState(state: McpCatalogRouteState): McpCatalogRouteState {
  return {
    artifact: state.artifact,
    destination: state.destination
  };
}

function normalizeAgentServer(server: AgentMcpServerApi): InstalledServer {
  return { id: server.id, name: server.name, url: server.url, revision: server.revision, authScope: server.authScope, authType: server.authType, authHeaderName: server.authHeaderName, provenance: server.provenance };
}

function normalizeTargetServer(server: TargetMcpServer): InstalledServer {
  return { id: server.id, name: server.serverName, url: server.serverUrl, revision: server.revision || 1, authScope: server.authScope, authType: server.authType, authHeaderName: server.authHeaderName, provenance: server.provenance };
}

export const WorkspaceCatalogPage: React.FC<WorkspaceCatalogPageProps> = ({ workspace, routeState, navigate }) => {
  const { t } = useTranslation();
  const [sources, setSources] = React.useState<CatalogSource[]>([]);
  const [sourcesLoaded, setSourcesLoaded] = React.useState(false);
  const [sourceCapabilities, setSourceCapabilities] = React.useState({
    workspaceManagedSourcesEnabled: false,
    supportedNetworkRoutes: ['direct'] as ['direct']
  });
  const [destinations, setDestinations] = React.useState<Destination[]>([]);
  const [installedServers, setInstalledServers] = React.useState<InstalledServer[]>([]);
  const [loadingDestination, setLoadingDestination] = React.useState(false);
  const [synchronizing, setSynchronizing] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState('');
  const [selectedEndpoints, setSelectedEndpoints] = React.useState<Record<string, string>>({});
  const [endpointConfiguration, setEndpointConfiguration] = React.useState<Record<string, Record<string, string>>>({});
  const [connection, setConnection] = React.useState<McpPersonalConnection | null>(null);
  const [connectionLoadError, setConnectionLoadError] = React.useState('');
  const [toolRefreshError, setToolRefreshError] = React.useState('');
  const [connectionLoadNonce, setConnectionLoadNonce] = React.useState(0);
  const [patDialogOpen, setPatDialogOpen] = React.useState(false);
  const itemRefs = React.useRef(new Map<string, HTMLButtonElement>());
  const lastSelectedId = React.useRef<string | undefined>(undefined);
  const catalogRefreshRequestedRef = React.useRef(false);
  const rateLimit = useMcpRateLimit();

  const canManageMcp = hasWorkspacePermission(workspace, 'manage_mcp');
  const canSynchronize = hasWorkspacePermission(workspace, 'manage_catalog_sources');
  const canUsePersonalMcpConnections = ['create_sessions', 'create_read_only_runs', 'create_read_write_runs']
    .some((permission) => hasWorkspacePermission(workspace, permission as keyof NonNullable<Workspace['permissions']>));
  const hasActiveDiscoveryFilters = Boolean(
    routeState.q?.trim()
    || routeState.source
    || (routeState.compatibility && routeState.compatibility !== 'all')
  );
  const catalogFilters = React.useMemo(() => ({
    compatible: routeState.compatibility === 'compatible' ? true : routeState.compatibility === 'incompatible' ? false : undefined,
    q: routeState.q,
    sourceId: routeState.source
  }), [routeState.compatibility, routeState.q, routeState.source]);
  const loadCatalogPage = React.useCallback(({ cursor, filters, limit, signal }: {
    cursor?: string;
    filters: typeof catalogFilters;
    limit: number;
    signal: AbortSignal;
  }) => {
    const refresh = !cursor && catalogRefreshRequestedRef.current;
    if (refresh) catalogRefreshRequestedRef.current = false;
    return catalogApi.listCatalogArtifacts(workspace.id, { ...filters, cursor, limit, refresh, signal });
  }, [workspace.id]);
  const catalogCollection = useCursorCollection({
    filters: catalogFilters,
    getKey: (artifact: CatalogArtifact) => artifact.id,
    loadPage: loadCatalogPage,
    pageSize: 50,
    strategy: 'manual'
  });
  const {
    items: artifacts,
    nextCursor,
    phase: catalogPhase,
    error: catalogError,
    loadMore: loadMoreArtifacts,
    refresh: refreshArtifacts,
    retry: retryArtifacts
  } = catalogCollection;
  const loading = catalogPhase === 'loading';
  const loadingMore = catalogPhase === 'loadingMore';

  const setRouteState = React.useCallback((patch: Partial<McpCatalogRouteState>, replace = false) => {
    navigate(AppPaths.workspaceCatalog(workspace.id, { ...routeState, ...patch }), { replace });
  }, [navigate, routeState, workspace.id]);

  React.useEffect(() => {
    setSelectedEndpoints((current) => ({
      ...current,
      ...Object.fromEntries(artifacts.map((artifact) => [artifact.id, current[artifact.id] || supportedEndpoint(artifact)?.url || '']))
    }));
  }, [artifacts]);

  const synchronizeCatalog = React.useCallback(async () => {
    setSynchronizing(true);
    catalogRefreshRequestedRef.current = true;
    await refreshArtifacts();
    setSynchronizing(false);
  }, [refreshArtifacts]);

  React.useEffect(() => {
    let cancelled = false;
    Promise.all([
      catalogApi.listCatalogSources(workspace.id),
      listWorkspaceAgents(workspace.id, { includeInactive: true }),
      controlPlaneApi.listTargetsForWorkspace(workspace.id, { limit: 200 })
    ]).then(([loadedSourceList, agents, targets]) => {
      if (cancelled) return;
      setSources(loadedSourceList.items.filter((source) => source.enabled));
      setSourceCapabilities(loadedSourceList.capabilities);
      setSourcesLoaded(true);
      setDestinations([
        ...agents.map((agent) => ({
          key: destinationKey('agent', agent.id), scopeType: 'agent' as const, id: agent.id,
          name: agent.name, kind: 'Workspace Agent', status: agent.status || 'draft', inactive: agent.status !== 'active'
        })),
        ...targets.items.map((target) => ({
          key: destinationKey('target', target.id), scopeType: 'target' as const, id: target.id,
          name: target.name, kind: target.targetType === 'kubernetes' ? 'Cluster default Agent' : 'VM default Agent',
          status: target.status, inactive: target.status !== 'online', targetType: target.targetType
        }))
      ]);
    }).catch((cause) => {
      setSourcesLoaded(true);
      setError(cause instanceof Error ? cause.message : 'Catalog destinations could not be loaded.');
    });
    return () => { cancelled = true; };
  }, [workspace.id]);

  const selectedArtifact = artifacts.find((artifact) => artifact.id === routeState.artifact)
    || artifacts[0];
  const selectedDestination = destinations.find((destination) => destination.key === routeState.destination);

  React.useEffect(() => {
    if (!selectedDestination) {
      setInstalledServers([]);
      return;
    }
    let cancelled = false;
    setLoadingDestination(true);
    const request = selectedDestination.scopeType === 'agent'
      ? listAgentMcpServers(workspace.id, selectedDestination.id).then((servers) => servers.map(normalizeAgentServer))
      : controlPlaneApi.listTargetMcpServers(workspace.id, selectedDestination.id).then((servers) => servers.map(normalizeTargetServer));
    request.then((servers) => !cancelled && setInstalledServers(servers))
      .catch((cause) => !cancelled && setError(cause instanceof Error ? cause.message : 'Destination capabilities could not be loaded.'))
      .finally(() => !cancelled && setLoadingDestination(false));
    return () => { cancelled = true; };
  }, [selectedDestination?.key, workspace.id]);

  const matchingInstallation = selectedArtifact
    ? installedServers.find((server) => server.provenance?.sourceId === selectedArtifact.sourceId
      && server.provenance.artifactName === selectedArtifact.name)
    : undefined;
  const installedCurrent = Boolean(matchingInstallation && selectedArtifact
    && matchingInstallation.provenance?.version === selectedArtifact.version
    && matchingInstallation.provenance.digest === selectedArtifact.digest);

  React.useEffect(() => {
    if (!selectedDestination || !matchingInstallation || matchingInstallation.authScope !== 'personal') {
      setConnection(null);
      setConnectionLoadError('');
      return;
    }
    setConnection(null);
    setConnectionLoadError('');
    const request = selectedDestination.scopeType === 'agent'
      ? catalogApi.getAgentMcpConnection(workspace.id, selectedDestination.id, matchingInstallation.id)
      : catalogApi.getTargetMcpConnection(workspace.id, selectedDestination.id, matchingInstallation.id);
    void request.then(setConnection).catch((cause) => {
      setConnectionLoadError(rateLimit.captureError(matchingInstallation.id, cause, 'Personal connection status could not be loaded.').message);
    });
  }, [connectionLoadNonce, matchingInstallation?.id, selectedDestination?.key, workspace.id, rateLimit.captureError]);

  const refreshDestinationInstallations = async (): Promise<InstalledServer[]> => {
    if (!selectedDestination) return [];
    const servers = selectedDestination.scopeType === 'agent'
      ? (await listAgentMcpServers(workspace.id, selectedDestination.id)).map(normalizeAgentServer)
      : (await controlPlaneApi.listTargetMcpServers(workspace.id, selectedDestination.id)).map(normalizeTargetServer);
    setInstalledServers(servers);
    return servers;
  };

  const install = async () => {
    if (!selectedArtifact || !selectedDestination || pending) return;
    const endpoint = supportedEndpoint(selectedArtifact, selectedEndpoints[selectedArtifact.id]);
    if (!endpoint) return;
    setPending(true);
    setError('');
    try {
      const input = {
        artifact: { artifactId: selectedArtifact.id },
        version: selectedArtifact.version,
        remoteEndpoint: endpoint.url,
        serverName: selectedArtifact.title || selectedArtifact.name,
        enabled: true,
        endpointConfiguration: endpointConfiguration[selectedArtifact.id] || {}
      };
      if (matchingInstallation) {
        const updateInput = { ...input, expectedRevision: matchingInstallation.revision };
        if (selectedDestination.scopeType === 'agent') {
          await catalogApi.reimportAgentMcpServer(workspace.id, selectedDestination.id, matchingInstallation.id, updateInput);
        } else {
          await catalogApi.reimportTargetMcpServer(workspace.id, selectedDestination.id, matchingInstallation.id, updateInput);
        }
      } else if (selectedDestination.scopeType === 'agent') {
        await catalogApi.importAgentMcpServer(workspace.id, selectedDestination.id, input);
      } else {
        await catalogApi.importTargetMcpServer(workspace.id, selectedDestination.id, input);
      }
      const servers = await refreshDestinationInstallations();
      const installed = servers.find((server) => server.provenance?.sourceId === selectedArtifact.sourceId
        && server.provenance.artifactName === selectedArtifact.name);
      if (endpoint.requiresPersonalAuth && installed && !matchingInstallation) {
        setConnection({
          serverId: installed.id,
          status: 'missing',
          authType: installed.authType === 'custom_header' ? 'custom_header' : 'bearer_token',
          action: 'connect_mcp_server'
        });
        setPatDialogOpen(true);
      } else if (installed?.authScope === 'personal') {
        setConnectionLoadNonce((value) => value + 1);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The catalog installation failed. Your selections were preserved.');
    } finally {
      setPending(false);
    }
  };

  const connect = async (credential: string) => {
    if (!selectedDestination || !matchingInstallation) return;
    if (rateLimit.remainingSeconds(matchingInstallation.id) > 0) return;
    try {
      const nextConnection = selectedDestination.scopeType === 'agent'
        ? await catalogApi.putAgentMcpConnection(workspace.id, selectedDestination.id, matchingInstallation.id, { credential, consentGranted: true })
        : await catalogApi.putTargetMcpConnection(workspace.id, selectedDestination.id, matchingInstallation.id, { credential, consentGranted: true });
      setConnection(nextConnection);
      if (nextConnection.status !== 'connected') {
        throw new Error('The PAT was saved, but verification failed. Check its scopes, then verify again or replace it.');
      }
      rateLimit.clear(matchingInstallation.id);
      try {
        await refreshDestinationInstallations();
        setToolRefreshError('');
      } catch {
        setToolRefreshError('The PAT is connected, but tools may be stale. Retry the installation refresh.');
      }
      setPatDialogOpen(false);
    } catch (cause) {
      const formatted = rateLimit.captureError(matchingInstallation.id, cause, 'The PAT could not be saved.');
      setError(formatted.message);
      throw cause;
    }
  };

  const verify = async () => {
    if (!selectedDestination || !matchingInstallation) return;
    if (rateLimit.remainingSeconds(matchingInstallation.id) > 0) return;
    setPending(true);
    try {
      const nextConnection = selectedDestination.scopeType === 'agent'
        ? await catalogApi.verifyAgentMcpConnection(workspace.id, selectedDestination.id, matchingInstallation.id)
        : await catalogApi.verifyTargetMcpConnection(workspace.id, selectedDestination.id, matchingInstallation.id);
      setConnection(nextConnection);
      if (nextConnection.status === 'connected') {
        rateLimit.clear(matchingInstallation.id);
        try {
          await refreshDestinationInstallations();
          setToolRefreshError('');
        } catch {
          setToolRefreshError('The PAT is connected, but tools may be stale. Retry the installation refresh.');
        }
      } else {
        setError('The stored PAT is still unusable. Verify again, replace it, or disconnect.');
      }
    } catch (cause) {
      setError(rateLimit.captureError(matchingInstallation.id, cause, 'The stored PAT could not be verified.').message);
    } finally { setPending(false); }
  };

  const disconnect = async () => {
    if (!selectedDestination || !matchingInstallation) return;
    setPending(true);
    try {
      if (selectedDestination.scopeType === 'agent') await catalogApi.disconnectAgentMcp(workspace.id, selectedDestination.id, matchingInstallation.id);
      else await catalogApi.disconnectTargetMcp(workspace.id, selectedDestination.id, matchingInstallation.id);
      setConnection({
        serverId: matchingInstallation.id,
        status: 'missing',
        authType: matchingInstallation.authType === 'custom_header' ? 'custom_header' : 'bearer_token',
        action: 'connect_mcp_server'
      });
      rateLimit.clear(matchingInstallation.id);
    } catch (cause) {
      setError(rateLimit.captureError(matchingInstallation.id, cause, 'The personal PAT could not be removed.').message);
    } finally { setPending(false); }
  };

  const selectArtifact = (artifact: CatalogArtifact) => {
    lastSelectedId.current = artifact.id;
    setRouteState({ artifact: artifact.id });
  };

  const handleArtifactKeys = (event: React.KeyboardEvent, index: number) => {
    const next = event.key === 'ArrowDown' ? Math.min(artifacts.length - 1, index + 1)
      : event.key === 'ArrowUp' ? Math.max(0, index - 1)
        : event.key === 'Home' ? 0 : event.key === 'End' ? artifacts.length - 1 : -1;
    if (next < 0) return;
    event.preventDefault();
    selectArtifact(artifacts[next]);
    itemRefs.current.get(artifacts[next].id)?.focus();
  };

  const closeMobileDetail = () => {
    setRouteState({ artifact: undefined });
    window.requestAnimationFrame(() => lastSelectedId.current && itemRefs.current.get(lastSelectedId.current)?.focus());
  };

  const endpoint = selectedArtifact ? supportedEndpoint(selectedArtifact, selectedEndpoints[selectedArtifact.id]) : undefined;
  const configurationFields = (endpoint?.configurationFields || []).filter((field) => !field.secret && field.fixedValue === undefined);
  const missingConfiguration = configurationFields.some((field) => field.required && !endpointConfiguration[selectedArtifact?.id || '']?.[field.name] && field.default === undefined);
  const connectionLoading = Boolean(matchingInstallation?.authScope === 'personal' && !connection && !connectionLoadError);
  const connectionRetryAfterSeconds = matchingInstallation ? rateLimit.remainingSeconds(matchingInstallation.id) : 0;
  const noEnabledRegistries = sourcesLoaded && sources.length === 0;
  const agentReturnNavigation = resolveAgentCatalogReturnNavigation(workspace.id, routeState.destination);
  const returnAgentName = agentReturnNavigation
    ? destinations.find((destination) => destination.scopeType === 'agent' && destination.id === agentReturnNavigation.agentId)?.name
    : undefined;
  const selectedDestinationHref = selectedDestination?.scopeType === 'target'
    ? destinationHref(workspace.id, selectedDestination)
    : undefined;

  return (
    <PageShell>
      <AgentCatalogReturnLink navigation={agentReturnNavigation} agentName={returnAgentName} />
      <PageHeader
        title="Browse MCP servers"
        context={selectedDestination ? `Destination: ${selectedDestination.name}` : undefined}
        description={selectedDestination
          ? `Install pinned servers on ${selectedDestination.name}. This destination stays fixed while you browse.`
          : 'Choose an Agent, Kubernetes cluster, or VM destination before installation.'}
        actions={<>
          {selectedDestinationHref && <a href={selectedDestinationHref} className={buttonClassName({ variant: 'secondary' })}>Back to destination</a>}
          {canSynchronize && <a href={AppPaths.workspaceMcpRegistries(workspace.id)} className={buttonClassName({ variant: 'secondary' })}>Manage registries</a>}
          {canSynchronize && !noEnabledRegistries && (
            <Button variant="secondary" disabled={synchronizing} onClick={() => void synchronizeCatalog()}>
              <RefreshCw className={`h-4 w-4 ${synchronizing ? 'animate-spin' : ''}`} />
              Synchronize
            </Button>
          )}
        </>}
      />

      {error && <div role="alert" className="mb-4 rounded-md border border-status-danger/30 bg-status-danger-soft px-4 py-3 text-sm text-status-danger-text">{error}</div>}

      {noEnabledRegistries && (
        <div className="space-y-4">
          {!selectedDestination && (
            <div className="mx-auto max-w-md text-sm font-semibold text-ui-text">
              <span>Install destination</span>
              <Select
                ariaLabel="Install destination"
                className="mt-2"
                value=""
                options={[
                  { value: '', label: 'Choose a destination' },
                  { value: '__workspace_agents', label: 'Workspace Agents', disabled: true },
                  ...destinations.filter((item) => item.scopeType === 'agent').map((item) => ({ value: item.key, label: `${item.name} · ${item.status}` })),
                  { value: '__target_agents', label: 'Cluster and VM default Agents', disabled: true },
                  ...destinations.filter((item) => item.scopeType === 'target').map((item) => ({ value: item.key, label: `${item.name} · ${item.kind} · ${item.status}` }))
                ]}
                onChange={(destination) => setRouteState({ destination: destination || undefined })}
              />
            </div>
          )}
          <EmptyState
            icon={<RefreshCw />}
            title="No MCP registries are enabled"
            description={canSynchronize
              ? sourceCapabilities.workspaceManagedSourcesEnabled
                ? 'Connect this destination directly, or add an internal MCP registry for workspace discovery.'
                : 'Connect this destination directly. Deployment policy does not allow workspace-managed registries.'
              : 'Connect this destination directly, or contact a workspace administrator to configure an MCP registry.'}
            actions={<>
              {selectedDestination && canManageMcp
                ? <a href={destinationHref(workspace.id, selectedDestination, 'connect_by_url')} className={buttonClassName({ variant: 'primary' })}>Connect by URL</a>
                : <Button variant="primary" disabled>Connect by URL</Button>}
              {canSynchronize && sourceCapabilities.workspaceManagedSourcesEnabled && <a href={AppPaths.workspaceMcpRegistries(workspace.id)} className={buttonClassName({ variant: 'secondary' })}>Add a registry</a>}
            </>}
          />
        </div>
      )}

      {!noEnabledRegistries && (loading || artifacts.length > 0 || hasActiveDiscoveryFilters) && (
        <DiscoveryFilterBar
          idPrefix="mcp-catalog"
          query={routeState.q || ''}
          queryLabel="Search catalog"
          queryPlaceholder="Search MCP servers"
          queryClearLabel="Clear search"
          resultSummary={loading ? 'Loading catalog…' : `${artifacts.length} ${artifacts.length === 1 ? 'server' : 'servers'} loaded`}
          filters={[
            createDiscoveryFilterGroup<string>({
              id: 'source',
              label: 'Catalog source',
              value: routeState.source || '',
              defaultValue: '',
              options: [{ value: '', label: 'All sources' }, ...sources.map((source) => ({ value: source.id, label: source.displayName }))],
              onChange: (source) => setRouteState({ source: source || undefined })
            }),
            createDiscoveryFilterGroup<'all' | 'compatible' | 'incompatible'>({
              id: 'compatibility',
              label: 'Compatibility',
              value: routeState.compatibility || 'all',
              defaultValue: 'all',
              options: [
                { value: 'all', label: 'All compatibility' },
                { value: 'compatible', label: 'Compatible' },
                { value: 'incompatible', label: 'Incompatible' }
              ],
              onChange: (compatibility) => setRouteState({ compatibility: compatibility === 'all' ? undefined : compatibility })
            })
          ]}
          clearAllLabel={t('common.clearAll')}
          onQueryChange={(q) => setRouteState({ q: q || undefined })}
          onClearAll={() => navigate(AppPaths.workspaceCatalog(workspace.id, clearMcpCatalogDiscoveryState(routeState)))}
          className={masterDetailDiscoverySpacingClass}
        />
      )}

      {!noEnabledRegistries && <MasterDetailLayout
        showDetailOnCompact={Boolean(routeState.artifact)}
        compactBackLabel="Back to servers"
        onCompactBack={closeMobileDetail}
        list={<section aria-label="Catalog artifacts" className="min-w-0">
          <MasterDetailListHeader>Servers</MasterDetailListHeader>
          <CollectionState
            phase={catalogPhase}
            itemCount={artifacts.length}
            filtered={hasActiveDiscoveryFilters}
            loading={<MasterDetailLoading>Loading catalog…</MasterDetailLoading>}
            empty={<MasterDetailEmptyState title="No MCP servers are available" description="Synchronize an enabled registry to discover installable servers." />}
            filteredEmpty={<MasterDetailEmptyState title="No MCP servers found" description="Adjust the search, source, or compatibility filter." />}
            error={<div role="alert" className="space-y-3 p-5 text-sm text-status-danger-text"><p>{catalogError || 'The MCP catalog could not be loaded.'}</p><Button variant="secondary" size="sm" onClick={() => void retryArtifacts()}>Retry</Button></div>}
            feedback={catalogError
              ? <div role="alert" className="border-t border-status-danger/25 bg-status-danger-soft p-3 text-sm text-status-danger-text">{catalogError}</div>
              : <span className="sr-only">{loadingMore ? 'Loading more servers' : 'Refreshing catalog'}</span>}
            announcement={catalogPhase === 'ready' ? `${artifacts.length} servers loaded` : undefined}
          >
            <ul className="divide-y divide-ui-border">
              {artifacts.map((artifact, index) => <li key={artifact.id}>
                <MasterDetailRow
                  buttonRef={(node) => { if (node) itemRefs.current.set(artifact.id, node); else itemRefs.current.delete(artifact.id); }}
                  title={artifact.title || artifact.name}
                  description={artifact.description}
                  status={<StatusBadge tone={artifact.compatible ? 'success' : 'warning'}>{artifact.compatible ? 'Compatible' : 'Incompatible'}</StatusBadge>}
                  metadata={<><span>{sourceName(sources, artifact.sourceId)}</span><span aria-hidden="true">·</span><span>v{artifact.version}</span></>}
                  selected={selectedArtifact?.id === artifact.id}
                  ariaLabel={`Select server ${artifact.title || artifact.name}`}
                  onClick={() => selectArtifact(artifact)}
                  onKeyDown={(event) => handleArtifactKeys(event, index)}
                />
              </li>)}
            </ul>
          </CollectionState>
          {nextCursor && <div ref={catalogCollection.sentinelRef} className="border-t border-ui-border p-3"><Button className="w-full justify-center" variant="tertiary" disabled={loadingMore} onClick={() => void loadMoreArtifacts()}>{loadingMore ? 'Loading…' : 'Load more'}</Button></div>}
        </section>}
        detail={<section aria-label="Selected catalog artifact" className="min-w-0">
          {selectedArtifact ? <>
            <MasterDetailPaneHeader
              badges={<><StatusBadge tone={selectedArtifact.compatible ? 'success' : 'warning'}>{selectedArtifact.compatible ? 'Compatible' : 'Incompatible'}</StatusBadge><StatusBadge tone="neutral">v{selectedArtifact.version}</StatusBadge></>}
              title={selectedArtifact.title || selectedArtifact.name}
              description={selectedArtifact.description}
            />
            <MasterDetailPaneBody>
            <dl className="grid gap-x-6 sm:grid-cols-2">
              {[['Source', sourceName(sources, selectedArtifact.sourceId)], ['Artifact', selectedArtifact.name], ['Digest', selectedArtifact.digest], ['Published', selectedArtifact.publishedAt || 'Not reported']].map(([label, value]) => <div key={label} className="min-w-0 py-2"><dt className="type-micro-label text-ui-text-muted">{label}</dt><dd className="type-code mt-1 break-all text-ui-text">{value}</dd></div>)}
            </dl>

            <div className="space-y-4 border-t border-ui-border pt-5">
              <div className="text-sm font-semibold text-ui-text">
                <span>Endpoint</span>
                <Select
                  ariaLabel="Endpoint"
                  className="mt-2"
                  value={endpoint?.url || ''}
                  options={selectedArtifact.remoteEndpoints.map((candidate) => ({ value: candidate.url, label: candidate.url, disabled: candidate.supported === false }))}
                  onChange={(url) => setSelectedEndpoints((current) => ({ ...current, [selectedArtifact.id]: url }))}
                />
              </div>
              <p className="type-caption break-all text-ui-text-muted">Transport: streamable HTTP. Authentication: {endpoint?.requiresPersonalAuth ? 'personal connection required' : 'none declared'}.</p>
              {configurationFields.length > 0 && <div className="grid gap-3 sm:grid-cols-2">{configurationFields.map((field) => <label key={field.name} className="text-sm font-semibold text-ui-text">{field.name}{field.required ? ' *' : ''}<input value={endpointConfiguration[selectedArtifact.id]?.[field.name] ?? field.default ?? ''} placeholder={field.placeholder} onChange={(event) => setEndpointConfiguration((current) => ({ ...current, [selectedArtifact.id]: { ...current[selectedArtifact.id], [field.name]: event.target.value } }))} className="mt-2 min-h-11 w-full rounded-md border border-ui-border bg-ui-bg px-3 font-normal text-ui-text" />{field.description && <span className="type-caption mt-1 block font-normal text-ui-text-muted">{field.description}</span>}</label>)}</div>}
            </div>

            <div className="border-t border-ui-border pt-5">
              <div className="text-sm font-semibold text-ui-text">
                <span>Install destination</span>
                {selectedDestination ? (
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-md border border-ui-border bg-ui-bg px-3 py-2">
                    <span><span className="block text-sm font-semibold">{selectedDestination.name}</span><span className="type-caption text-ui-text-muted">{selectedDestination.kind} · {selectedDestination.status}</span></span>
                    <a href={destinationHref(workspace.id, selectedDestination)} className="text-sm font-semibold text-accent-strong underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-control-boundary">Back to destination</a>
                  </div>
                ) : (
                  <Select
                    ariaLabel="Install destination"
                    className="mt-2"
                    value=""
                    options={[
                      { value: '', label: 'Choose a destination' },
                      { value: '__workspace_agents', label: 'Workspace Agents', disabled: true },
                      ...destinations.filter((item) => item.scopeType === 'agent').map((item) => ({ value: item.key, label: `${item.name} · ${item.status}` })),
                      { value: '__target_agents', label: 'Cluster and VM default Agents', disabled: true },
                      ...destinations.filter((item) => item.scopeType === 'target').map((item) => ({ value: item.key, label: `${item.name} · ${item.kind} · ${item.status}` }))
                    ]}
                    onChange={(destination) => setRouteState({ destination: destination || undefined })}
                  />
                )}
              </div>
              {selectedDestination?.inactive && <p role="status" className="mt-3 rounded-md border border-status-warning/30 bg-status-warning-soft px-3 py-2 text-sm text-status-warning-text">{selectedDestination.name} is {selectedDestination.status}. You can configure it now, but the capability will not be usable until the destination becomes active.</p>}
              {!selectedArtifact.compatible && <p role="status" className="mt-3 text-sm text-status-warning-text">{selectedArtifact.incompatibilityReason || 'This artifact has no supported endpoint.'}</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="primary" disabled={!canManageMcp || !selectedDestination || !selectedArtifact.compatible || !endpoint || endpoint.supported === false || missingConfiguration || installedCurrent || loadingDestination || pending} onClick={() => void install()}>{pending ? 'Saving…' : installedCurrent ? 'Installed' : matchingInstallation ? 'Update' : 'Install'}</Button>
                {matchingInstallation?.authScope === 'personal' && connectionLoadError && <Button variant="secondary" disabled={pending} onClick={() => setConnectionLoadNonce((value) => value + 1)}>Retry connection status</Button>}
                {connectionLoading && <Button variant="secondary" disabled>Loading PAT status…</Button>}
                {matchingInstallation?.authScope === 'personal' && !connectionLoading && !connectionLoadError && connection?.status === 'error' && <Button variant="secondary" disabled={pending || !canUsePersonalMcpConnections || connectionRetryAfterSeconds > 0} onClick={() => void verify()}>{connectionRetryAfterSeconds > 0 ? `Try again in ${connectionRetryAfterSeconds}s` : 'Verify PAT'}</Button>}
                {matchingInstallation?.authScope === 'personal' && !connectionLoading && !connectionLoadError && connection && <Button variant="secondary" disabled={pending || !canUsePersonalMcpConnections || connectionRetryAfterSeconds > 0} onClick={() => setPatDialogOpen(true)}>{connectionRetryAfterSeconds > 0 ? `Try again in ${connectionRetryAfterSeconds}s` : connection.status === 'missing' ? 'Connect PAT' : 'Replace PAT'}</Button>}
                {matchingInstallation?.authScope === 'personal' && !connectionLoading && !connectionLoadError && (connection?.status === 'connected' || connection?.status === 'error') && <Button variant="secondary" disabled={pending || !canUsePersonalMcpConnections || connectionRetryAfterSeconds > 0} onClick={() => void disconnect()}>Disconnect</Button>}
                {toolRefreshError && <Button variant="secondary" disabled={pending} onClick={() => void refreshDestinationInstallations().then(() => setToolRefreshError('')).catch(() => undefined)}>Retry tool refresh</Button>}
              </div>
              {connectionLoadError && <p role="alert" className="type-caption mt-2 text-status-danger-text">Personal connection status could not be loaded. Retry before changing this PAT.</p>}
              {toolRefreshError && <p role="alert" className="type-caption mt-2 text-status-warning-text">{toolRefreshError}</p>}
              {connectionRetryAfterSeconds > 0 && <p role="status" className="type-caption mt-2 text-status-warning-text">Connection controls unlock in {connectionRetryAfterSeconds}s.</p>}
              {!canManageMcp && <p className="type-caption mt-2 text-ui-text-muted">You need manage_mcp permission to install or update catalog servers.</p>}
            </div>
            </MasterDetailPaneBody>
          </> : <MasterDetailEmptyState title="Select an MCP server" description="Review provenance, endpoint requirements, and destination before installing." />}
        </section>}
      />}
      {patDialogOpen && matchingInstallation && (
        <McpPatDialog
          serverName={matchingInstallation.name}
          serverUrl={matchingInstallation.url}
          authType={connection?.authType || matchingInstallation.authType}
          authHeaderName={matchingInstallation.authHeaderName}
          mode={connection?.status === 'missing' || !connection ? 'connect' : 'replace'}
          retryAfterSeconds={connectionRetryAfterSeconds}
          onClose={() => setPatDialogOpen(false)}
          onSubmit={connect}
        />
      )}
    </PageShell>
  );
};
