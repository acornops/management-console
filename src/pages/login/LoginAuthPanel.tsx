import React from 'react';
import { useTranslation } from 'react-i18next';
import { ICONS } from '@/constants';
import { formatControlPlaneError } from '@/services/control-plane/errorFormatting';
import { EmailField, ErrorMessage, NoticeCard, OidcLoginButton, PasswordField, SignupSwitchFooter, primaryButtonClass, secondaryButtonClass } from '@/pages/login/LoginAuthPanelParts';
import { LoginPasswordAuthForm } from '@/pages/login/LoginPasswordAuthForm';
import { isPlausibleAuthEmailToken, isValidEmailAddress, routeToken } from '@/pages/login/loginAuthPanelState';
import type { AuthMode, LoginAuthPanelProps, PasswordResetRequestState, PendingVerificationState, ResetLinkState, VerifyLinkState } from '@/pages/login/loginAuthPanelState';

export function LoginAuthPanel({
  isAuthLoading,
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
  onResetPassword
}: LoginAuthPanelProps) {
  const { t } = useTranslation();
  const [mode, setMode] = React.useState<AuthMode>('login');
  const [identifier, setIdentifier] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [forgotEmail, setForgotEmail] = React.useState('');
  const [resetToken, setResetToken] = React.useState('');
  const [resetPasswordValue, setResetPasswordValue] = React.useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = React.useState('');
  const [resetRequestEmail, setResetRequestEmail] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [resendEmailError, setResendEmailError] = React.useState<string | undefined>();
  const [forgotEmailError, setForgotEmailError] = React.useState<string | undefined>();
  const [resetRequestEmailError, setResetRequestEmailError] = React.useState<string | undefined>();
  const [pendingVerification, setPendingVerification] = React.useState<PendingVerificationState | null>(null);
  const [resendEmail, setResendEmail] = React.useState('');
  const [passwordResetRequest, setPasswordResetRequest] = React.useState<PasswordResetRequestState | null>(null);
  const [verifyLinkState, setVerifyLinkState] = React.useState<VerifyLinkState>('idle');
  const [resetLinkState, setResetLinkState] = React.useState<ResetLinkState>('idle');
  const attemptedVerifyTokenRef = React.useRef<string | null>(null);
  const attemptedResetRouteRef = React.useRef<string | null>(null);
  const canSignup = passwordAuthEnabled && passwordSignupEnabled;
  const canResetPassword = passwordAuthEnabled && passwordResetEnabled;
  const hasAuthMethod = oidcEnabled || passwordAuthEnabled;
  const loginSubtitle = !hasAuthMethod
    ? t('login.noAuthMethods')
    : passwordAuthEnabled
      ? mode === 'signup' && canSignup
        ? t('login.startManaging')
        : mode === 'forgot'
          ? t('login.forgotSubtitle')
          : mode === 'reset'
            ? t('login.resetSubtitle')
            : t('login.accessWorkspace')
      : t('login.ssoOnly');

  React.useEffect(() => {
    if (mode === 'signup' && !canSignup) {
      setMode('login');
      setError(null);
    }
    if ((mode === 'forgot' || mode === 'reset') && !canResetPassword) {
      setMode('login');
      setError(null);
    }
  }, [canResetPassword, canSignup, mode]);

  React.useEffect(() => {
    const countdown = pendingVerification?.resendAfterSeconds || passwordResetRequest?.resendAfterSeconds;
    if (!countdown) return;
    const timer = window.setInterval(() => {
      setPendingVerification((current) => {
        if (!current?.resendAfterSeconds) return current;
        const nextSeconds = current.resendAfterSeconds - 1;
        return {
          ...current,
          resendAfterSeconds: nextSeconds > 0 ? nextSeconds : undefined,
          notice: nextSeconds > 0 ? current.notice : undefined
        };
      });
      setPasswordResetRequest((current) => {
        if (!current?.resendAfterSeconds) return current;
        const nextSeconds = current.resendAfterSeconds - 1;
        return {
          ...current,
          resendAfterSeconds: nextSeconds > 0 ? nextSeconds : undefined,
          notice: nextSeconds > 0 ? current.notice : undefined
        };
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [pendingVerification?.resendAfterSeconds, passwordResetRequest?.resendAfterSeconds]);

  React.useEffect(() => {
    const rawHash = window.location.hash.startsWith('#/') ? window.location.hash.slice(1) : '';
    const { isRoute, token } = routeToken(window.location.pathname, rawHash, '/verify-email');
    if (!isRoute || !token || verifyLinkState !== 'idle') return;
    if (attemptedVerifyTokenRef.current === token) return;
    attemptedVerifyTokenRef.current = token;
    setVerifyLinkState('loading');
    void onVerifyEmail(token)
      .then(() => {
        setVerifyLinkState('success');
      })
      .catch((err) => {
        const code = err instanceof Error ? err.name || err.message : '';
        if (code === 'EMAIL_VERIFICATION_TOKEN_EXPIRED') {
          setVerifyLinkState('expired');
        } else if (code === 'EMAIL_VERIFICATION_TOKEN_INVALID') {
          setVerifyLinkState('invalid');
        } else {
          setVerifyLinkState('error');
        }
      });
  }, [onVerifyEmail, verifyLinkState]);

  React.useEffect(() => {
    const rawHash = window.location.hash.startsWith('#/') ? window.location.hash.slice(1) : '';
    const { isRoute, token } = routeToken(window.location.pathname, rawHash, '/reset-password');
    if (!isRoute) return;
    if (attemptedResetRouteRef.current === `${rawHash}|${window.location.search}`) return;
    attemptedResetRouteRef.current = `${rawHash}|${window.location.search}`;
    setMode('reset');
    setPendingVerification(null);
    setPasswordResetRequest(null);
    setError(null);
    if (!token || !isPlausibleAuthEmailToken(token)) {
      setResetToken('');
      setResetLinkState('invalid');
      return;
    }
    setResetToken(token);
    setResetLinkState('form');
  }, []);

  const resetAuthFormState = () => {
    setError(null);
    setResendEmailError(undefined);
    setForgotEmailError(undefined);
    setResetRequestEmailError(undefined);
    setPendingVerification(null);
    setPasswordResetRequest(null);
  };

  const validateEmailField = (value: string, setFieldError: (message: string | undefined) => void) => {
    if (!value.trim()) {
      setFieldError(t('login.validation.emailRequired'));
      return false;
    }
    if (!isValidEmailAddress(value.trim())) {
      setFieldError(t('login.validation.emailInvalid'));
      return false;
    }
    setFieldError(undefined);
    return true;
  };

  const submitPasswordAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetAuthFormState();
    try {
      if (!passwordAuthEnabled) {
        setError(t('login.passwordAuthUnavailable'));
        return;
      }
      if (mode === 'login') {
        const result = await onPasswordLogin(identifier, password);
        if (result.status === 'verification_required') {
          setPendingVerification({ email: result.email, resendAfterSeconds: result.resendAfterSeconds });
          setResendEmail(result.email);
        }
        return;
      }
      if (!canSignup) {
        setError(t('login.signupUnavailable'));
        return;
      }
      if (password !== confirmPassword) {
        setError(t('login.passwordMismatch'));
        return;
      }
      const result = await onPasswordSignup({
        email,
        username,
        password,
        displayName: username.trim() || email.trim() || undefined
      });
      if (result.status === 'verification_required') {
        setPendingVerification({
          email: result.email,
          resendAfterSeconds: result.resendAfterSeconds,
          deliveryFailed: result.deliveryFailed
        });
        setResendEmail(result.email);
        if (result.deliveryFailed) {
          setError(t('login.verificationDeliveryFailed'));
        }
      }
    } catch (err) {
      setError(formatControlPlaneError(err, t('login.authFailed'), { area: 'auth' }));
    }
  };

  const requestPasswordResetEmail = async (destination: string) => {
    if (!destination || !canResetPassword) return;
    setError(null);
    try {
      const result = await onRequestPasswordReset(destination);
      setPasswordResetRequest({
        email: destination,
        resendAfterSeconds: result.resendAfterSeconds,
        notice: result.resendAfterSeconds ? undefined : t('login.resetEmailSent')
      });
    } catch (err) {
      setError(formatControlPlaneError(err, t('login.authFailed'), { area: 'auth' }));
    }
  };

  const submitForgotPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateEmailField(forgotEmail, setForgotEmailError)) return;
    await requestPasswordResetEmail(forgotEmail.trim());
  };

  const submitResetRequestFromState = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateEmailField(resetRequestEmail, setResetRequestEmailError)) return;
    await requestPasswordResetEmail(resetRequestEmail.trim());
  };

  const submitResetPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!resetToken) {
      setResetLinkState('invalid');
      return;
    }
    if (resetPasswordValue.length < 15) {
      setError(t('login.passwordPolicyMinimum'));
      return;
    }
    if (resetPasswordValue !== resetConfirmPassword) {
      setError(t('login.passwordMismatch'));
      return;
    }
    try {
      await onResetPassword(resetToken, resetPasswordValue);
      setResetPasswordValue('');
      setResetConfirmPassword('');
      setResetLinkState('success');
    } catch (err) {
      const code = err instanceof Error ? err.name || err.message : '';
      if (code === 'PASSWORD_RESET_TOKEN_EXPIRED') {
        setResetLinkState('expired');
      } else if (code === 'PASSWORD_RESET_TOKEN_INVALID') {
        setResetLinkState('invalid');
      } else {
        setError(formatControlPlaneError(err, t('login.authFailed'), { area: 'auth' }));
        setResetLinkState(code === 'PASSWORD_POLICY_VIOLATION' ? 'form' : 'error');
      }
    }
  };

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError(null);
    setPendingVerification(null);
    setPasswordResetRequest(null);
    if (nextMode !== 'reset') {
      setResetLinkState('idle');
    }
  };

  const resendVerification = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const destination = (pendingVerification?.email || resendEmail).trim();
    if (!pendingVerification?.email && !validateEmailField(resendEmail, setResendEmailError)) return;
    if (!destination) return;
    setError(null);
    try {
      const result = await onResendVerification(destination);
      setPendingVerification({
        email: destination,
        resendAfterSeconds: result.resendAfterSeconds,
        notice: result.resendAfterSeconds ? undefined : t('login.verificationEmailSent')
      });
      setResendEmail(destination);
      if (verifyLinkState !== 'idle') {
        setVerifyLinkState('idle');
      }
    } catch (err) {
      setError(formatControlPlaneError(err, t('login.authFailed'), { area: 'auth' }));
    }
  };

  const renderPasswordToggle = () => (
    <button
      type="button"
      onClick={() => setShowPassword((current) => !current)}
      className="control-target absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-ui-text-muted transition-all hover:bg-ui-surface hover:text-ui-text focus:outline-none focus:ring-2 focus:ring-accent/20"
      aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
      aria-pressed={showPassword}
    >
      {showPassword ? <ICONS.EyeOff className="h-4 w-4" /> : <ICONS.Eye className="h-4 w-4" />}
    </button>
  );

  const renderPendingVerification = () => (
    <div className="space-y-5">
      <NoticeCard
        icon={<ICONS.Mail className="h-4 w-4" />}
        title={t('login.checkEmail')}
        body={pendingVerification?.deliveryFailed
          ? t('login.verificationPendingDeliveryFailedBody', { email: pendingVerification.email })
          : t('login.verificationPendingBody', { email: pendingVerification?.email })}
        status={pendingVerification?.notice ||
          (pendingVerification?.resendAfterSeconds
            ? t('login.verificationThrottled', { time: Math.ceil(pendingVerification.resendAfterSeconds / 60) })
            : undefined)}
        danger={Boolean(pendingVerification?.resendAfterSeconds)}
      />
      <button
        type="button"
        onClick={() => void resendVerification()}
        disabled={isAuthLoading || Boolean(pendingVerification?.resendAfterSeconds)}
        className={`control-target ${primaryButtonClass}`}
      >
        <ICONS.Send className="h-4 w-4" />
        <span>{t('login.resendEmail')}</span>
      </button>
      <button
        type="button"
        onClick={() => {
          setPendingVerification(null);
          setError(null);
          setPassword('');
          setConfirmPassword('');
        }}
        className={`control-target ${secondaryButtonClass}`}
      >
        {t('login.useDifferentEmail')}
      </button>
    </div>
  );

  const renderVerifyLinkState = () => {
    if (verifyLinkState === 'idle') return null;
    const stateCopy = {
      loading: [t('login.verificationLoading'), t('login.verificationLoadingBody')],
      success: [t('login.verificationSuccess'), t('login.verificationSuccessBody')],
      expired: [t('login.verificationExpired'), t('login.verificationExpiredBody')],
      invalid: [t('login.verificationInvalid'), t('login.verificationInvalidBody')],
      error: [t('login.verificationError'), t('login.verificationErrorBody')]
    }[verifyLinkState];
    const canResend = verifyLinkState === 'expired' || verifyLinkState === 'invalid' || verifyLinkState === 'error';
    return (
      <div className="space-y-5">
        <NoticeCard
          icon={verifyLinkState === 'loading'
            ? <span className="h-4 w-4 rounded-full border-2 border-accent-strong border-t-transparent animate-spin" />
            : verifyLinkState === 'success'
              ? <ICONS.CheckCircle2 className="h-4 w-4" />
              : <ICONS.AlertCircle className="h-4 w-4" />}
          title={stateCopy[0]}
          body={stateCopy[1]}
        />
        {canResend && (
          <form className="space-y-3" onSubmit={(event) => void resendVerification(event)} noValidate>
            <EmailField
              value={resendEmail}
              onChange={(value) => {
                setResendEmailError(undefined);
                setResendEmail(value);
              }}
              disabled={isAuthLoading}
              label={t('login.email')}
              error={resendEmailError}
              inputId="verification-resend-email"
            />
            <button type="submit" disabled={isAuthLoading} className={`control-target ${primaryButtonClass}`}>
              <ICONS.Send className="h-4 w-4" />
              <span>{t('login.resendEmail')}</span>
            </button>
          </form>
        )}
        {error && <ErrorMessage message={error} />}
      </div>
    );
  };

  const resetRequestForEmail = (emailValue: string) => {
    if (!passwordResetRequest) return null;
    return passwordResetRequest.email.trim().toLowerCase() === emailValue.trim().toLowerCase()
      ? passwordResetRequest
      : null;
  };

  const renderPasswordResetNotice = (request: PasswordResetRequestState) => (
    <NoticeCard
      icon={<ICONS.Mail className="h-4 w-4" />}
      title={t('login.resetCheckEmail')}
      body={t('login.resetCheckEmailBody', { email: request.email })}
      status={request.notice ||
        (request.resendAfterSeconds
          ? t('login.resetThrottled', { time: Math.ceil(request.resendAfterSeconds / 60) })
          : undefined)}
      danger={Boolean(request.resendAfterSeconds)}
    />
  );

  const renderForgotPassword = () => {
    const activeResetRequest = resetRequestForEmail(forgotEmail);
    return (
      <form className="space-y-5" onSubmit={(event) => void submitForgotPassword(event)} noValidate>
        {activeResetRequest && renderPasswordResetNotice(activeResetRequest)}
        <EmailField
          value={forgotEmail}
          onChange={(value) => {
            setForgotEmailError(undefined);
            setForgotEmail(value);
          }}
          disabled={isAuthLoading}
          label={t('login.email')}
          error={forgotEmailError}
          inputId="forgot-password-email"
        />
        {error && <ErrorMessage message={error} />}
        <button
          type="submit"
          disabled={isAuthLoading || Boolean(activeResetRequest?.resendAfterSeconds)}
          className={`control-target ${primaryButtonClass}`}
        >
          {isAuthLoading ? (
            <span className="h-4 w-4 rounded-full border-2 border-ui-bg border-t-transparent animate-spin" />
          ) : (
            <>
              <ICONS.Send className="h-4 w-4" />
              <span>{t('login.sendResetEmail')}</span>
            </>
          )}
        </button>
        <button type="button" onClick={() => changeMode('login')} className={`control-target ${secondaryButtonClass}`}>
          {t('login.backToSignIn')}
        </button>
      </form>
    );
  };

  const renderResetRequestForm = () => {
    const activeResetRequest = resetRequestForEmail(resetRequestEmail);
    return (
      <form className="space-y-3" onSubmit={(event) => void submitResetRequestFromState(event)} noValidate>
        <EmailField
          value={resetRequestEmail}
          onChange={(value) => {
            setResetRequestEmailError(undefined);
            setResetRequestEmail(value);
          }}
          disabled={isAuthLoading}
          label={t('login.email')}
          error={resetRequestEmailError}
          inputId="reset-request-email"
        />
        {activeResetRequest && renderPasswordResetNotice(activeResetRequest)}
        <button type="submit" disabled={isAuthLoading || Boolean(activeResetRequest?.resendAfterSeconds)} className={`control-target ${primaryButtonClass}`}>
          <ICONS.Send className="h-4 w-4" />
          <span>{t('login.sendResetEmail')}</span>
        </button>
      </form>
    );
  };

  const renderResetPassword = () => {
    if (resetLinkState === 'success') {
      return (
        <div className="space-y-5">
          <NoticeCard
            icon={<ICONS.CheckCircle2 className="h-4 w-4" />}
            title={t('login.passwordUpdated')}
            body={t('login.passwordUpdatedBody')}
          />
          <button type="button" onClick={() => changeMode('login')} className={`control-target ${primaryButtonClass}`}>
            <span>{t('login.signInTab')}</span>
            <ICONS.ArrowRight className="h-4 w-4" />
          </button>
        </div>
      );
    }
    if (resetLinkState === 'expired' || resetLinkState === 'invalid' || resetLinkState === 'error') {
      const copy = {
        expired: [t('login.resetExpired'), t('login.resetExpiredBody')],
        invalid: [t('login.resetInvalid'), t('login.resetInvalidBody')],
        error: [t('login.resetError'), t('login.resetErrorBody')]
      }[resetLinkState];
      return (
        <div className="space-y-5">
          <NoticeCard
            icon={<ICONS.AlertCircle className="h-4 w-4" />}
            title={copy[0]}
            body={copy[1]}
          />
          {renderResetRequestForm()}
          {error && <ErrorMessage message={error} />}
          <button type="button" onClick={() => changeMode('login')} className={`control-target ${secondaryButtonClass}`}>
            {t('login.backToSignIn')}
          </button>
        </div>
      );
    }
    return (
      <form className="space-y-5" onSubmit={(event) => void submitResetPassword(event)} noValidate>
        <PasswordField
          value={resetPasswordValue}
          onChange={setResetPasswordValue}
          disabled={isAuthLoading}
          showPassword={showPassword}
          autoComplete="new-password"
          label={t('login.newPassword')}
          minLength={15}
          renderPasswordToggle={renderPasswordToggle}
        />
        <PasswordField
          value={resetConfirmPassword}
          onChange={setResetConfirmPassword}
          disabled={isAuthLoading}
          showPassword={showPassword}
          autoComplete="new-password"
          label={t('login.confirmPassword')}
          minLength={15}
          renderPasswordToggle={renderPasswordToggle}
        />
        {error && <ErrorMessage message={error} />}
        <button type="submit" disabled={isAuthLoading} className={`control-target ${primaryButtonClass}`}>
          {isAuthLoading ? (
            <span className="h-4 w-4 rounded-full border-2 border-ui-bg border-t-transparent animate-spin" />
          ) : (
            <>
              <span>{t('login.updatePassword')}</span>
              <ICONS.ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
    );
  };

  const verifyLinkContent = renderVerifyLinkState();

  return (
    <div className="relative overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm">
      <div className="p-5 sm:p-8">
        <h1 className="mb-2 text-center text-2xl font-bold text-ui-text">
          {mode === 'signup' && canSignup
            ? t('login.createAccount')
            : mode === 'forgot'
              ? t('login.forgotPasswordTitle')
              : mode === 'reset'
                ? t('login.resetPasswordTitle')
                : t('login.welcomeBack')}
        </h1>
        <p className="mb-8 text-center text-sm font-medium leading-6 text-ui-text-muted">{loginSubtitle}</p>

        {verifyLinkContent || pendingVerification ? (
          <>
            {verifyLinkContent || renderPendingVerification()}
            {pendingVerification && error && <div className="mt-5"><ErrorMessage message={error} /></div>}
          </>
        ) : mode === 'forgot' ? (
          renderForgotPassword()
        ) : mode === 'reset' ? (
          renderResetPassword()
        ) : passwordAuthEnabled && (
          <LoginPasswordAuthForm
            mode={mode}
            canSignup={canSignup}
            canResetPassword={canResetPassword}
            isAuthLoading={isAuthLoading}
            error={error}
            email={email}
            identifier={identifier}
            username={username}
            password={password}
            confirmPassword={confirmPassword}
            showPassword={showPassword}
            onEmailChange={setEmail}
            onIdentifierChange={setIdentifier}
            onUsernameChange={setUsername}
            onPasswordChange={setPassword}
            onConfirmPasswordChange={setConfirmPassword}
            onForgotPassword={() => {
              setForgotEmail(identifier.includes('@') ? identifier : '');
              changeMode('forgot');
            }}
            onSubmit={submitPasswordAuth}
            renderPasswordToggle={renderPasswordToggle}
            t={t}
          />
        )}

        {passwordAuthEnabled && oidcEnabled && mode !== 'forgot' && mode !== 'reset' && !pendingVerification && !verifyLinkContent && (
          <div className="relative mt-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-ui-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-ui-surface px-2 font-bold uppercase tracking-widest text-ui-text-muted">{t('login.orContinueWith')}</span>
            </div>
          </div>
        )}

        {oidcEnabled && mode !== 'forgot' && mode !== 'reset' && !pendingVerification && !verifyLinkContent && (
          <OidcLoginButton
            isAuthLoading={isAuthLoading}
            passwordAuthEnabled={passwordAuthEnabled}
            onLogin={onLogin}
            label={t('login.continueWithOidc')}
          />
        )}
      </div>

      {passwordAuthEnabled && canSignup && mode !== 'forgot' && mode !== 'reset' && !pendingVerification && !verifyLinkContent && (
        <SignupSwitchFooter
          isAuthLoading={isAuthLoading}
          onSwitch={() => changeMode(mode === 'login' ? 'signup' : 'login')}
          prompt={mode === 'login' ? t('login.dontHaveAccount') : t('login.alreadyHaveAccount')}
          actionLabel={mode === 'login' ? t('login.signUp') : t('login.signInTab')}
        />
      )}
    </div>
  );
}
