import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { Dialog } from '@/components/common/Dialog';
import { Select } from '@/components/common/Select';
import { formInputClassName } from '@/components/common/formControlStyles';
import { ICONS } from '@/constants';
import type { AppLanguageCode, AppLanguageOption } from '@/i18n/languageConfig';
import { headerMotion } from '@/lib/motion';
import { controlPlaneApi, ControlPlaneAuthMethods } from '@/services/controlPlaneApi';
import { User } from '@/types';

interface UserSettingsPageProps {
  user: User;
  language: AppLanguageCode;
  languageOptions: AppLanguageOption[];
  onLogout: () => void;
  onSetLanguage: (language: AppLanguageCode) => void;
  embedded?: boolean;
}

const SettingSection: React.FC<{
  title: string;
  description: string;
  children: React.ReactNode;
}> = ({ title, description, children }) => (
  <div className="mb-12">
    <div className="mb-6 px-1">
      <h2 className="mb-1 text-xl font-bold tracking-tight text-ui-text">{title}</h2>
      <p className="text-sm text-ui-text-muted">{description}</p>
    </div>
    <div className="overflow-hidden rounded-xl border border-ui-border bg-ui-surface shadow-sm">{children}</div>
  </div>
);

const SettingRow: React.FC<{
  icon: React.ElementType;
  label: string;
  description: string;
  action?: React.ReactNode;
}> = ({ icon: Icon, label, description, action }) => (
  <div className="flex flex-col gap-4 border-b border-ui-border p-6 transition-colors last:border-0 hover:bg-ui-bg/20 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex w-full min-w-0 items-center gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-ui-border bg-ui-bg text-accent-strong shadow-sm">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="mb-0.5 text-sm font-bold text-ui-text">{label}</p>
        <p className="break-words text-xs text-ui-text-muted">{description}</p>
      </div>
    </div>
    {action && <div className="w-full shrink-0 sm:w-auto">{action}</div>}
  </div>
);

const inputClassName = formInputClassName();

