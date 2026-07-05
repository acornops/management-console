import type React from 'react';
import { Check, Clock, Wrench } from 'lucide-react';

import { Button } from '@/components/common/Button';

interface PendingAgentSetupProps {
  targetId: string;
  completedLabel: string;
  pendingLabel: string;
  message: string;
  actionLabel: string;
  actionDataAttribute: 'data-cluster-setup-action' | 'data-vm-setup-action';
  onInstallAgent?: (targetId: string) => void;
  showAction?: boolean;
  showFooter?: boolean;
}

export const PendingAgentSetup: React.FC<PendingAgentSetupProps> = ({
  targetId,
  completedLabel,
  pendingLabel,
  message,
  actionLabel,
  actionDataAttribute,
  onInstallAgent,
  showAction = true,
  showFooter = true
}) => {
  const actionDataProps = { [actionDataAttribute]: 'install' };
  const gridRowsClassName = showFooter ? 'grid-rows-[minmax(0,1fr)_minmax(4.25rem,auto)]' : 'grid-rows-[minmax(0,1fr)]';
  const panelClassName = showFooter
    ? `grid min-h-0 min-w-0 flex-1 ${gridRowsClassName}`
    : `grid h-[238px] min-w-0 shrink-0 overflow-hidden rounded-md border border-ui-border bg-ui-bg/35 ${gridRowsClassName}`;

  return (
    <div className={panelClassName}>
      <ol className="relative mx-auto grid min-h-0 w-full max-w-[22rem] -translate-y-2 grid-cols-2 items-start gap-4 self-center px-2 py-3 before:absolute before:left-[calc(25%+0.875rem)] before:right-[calc(25%+0.875rem)] before:top-[1.625rem] before:h-px before:bg-gradient-to-r before:from-status-success/50 before:via-ui-border before:to-ui-border">
        <li className="relative z-10 flex min-w-0 flex-col items-center gap-1.5 text-center">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-status-success-soft text-status-success-text ring-[3px] ring-status-success-soft/55">
            <Check className="h-3.5 w-3.5" />
          </span>
          <span className="max-w-full truncate text-[0.8125rem] font-bold leading-5 text-ui-text">{completedLabel}</span>
        </li>
        <li className="relative z-10 flex min-w-0 flex-col items-center gap-1.5 text-center">
          <span className="pending-agent-step-pulse flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-ui-border bg-ui-surface text-ui-text-muted">
            <Clock className="h-3.5 w-3.5" />
          </span>
          <span className="max-w-full truncate text-[0.8125rem] font-bold leading-5 text-ui-text-muted">{pendingLabel}</span>
        </li>
      </ol>

      {showFooter && (
        <div className="pointer-events-auto min-h-[4.25rem] border-t border-ui-border py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <p className="max-w-md text-sm font-semibold leading-5 text-ui-text-muted">{message}</p>
            {showAction && (
              <Button
                {...actionDataProps}
                type="button"
                onClick={() => onInstallAgent?.(targetId)}
                disabled={!onInstallAgent}
                variant="primary"
                size="sm"
                className="w-full whitespace-nowrap sm:w-fit"
              >
                <Wrench className="h-3.5 w-3.5" />
                {actionLabel}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
