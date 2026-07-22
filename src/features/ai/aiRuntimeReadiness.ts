import type { LlmProvider, WorkspaceAiSettings } from '@/types';

export type AiRuntimeReadinessStatus = 'loading' | 'unavailable' | 'unconfigured' | 'ready';

export interface ReadyAiRuntimeModel {
  provider: LlmProvider;
  model: string;
}

export interface AiRuntimeReadiness {
  status: AiRuntimeReadinessStatus;
  readyModels: ReadyAiRuntimeModel[];
}

interface ResolveAiRuntimeReadinessInput {
  settings: WorkspaceAiSettings | null;
  isLoading: boolean;
  error?: string | null;
}

export function getReadyAiRuntimeModels(settings: WorkspaceAiSettings | null): ReadyAiRuntimeModel[] {
  if (!settings) return [];

  const providerStatusByProvider = new Map(
    settings.providers.map((status) => [status.provider, status])
  );

  return settings.allowedProviders.flatMap((provider) => {
    const providerStatus = providerStatusByProvider.get(provider);
    if (!providerStatus?.enabled || !providerStatus.configured) return [];

    return (settings.allowedProviderModels[provider] || []).map((model) => ({ provider, model }));
  });
}

export function resolveAiRuntimeReadiness({
  settings,
  isLoading,
  error
}: ResolveAiRuntimeReadinessInput): AiRuntimeReadiness {
  if (isLoading) return { status: 'loading', readyModels: [] };
  if (error) return { status: 'unavailable', readyModels: [] };

  const readyModels = getReadyAiRuntimeModels(settings);
  return {
    status: readyModels.length > 0 ? 'ready' : 'unconfigured',
    readyModels
  };
}

export function isAiRuntimeReady(readiness: AiRuntimeReadiness): boolean {
  return readiness.status === 'ready';
}
