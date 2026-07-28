import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const baseCardClass = 'rounded-lg border border-ui-border bg-ui-surface shadow-sm';
const interactiveCardClass =
  'transition-colors hover:border-accent/30 hover:bg-ui-surface-strong/45 focus-within:border-accent/30';
const actionCardButtonBaseClass =
  'type-ui flex min-h-28 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-ui-border bg-ui-surface px-4 py-4 text-ui-text-muted transition-colors hover:border-accent/30 hover:bg-ui-bg hover:text-accent-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25';

export const cardClassName = ({
  interactive = false,
  className
}: {
  interactive?: boolean;
  className?: string;
} = {}) => twMerge(clsx(baseCardClass, interactive && interactiveCardClass, className));

export const actionCardButtonClassName = ({
  className
}: {
  className?: string;
} = {}) => twMerge(clsx(actionCardButtonBaseClass, className));
