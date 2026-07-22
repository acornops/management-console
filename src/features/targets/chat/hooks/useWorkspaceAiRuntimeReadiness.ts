import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isAiRuntimeReady, resolveAiRuntimeReadiness } from '@/features/ai/aiRuntimeReadiness';
import { formatControlPlaneError } from '@/services/control-plane/errorFormatting';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import type { WorkspaceAiSettings } from '@/types';

export function useWorkspaceAiRuntimeReadiness(workspaceId: string, refreshToken: number) {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<WorkspaceAiSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const readiness = resolveAiRuntimeReadiness({ settings, isLoading, error });

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError('');
    controlPlaneApi.getWorkspaceAiSettings(workspaceId)
      .then((nextSettings) => {
        if (!cancelled) setSettings(nextSettings);
      })
      .catch((loadError) => {
        if (cancelled) return;
        setSettings(null);
        setError(formatControlPlaneError(loadError, t('workspaceAiSettings.loadFailed'), { area: 'aiSettings' }));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshToken, t, workspaceId]);

  return { settings, isLoading, error, isReady: isAiRuntimeReady(readiness) };
}
