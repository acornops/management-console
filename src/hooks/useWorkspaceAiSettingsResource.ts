import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatControlPlaneError } from '@/services/control-plane/errorFormatting';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import type { WorkspaceAiSettings } from '@/types';

interface WorkspaceAiSettingsCacheEntry {
  settings: WorkspaceAiSettings | null;
  isLoading: boolean;
  error: string;
}

export interface WorkspaceAiSettingsResource extends WorkspaceAiSettingsCacheEntry {
  retry: () => void;
  update: (settings: WorkspaceAiSettings) => void;
}

const EMPTY_ENTRY: WorkspaceAiSettingsCacheEntry = {
  settings: null,
  isLoading: false,
  error: ''
};

export function useWorkspaceAiSettingsResource(
  workspaceId: string | undefined,
  enabled: boolean
): WorkspaceAiSettingsResource {
  const { t } = useTranslation();
  const [entries, setEntries] = React.useState<Record<string, WorkspaceAiSettingsCacheEntry>>({});
  const activeWorkspaceIdRef = React.useRef(workspaceId);
  const requestSequenceRef = React.useRef(0);
  const inFlightRequestsRef = React.useRef(new Map<string, number>());
  activeWorkspaceIdRef.current = workspaceId;

  const load = React.useCallback((targetWorkspaceId: string) => {
    if (inFlightRequestsRef.current.has(targetWorkspaceId)) return;

    const requestSequence = ++requestSequenceRef.current;
    inFlightRequestsRef.current.set(targetWorkspaceId, requestSequence);
    setEntries((current) => ({
      ...current,
      [targetWorkspaceId]: {
        settings: current[targetWorkspaceId]?.settings ?? null,
        isLoading: true,
        error: ''
      }
    }));

    void controlPlaneApi.getWorkspaceAiSettings(targetWorkspaceId)
      .then((settings) => {
        const isCurrentRequest = activeWorkspaceIdRef.current === targetWorkspaceId
          && inFlightRequestsRef.current.get(targetWorkspaceId) === requestSequence;
        if (!isCurrentRequest || settings.workspaceId !== targetWorkspaceId) return;
        setEntries((current) => ({
          ...current,
          [targetWorkspaceId]: { settings, isLoading: false, error: '' }
        }));
      })
      .catch((error) => {
        const isCurrentRequest = activeWorkspaceIdRef.current === targetWorkspaceId
          && inFlightRequestsRef.current.get(targetWorkspaceId) === requestSequence;
        if (!isCurrentRequest) return;
        setEntries((current) => ({
          ...current,
          [targetWorkspaceId]: {
            settings: current[targetWorkspaceId]?.settings ?? null,
            isLoading: false,
            error: formatControlPlaneError(error, t('workspaceAiSettings.loadFailed'), { area: 'aiSettings' })
          }
        }));
      })
      .finally(() => {
        if (inFlightRequestsRef.current.get(targetWorkspaceId) !== requestSequence) return;
        inFlightRequestsRef.current.delete(targetWorkspaceId);
        if (activeWorkspaceIdRef.current === targetWorkspaceId) return;
        setEntries((current) => {
          const entry = current[targetWorkspaceId];
          if (!entry?.isLoading) return current;
          if (entry.settings) {
            return { ...current, [targetWorkspaceId]: { ...entry, isLoading: false } };
          }
          const next = { ...current };
          delete next[targetWorkspaceId];
          return next;
        });
      });
  }, [t]);

  const entry = workspaceId ? entries[workspaceId] : undefined;

  React.useEffect(() => {
    if (!enabled || !workspaceId || entry?.settings || entry?.isLoading || entry?.error) return;
    load(workspaceId);
  }, [enabled, entry?.error, entry?.isLoading, entry?.settings, load, workspaceId]);

  const retry = React.useCallback(() => {
    if (workspaceId) load(workspaceId);
  }, [load, workspaceId]);

  const update = React.useCallback((settings: WorkspaceAiSettings) => {
    if (!workspaceId || activeWorkspaceIdRef.current !== workspaceId || settings.workspaceId !== workspaceId) return;
    setEntries((current) => ({
      ...current,
      [workspaceId]: { settings, isLoading: false, error: '' }
    }));
  }, [workspaceId]);

  const isInitialLoadPending = Boolean(enabled && workspaceId && !entry);
  return {
    ...(entry ?? EMPTY_ENTRY),
    isLoading: entry?.isLoading ?? isInitialLoadPending,
    retry,
    update
  };
}
