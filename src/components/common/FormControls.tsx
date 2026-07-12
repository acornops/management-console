import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { buttonClassName } from '@/components/common/Button';
import { menuOptionClassName } from '@/components/common/menuStyles';

export const FieldLabel: React.FC<React.LabelHTMLAttributes<HTMLLabelElement>> = ({ children, className, ...props }) => (
  <label className={twMerge('block type-label text-ui-text', className)} {...props}>{children}</label>
);

export const HelpText: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({ children, className, ...props }) => (
  <p className={twMerge('type-caption mt-1 text-ui-text-muted', className)} {...props}>{children}</p>
);

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {}

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    type="radio"
    className={twMerge('ui-radio h-4 w-4 shrink-0 border-ui-border bg-ui-surface text-ui-text focus:ring-2 focus:ring-accent/25 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50', className)}
    {...props}
  />
));

Radio.displayName = 'Radio';

export interface SwitchProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'role'> {
  checked: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(({ checked, className, disabled, label, onCheckedChange, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onCheckedChange(!checked)}
    className={twMerge(clsx(
      'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border p-0.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 disabled:cursor-not-allowed disabled:opacity-50',
      checked ? 'border-ui-text bg-ui-text' : 'border-ui-border bg-ui-surface-strong'
    ), className)}
    {...props}
  >
    <span aria-hidden="true" className={clsx('h-[1.125rem] w-[1.125rem] rounded-full bg-ui-bg shadow-sm transition-transform', checked ? 'translate-x-[1.125rem]' : 'translate-x-0')} />
  </button>
));

Switch.displayName = 'Switch';

export const MenuTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(({ className, ...props }, ref) => (
  <button ref={ref} type="button" className={buttonClassName({ variant: 'icon', size: 'icon', className })} {...props} />
));

MenuTrigger.displayName = 'MenuTrigger';

export interface MenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  destructive?: boolean;
  selected?: boolean;
}

export const MenuItem = React.forwardRef<HTMLButtonElement, MenuItemProps>(({ className, destructive, selected, ...props }, ref) => (
  <button ref={ref} type="button" role="menuitem" className={menuOptionClassName({ className, destructive, selected })} {...props} />
));

MenuItem.displayName = 'MenuItem';
