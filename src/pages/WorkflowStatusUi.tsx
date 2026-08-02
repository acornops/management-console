import React from 'react';
import { Button, StatusBadge } from '@acornops/ui';

export const WorkflowLoadErrorNotice: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <div className="mb-4 flex flex-col gap-3 rounded-md border border-status-warning/30 bg-status-warning-soft px-3 py-2 type-caption type-emphasis text-status-warning-text sm:flex-row sm:items-center sm:justify-between">
    <span className="min-w-0 break-words [overflow-wrap:anywhere]">Workflows could not be loaded from the control plane.</span>
    <Button type="button" variant="secondary" size="sm" onClick={onRetry} className="self-start border-status-warning/30 bg-ui-surface text-status-warning-text hover:bg-ui-bg sm:self-auto">
      Retry
    </Button>
  </div>
);

export const WorkflowModeLabel: React.FC<{ mode: string }> = ({ mode }) => {
  const label = mode === 'read_write' ? 'Read/write policy' : mode === 'write_only' ? 'Write-only policy' : 'Read-only policy';
  const tone = mode === 'write_only' ? 'danger' : 'neutral';
  const className = `${mode === 'read_write' ? 'bg-ui-surface-strong text-ui-text' : ''} type-caption normal-case tracking-normal`;
  return <StatusBadge tone={tone} className={className}>{label}</StatusBadge>;
};
