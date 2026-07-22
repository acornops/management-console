import { useCallback, useEffect, useState } from 'react';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import type { ControlPlaneAuthConfig } from '@/services/controlPlaneApi';
import { reportBrowserError } from '@/observability/browserErrors';

export const defaultAuthConfig: ControlPlaneAuthConfig = {
  oidcEnabled: false,
  oidcProviderName: 'OIDC',
  passwordAuthEnabled: false,
  passwordSignupEnabled: false,
  passwordEmailVerificationRequired: true,
  passwordResetEnabled: false
};

export type AuthConfigLoadState =
  | { status: 'loading'; config: ControlPlaneAuthConfig }
  | { status: 'ready'; config: ControlPlaneAuthConfig }
  | { status: 'unavailable'; config: ControlPlaneAuthConfig };

export function useAuthConfig(): AuthConfigLoadState & { retry: () => void } {
  const [state, setState] = useState<AuthConfigLoadState>({ status: 'loading', config: defaultAuthConfig });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => {
    setState({ status: 'loading', config: defaultAuthConfig });
    setAttempt((current) => current + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void controlPlaneApi.getAuthConfig()
      .then((nextAuthConfig) => {
        if (!cancelled) {
          setState({ status: 'ready', config: nextAuthConfig });
        }
      })
      .catch((err) => {
        reportBrowserError(err, 'operation');
        if (!cancelled) {
          setState({ status: 'unavailable', config: defaultAuthConfig });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return { ...state, retry };
}
