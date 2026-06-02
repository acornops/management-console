import { useEffect, useState } from 'react';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import type { ControlPlaneAuthConfig } from '@/services/controlPlaneApi';

export const defaultAuthConfig: ControlPlaneAuthConfig = {
  oidcEnabled: true,
  oidcProviderName: 'OIDC',
  passwordAuthEnabled: true,
  passwordSignupEnabled: true,
  passwordEmailVerificationRequired: true,
  passwordResetEnabled: true
};

export function useAuthConfig(): ControlPlaneAuthConfig {
  const [authConfig, setAuthConfig] = useState<ControlPlaneAuthConfig>(defaultAuthConfig);

  useEffect(() => {
    let cancelled = false;
    void controlPlaneApi.getAuthConfig()
      .then((nextAuthConfig) => {
        if (!cancelled) {
          setAuthConfig(nextAuthConfig);
        }
      })
      .catch((err) => {
        console.error('Failed to load auth config', err);
        if (!cancelled) {
          setAuthConfig(defaultAuthConfig);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return authConfig;
}
