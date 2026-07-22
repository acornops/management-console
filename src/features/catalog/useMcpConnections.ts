import { useCallback, useEffect, useState } from 'react';

import { useMcpRateLimit } from '@/features/catalog/useMcpRateLimit';
import { catalogApi, type McpConnection } from '@/services/control-plane/catalogApi';
import { formatMcpError } from '@/services/control-plane/mcpError';

export interface McpConnectionInstallation {
  id: string;
  credentialMode: 'none' | 'workspace' | 'individual';
  authType?: string;
  isSystem?: boolean;
}

type McpDestination =
  | { kind: 'agent'; id: string }
  | { kind: 'target'; id: string };

interface UseMcpConnectionsOptions<TInstallation extends McpConnectionInstallation> {
  workspaceId: string;
  destination: McpDestination;
  installations: TInstallation[];
  onConnectionReady?: (installation: TInstallation) => Promise<void>;
  onRefreshError?: (installation: TInstallation, message: string) => void;
  onError?: (message: string | null) => void;
}

const connectionCopy = {
  load: 'Credential connection status could not be loaded.',
  connect: 'The credential could not be saved.',
  verify: 'The stored credential could not be verified.',
  disconnect: 'The credential could not be removed.',
  verificationFailed: 'The credential was saved, but verification failed. Check its permissions, then verify again or replace it.',
  stillUnusable: 'The stored credential is still unusable. Verify again, replace it, or disconnect.',
  refreshFailed: 'The credential is connected, but tools may be stale. Retry the installation refresh.'
} as const;

