import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isAiRuntimeReady, resolveAiRuntimeReadiness } from '@/features/ai/aiRuntimeReadiness';
import { formatControlPlaneError } from '@/services/control-plane/errorFormatting';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import type { WorkspaceAiSettings } from '@/types';
import { hasSessionDataCacheValue, useSessionCachedState } from '@/hooks/sessionDataCache';

export function useWorkspaceAiRuntimeReadiness(workspaceId: string, refreshToken: number) {
  const { t } = useTranslation();
  const settingsCacheKey = `workspace:${workspaceId}:ai-runtime-settings`;
  const [settings, setSettings] = useSessionCachedState<WorkspaceAiSettings | null>(settingsCacheKey, null);
  const [isLoading, setIsLoading] = useState(() => !hasSessionDataCacheValue(settingsCacheKey));
  const [error, setError] = useState('');
  const readiness = resolveAiRuntimeReadiness({ settings, isLoading, error });

  useEffect(() => {
    let cancelled = false;
    setIsLoading(!hasSessionDataCacheValue(settingsCacheKey));
    setError('');
    controlPlaneApi.getWorkspaceAiSettings(workspaceId)
      .then((nextSettings) => {
        if (!cancelled) setSettings(nextSettings);
      })
      .catch((loadError) => {
        if (cancelled) return;
        if (!hasSessionDataCacheValue(settingsCacheKey)) {
          setError(formatControlPlaneError(loadError, t('workspaceAiSettings.loadFailed'), { area: 'aiSettings' }));
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshToken, settingsCacheKey, t, workspaceId]);

  return { settings, isLoading, error, isReady: isAiRuntimeReady(readiness) };
}
