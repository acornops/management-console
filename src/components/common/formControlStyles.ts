import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const formControlBaseClassName =
  'w-full rounded-lg border border-ui-border bg-ui-surface text-sm text-ui-text shadow-[inset_0_1px_0_rgb(var(--surface-rgb)/0.9),0_1px_2px_rgb(var(--text-rgb)/0.05)] outline-none transition-[border-color,background-color,box-shadow] duration-200 placeholder:font-medium placeholder:text-ui-text-muted/55 hover:border-accent/25 hover:bg-ui-surface focus:border-accent/45 focus:bg-ui-surface focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-60';

export const formControlInvalidClassName =
  'border-status-danger/45 bg-status-danger-soft/20 focus:border-status-danger/60 focus:ring-status-danger/20';

export function formInputClassName(className?: string): string {
  return twMerge(clsx(formControlBaseClassName, 'min-h-11 px-3.5 font-semibold', className));
}

export function formTextareaClassName(className?: string): string {
  return twMerge(clsx(formControlBaseClassName, 'min-h-28 resize-y px-3.5 py-2.5 font-medium leading-6', className));
}
