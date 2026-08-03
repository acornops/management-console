import { useState } from 'react';
import type { TFunction } from 'i18next';

import type { McpConnection } from '@/services/control-plane/catalogApi';
import type { TargetMcpServerTestConnectionResult } from '@/services/controlPlaneApi';
import type { TargetToolCatalogServer } from '@/features/targets/admin/targetMcpCatalogTypes';

type ConnectionOperation = (
  server: TargetToolCatalogServer
) => Promise<McpConnection | undefined>;

export function useMcpServerActionFeedback(t: TFunction) {
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const clear = () => {
    setError(null);
    setNotice(null);
  };

  const reportRefreshResult = (result: TargetMcpServerTestConnectionResult) => {
    if (result.connectionStatus === 'ok') {
      setNotice(t('mcpServers.refreshToolsPassed'));
      return;
    }
    setError(result.error || t('mcpServers.refreshToolsFailedMessage'));
  };

  const verifyConnection = async (
    server: TargetToolCatalogServer,
    operation: ConnectionOperation,
    onConnected: () => void
  ) => {
    clear();
    const connection = await operation(server);
    if (connection?.status !== 'connected') return;
    onConnected();
    setNotice(t('mcpServers.connectionVerified', { name: server.name }));
  };

  const disconnectCredential = async (
    server: TargetToolCatalogServer,
    operation: (target: TargetToolCatalogServer) => Promise<boolean>
  ) => {
    clear();
    if (await operation(server)) {
      setNotice(t('mcpServers.credentialDisconnected', { name: server.name }));
    }
  };

  const connectCredential = async (
    server: TargetToolCatalogServer,
    credential: string,
    operation: (
      target: TargetToolCatalogServer,
      value: string
    ) => Promise<McpConnection | undefined>,
    onConnected: () => void
  ) => {
    clear();
    const connection = await operation(server, credential);
    if (connection?.status !== 'connected') return;
    onConnected();
    setNotice(t('mcpServers.credentialConnected', { name: server.name }));
  };

  return {
    error,
    notice,
    setError,
    setNotice,
    clear,
    reportRefreshResult,
    verifyConnection,
    disconnectCredential,
    connectCredential
  };
}
