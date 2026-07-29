import React from 'react';
import { X } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

import { Button, buttonClassName, type ButtonProps } from './Button';

export function closeButtonClassName(className?: string): string {
  return buttonClassName({ variant: 'icon', size: 'icon', className });
}

export interface CloseButtonProps extends Omit<ButtonProps, 'variant' | 'size' | 'children'> {
  label?: string;
}

export const CloseButton = React.forwardRef<HTMLButtonElement, CloseButtonProps>(({ label = 'Close', className, type = 'button', ...props }, ref) => (
  <Button ref={ref} type={type} variant="icon" size="icon" className={twMerge('shrink-0', className)} aria-label={props['aria-label'] || label} {...props}>
    <X className="h-4 w-4" aria-hidden="true" />
  </Button>
));

CloseButton.displayName = 'CloseButton';
