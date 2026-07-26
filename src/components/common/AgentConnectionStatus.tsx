import React from 'react';
import clsx from 'clsx';

interface AgentConnectionStatusProps {
  isConnected: boolean;
  waitingLabel: string;
  connectedLabel: string;
}

export const AgentConnectionStatus: React.FC<AgentConnectionStatusProps> = ({
  isConnected,
  waitingLabel,
  connectedLabel
}) => (
  <div
    role="status"
    aria-live="polite"
    aria-atomic="true"
    className={clsx(
      'flex items-center gap-3 rounded-lg border px-4 py-3 text-xs font-extrabold',
      isConnected
        ? 'border-status-success/25 bg-status-success-soft text-status-success-text'
        : 'border-ui-border bg-ui-bg text-ui-text-muted'
    )}
  >
    <span
      aria-hidden="true"
      className={clsx(
        'h-2 w-2 rounded-full',
        isConnected ? 'bg-status-success' : 'bg-ui-text-muted'
      )}
    />
    {isConnected ? connectedLabel : waitingLabel}
  </div>
);
