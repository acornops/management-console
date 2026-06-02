import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'accent' | 'ghost' | 'icon' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const baseButtonClass =
  'type-ui inline-flex items-center justify-center gap-2 rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25';

const filledNeutralButtonClass =
  'border border-[oklch(0.20_0.006_70)] bg-[oklch(0.18_0.006_70)] text-[oklch(0.97_0.006_86)] shadow-sm shadow-[oklch(0.18_0.006_70)]/15 hover:border-[oklch(0.13_0.006_70)] hover:bg-[oklch(0.13_0.006_70)]';

const variantClasses: Record<ButtonVariant, string> = {
  primary: filledNeutralButtonClass,
  secondary: 'border border-ui-border bg-ui-surface text-ui-text shadow-sm hover:bg-ui-bg hover:border-accent/30',
  tertiary: 'text-ui-text-muted hover:bg-accent-soft hover:text-accent-strong',
  accent: 'border border-accent bg-accent text-[oklch(0.99_0.004_86)] shadow-sm shadow-accent/20 hover:bg-accent-bright hover:border-accent-bright',
  ghost: 'text-ui-text-muted hover:bg-brand-orange-soft hover:text-accent-strong',
  icon: 'border border-ui-border bg-ui-surface text-ui-text-muted shadow-sm hover:bg-ui-bg hover:text-accent-strong',
  danger: 'border border-status-danger bg-status-danger text-[oklch(0.99_0.004_86)] hover:bg-status-danger-text'
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3 py-2 text-xs',
  md: 'min-h-11 px-4 py-2.5',
  lg: 'min-h-12 px-5 py-3',
  icon: 'h-9 w-9 p-0'
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const buttonClassName = ({
  variant = 'secondary',
  size = 'md',
  className
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) => twMerge(clsx(baseButtonClass, variantClasses[variant], sizeClasses[size], className));

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', className, type = 'button', ...props }, ref) => (
    <button ref={ref} type={type} className={buttonClassName({ variant, size, className })} {...props} />
  )
);

Button.displayName = 'Button';