function formatDate(value?: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

function formatQuota(value: { used: number; limit: number } | undefined, fallback: string): string {
  return value ? `${value.used} / ${value.limit}` : fallback;
}

const PasswordField: React.FC<{
  id: string;
  label: string;
  value: string;
  autoComplete: string;
  onChange: (value: string) => void;
}> = ({ id, label, value, autoComplete, onChange }) => (
  <label className="block">
    <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-ui-text-muted">{label}</span>
    <input
      id={id}
      type="password"
      value={value}
      autoComplete={autoComplete}
      onChange={(event) => onChange(event.target.value)}
      className={inputClassName}
    />
  </label>
);

const SecurityDialog: React.FC<{
  title: string;
  submitLabel: string;
  cancelLabel: string;
  savingLabel: string;
  closeLabel: string;
  isSubmitting: boolean;
  error?: string;
  children: React.ReactNode;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}> = ({ title, submitLabel, cancelLabel, savingLabel, closeLabel, isSubmitting, error, children, onClose, onSubmit }) => (
  <Dialog
    titleId="account-security-dialog-title"
    className="w-full max-w-md rounded-xl border border-ui-border bg-ui-surface p-6 shadow-xl"
    closeDisabled={isSubmitting}
    onClose={onClose}
  >
    <div className="mb-5 flex items-center justify-between gap-4">
      <h2 id="account-security-dialog-title" className="text-lg font-bold text-ui-text">{title}</h2>
      <button
        type="button"
        onClick={onClose}
        disabled={isSubmitting}
        className="rounded-lg p-1.5 text-ui-text-muted transition-colors hover:bg-ui-bg hover:text-accent-strong disabled:opacity-50"
        aria-label={closeLabel}
      >
        <ICONS.X className="h-4 w-4" />
      </button>
    </div>
    <form className="space-y-4" onSubmit={onSubmit}>
      {children}
      {error && (
        <div className="rounded-lg border border-status-danger/20 bg-status-danger-soft px-3 py-2 text-sm text-status-danger-text">
          {error}
        </div>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
          {cancelLabel}
        </Button>
        <Button type="submit" variant="accent" disabled={isSubmitting}>
          {isSubmitting ? savingLabel : submitLabel}
        </Button>
      </div>
    </form>
  </Dialog>
);

export const UserSettingsPage: React.FC<UserSettingsPageProps> = ({
  user,
  language,
  languageOptions,
  onLogout,
  onSetLanguage,
  embedded = false
}) => {
  const { t } = useTranslation();
  const [authMethods, setAuthMethods] = React.useState<ControlPlaneAuthMethods | null>(null);
  const [securityError, setSecurityError] = React.useState<string | null>(null);
  const [securityNotice, setSecurityNotice] = React.useState<string | null>(null);
  const [activeDialog, setActiveDialog] = React.useState<'password' | 'sso' | null>(null);
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [dialogError, setDialogError] = React.useState<string | undefined>();
  const [isSubmittingSecurity, setIsSubmittingSecurity] = React.useState(false);

  const passwordMethod = authMethods?.methods.find((method) => method.type === 'password');
  const oidcMethod = authMethods?.methods.find((method) => method.type === 'oidc');
  const passwordChangedAt = passwordMethod?.type === 'password' ? formatDate(passwordMethod.lastChangedAt) : undefined;
  const selectedLanguage = languageOptions.find((option) => option.code === language) || languageOptions[0];

  const refreshAuthMethods = React.useCallback(async () => {
    try {
      setAuthMethods(await controlPlaneApi.getAuthMethods());
      setSecurityError(null);
    } catch (error) {
      setSecurityError(error instanceof Error ? error.message : t('settings.authMethodsError'));
    }
  }, [t]);

  React.useEffect(() => {
    void refreshAuthMethods();
  }, [refreshAuthMethods]);

  const closeSecurityDialog = () => {
    setActiveDialog(null);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setDialogError(undefined);
  };

  const submitPasswordChange = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setDialogError(t('settings.passwordMismatch'));
      return;
    }
    setIsSubmittingSecurity(true);
    setDialogError(undefined);
    try {
      await controlPlaneApi.changePassword({ currentPassword, newPassword });
      setSecurityNotice(t('settings.passwordChanged'));
      closeSecurityDialog();
      await refreshAuthMethods();
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : t('settings.passwordChangeFailed'));
    } finally {
      setIsSubmittingSecurity(false);
    }
  };

  const submitSsoLink = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmittingSecurity(true);
    setDialogError(undefined);
    try {
      const url = await controlPlaneApi.startOidcLink({
        currentPassword,
        returnTo: window.location.pathname
      });
      window.location.assign(url);
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : t('settings.ssoLinkFailed'));
      setIsSubmittingSecurity(false);
    }
  };

  return (
    <div className={embedded ? '' : 'min-h-0 flex-1 overflow-y-auto bg-ui-bg px-4 py-6 custom-scrollbar stable-scrollbar-gutter sm:px-6 lg:px-10 lg:py-8'}>
      {!embedded && (
        <motion.header {...headerMotion} className="mb-12">
          <h1 className="mb-2 text-3xl font-bold tracking-tight text-ui-text">{t('settings.title')}</h1>
          <p className="font-medium text-ui-text-muted">{t('settings.subtitle')}</p>
        </motion.header>
      )}

      <div className="max-w-4xl">
        <SettingSection title={t('settings.profileTitle')} description={t('settings.profileBody')}>
          <SettingRow icon={ICONS.User} label={t('settings.fullName')} description={user.name} />
          <SettingRow
            icon={ICONS.Mail}
            label={t('settings.email')}
            description={user.email}
            action={
              <div className="flex items-center gap-2 rounded-lg bg-status-success-soft px-3 py-1.5 text-status-success-text">
                <ICONS.CheckCircle2 className="h-4 w-4" />
                <span className="text-xs font-bold">{t('settings.verified')}</span>
              </div>
            }
          />
          <SettingRow
            icon={ICONS.LayoutGrid}
            label={t('settings.workspacesJoined')}
            description={formatQuota(user.quota?.workspaceMemberships, t('settings.quotaUnavailable'))}
          />
        </SettingSection>

        <SettingSection title={t('settings.securityTitle')} description={t('settings.securityBody')}>
          {securityError && (
            <div className="border-b border-ui-border bg-status-danger-soft px-6 py-3 text-sm text-status-danger-text">
              {securityError}
            </div>
          )}
          {securityNotice && (
            <div className="border-b border-ui-border bg-status-success-soft px-6 py-3 text-sm text-status-success-text">
              {securityNotice}
            </div>
          )}
          <SettingRow
            icon={ICONS.Lock}
            label={t('settings.password')}
            description={
              !authMethods
                ? t('settings.loadingAuthMethods')
                : authMethods.capabilities.canChangePassword
                ? t('settings.passwordLastChanged', { date: passwordChangedAt || t('settings.recently') })
                : oidcMethod
                ? t('settings.passwordManagedByProvider')
                : t('settings.passwordNotConfigured')
            }
            action={
              authMethods?.capabilities.canChangePassword ? (
                <Button size="sm" onClick={() => setActiveDialog('password')}>{t('settings.changePassword')}</Button>
              ) : undefined
            }
          />
          <SettingRow
            icon={ICONS.Shield}
            label={t('settings.sso')}
            description={
              !authMethods
                ? t('settings.loadingAuthMethods')
                : oidcMethod?.type === 'oidc'
                ? t('settings.ssoConnected', { provider: oidcMethod.provider })
                : t('settings.ssoNotConnected')
            }
            action={
              authMethods?.capabilities.canLinkOidc ? (
                <Button size="sm" onClick={() => setActiveDialog('sso')}>{t('settings.connectSso')}</Button>
              ) : undefined
            }
          />
          <SettingRow
            icon={ICONS.Smartphone}
            label={t('settings.twoFactor')}
            description={
              !authMethods
                ? t('settings.loadingAuthMethods')
                : oidcMethod
                ? t('settings.twoFactorManagedByProvider')
                : t('settings.twoFactorUnavailable')
            }
          />
        </SettingSection>

        <SettingSection title={t('settings.preferencesTitle')} description={t('settings.preferencesBody')}>
          <SettingRow
            icon={ICONS.Languages}
            label={t('settings.language')}
            description={selectedLanguage?.nativeLabel || language}
            action={
              <Select
                value={selectedLanguage?.code || language}
                options={languageOptions.map((option) => ({
                  value: option.code,
                  label: option.nativeLabel
                }))}
                onChange={onSetLanguage}
                ariaLabel={t('settings.language')}
                size="sm"
                className="w-full sm:min-w-44"
              />
            }
          />
          <SettingRow
            icon={ICONS.Bell}
            label={t('settings.notifications')}
            description={t('settings.notificationsBody')}
          />
        </SettingSection>

        <SettingSection title={t('settings.accountTitle')} description={t('settings.accountBody')}>
          <SettingRow
            icon={ICONS.LogOut}
            label={t('app.logout')}
            description={t('settings.logoutBody')}
            action={
              <motion.button
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={onLogout}
                className="rounded-lg border border-status-danger/25 bg-status-danger-soft px-4 py-2 text-xs font-bold text-status-danger-text transition-all hover:bg-status-danger-soft bg-status-danger-soft text-status-danger-text"
              >
                {t('app.logout')}
              </motion.button>
            }
          />
        </SettingSection>
      </div>
      {activeDialog === 'password' && (
        <SecurityDialog
          title={t('settings.changePassword')}
          submitLabel={t('settings.changePassword')}
          cancelLabel={t('settings.cancel')}
          savingLabel={t('settings.saving')}
          closeLabel={t('settings.closeSecurityDialog')}
          isSubmitting={isSubmittingSecurity}
          error={dialogError}
          onClose={closeSecurityDialog}
          onSubmit={submitPasswordChange}
        >
          <PasswordField id="current-password" label={t('settings.currentPassword')} value={currentPassword} autoComplete="current-password" onChange={setCurrentPassword} />
          <PasswordField id="new-password" label={t('settings.newPassword')} value={newPassword} autoComplete="new-password" onChange={setNewPassword} />
          <PasswordField id="confirm-new-password" label={t('settings.confirmNewPassword')} value={confirmPassword} autoComplete="new-password" onChange={setConfirmPassword} />
        </SecurityDialog>
      )}
      {activeDialog === 'sso' && (
        <SecurityDialog
          title={t('settings.connectSso')}
          submitLabel={t('settings.continueToProvider')}
          cancelLabel={t('settings.cancel')}
          savingLabel={t('settings.saving')}
          closeLabel={t('settings.closeSecurityDialog')}
          isSubmitting={isSubmittingSecurity}
          error={dialogError}
          onClose={closeSecurityDialog}
          onSubmit={submitSsoLink}
        >
          <PasswordField id="sso-current-password" label={t('settings.currentPassword')} value={currentPassword} autoComplete="current-password" onChange={setCurrentPassword} />
        </SecurityDialog>
      )}
    </div>
  );
};
