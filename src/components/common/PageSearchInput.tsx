import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const pageSearchInputClassName = (className?: string) =>
  twMerge(
    clsx(
      'h-11 w-full rounded-lg border border-ui-border bg-ui-surface px-3 text-sm text-ui-text outline-none focus-visible:ring-2 focus-visible:ring-accent/20 lg:w-72',
      className
    )
  );

export const PageSearchInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = 'search', ...props }, ref) => (
    <input ref={ref} type={type} className={pageSearchInputClassName(className)} {...props} />
  )
);

PageSearchInput.displayName = 'PageSearchInput';
