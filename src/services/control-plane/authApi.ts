import { User } from '@/types';
import { formatControlPlaneError } from './errorFormatting';
import { ControlPlaneRequestError, getControlPlaneUrl, requestJson } from './http';
import {
  ControlPlaneAuthConfig,
  ControlPlaneAuthMethods,
  ControlPlaneExternalIntegrationLinkPreview,
  ControlPlanePasswordResetRequestResult,
  ControlPlaneUser,
  ControlPlaneVerificationRequired,
  ControlPlaneVerificationResendResult
} from './types';
import { userFromControlPlane } from './userMappers';

export class EmailVerificationRequiredError extends Error {
  constructor(
    readonly email: string,
    readonly resendAfterSeconds?: number
  ) {
    super('Verify your email before signing in.');
    this.name = 'EmailVerificationRequiredError';
  }
}

function stripControlPlaneErrorPrefix(error: unknown, fallback: string): string {
  return formatControlPlaneError(error, fallback, { area: 'auth' });
}

export const controlPlaneAuthApi = {
  async getAuthConfig(): Promise<ControlPlaneAuthConfig> {
    return requestJson<ControlPlaneAuthConfig>('/api/v1/auth/config');
  },

  async getCsrfToken(): Promise<string> {
    const result = await requestJson<{ csrfToken: string }>('/api/v1/auth/csrf');
    return result.csrfToken;
  },

  async initiateLogin(returnTo: string, options?: { externalIntegrationLinkToken?: string }): Promise<void> {
    const url = getControlPlaneUrl('/api/v1/auth/oidc/login');
    url.searchParams.set('return_to', returnTo);
    if (options?.externalIntegrationLinkToken) {
      url.searchParams.set('external_integration_link_token', options.externalIntegrationLinkToken);
    }
    window.location.assign(url.toString());
  },

  async previewExternalIntegrationLink(token: string): Promise<ControlPlaneExternalIntegrationLinkPreview> {
    return requestJson<ControlPlaneExternalIntegrationLinkPreview>('/api/v1/auth/external-integrations/link/preview', {
      method: 'POST',
      body: JSON.stringify({ token })
    });
  },

  async completeExternalIntegrationLink(token: string): Promise<void> {
    await requestJson<{ status: 'linked' }>('/api/v1/auth/external-integrations/link/complete', {
      method: 'POST',
      body: JSON.stringify({ token })
    });
  },

  async loginWithPassword(identifier: string, password: string): Promise<User> {
    try {
      const result = await requestJson<{ user: ControlPlaneUser }>('/api/v1/auth/password/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password })
      });
      return userFromControlPlane(result.user);
    } catch (error) {
      if (error instanceof ControlPlaneRequestError && error.code === 'EMAIL_VERIFICATION_REQUIRED') {
        const details = error.details || {};
        throw new EmailVerificationRequiredError(
          typeof details.email === 'string' ? details.email : identifier,
          typeof details.resendAfterSeconds === 'number' ? details.resendAfterSeconds : undefined
        );
      }
      throw error;
    }
  },

  async signupWithPassword(input: { email: string; username: string; password: string; displayName?: string }): Promise<
    | { status: 'signed_in'; user: User }
    | (ControlPlaneVerificationRequired & { deliveryFailed?: boolean })
  > {
    try {
      const result = await requestJson<
        | { user: ControlPlaneUser }
        | ControlPlaneVerificationRequired
      >('/api/v1/auth/password/signup', {
        method: 'POST',
        body: JSON.stringify(input)
      });
      if ('status' in result && result.status === 'verification_required') return result;
      if ('user' in result) return { status: 'signed_in', user: userFromControlPlane(result.user) };
      throw new Error('Signup response was missing a user.');
    } catch (error) {
      if (error instanceof ControlPlaneRequestError && error.code === 'EMAIL_DELIVERY_FAILED') {
        const details = error.details || {};
        return {
          status: 'verification_required',
          email: typeof details.email === 'string' ? details.email : input.email,
          deliveryFailed: true
        };
      }
      throw new Error(stripControlPlaneErrorPrefix(error, 'Signup failed.'));
    }
  },

  async verifyPasswordEmail(token: string): Promise<User> {
    try {
      const result = await requestJson<{ user: ControlPlaneUser; status: 'verified' }>('/api/v1/auth/password/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token })
      });
      return userFromControlPlane(result.user);
    } catch (error) {
      if (error instanceof ControlPlaneRequestError && error.code) {
        const next = new Error(error.code);
        next.name = error.code;
        throw next;
      }
      throw error;
    }
  },

  async resendPasswordVerification(email: string): Promise<ControlPlaneVerificationResendResult> {
    return requestJson<ControlPlaneVerificationResendResult>('/api/v1/auth/password/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  async requestPasswordReset(email: string): Promise<ControlPlanePasswordResetRequestResult> {
    return requestJson<ControlPlanePasswordResetRequestResult>('/api/v1/auth/password/forgot', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  async resetPassword(token: string, password: string): Promise<void> {
    try {
      await requestJson<{ status: string }>('/api/v1/auth/password/reset', {
        method: 'POST',
        body: JSON.stringify({ token, password })
      });
    } catch (error) {
      if (error instanceof ControlPlaneRequestError && error.code) {
        const next = new Error(formatControlPlaneError(error, 'Password reset failed.', { area: 'auth' }));
        next.name = error.code;
        throw next;
      }
      throw error;
    }
  },

  async getAuthMethods(): Promise<ControlPlaneAuthMethods> {
    return requestJson<ControlPlaneAuthMethods>('/api/v1/auth/methods');
  },

  async changePassword(input: { currentPassword: string; newPassword: string }): Promise<void> {
    try {
      await requestJson<{ status: string }>('/api/v1/auth/password/change', {
        method: 'POST',
        body: JSON.stringify(input)
      });
    } catch (error) {
      throw new Error(stripControlPlaneErrorPrefix(error, 'Password change failed.'));
    }
  },

  async startOidcLink(input: { currentPassword: string; returnTo?: string }): Promise<string> {
    try {
      const result = await requestJson<{ url: string }>('/api/v1/auth/oidc/link/start', {
        method: 'POST',
        body: JSON.stringify(input)
      });
      return result.url;
    } catch (error) {
      throw new Error(stripControlPlaneErrorPrefix(error, 'SSO link failed.'));
    }
  },

  async logout(): Promise<void> {
    await requestJson<{ status: string }>('/api/v1/auth/logout', {
      method: 'POST',
      body: JSON.stringify({})
    });
  }
};
