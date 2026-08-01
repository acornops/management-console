import React from 'react';
import { twMerge } from 'tailwind-merge';

export type StatusBadgeTone = 'success' | 'warning' | 'danger' | 'neutral';
export type StatusBadgeSize = 'compact' | 'default';

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone: StatusBadgeTone;
  size?: StatusBadgeSize;
}

export const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(({ className, size = 'default', tone, ...props }, ref) => {
  const toneClass =
    tone === 'success'
      ? 'border-status-success/25 bg-status-success-soft text-status-success-text'
      : tone === 'warning'
        ? 'border-status-warning/25 bg-status-warning-soft text-status-warning-text'
        : tone === 'danger'
          ? 'border-status-danger/25 bg-status-danger-soft text-status-danger-text'
          : 'border-ui-border bg-ui-bg text-ui-text-muted';

  return (
    <span
      ref={ref}
      className={twMerge(
        'inline-flex max-w-full items-center rounded-full border type-micro-label',
        size === 'compact' ? 'px-1.5 py-0.5 normal-case leading-none tracking-normal' : 'px-2 py-0.5',
        toneClass,
        className
      )}
      {...props}
    />
  );
});

StatusBadge.displayName = 'StatusBadge';
