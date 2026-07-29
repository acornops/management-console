import React from 'react';

import { updateUrlSearch } from '@/hooks/useUrlSearchState';
import {
  isMcpOAuthPopupWindow,
  publishMcpOAuthWindowResult,
  readMcpOAuthWindowResult
} from './mcpOAuthWindowHandoff';
import {
  isSafeMcpOAuthCallbackResult,
  mcpVerificationKind,
  type McpVerificationKind
} from './mcpVerificationPresentation';

interface McpOAuthReturnFeedbackOptions {
  result: string | null;
  successMessage: string;
  failureMessage: string;
  verificationMessages: Record<McpVerificationKind, string>;
  setNotice: (message: string) => void;
  setError: (message: string) => void;
  onConnected?: () => void | Promise<void>;
  onVerificationFailed?: () => void | Promise<void>;
}

export function useMcpOAuthReturnFeedback({
  result,
  successMessage,
  failureMessage,
  verificationMessages,
  setNotice,
  setError,
  onConnected,
  onVerificationFailed
}: McpOAuthReturnFeedbackOptions): string {
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
    const returnUrl = new URL(window.location.href);
    returnUrl.searchParams.delete('mcpOAuthResult');
    return `${returnUrl.pathname}${returnUrl.search}${returnUrl.hash}`;
  }, []);

  const applyResult = React.useCallback((nextResult: string) => {
    if (nextResult === 'connected') {
      callbacksRef.current.setNotice(successMessage);
      callbacksRef.current.setError('');
      void callbacksRef.current.onConnected?.();
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
    callbacksRef.current.setError(`${message} (${stableCode})`);
    if (!stableCode.startsWith('MCP_OAUTH_')) {
      void callbacksRef.current.onVerificationFailed?.();
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
      applyResult(payload.result);
    };
    window.addEventListener('storage', receiveResult);
    return () => window.removeEventListener('storage', receiveResult);
  }, [applyResult, returnPath]);

  React.useEffect(() => {
    if (!result) return;
    updateUrlSearch({ mcpOAuthResult: null }, { replace: true });
    const resultWasPublished = publishMcpOAuthWindowResult(result, returnPath);
    applyResult(result);
    if (!resultWasPublished || !isMcpOAuthPopupWindow()) return;
    const closeTimer = window.setTimeout(() => window.close(), 150);
    return () => window.clearTimeout(closeTimer);
  }, [applyResult, result, returnPath]);

  return returnPath;
}
