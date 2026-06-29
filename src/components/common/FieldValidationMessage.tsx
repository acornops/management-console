import React from 'react';
import { ICONS } from '@/constants';
import { formControlInvalidClassName } from '@/components/common/formControlStyles';

export const fieldInvalidClass = formControlInvalidClassName;

export const FieldValidationMessage: React.FC<{ id: string; message?: string }> = ({ id, message }) => {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-2 flex items-start gap-2 rounded-md border border-status-danger/25 bg-status-danger-soft px-3 py-2 text-xs font-semibold leading-5 text-status-danger-text">
      <ICONS.AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{message}</span>
    </p>
  );
};
