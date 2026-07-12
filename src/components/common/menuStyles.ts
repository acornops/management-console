import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const menuSurfaceClassName = (className?: string) =>
  twMerge(clsx(
    'overflow-y-auto rounded-md border border-ui-border bg-ui-surface text-ui-text shadow-lg shadow-ui-text/10 outline-none custom-scrollbar',
    className
  ));

export const menuOptionClassName = ({
  selected = false,
  active = false,
  disabled = false,
  destructive = false,
  className
}: {
  selected?: boolean;
  active?: boolean;
  disabled?: boolean;
  destructive?: boolean;
  className?: string;
} = {}) =>
  twMerge(clsx(
    'type-ui flex min-h-9 w-full items-center gap-3 rounded-sm px-3 py-2 text-left outline-none transition-colors',
    selected && 'bg-ui-bg text-ui-text',
    !selected && active && 'bg-ui-bg text-ui-text',
    !selected && !active && !destructive && 'text-ui-text hover:bg-ui-bg',
    destructive && 'text-status-danger-text hover:bg-status-danger-soft',
    disabled && 'cursor-not-allowed opacity-45',
    className
  ));
