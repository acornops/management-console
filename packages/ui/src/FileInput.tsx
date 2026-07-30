import React from 'react';
import { twMerge } from 'tailwind-merge';

import { formInputClassName } from './formControlStyles';

export interface FileInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  visuallyHidden?: boolean;
}

export const FileInput = React.forwardRef<HTMLInputElement, FileInputProps>(
  ({ className, visuallyHidden = false, ...props }, ref) => (
    <input
      {...props}
      ref={ref}
      type="file"
      className={visuallyHidden ? twMerge('sr-only', className) : formInputClassName(className)}
    />
  )
);

FileInput.displayName = 'FileInput';
