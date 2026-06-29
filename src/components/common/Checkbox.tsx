import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const baseCheckboxClassName =
  'h-4 w-4 rounded border-ui-border bg-ui-surface text-accent shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 focus-visible:ring-offset-0';

export function checkboxClassName({ className }: { className?: string } = {}): string {
  return twMerge(clsx(baseCheckboxClassName, className));
}

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, type = 'checkbox', ...props }, ref) => (
    <input ref={ref} type={type} className={checkboxClassName({ className })} {...props} />
  )
);

Checkbox.displayName = 'Checkbox';
