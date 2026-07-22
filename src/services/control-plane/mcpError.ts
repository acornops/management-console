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
  const baseMessage = formatControlPlaneError(error, fallback, { area: 'mcp' });
  return {
    message: retryAfterSeconds
      ? `${baseMessage} Try again in ${retryAfterSeconds} ${retryAfterSeconds === 1 ? 'second' : 'seconds'}.`
      : baseMessage,
    ...(retryAfterSeconds ? { retryAfterSeconds } : {})
  };
}
