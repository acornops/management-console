import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const requestJson = vi.fn();
const getControlPlaneUrl = vi.fn();
let assignMock: ReturnType<typeof vi.fn>;

vi.mock('./http', () => ({
  requestJson,
  getControlPlaneUrl,
  ControlPlaneRequestError: class ControlPlaneRequestError extends Error {
    constructor(
      message: string,
      readonly status: number,
      readonly code?: string,
      readonly details?: Record<string, unknown>
    ) {
      super(message);
      this.name = 'ControlPlaneRequestError';
    }
  }
}));

describe('controlPlaneAuthApi', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    assignMock = vi.fn();
    (globalThis as { window?: unknown }).window = {
      location: {
        assign: assignMock
      }
    };
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
    vi.restoreAllMocks();
  });

  it('initiates OIDC login with the requested return URL', async () => {
    getControlPlaneUrl.mockReturnValue(new URL('https://control-plane.example.com/api/v1/auth/oidc/login'));
    const { controlPlaneAuthApi } = await import('./authApi');

    await controlPlaneAuthApi.initiateLogin('/workspaces/demo');

    expect(getControlPlaneUrl).toHaveBeenCalledWith('/api/v1/auth/oidc/login');
    expect(assignMock).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/auth/oidc/login?return_to=%2Fworkspaces%2Fdemo'
    );
  });

  it('carries an external integration link token into OIDC login state', async () => {
    getControlPlaneUrl.mockReturnValue(new URL('https://control-plane.example.com/api/v1/auth/oidc/login'));
    const { controlPlaneAuthApi } = await import('./authApi');

    await controlPlaneAuthApi.initiateLogin('/integrations/external/link?token=intlink_token', {
      externalIntegrationLinkToken: 'intlink_token'
    });

    expect(assignMock).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/auth/oidc/login?return_to=%2Fintegrations%2Fexternal%2Flink%3Ftoken%3Dintlink_token&external_integration_link_token=intlink_token'
    );
  });

  it('previews an external integration link through the authenticated browser endpoint', async () => {
    requestJson.mockResolvedValueOnce({
      integrationClientId: 'mattermost-eng',
      provider: 'mattermost',
      clientDisplayName: 'Mattermost Engineering',
      externalUserId: 'mm-user-1',
      externalDisplayName: 'Ops User',
      expiresAt: '2026-06-09T00:00:00.000Z',
      signedInUser: {
        id: 'user-1',
        email: 'ops@example.com',
        displayName: 'Ops User'
      }
    });
    const { controlPlaneAuthApi } = await import('./authApi');

    await expect(controlPlaneAuthApi.previewExternalIntegrationLink('intlink_token')).resolves.toMatchObject({
      integrationClientId: 'mattermost-eng',
      provider: 'mattermost',
      clientDisplayName: 'Mattermost Engineering',
      externalUserId: 'mm-user-1'
    });
    expect(requestJson).toHaveBeenCalledWith('/api/v1/auth/external-integrations/link/preview', {
      method: 'POST',
      body: JSON.stringify({ token: 'intlink_token' })
    });
  });

  it('completes an external integration link through the authenticated browser endpoint', async () => {
    requestJson.mockResolvedValueOnce({ status: 'linked' });
    const { controlPlaneAuthApi } = await import('./authApi');

    await controlPlaneAuthApi.completeExternalIntegrationLink('intlink_token');

    expect(requestJson).toHaveBeenCalledWith('/api/v1/auth/external-integrations/link/complete', {
      method: 'POST',
      body: JSON.stringify({ token: 'intlink_token' })
    });
  });

  it('maps password login and auth config responses', async () => {
    requestJson
      .mockResolvedValueOnce({
        oidcEnabled: true,
        oidcProviderName: 'Acme',
        passwordAuthEnabled: true,
        passwordSignupEnabled: false,
        passwordEmailVerificationRequired: true,
        passwordResetEnabled: true
      })
      .mockResolvedValueOnce({
        user: {
          id: 'user-1',
          email: 'ops@example.com',
          displayName: 'Ops User'
        }
      });
    const { controlPlaneAuthApi } = await import('./authApi');

    await expect(controlPlaneAuthApi.getAuthConfig()).resolves.toEqual({
      oidcEnabled: true,
      oidcProviderName: 'Acme',
      passwordAuthEnabled: true,
      passwordSignupEnabled: false,
      passwordEmailVerificationRequired: true,
      passwordResetEnabled: true
    });
    await expect(controlPlaneAuthApi.loginWithPassword('ops@example.com', 'secret')).resolves.toEqual({
      id: 'user-1',
      email: 'ops@example.com',
      name: 'Ops User',
      groups: [],
      quota: undefined
    });
    expect(requestJson).toHaveBeenNthCalledWith(2, '/api/v1/auth/password/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: 'ops@example.com', password: 'secret' }),
      sessionExpiry: 'ignore'
    });
  });

  it('maps pending login, verify, and resend verification responses', async () => {
    const { ControlPlaneRequestError } = await import('./http');
    requestJson
      .mockRejectedValueOnce(new ControlPlaneRequestError(
        'Control plane request failed (403): verify email',
        403,
        'EMAIL_VERIFICATION_REQUIRED',
        { email: 'ops@example.com', resendAfterSeconds: 120 }
      ))
      .mockRejectedValueOnce(new ControlPlaneRequestError(
        'Control plane request failed (410): expired',
        410,
        'EMAIL_VERIFICATION_TOKEN_EXPIRED'
      ))
      .mockResolvedValueOnce({
        status: 'ok',
        message: 'If an account is pending verification, a verification email will be sent.',
        resendAfterSeconds: 60
      });
    const { controlPlaneAuthApi } = await import('./authApi');

    await expect(controlPlaneAuthApi.loginWithPassword('ops@example.com', 'secret')).rejects.toMatchObject({
      name: 'EmailVerificationRequiredError',
      email: 'ops@example.com',
      resendAfterSeconds: 120
    });
    await expect(controlPlaneAuthApi.verifyPasswordEmail('expired-token')).rejects.toMatchObject({
      name: 'EMAIL_VERIFICATION_TOKEN_EXPIRED',
      message: 'EMAIL_VERIFICATION_TOKEN_EXPIRED'
    });
    await expect(controlPlaneAuthApi.resendPasswordVerification('ops@example.com')).resolves.toEqual({
      status: 'ok',
      message: 'If an account is pending verification, a verification email will be sent.',
      resendAfterSeconds: 60
    });
    expect(requestJson).toHaveBeenNthCalledWith(3, '/api/v1/auth/password/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email: 'ops@example.com' }),
      sessionExpiry: 'ignore'
    });
  });

  it('requests password reset and maps reset token errors by name', async () => {
    const { ControlPlaneRequestError } = await import('./http');
    requestJson
      .mockResolvedValueOnce({
        status: 'ok',
        message: 'If a password-backed account exists, reset instructions will be sent.',
        resendAfterSeconds: 60
      })
      .mockRejectedValueOnce(new ControlPlaneRequestError(
        'Control plane request failed (410): expired',
        410,
        'PASSWORD_RESET_TOKEN_EXPIRED'
      ))
      .mockResolvedValueOnce({ status: 'ok' });
    const { controlPlaneAuthApi } = await import('./authApi');

    await expect(controlPlaneAuthApi.requestPasswordReset('ops@example.com')).resolves.toEqual({
      status: 'ok',
      message: 'If a password-backed account exists, reset instructions will be sent.',
      resendAfterSeconds: 60
    });
    await expect(controlPlaneAuthApi.resetPassword('expired-token', 'new secure passphrase')).rejects.toMatchObject({
      name: 'PASSWORD_RESET_TOKEN_EXPIRED'
    });
    await expect(controlPlaneAuthApi.resetPassword('valid-token', 'new secure passphrase')).resolves.toBeUndefined();
    expect(requestJson).toHaveBeenNthCalledWith(1, '/api/v1/auth/password/forgot', {
      method: 'POST',
      body: JSON.stringify({ email: 'ops@example.com' }),
      sessionExpiry: 'ignore'
    });
    expect(requestJson).toHaveBeenNthCalledWith(2, '/api/v1/auth/password/reset', {
      method: 'POST',
      body: JSON.stringify({ token: 'expired-token', password: 'new secure passphrase' }),
      sessionExpiry: 'ignore'
    });
    expect(requestJson).toHaveBeenNthCalledWith(3, '/api/v1/auth/password/reset', {
      method: 'POST',
      body: JSON.stringify({ token: 'valid-token', password: 'new secure passphrase' }),
      sessionExpiry: 'ignore'
    });
  });

  it('strips control-plane prefixes for signup and password change failures', async () => {
    requestJson
      .mockRejectedValueOnce(new Error('Control plane request failed (409): Email already exists'))
      .mockRejectedValueOnce(new Error('Control plane request failed (400): Password too weak'));
    const { controlPlaneAuthApi } = await import('./authApi');

    await expect(
      controlPlaneAuthApi.signupWithPassword({
        email: 'ops@example.com',
        username: 'ops',
        password: 'secret'
      })
    ).rejects.toThrow('Email already exists');
    await expect(
      controlPlaneAuthApi.changePassword({ currentPassword: 'old-secret', newPassword: 'new-secret' })
    ).rejects.toThrow('Password too weak');
  });

  it('uses fallback messages when link or signup errors are not Error instances', async () => {
    requestJson.mockRejectedValueOnce('bad response').mockRejectedValueOnce(null);
    const { controlPlaneAuthApi } = await import('./authApi');

    await expect(
      controlPlaneAuthApi.startOidcLink({ currentPassword: 'secret', returnTo: '/settings' })
    ).rejects.toThrow('SSO link failed.');
    await expect(
      controlPlaneAuthApi.signupWithPassword({
        email: 'ops@example.com',
        username: 'ops',
        password: 'secret'
      })
    ).rejects.toThrow('Signup failed.');
  });

  it('returns pending verification when signup email delivery already created the account', async () => {
    const { ControlPlaneRequestError } = await import('./http');
    requestJson.mockRejectedValueOnce(new ControlPlaneRequestError(
      'Control plane request failed (503): delivery failed',
      503,
      'EMAIL_DELIVERY_FAILED',
      { email: 'ops@example.com' }
    ));
    const { controlPlaneAuthApi } = await import('./authApi');

    await expect(
      controlPlaneAuthApi.signupWithPassword({
        email: 'ops@example.com',
        username: 'ops',
        password: 'secret'
      })
    ).resolves.toEqual({
      status: 'verification_required',
      email: 'ops@example.com',
      deliveryFailed: true
    });
  });

  it('returns OIDC start URLs and posts logout bodies', async () => {
    const handoff = 'a'.repeat(43);
    requestJson.mockResolvedValueOnce({ url: 'https://idp.example.com/link' }).mockResolvedValueOnce({
      status: 'ok',
      mode: 'oidc',
      redirectPath: `/api/v1/auth/oidc/logout/start?request=${handoff}`
    });
    const { controlPlaneAuthApi } = await import('./authApi');

    await expect(controlPlaneAuthApi.startOidcLink({ currentPassword: 'secret' })).resolves.toBe(
      'https://idp.example.com/link'
    );
    await expect(controlPlaneAuthApi.logout()).resolves.toEqual({
      status: 'ok',
      mode: 'oidc',
      redirectPath: `/api/v1/auth/oidc/logout/start?request=${handoff}`
    });
    expect(requestJson).toHaveBeenNthCalledWith(2, '/api/v1/auth/logout', {
      method: 'POST',
      body: JSON.stringify({}),
      sessionExpiry: 'ignore'
    });
  });

  it('rejects protocol-relative logout paths', async () => {
    requestJson.mockResolvedValueOnce({ status: 'ok', mode: 'oidc', redirectPath: '//attacker.example.com' });
    const { controlPlaneAuthApi } = await import('./authApi');
    await expect(controlPlaneAuthApi.logout()).rejects.toThrow('invalid redirect path');
  });

  it('rejects unrecognized same-origin logout paths', async () => {
    requestJson.mockResolvedValueOnce({ status: 'ok', mode: 'local', redirectPath: '/settings' });
    const { controlPlaneAuthApi } = await import('./authApi');
    await expect(controlPlaneAuthApi.logout()).rejects.toThrow('invalid redirect path');
  });
});
