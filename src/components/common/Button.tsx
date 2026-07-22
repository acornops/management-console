import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'icon' | 'danger' | 'activation';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const baseButtonClass =
  'type-ui inline-flex items-center justify-center gap-2 rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-control-boundary focus-visible:ring-offset-2 focus-visible:ring-offset-ui-bg';

const filledNeutralButtonClass =
  'border border-control-boundary bg-control-primary text-control-primary-fg shadow-sm shadow-ui-text/15 hover:bg-control-primary-hover';

const variantClasses: Record<ButtonVariant, string> = {
  primary: filledNeutralButtonClass,
  secondary: 'border border-control-boundary bg-control-secondary text-control-secondary-fg shadow-sm hover:bg-control-secondary-hover',
  tertiary: 'text-ui-text-muted hover:bg-accent-soft hover:text-accent-strong',
  activation: 'border border-transparent bg-control-activation text-control-activation-fg hover:bg-control-activation-hover',
  icon: 'border border-control-boundary bg-control-secondary text-control-secondary-fg shadow-sm hover:bg-control-secondary-hover',
  danger: 'border border-control-boundary bg-control-danger text-control-danger-fg hover:bg-control-danger-hover'
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-11 px-3 py-2 text-xs sm:min-h-9',
  md: 'min-h-11 px-4 py-2.5',
  lg: 'min-h-12 px-5 py-3',
  icon: 'h-11 w-11 p-0 sm:h-9 sm:w-9'
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
