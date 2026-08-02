import React from 'react';
import { twMerge } from 'tailwind-merge';

export type CollectionResultSummaryProps = Omit<React.HTMLAttributes<HTMLSpanElement>, 'role' | 'aria-live' | 'aria-atomic'>;

export const CollectionResultSummary = React.forwardRef<HTMLSpanElement, CollectionResultSummaryProps>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={twMerge('type-caption inline-flex min-h-11 min-w-0 items-center text-ui-text-muted tabular-nums lg:whitespace-nowrap', className)}
    role="status"
    aria-live="polite"
    aria-atomic="true"
    {...props}
  />
));

CollectionResultSummary.displayName = 'CollectionResultSummary';
