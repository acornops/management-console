import React from 'react';
import { useTranslation } from 'react-i18next';

import { useMcpOAuthReturnFeedback } from '@/features/catalog/useMcpOAuthReturnFeedback';

interface AgentMcpOAuthFeedbackOptions {
  result: string | null;
  reload: () => Promise<void>;
  reloadConnections: () => Promise<void>;
  setNotice: (message: string) => void;
  setError: (message: string) => void;
}

export function useAgentMcpOAuthFeedback({
  result,
  reload,
  reloadConnections,
  setNotice,
  setError
}: AgentMcpOAuthFeedbackOptions): string {
  const { t } = useTranslation();
  const refreshTools = React.useCallback(
    () => reload().catch(() => {
      setError('The connection succeeded, but the MCP tool list could not be refreshed.');
    }),
    [reload, setError]
  );

  return useMcpOAuthReturnFeedback({
    result,
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
    setNotice,
    setError,
    onConnected: refreshTools,
    onVerificationFailed: reloadConnections
  });
}
