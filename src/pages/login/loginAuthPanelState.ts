export interface LoginAuthPanelProps {
  isAuthLoading: boolean;
  oidcEnabled: boolean;
  passwordAuthEnabled: boolean;
  passwordSignupEnabled: boolean;
  passwordResetEnabled: boolean;
  onLogin: () => void;
  onPasswordLogin: (identifier: string, password: string) => Promise<import('@/types').PasswordAuthResult>;
  onPasswordSignup: (input: {
    email: string;
    username: string;
    password: string;
    displayName?: string;
  }) => Promise<import('@/types').PasswordAuthResult>;
  onVerifyEmail: (token: string) => Promise<void>;
  onResendVerification: (email: string) => Promise<{ resendAfterSeconds?: number }>;
  onRequestPasswordReset: (email: string) => Promise<{ resendAfterSeconds?: number }>;
  onResetPassword: (token: string, password: string) => Promise<void>;
}

export type AuthMode = 'login' | 'signup' | 'forgot' | 'reset';

export type PendingVerificationState = {
  email: string;
  resendAfterSeconds?: number;
  notice?: string;
  deliveryFailed?: boolean;
};

export type PasswordResetRequestState = {
  email: string;
  resendAfterSeconds?: number;
  notice?: string;
};

export type VerifyLinkState = 'idle' | 'loading' | 'success' | 'expired' | 'invalid' | 'error';
export type ResetLinkState = 'idle' | 'form' | 'success' | 'expired' | 'invalid' | 'error';

export function routeToken(path: string, hashRoute: string, expectedPath: string): { isRoute: boolean; token: string | null } {
  const isHashRoute = hashRoute.startsWith(expectedPath);
  const tokenFromHash = isHashRoute && hashRoute.includes('?')
    ? new URLSearchParams(hashRoute.slice(hashRoute.indexOf('?') + 1)).get('token')
    : null;
  return {
    isRoute: path.endsWith(expectedPath) || isHashRoute,
    token: tokenFromHash || new URLSearchParams(window.location.search).get('token')
  };
}

export function isPlausibleAuthEmailToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{32,512}$/.test(token);
}

export function isValidEmailAddress(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
