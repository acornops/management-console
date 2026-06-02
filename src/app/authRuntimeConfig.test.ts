import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const app = readFileSync(resolve(root, 'src/App.tsx'), 'utf8');
const authConfigHook = readFileSync(resolve(root, 'src/app/useAuthConfig.ts'), 'utf8');
const loginPage = readFileSync(resolve(root, 'src/pages/LoginPage.tsx'), 'utf8');
const loginAuthPanel = readFileSync(resolve(root, 'src/pages/login/LoginAuthPanel.tsx'), 'utf8');
const loginPasswordAuthForm = readFileSync(resolve(root, 'src/pages/login/LoginPasswordAuthForm.tsx'), 'utf8');
const api = readFileSync(resolve(root, 'src/services/controlPlaneApi.ts'), 'utf8');
const authApi = readFileSync(resolve(root, 'src/services/control-plane/authApi.ts'), 'utf8');
const enLocale = readFileSync(resolve(root, 'src/i18n/locales/en.js'), 'utf8');
const authApiSurface = `${api}\n${authApi}`;

describe('runtime auth configuration', () => {
  it('loads auth capabilities from the control plane before rendering login controls', () => {
    expect(authApiSurface).toContain("requestJson<ControlPlaneAuthConfig>('/api/v1/auth/config')");
    expect(authConfigHook).toContain('const [authConfig, setAuthConfig] = useState<ControlPlaneAuthConfig>(defaultAuthConfig)');
    expect(authConfigHook).toContain('void controlPlaneApi.getAuthConfig()');
    expect(app).toContain('const authConfig = useAuthConfig();');
    expect(app).toContain('oidcEnabled={authConfig.oidcEnabled}');
    expect(app).toContain('passwordAuthEnabled={authConfig.passwordAuthEnabled}');
    expect(app).toContain('passwordSignupEnabled={authConfig.passwordSignupEnabled}');
    expect(app).toContain('passwordResetEnabled={authConfig.passwordResetEnabled}');
    expect(authConfigHook).toContain('passwordEmailVerificationRequired: true');
    expect(authConfigHook).toContain('passwordResetEnabled: true');
  });

  it('keeps dual auth visible by default and hides disabled modes from login', () => {
    expect(authConfigHook).toContain('oidcEnabled: true');
    expect(authConfigHook).toContain('passwordAuthEnabled: true');
    expect(authConfigHook).toContain('passwordSignupEnabled: true');
    expect(authConfigHook).toContain('passwordResetEnabled: true');
    expect(loginPage).toContain('<LoginAuthPanel');
    expect(loginAuthPanel).toContain('const canSignup = passwordAuthEnabled && passwordSignupEnabled');
    expect(loginAuthPanel).toContain('const canResetPassword = passwordAuthEnabled && passwordResetEnabled');
    expect(loginAuthPanel).toContain("{oidcEnabled && mode !== 'forgot'");
    expect(loginAuthPanel).toContain("{passwordAuthEnabled && canSignup && mode !== 'forgot'");
    expect(loginAuthPanel).toContain('const hasAuthMethod = oidcEnabled || passwordAuthEnabled');
    expect(loginAuthPanel).toContain("t('login.noAuthMethods')");
    expect(loginAuthPanel).toContain("t('login.passwordAuthUnavailable')");
    expect(loginAuthPanel).toContain("t('login.signupUnavailable')");
    expect(loginAuthPanel).toContain("t('login.checkEmail')");
    expect(loginAuthPanel).toContain("t('login.verificationExpired')");
    expect(loginPasswordAuthForm).toContain("t('login.forgotPassword')");
    expect(loginAuthPanel).toContain("t('login.resetExpired')");
    expect(loginAuthPanel).toContain("t('login.passwordUpdated')");
    expect(loginAuthPanel).toContain("t('login.verificationPendingDeliveryFailedBody',");
    expect(loginAuthPanel).toContain('const attemptedVerifyTokenRef = React.useRef');
    expect(loginAuthPanel).toContain('attemptedVerifyTokenRef.current === token');
    expect(loginAuthPanel).toContain("setVerifyLinkState('idle')");
    expect(loginAuthPanel).toContain('/reset-password');
    expect(loginAuthPanel).toContain('isPlausibleAuthEmailToken(token)');
    expect(authApi).toContain('/api/v1/auth/password/verify-email');
    expect(authApi).toContain('/api/v1/auth/password/resend-verification');
    expect(authApi).toContain('/api/v1/auth/password/forgot');
    expect(authApi).toContain('/api/v1/auth/password/reset');
    expect(authApi).toContain('next.name = error.code');
    expect(authApi).toContain('deliveryFailed: true');
    expect(enLocale).toContain("passwordAuthUnavailable: 'Password login is disabled for this environment.'");
    expect(enLocale).toContain("forgotPassword: 'Forgot password?'");
    expect(enLocale).toContain("signupUnavailable: 'Self-service signup is disabled for this environment.'");
    expect(enLocale).toContain("noAuthMethods: 'No sign-in method is enabled for this environment.");
  });
});
