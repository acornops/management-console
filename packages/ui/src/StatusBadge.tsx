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
      ? 'bg-status-success-soft text-status-success-text'
      : tone === 'warning'
        ? 'bg-status-warning-soft text-status-warning-text'
        : tone === 'danger'
          ? 'bg-status-danger-soft text-status-danger-text'
          : 'bg-ui-bg text-ui-text-muted';

  return (
    <span
      ref={ref}
      className={twMerge(
        'inline-flex max-w-full items-center rounded-full type-micro-label',
        size === 'compact' ? 'px-1.5 py-0.5 normal-case leading-none tracking-normal' : 'px-2 py-0.5',
        toneClass,
        className
      )}
      {...props}
    />
  );
});

StatusBadge.displayName = 'StatusBadge';
