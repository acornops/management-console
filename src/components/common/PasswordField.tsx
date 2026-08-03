import React from 'react';

import {
  FieldLabel,
  FieldValidationMessage,
  TextInput,
  fieldInvalidClass
} from '@acornops/ui';

export interface PasswordFieldProps {
  autoComplete: string;
  disabled?: boolean;
  error?: string;
  icon?: React.ReactNode;
  id?: string;
  inputClassName?: string;
  label: React.ReactNode;
  minLength?: number;
  onChange: (value: string) => void;
  placeholder?: string;
  showPassword?: boolean;
  trailingAction?: React.ReactNode;
  value: string;
}

export function PasswordField({
  autoComplete,
  disabled = false,
  error,
  icon,
  id: providedId,
  inputClassName = '',
  label,
  minLength,
  onChange,
  placeholder,
  showPassword = false,
  trailingAction,
  value
}: PasswordFieldProps) {
  const reactId = React.useId();
  const id = providedId || `password-field-${reactId}`;
  const errorId = `${id}-error`;
  const adornmentClassName = [
    icon ? 'pl-10' : '',
    trailingAction ? 'pr-11' : '',
    error ? fieldInvalidClass : '',
    inputClassName
  ].filter(Boolean).join(' ');

  return (
    <div>
      <FieldLabel htmlFor={id} className="mb-2">{label}</FieldLabel>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ui-text-muted/60" aria-hidden="true">
            {icon}
          </span>
        )}
        <TextInput
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          type={showPassword ? 'text' : 'password'}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className={adornmentClassName}
          disabled={disabled}
          minLength={minLength}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
        />
        {trailingAction}
      </div>
      <FieldValidationMessage id={errorId} message={error} />
    </div>
  );
}