export function useMcpConnections<TInstallation extends McpConnectionInstallation>({
  workspaceId,
  destination,
  installations,
  onConnectionReady,
  onRefreshError,
  onError
}: UseMcpConnectionsOptions<TInstallation>) {
  const [connections, setConnections] = useState<Record<string, McpConnection>>({});
  const [connectionErrors, setConnectionErrors] = useState<Record<string, string>>({});
  const [loadingByServerId, setLoadingByServerId] = useState<Record<string, boolean>>({});
  const [pendingServerId, setPendingServerId] = useState<string | null>(null);
  const rateLimit = useMcpRateLimit();

  const getConnection = useCallback((serverId: string) => destination.kind === 'agent'
    ? catalogApi.getAgentMcpConnection(workspaceId, destination.id, serverId)
    : catalogApi.getTargetMcpConnection(workspaceId, destination.id, serverId), [destination.id, destination.kind, workspaceId]);
  const putConnection = useCallback((serverId: string, credential: string) => destination.kind === 'agent'
    ? catalogApi.putAgentMcpConnection(workspaceId, destination.id, serverId, { credential, consentGranted: true })
    : catalogApi.putTargetMcpConnection(workspaceId, destination.id, serverId, { credential, consentGranted: true }), [destination.id, destination.kind, workspaceId]);
  const verifyConnection = useCallback((serverId: string) => destination.kind === 'agent'
    ? catalogApi.verifyAgentMcpConnection(workspaceId, destination.id, serverId)
    : catalogApi.verifyTargetMcpConnection(workspaceId, destination.id, serverId), [destination.id, destination.kind, workspaceId]);
  const deleteConnection = useCallback((serverId: string) => destination.kind === 'agent'
    ? catalogApi.disconnectAgentMcp(workspaceId, destination.id, serverId)
    : catalogApi.disconnectTargetMcp(workspaceId, destination.id, serverId), [destination.id, destination.kind, workspaceId]);

  const load = useCallback(async (installation: TInstallation) => {
    setLoadingByServerId((current) => ({ ...current, [installation.id]: true }));
    try {
      const connection = await getConnection(installation.id);
      setConnections((current) => ({ ...current, [installation.id]: connection }));
      setConnectionErrors((current) => {
        const next = { ...current };
        delete next[installation.id];
        return next;
      });
      return connection;
    } catch (cause) {
      const message = formatMcpError(cause, connectionCopy.load).message;
      setConnectionErrors((current) => ({ ...current, [installation.id]: message }));
      return undefined;
    } finally {
      setLoadingByServerId((current) => {
        const next = { ...current };
        delete next[installation.id];
        return next;
      });
    }
  }, [getConnection]);

  useEffect(() => {
    const authenticated = installations.filter((installation) => installation.credentialMode !== 'none' && !installation.isSystem);
    if (authenticated.length === 0) {
      setConnections({});
      setConnectionErrors({});
      setLoadingByServerId({});
      return;
    }
    let cancelled = false;
    setLoadingByServerId(Object.fromEntries(authenticated.map((installation) => [installation.id, true])));
    void Promise.all(authenticated.map(async (installation) => {
      try {
        return { serverId: installation.id, connection: await getConnection(installation.id) };
      } catch (cause) {
        return { serverId: installation.id, error: formatMcpError(cause, connectionCopy.load).message };
      }
    })).then((results) => {
      if (cancelled) return;
      setConnections(Object.fromEntries(results.flatMap((result) => result.connection ? [[result.serverId, result.connection]] : [])));
      setConnectionErrors(Object.fromEntries(results.flatMap((result) => result.error ? [[result.serverId, result.error]] : [])));
      setLoadingByServerId({});
    });
    return () => { cancelled = true; };
  }, [getConnection, installations]);

  const refreshTools = async (installation: TInstallation) => {
    if (!onConnectionReady) return;
    try {
      await onConnectionReady(installation);
    } catch {
      onRefreshError?.(installation, connectionCopy.refreshFailed);
    }
  };

  const connect = async (installation: TInstallation, credential: string) => {
    if (pendingServerId || rateLimit.remainingSeconds(installation.id) > 0) return undefined;
    setPendingServerId(installation.id);
    onError?.(null);
    try {
      const connection = await putConnection(installation.id, credential);
      setConnections((current) => ({ ...current, [installation.id]: connection }));
      setConnectionErrors((current) => {
        const next = { ...current };
        delete next[installation.id];
        return next;
      });
      if (connection.status !== 'connected') throw new Error(connectionCopy.verificationFailed);
      rateLimit.clear(installation.id);
      await refreshTools(installation);
      return connection;
    } catch (cause) {
      const message = rateLimit.captureError(installation.id, cause, connectionCopy.connect).message;
      onError?.(message);
      throw cause;
    } finally {
      setPendingServerId(null);
    }
  };

  const verify = async (installation: TInstallation) => {
    if (pendingServerId || rateLimit.remainingSeconds(installation.id) > 0) return undefined;
    setPendingServerId(installation.id);
    onError?.(null);
    try {
      const connection = await verifyConnection(installation.id);
      setConnections((current) => ({ ...current, [installation.id]: connection }));
      if (connection.status !== 'connected') {
        onError?.(connectionCopy.stillUnusable);
        return connection;
      }
      rateLimit.clear(installation.id);
      await refreshTools(installation);
      return connection;
    } catch (cause) {
      onError?.(rateLimit.captureError(installation.id, cause, connectionCopy.verify).message);
      return undefined;
    } finally {
      setPendingServerId(null);
    }
  };

  const disconnect = async (installation: TInstallation) => {
    if (pendingServerId || rateLimit.remainingSeconds(installation.id) > 0) return false;
    setPendingServerId(installation.id);
    onError?.(null);
    try {
      await deleteConnection(installation.id);
      setConnections((current) => ({ ...current, [installation.id]: {
        serverId: installation.id,
        credentialMode: installation.credentialMode === 'workspace' ? 'workspace' : 'individual',
        managementScope: installation.credentialMode === 'workspace' ? 'workspace' : 'individual',
        canManage: true,
        status: 'missing',
        authType: installation.authType === 'custom_header' ? 'custom_header' : 'bearer_token',
        action: 'connect_mcp_server'
      } }));
      rateLimit.clear(installation.id);
      return true;
    } catch (cause) {
      onError?.(rateLimit.captureError(installation.id, cause, connectionCopy.disconnect).message);
      return false;
    } finally {
      setPendingServerId(null);
    }
  };

  return {
    connections,
    connectionErrors,
    loadingByServerId,
    pendingServerId,
    connect,
    verify,
    disconnect,
    retry: load,
    retryAfterSecondsFor: rateLimit.remainingSeconds
  };
}
