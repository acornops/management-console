import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ICONS } from '@/constants';
import { Tooltip } from '@/components/common/Tooltip';
import { PasswordAuthResult } from '@/types';
import { LoginAuthPanel } from './login/LoginAuthPanel';
import { LoginPreview } from './login/LoginPreview';

interface LoginPageProps {
  isDark: boolean;
  isAuthLoading: boolean;
  logoSrc: string;
  oidcEnabled: boolean;
  passwordAuthEnabled: boolean;
  passwordSignupEnabled: boolean;
  passwordResetEnabled: boolean;
  onLogin: () => void;
  onPasswordLogin: (identifier: string, password: string) => Promise<PasswordAuthResult>;
  onPasswordSignup: (input: {
    email: string;
    username: string;
    password: string;
    displayName?: string;
  }) => Promise<PasswordAuthResult>;
  onVerifyEmail: (token: string) => Promise<void>;
  onResendVerification: (email: string) => Promise<{ resendAfterSeconds?: number }>;
  onRequestPasswordReset: (email: string) => Promise<{ resendAfterSeconds?: number }>;
  onResetPassword: (token: string, password: string) => Promise<void>;
  onToggleTheme: () => void;
}

/**
 * Standalone login screen shown when no active user session is available.
 */
export const LoginPage: React.FC<LoginPageProps> = ({
  isDark,
  isAuthLoading,
  logoSrc,
  oidcEnabled,
  passwordAuthEnabled,
  passwordSignupEnabled,
  passwordResetEnabled,
  onLogin,
  onPasswordLogin,
  onPasswordSignup,
  onVerifyEmail,
  onResendVerification,
  onRequestPasswordReset,
  onResetPassword,
  onToggleTheme
}) => {
  const { t } = useTranslation();

  return (
    <div className={`relative flex min-h-[100dvh] w-full overflow-x-hidden overflow-y-auto bg-ui-bg text-ui-text transition-colors duration-200 lg:grid lg:grid-cols-2 lg:overflow-hidden ${isDark ? 'dark' : ''}`}>
      <Tooltip
        content={isDark ? t('login.switchLight') : t('login.switchDark')}
        side="left"
        className="absolute right-4 top-4 z-20"
      >
        <button
          type="button"
          onClick={onToggleTheme}
          className="rounded-lg border border-ui-border bg-ui-surface/90 p-2.5 text-ui-text-muted shadow-sm transition-all hover:bg-ui-surface-strong hover:text-accent-strong focus:outline-none focus:ring-2 focus:ring-accent/20"
          aria-label={isDark ? t('login.switchLight') : t('login.switchDark')}
        >
          {isDark ? <ICONS.Sun className="h-4 w-4" /> : <ICONS.Moon className="h-4 w-4" />}
        </button>
      </Tooltip>

      <main className="relative z-10 flex min-h-[100dvh] flex-1 flex-col items-center justify-center px-4 py-6 sm:p-8 lg:min-h-0 lg:items-end lg:pr-28 xl:pr-32 2xl:pr-36">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, type: 'spring', stiffness: 100 }}
          className="w-full max-w-[26rem]"
        >
          <div className="mb-8 flex justify-center">
            <div className="flex items-center gap-3">
              <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-ui-border bg-ui-surface-strong">
                <img src={logoSrc} alt="AcornOps" className="relative z-10 h-8 w-8" />
              </div>
              <div className="text-3xl font-bold tracking-tight">
                <span className="text-ui-text">Acorn</span>
                <span className="text-accent-bright">Ops</span>
              </div>
            </div>
          </div>

          <LoginAuthPanel
            isAuthLoading={isAuthLoading}
            oidcEnabled={oidcEnabled}
            passwordAuthEnabled={passwordAuthEnabled}
            passwordSignupEnabled={passwordSignupEnabled}
            passwordResetEnabled={passwordResetEnabled}
            onLogin={onLogin}
            onPasswordLogin={onPasswordLogin}
            onPasswordSignup={onPasswordSignup}
            onVerifyEmail={onVerifyEmail}
            onResendVerification={onResendVerification}
            onRequestPasswordReset={onRequestPasswordReset}
            onResetPassword={onResetPassword}
          />
        </motion.div>
      </main>

      <motion.aside
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="relative hidden flex-1 items-center justify-start overflow-hidden border-l border-ui-border bg-ui-surface-strong lg:flex lg:pl-16 lg:pr-8 xl:pl-20 xl:pr-10 2xl:pl-24 2xl:pr-12"
      >
        <LoginPreview />
      </motion.aside>
    </div>
  );
};
