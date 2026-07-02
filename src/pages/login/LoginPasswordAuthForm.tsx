import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { TFunction } from 'i18next';
import { ICONS } from '@/constants';
import { FieldValidationMessage } from '@/components/common/FieldValidationMessage';
import {
  EmailField,
  ErrorMessage,
  PasswordField,
  fieldWrapClass,
  invalidInputClass,
  iconInputClass,
  primaryButtonClass
} from '@/pages/login/LoginAuthPanelParts';

type AuthMode = 'login' | 'signup' | 'forgot' | 'reset';

interface LoginPasswordAuthFormProps {
  mode: AuthMode;
  canSignup: boolean;
  canResetPassword: boolean;
  isAuthLoading: boolean;
  error: string | null;
  email: string;
  identifier: string;
  username: string;
  password: string;
  confirmPassword: string;
  showPassword: boolean;
  onEmailChange: (value: string) => void;
  onIdentifierChange: (value: string) => void;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onForgotPassword: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
  renderPasswordToggle: () => React.ReactNode;
  t: TFunction;
}

type PasswordAuthField = 'identifier' | 'email' | 'username' | 'password' | 'confirmPassword';
type PasswordAuthFieldErrors = Partial<Record<PasswordAuthField, string>>;

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function LoginPasswordAuthForm({
  mode,
  canSignup,
  canResetPassword,
  isAuthLoading,
  error,
  email,
  identifier,
  username,
  password,
  confirmPassword,
  showPassword,
  onEmailChange,
  onIdentifierChange,
  onUsernameChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onForgotPassword,
  onSubmit,
  renderPasswordToggle,
  t
}: LoginPasswordAuthFormProps) {
  const [fieldErrors, setFieldErrors] = React.useState<PasswordAuthFieldErrors>({});

  const clearFieldError = (field: PasswordAuthField) => {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const validateBeforeSubmit = () => {
    const nextErrors: PasswordAuthFieldErrors = {};

    if (mode === 'signup' && canSignup) {
      if (!email.trim()) {
        nextErrors.email = t('login.validation.emailRequired');
      } else if (!isValidEmail(email.trim())) {
        nextErrors.email = t('login.validation.emailInvalid');
      }
      if (!username.trim()) nextErrors.username = t('login.validation.usernameRequired');
    } else if (!identifier.trim()) {
      nextErrors.identifier = t('login.validation.identifierRequired');
    }

    if (!password) {
      nextErrors.password = t('login.validation.passwordRequired');
    } else if (mode === 'signup' && canSignup && password.length < 15) {
      nextErrors.password = t('login.passwordPolicyMinimum');
    }

    if (mode === 'signup' && canSignup) {
      if (!confirmPassword) {
        nextErrors.confirmPassword = t('login.validation.confirmPasswordRequired');
      } else if (password && confirmPassword !== password) {
        nextErrors.confirmPassword = t('login.passwordMismatch');
      }
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submitWithValidation = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateBeforeSubmit()) return;
    void onSubmit(event);
  };

  return (
    <form className="space-y-5" onSubmit={submitWithValidation} noValidate>
      <div className="space-y-4">
        <AnimatePresence mode="wait" initial={false}>
          {mode === 'signup' && canSignup ? (
            <motion.div
              key="signup-fields"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-4"
            >
              <EmailField
                value={email}
                onChange={(value) => {
                  clearFieldError('email');
                  onEmailChange(value);
                }}
                disabled={isAuthLoading}
                label={t('login.email')}
                error={fieldErrors.email}
                inputId="auth-email"
              />
              <label className="block" htmlFor="auth-username">
                <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-ui-text-muted">{t('login.username')}</span>
                <span className={fieldWrapClass}>
                  <ICONS.User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-text-muted/60" />
                  <input
                    id="auth-username"
                    value={username}
                    onChange={(event) => {
                      clearFieldError('username');
                      onUsernameChange(event.target.value);
                    }}
                    autoComplete="username"
                    placeholder={t('login.username')}
                    className={`${iconInputClass} ${fieldErrors.username ? invalidInputClass : ''}`}
                    disabled={isAuthLoading}
                    aria-invalid={Boolean(fieldErrors.username)}
                    aria-describedby={fieldErrors.username ? 'auth-username-error' : undefined}
                  />
                </span>
                <FieldValidationMessage id="auth-username-error" message={fieldErrors.username} />
              </label>
            </motion.div>
          ) : (
            <motion.label
              key="login-field"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
              className="block"
              htmlFor="auth-identifier"
            >
              <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-ui-text-muted">{t('login.usernameOrEmail')}</span>
              <span className={fieldWrapClass}>
                <ICONS.Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-text-muted/60" />
                <input
                  id="auth-identifier"
                  value={identifier}
                  onChange={(event) => {
                    clearFieldError('identifier');
                    onIdentifierChange(event.target.value);
                  }}
                  autoComplete="username"
                  placeholder={t('login.usernameOrEmail')}
                  className={`${iconInputClass} ${fieldErrors.identifier ? invalidInputClass : ''}`}
                  disabled={isAuthLoading}
                  aria-invalid={Boolean(fieldErrors.identifier)}
                  aria-describedby={fieldErrors.identifier ? 'auth-identifier-error' : undefined}
                />
              </span>
              <FieldValidationMessage id="auth-identifier-error" message={fieldErrors.identifier} />
            </motion.label>
          )}
        </AnimatePresence>

        <PasswordField
          value={password}
          onChange={(value) => {
            clearFieldError('password');
            onPasswordChange(value);
          }}
          disabled={isAuthLoading}
          showPassword={showPassword}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          label={t('login.password')}
          minLength={mode === 'signup' && canSignup ? 15 : undefined}
          error={fieldErrors.password}
          inputId="auth-password"
          renderPasswordToggle={renderPasswordToggle}
        />

        {mode === 'login' && canResetPassword && (
          <div className="-mt-2 flex justify-end">
            <button
              type="button"
              onClick={onForgotPassword}
              className="rounded-sm text-xs font-bold text-accent-bright transition-colors hover:text-accent-strong focus:outline-none focus:ring-2 focus:ring-accent/20"
            >
              {t('login.forgotPassword')}
            </button>
          </div>
        )}

        <AnimatePresence initial={false}>
          {mode === 'signup' && canSignup && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
            >
              <PasswordField
                value={confirmPassword}
                onChange={(value) => {
                  clearFieldError('confirmPassword');
                  onConfirmPasswordChange(value);
                }}
                disabled={isAuthLoading}
                showPassword={showPassword}
                autoComplete="new-password"
                label={t('login.confirmPassword')}
                minLength={15}
                error={fieldErrors.confirmPassword}
                inputId="auth-confirm-password"
                renderPasswordToggle={renderPasswordToggle}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence initial={false}>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
          >
            <ErrorMessage message={error} />
          </motion.div>
        )}
      </AnimatePresence>

      <button type="submit" disabled={isAuthLoading} className={primaryButtonClass}>
        {isAuthLoading ? (
          <span className="h-4 w-4 rounded-full border-2 border-ui-bg border-t-transparent animate-spin" />
        ) : (
          <>
            <span>{mode === 'login' ? t('login.signInTab') : t('login.createAccount')}</span>
            <ICONS.ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
    </form>
  );
}
