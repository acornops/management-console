export type AppDataMode = 'mock' | 'control-plane';

let frontendFixtureRuntimeActive = false;

interface ResolveAppDataModeOptions {
  production: boolean;
}

export function resolveAppDataMode(
  configuredValue: string | undefined,
  { production }: ResolveAppDataModeOptions
): AppDataMode {
  const value = configuredValue?.trim() || (production ? 'control-plane' : 'mock');
  if (value !== 'mock' && value !== 'control-plane') {
    throw new Error(
      `Invalid VITE_APP_DATA_MODE "${value}". Expected "mock" or "control-plane".`
    );
  }
  if (production && value === 'mock') {
    throw new Error(
      'VITE_APP_DATA_MODE=mock is development-only. Production builds must use VITE_APP_DATA_MODE=control-plane.'
    );
  }
  return value;
}

export function getAppDataMode(): AppDataMode {
  return resolveAppDataMode(import.meta.env.VITE_APP_DATA_MODE, {
    production: import.meta.env.PROD
  });
}

export function isFrontendFixtureRuntime(): boolean {
  return frontendFixtureRuntimeActive;
}

export function activateFrontendFixtureRuntime(): void {
  frontendFixtureRuntimeActive = true;
}
