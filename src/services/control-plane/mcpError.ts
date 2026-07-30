import { formatControlPlaneError } from './errorFormatting';
import { ControlPlaneRequestError } from './http';

export interface FormattedMcpError {
  message: string;
  retryAfterSeconds?: number;
}

export function formatMcpError(
  error: unknown,
  fallback: string,
  remainingSeconds?: number
): FormattedMcpError {
  const retryAfterSeconds = remainingSeconds
    ?? (error instanceof ControlPlaneRequestError ? error.retryAfterSeconds : undefined);
  const stableOAuthMessage = error instanceof ControlPlaneRequestError
    && /^MCP_OAUTH_[A-Z0-9_]+$/.test(error.code || '')
    ? error.message.replace(/^Control plane request failed \(\d+\):\s*/i, '').trim()
    : '';
  const baseMessage = stableOAuthMessage
    && stableOAuthMessage.length <= 512
    && !/[\r\n]/u.test(stableOAuthMessage)
    // The control plane forwards these only after validating the gateway's
    // stable MCP_OAUTH_* code and bounded, sanitized message.
    ? stableOAuthMessage
    : formatControlPlaneError(error, fallback, { area: 'mcp' });
  return {
    message: retryAfterSeconds
      ? `${baseMessage} Try again in ${retryAfterSeconds} ${retryAfterSeconds === 1 ? 'second' : 'seconds'}.`
      : baseMessage,
    ...(retryAfterSeconds ? { retryAfterSeconds } : {})
  };
}
