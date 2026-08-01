import React from 'react';
import { ICONS } from '@/constants';
import { FieldValidationMessage, InlineAlert, fieldInvalidClass } from '@acornops/ui';
import { formInputClassName } from '@acornops/ui';
import { Button, IconTile, TextInput } from '@acornops/ui';

export const fieldWrapClass = 'relative block';
export const inputClass = formInputClassName('px-4');
export const iconInputClass = `${inputClass} pl-10`;
export const passwordInputClass = `${iconInputClass} pr-11`;
export const invalidInputClass = fieldInvalidClass;
export const primaryButtonClass =
  'type-ui flex w-full items-center justify-center gap-2 rounded-lg border border-control-boundary bg-control-primary px-4 py-3 text-control-primary-fg transition-colors hover:bg-control-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-control-boundary focus-visible:ring-offset-2 focus-visible:ring-offset-ui-bg disabled:cursor-not-allowed disabled:opacity-60';
export const secondaryButtonClass =
  'type-ui w-full rounded-lg border border-ui-border bg-ui-bg px-4 py-2.5 transition-colors hover:bg-ui-surface focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-60';

export function NoticeCard({ icon, title, body, status, danger }: { icon: React.ReactNode; title: string; body: string; status?: string; danger?: boolean }) {
  return (
    <div className="rounded-lg border border-ui-border bg-ui-bg px-4 py-4">
      <div className="mb-3 flex items-center gap-3">
        <IconTile size="sm" tone="accent">{icon}</IconTile>
        <div>
          <h2 className="type-panel-title text-ui-text">{title}</h2>
          <p className="type-body leading-5 text-ui-text-muted">{body}</p>
        </div>
      </div>
      {status && (
        <p role="status" className={`type-body type-emphasis ${danger ? 'text-status-warning-text' : 'text-status-success-text'}`}>
          {status}
        </p>
      )}
    </div>
  );
}

export function EmailField({
  value,
  onChange,
  disabled,
  label,
  error,
  inputId
}: {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  label: string;
  error?: string;
  inputId?: string;
}) {
  const reactId = React.useId();
  const id = inputId || `email-field-${reactId}`;
  const errorId = `${id}-error`;
  return (
    <label className="block" htmlFor={id}>
      <span className="mb-2 block type-label">{label}</span>
      <span className={fieldWrapClass}>
        <ICONS.Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-text-muted/60" />
        <TextInput
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          type="email"
          autoComplete="email"
          placeholder="name@company.com"
          className={`${iconInputClass} ${error ? invalidInputClass : ''}`}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
        />
      </span>
      <FieldValidationMessage id={errorId} message={error} />
    </label>
  );
}

export function PasswordField({
  value,
  onChange,
  disabled,
  showPassword,
  autoComplete,
  label,
  minLength,
  renderPasswordToggle,
  error,
  inputId
}: {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  showPassword: boolean;
  autoComplete: string;
  label: string;
  minLength?: number;
  renderPasswordToggle: () => React.ReactNode;
  error?: string;
  inputId?: string;
}) {
  const reactId = React.useId();
  const id = inputId || `password-field-${reactId}`;
  const errorId = `${id}-error`;
  return (
    <label className="block" htmlFor={id}>
      <span className="mb-2 block type-label">{label}</span>
      <span className={fieldWrapClass}>
        <ICONS.Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-text-muted/60" />
        <TextInput
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          type={showPassword ? 'text' : 'password'}
          autoComplete={autoComplete}
          placeholder="••••••••"
          className={`${passwordInputClass} ${error ? invalidInputClass : ''}`}
          disabled={disabled}
          minLength={minLength}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
        />
        {renderPasswordToggle()}
      </span>
      <FieldValidationMessage id={errorId} message={error} />
    </label>
  );
}

export function ErrorMessage({ message }: { message: string }) {
  return (
    <InlineAlert tone="danger" className="px-3 py-2 type-emphasis">
      {message}
    </InlineAlert>
  );
}

export function OidcLoginButton({
  isAuthLoading,
  passwordAuthEnabled,
  onLogin,
  label
}: {
  isAuthLoading: boolean;
  passwordAuthEnabled: boolean;
  onLogin: () => void;
  label: string;
}) {
  return (
    <Button
      type="button"
      variant={passwordAuthEnabled ? 'secondary' : 'primary'}
      onClick={onLogin}
      disabled={isAuthLoading}
      className={`control-target mt-6 flex w-full items-center justify-center gap-3 rounded-lg border border-ui-border px-4 py-2.5 type-ui transition-[background-color,border-color,color,box-shadow,transform] focus:outline-none focus:ring-2 focus:ring-accent/20 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 ${
        passwordAuthEnabled ? 'bg-ui-bg text-ui-text hover:bg-ui-surface' : 'border-control-boundary bg-control-primary text-control-primary-fg hover:bg-control-primary-hover'
      }`}
    >
      {isAuthLoading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        <>
          <ICONS.Shield className="h-4 w-4 text-accent-strong" />
          <span>{label}</span>
        </>
      )}
    </Button>
  );
}

export function SignupSwitchFooter({ isAuthLoading, onSwitch, prompt, actionLabel }: { isAuthLoading: boolean; onSwitch: () => void; prompt: string; actionLabel: string }) {
  return (
    <div className="border-t border-ui-border bg-ui-bg p-6 text-center">
      <p className="type-ui text-ui-text-muted">
        {prompt}{' '}
        <Button
          type="button"
          variant="tertiary"
          size="inline"
          onClick={onSwitch}
          disabled={isAuthLoading}
          className="control-target rounded-sm type-ui text-accent-readable transition-colors hover:text-accent-strong focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {actionLabel}
        </Button>
      </p>
    </div>
  );
}
