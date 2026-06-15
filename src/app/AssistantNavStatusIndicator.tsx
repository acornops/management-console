import React from 'react';
import { Tooltip } from '@/components/common/Tooltip';
import { ICONS } from '@/constants';
import type { AssistantNavStatus } from '@/app/assistantNavStatus';

const statusClasses: Record<Exclude<AssistantNavStatus, 'idle'>, string> = {
  working: 'border-accent/30 bg-accent-soft text-accent-strong',
  review: 'border-status-warning/30 bg-status-warning-soft text-status-warning-text',
  done: 'border-status-success/30 bg-status-success-soft text-status-success-text'
};

interface AssistantNavStatusIndicatorProps {
  status: AssistantNavStatus;
  label?: string;
  tooltipSide?: 'top' | 'bottom' | 'left' | 'right';
  withTooltip?: boolean;
}

export const AssistantNavStatusIndicator: React.FC<AssistantNavStatusIndicatorProps> = ({
  status,
  label,
  tooltipSide = 'right',
  withTooltip = true
}) => {
  if (status === 'idle' || !label) return null;
  const Icon = status === 'review'
    ? ICONS.AlertTriangle
    : status === 'done'
      ? ICONS.CheckCircle2
      : null;
  const indicator = (
    <span
      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${statusClasses[status]}`}
      title={withTooltip ? undefined : label}
      aria-label={label}
    >
      {Icon ? (
        <Icon className="h-3 w-3" aria-hidden="true" />
      ) : (
        <span className="h-2 w-2 rounded-full bg-current animate-pulse motion-reduce:animate-none" aria-hidden="true" />
      )}
    </span>
  );

  if (!withTooltip) return indicator;

  return (
    <Tooltip content={label} side={tooltipSide}>
      {indicator}
    </Tooltip>
  );
};
