import React from 'react';
import { twMerge } from 'tailwind-merge';

import { Button, type ButtonProps } from './Button';
import { menuOptionClassName, menuSurfaceClassName } from './menuStyles';

export interface ComboboxListboxProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'role'> {
  label: string;
}

export const ComboboxListbox = React.forwardRef<HTMLDivElement, ComboboxListboxProps>(({ className, label, ...props }, ref) => (
  <div
    {...props}
    ref={ref}
    role="listbox"
    aria-label={label}
    className={menuSurfaceClassName(twMerge('p-1', className))}
  />
));

ComboboxListbox.displayName = 'ComboboxListbox';

export interface ComboboxGroupProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'role'> {
  label: string;
}

export const ComboboxGroup = React.forwardRef<HTMLDivElement, ComboboxGroupProps>(({ label, ...props }, ref) => (
  <div {...props} ref={ref} role="group" aria-label={label} />
));

ComboboxGroup.displayName = 'ComboboxGroup';

export interface ComboboxOptionProps extends Omit<ButtonProps, 'aria-selected' | 'role' | 'variant'> {
  active?: boolean;
  selected?: boolean;
}

export const ComboboxOption = React.forwardRef<HTMLButtonElement, ComboboxOptionProps>(({
  active = false,
  className,
  disabled,
  selected = active,
  ...props
}, ref) => (
  <Button
    {...props}
    ref={ref}
    type="button"
    variant="tertiary"
    role="option"
    aria-selected={selected}
    disabled={disabled}
    className={menuOptionClassName({ active, disabled, className })}
  />
));

ComboboxOption.displayName = 'ComboboxOption';
