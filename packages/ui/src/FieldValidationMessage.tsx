import React from 'react';
import { AlertCircle } from 'lucide-react';

import { formControlInvalidClassName } from './formControlStyles';

export const fieldInvalidClass = formControlInvalidClassName;

export const FieldValidationMessage: React.FC<{ id: string; message?: string }> = ({ id, message }) => {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="type-caption mt-2 flex items-start gap-2 rounded-md border border-status-danger/25 bg-status-danger-soft px-3 py-2 text-status-danger-text">
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
};
