import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formInputClassName } from '@/components/common/formControlStyles';

export const pageSearchInputClassName = (className?: string) =>
  twMerge(
    clsx(
      formInputClassName('page-search-input lg:w-72'),
      className
    )
  );

export const PageSearchInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = 'search', ...props }, ref) => (
    <input ref={ref} type={type} className={pageSearchInputClassName(className)} {...props} />
  )
);

PageSearchInput.displayName = 'PageSearchInput';
