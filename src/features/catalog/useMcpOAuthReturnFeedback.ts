import React from 'react';

import { updateUrlSearch } from '@/hooks/useUrlSearchState';
import {
  isMcpOAuthPopupWindow,
  publishMcpOAuthWindowResult,
  readMcpOAuthWindowResult,
  safeMcpOAuthServerId
} from './mcpOAuthWindowHandoff';
import {
  isSafeMcpOAuthCallbackResult,
  mcpVerificationKind,
  type McpVerificationKind
} from './mcpVerificationPresentation';

interface McpOAuthReturnFeedbackOptions {
  result: string | null;
  serverId: string | null;
  successMessage: string;
  failureMessage: string;
  verificationMessages: Record<McpVerificationKind, string>;
  setNotice: (message: string) => void;
  setError: (message: string, serverId: string | null) => void;
  onConnected?: (serverId: string | null) => void | Promise<void>;
  onVerificationFailed?: (serverId: string | null) => void | Promise<void>;
}

export function mcpOAuthVerificationMessages(
  translate: (key: string) => string
): Record<McpVerificationKind, string> {
  return {
    authenticationRejected: translate('mcpServers.oauthAuthenticationRejected'),
    discoveryResponseTooLarge: translate('mcpServers.oauthDiscoveryResponseTooLarge'),
    discoveryTimeout: translate('mcpServers.oauthDiscoveryTimeout'),
    egressBlocked: translate('mcpServers.oauthEgressBlocked'),
    endpointNotFound: translate('mcpServers.oauthEndpointNotFound'),
    endpointUnavailable: translate('mcpServers.oauthEndpointUnavailable'),
    protocolError: translate('mcpServers.oauthProtocolError'),
    toolDiscoveryFailed: translate('mcpServers.oauthVerificationFailed')
  };
}

export function useMcpOAuthReturnFeedback({
  result,
  serverId,
  successMessage,
  failureMessage,
  verificationMessages,
  setNotice,
  setError,
  onConnected,
  onVerificationFailed
}: McpOAuthReturnFeedbackOptions): string {
  const safeServerId = safeMcpOAuthServerId(serverId);
  const {
    authenticationRejected,
    discoveryResponseTooLarge,
    discoveryTimeout,
    egressBlocked,
    endpointNotFound,
    endpointUnavailable,
    protocolError,
    toolDiscoveryFailed
  } = verificationMessages;
  const callbacksRef = React.useRef({
    setNotice,
    setError,
    onConnected,
    onVerificationFailed
  });
  React.useEffect(() => {
    callbacksRef.current = {
      setNotice,
      setError,
      onConnected,
      onVerificationFailed
    };
  }, [onConnected, onVerificationFailed, setError, setNotice]);

  const returnPath = React.useMemo(() => {
    if (typeof window === 'undefined') return '/';
    const returnUrl = new URL(window.location.href);
    returnUrl.searchParams.delete('mcpOAuthResult');
    returnUrl.searchParams.delete('mcpOAuthServerId');
    return `${returnUrl.pathname}${returnUrl.search}${returnUrl.hash}`;
  }, []);

  const applyResult = React.useCallback((nextResult: string, callbackServerId: string | null) => {
    if (nextResult === 'connected') {
      callbacksRef.current.setNotice(successMessage);
      callbacksRef.current.setError('', callbackServerId);
      void callbacksRef.current.onConnected?.(callbackServerId);
      return;
    }
    const stableCode = isSafeMcpOAuthCallbackResult(nextResult)
      ? nextResult
      : 'MCP_OAUTH_CALLBACK_FAILED';
    const verificationMessageByKind: Record<McpVerificationKind, string> = {
      authenticationRejected,
      discoveryResponseTooLarge,
      discoveryTimeout,
      egressBlocked,
      endpointNotFound,
      endpointUnavailable,
      protocolError,
      toolDiscoveryFailed
    };
    const message = stableCode.startsWith('MCP_OAUTH_')
      ? failureMessage
      : verificationMessageByKind[mcpVerificationKind(stableCode)];
    callbacksRef.current.setNotice('');
    callbacksRef.current.setError(`${message} (${stableCode})`, callbackServerId);
    if (!stableCode.startsWith('MCP_OAUTH_')) {
      void callbacksRef.current.onVerificationFailed?.(callbackServerId);
    }
  }, [
    authenticationRejected,
    discoveryResponseTooLarge,
    discoveryTimeout,
    egressBlocked,
    endpointNotFound,
    endpointUnavailable,
    failureMessage,
    protocolError,
    successMessage,
    toolDiscoveryFailed
  ]);

  React.useEffect(() => {
    const receiveResult = (event: StorageEvent) => {
      const payload = readMcpOAuthWindowResult(event);
      if (!payload || payload.returnPath !== returnPath) return;
      applyResult(payload.result, payload.serverId || null);
    };
    window.addEventListener('storage', receiveResult);
    return () => window.removeEventListener('storage', receiveResult);
  }, [applyResult, returnPath]);

  React.useEffect(() => {
    if (!result) return;
    updateUrlSearch({ mcpOAuthResult: null, mcpOAuthServerId: null }, { replace: true });
    const resultWasPublished = publishMcpOAuthWindowResult(result, returnPath, safeServerId);
    applyResult(result, safeServerId);
    if (!resultWasPublished || !isMcpOAuthPopupWindow()) return;
    const closeTimer = window.setTimeout(() => window.close(), 150);
    return () => window.clearTimeout(closeTimer);
  }, [applyResult, result, returnPath, safeServerId]);

  return returnPath;
}
