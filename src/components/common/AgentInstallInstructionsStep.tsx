import React from 'react';
import { Check, Copy, Zap } from 'lucide-react';
import { Button, IconTile } from '@acornops/ui';

import { AgentConnectionStatus } from '@/components/common/AgentConnectionStatus';
import { ICONS } from '@/constants';

interface AgentInstallInstructionsStepProps {
  introduction: string;
  command: string;
  commandLabel: string;
  copyLabel: string;
  copiedLabel: string;
  missingCommandMessage: string;
  isConnected: boolean;
  waitingLabel: string;
  connectedLabel: string;
  isSubmitting: boolean;
  submittingLabel: string;
  connectedActionLabel: string;
  pendingActionLabel: string;
  onConfirmInstalled: () => void | Promise<void>;
  summary: React.ReactNode;
  notices?: React.ReactNode;
}

export function AgentInstallInstructionsStep({
  introduction,
  command,
  commandLabel,
  copyLabel,
  copiedLabel,
  missingCommandMessage,
  isConnected,
  waitingLabel,
  connectedLabel,
  isSubmitting,
  submittingLabel,
  connectedActionLabel,
  pendingActionLabel,
  onConfirmInstalled,
  summary,
  notices
}: AgentInstallInstructionsStepProps) {
  const [hasCopied, setHasCopied] = React.useState(false);

  const copyCommand = async () => {
    try {
      if (!command) return;
      await navigator.clipboard.writeText(command);
      setHasCopied(true);
      window.setTimeout(() => setHasCopied(false), 2200);
    } catch {
      setHasCopied(false);
    }
  };

  return (
    <>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 custom-scrollbar">
        <div className="rounded-lg border border-ui-border bg-ui-bg px-4 py-4 type-ui leading-6 text-ui-text-muted">
          <div className="flex items-start gap-3">
            <IconTile size="xs" tone="accent" className="mt-0.5"><ICONS.Terminal className="h-4 w-4" /></IconTile>
            <p>{introduction}</p>
          </div>
        </div>

        {command ? (
          <div className="rounded-lg border border-ui-border bg-ui-bg shadow-sm">
            <div className="flex items-center justify-between gap-3 px-4 pt-4">
              <span className="type-micro-label">{commandLabel}</span>
              <Button type="button" variant="icon" size="icon" onClick={() => void copyCommand()} aria-label={hasCopied ? copiedLabel : copyLabel}>
                {hasCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <div className="max-h-[18rem] overflow-auto px-4 pb-4 pt-3 font-mono type-caption leading-6 text-ui-text custom-scrollbar">
              <pre className="whitespace-pre">{command}</pre>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-status-warning/25 bg-status-warning-soft p-4 type-body type-emphasis text-status-warning-text">
            {missingCommandMessage}
          </div>
        )}
        {notices}
        {summary}
        <AgentConnectionStatus isConnected={isConnected} waitingLabel={waitingLabel} connectedLabel={connectedLabel} />
      </div>
      <div className="flex shrink-0 items-center justify-end border-t border-ui-border bg-ui-bg px-6 py-4">
        <Button onClick={() => void onConfirmInstalled()} disabled={isSubmitting} variant="primary" size="sm" className="rounded-lg">
          <Zap className="h-4 w-4" />
          {isSubmitting ? submittingLabel : isConnected ? connectedActionLabel : pendingActionLabel}
        </Button>
      </div>
    </>
  );
}
