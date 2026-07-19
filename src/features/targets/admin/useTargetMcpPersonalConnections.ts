import { useCallback, useEffect, useState } from 'react';

import { formatMcpMutationError } from '@/features/targets/admin/mcpServersCatalog';
import type { TargetToolCatalogServer } from '@/features/targets/admin/targetMcpCatalogTypes';
import type { TargetDescriptor } from '@/features/targets/targetDescriptor';
import { catalogApi, type McpPersonalConnection } from '@/services/control-plane/catalogApi';
import { useMcpRateLimit } from '@/features/catalog/useMcpRateLimit';

interface TargetMcpPersonalConnectionsOptions {
  servers: TargetToolCatalogServer[];
  target: TargetDescriptor;
  connectionFailedMessage: string;
  disconnectFailedMessage: string;
  onError: (message: string | null) => void;
  onConnectionReady?: (server: TargetToolCatalogServer) => Promise<void>;
  onRefreshError?: (message: string) => void;
}

export function useTargetMcpPersonalConnections({
  servers,
  target,
  connectionFailedMessage,
  disconnectFailedMessage,
  onError,
  onConnectionReady,
  onRefreshError
}: TargetMcpPersonalConnectionsOptions) {
  const [pendingConnectionServerId, setPendingConnectionServerId] = useState<string | null>(null);
  const [personalConnections, setPersonalConnections] = useState<Record<string, McpPersonalConnection>>({});
  const [personalConnectionErrors, setPersonalConnectionErrors] = useState<Record<string, string>>({});
  const rateLimit = useMcpRateLimit();
  const installationAuthType = (server: TargetToolCatalogServer): McpPersonalConnection['authType'] => (
    server.authType === 'custom_header' ? 'custom_header' : 'bearer_token'
  );

  const loadConnection = useCallback(async (server: TargetToolCatalogServer) => {
    try {
      const connection = await catalogApi.getTargetMcpConnection(target.workspaceId, target.id, server.id);
      setPersonalConnections((current) => ({ ...current, [server.id]: connection }));
      setPersonalConnectionErrors((current) => {
        const next = { ...current };
        delete next[server.id];
        return next;
      });
    } catch (error) {
      setPersonalConnectionErrors((current) => ({
        ...current,
        [server.id]: formatMcpMutationError(error, connectionFailedMessage)
      }));
    }
  }, [connectionFailedMessage, target.id, target.workspaceId]);

  useEffect(() => {
    const personalServers = servers.filter((server) => server.authScope === 'personal' && !server.isSystem);
    if (personalServers.length === 0) {
      setPersonalConnections({});
      setPersonalConnectionErrors({});
      return;
    }
    let cancelled = false;
    void Promise.all(personalServers.map(async (server) => {
      try {
        return { serverId: server.id, connection: await catalogApi.getTargetMcpConnection(target.workspaceId, target.id, server.id) };
      } catch (error) {
        return { serverId: server.id, error: formatMcpMutationError(error, connectionFailedMessage) };
      }
    })).then((results) => {
      if (cancelled) return;
      setPersonalConnections(Object.fromEntries(results.flatMap((result) => result.connection ? [[result.serverId, result.connection]] : [])));
      setPersonalConnectionErrors(Object.fromEntries(results.flatMap((result) => result.error ? [[result.serverId, result.error]] : [])));
    });
    return () => { cancelled = true; };
  }, [connectionFailedMessage, servers, target.id, target.workspaceId]);

  const connectPersonal = async (server: TargetToolCatalogServer, credential: string) => {
    if (pendingConnectionServerId || rateLimit.remainingSeconds(server.id) > 0) return;
    setPendingConnectionServerId(server.id);
    onError(null);
    try {
      const connection = await catalogApi.putTargetMcpConnection(target.workspaceId, target.id, server.id, {
        credential,
        consentGranted: true
      });
      setPersonalConnections((current) => ({ ...current, [server.id]: connection }));
      setPersonalConnectionErrors((current) => {
        const next = { ...current };
        delete next[server.id];
        return next;
      });
      rateLimit.clear(server.id);
      if (connection.status !== 'connected') {
        const message = 'The PAT was saved, but verification failed. Check its scopes, then verify again or replace it.';
        onError(message);
        throw new Error(message);
      }
      if (onConnectionReady) {
        try {
          await onConnectionReady(server);
        } catch {
          onRefreshError?.('The PAT is connected, but tools may be stale. Refresh the MCP catalog to retry discovery.');
        }
      }
      return connection;
    } catch (error) {
      const formatted = rateLimit.captureError(server.id, error, connectionFailedMessage);
      onError(formatted.message);
      throw error;
    } finally {
      setPendingConnectionServerId(null);
    }
  };

  const verifyPersonal = async (server: TargetToolCatalogServer) => {
    if (pendingConnectionServerId || rateLimit.remainingSeconds(server.id) > 0) return;
    setPendingConnectionServerId(server.id);
    onError(null);
    try {
      const connection = await catalogApi.verifyTargetMcpConnection(target.workspaceId, target.id, server.id);
      setPersonalConnections((current) => ({ ...current, [server.id]: connection }));
      setPersonalConnectionErrors((current) => {
        const next = { ...current };
        delete next[server.id];
        return next;
      });
      rateLimit.clear(server.id);
      if (connection.status !== 'connected') {
        onError('The stored PAT is still unusable. Verify again, replace it, or disconnect.');
        return connection;
      }
      if (onConnectionReady) {
        try {
          await onConnectionReady(server);
        } catch {
          onRefreshError?.('The PAT is connected, but tools may be stale. Refresh the MCP catalog to retry discovery.');
        }
      }
      return connection;
    } catch (error) {
      onError(rateLimit.captureError(server.id, error, connectionFailedMessage).message);
      return undefined;
    } finally {
      setPendingConnectionServerId(null);
    }
  };

  const disconnectPersonal = async (server: TargetToolCatalogServer) => {
    if (pendingConnectionServerId || rateLimit.remainingSeconds(server.id) > 0) return;
    setPendingConnectionServerId(server.id);
    onError(null);
    try {
      await catalogApi.disconnectTargetMcp(target.workspaceId, target.id, server.id);
      setPersonalConnections((current) => ({
        ...current,
        [server.id]: {
          serverId: server.id,
          status: 'missing',
          authType: installationAuthType(server),
          action: 'connect_mcp_server'
        }
      }));
      setPersonalConnectionErrors((current) => {
        const next = { ...current };
        delete next[server.id];
        return next;
      });
      rateLimit.clear(server.id);
    } catch (error) {
      onError(rateLimit.captureError(server.id, error, disconnectFailedMessage).message);
    } finally {
      setPendingConnectionServerId(null);
    }
  };

  const retryPersonal = async (server: TargetToolCatalogServer) => {
    if (pendingConnectionServerId) return;
    setPendingConnectionServerId(server.id);
    await loadConnection(server);
    setPendingConnectionServerId(null);
  };

  return {
    connectPersonal,
    disconnectPersonal,
    verifyPersonal,
    retryPersonal,
    pendingConnectionServerId,
    personalConnections,
    personalConnectionErrors,
    retryAfterSecondsFor: rateLimit.remainingSeconds
  };
}
