import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { Dialog } from '@/components/common/Dialog';
import { InlineLoadingIndicator } from '@/components/common/Loading';
import { TargetInsightsSettingsPanel } from '@/features/kubernetes-cluster-detail/components/detail/views/TargetInsightsSettingsPanel';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import type { ControlPlaneTargetToolItem } from '@/services/controlPlaneApi';
import type { WorkspaceAiSettings } from '@/types';
import { formatError } from '@/features/kubernetes-cluster-detail/components/detail/views/targetSkillsViewModel';
import {
  pauseReasonKey,
  resolveLearningReadiness,
  settingsDraftFromTool,
  type SettingsDraft
} from '@/features/kubernetes-cluster-detail/components/detail/views/targetInsightsDialogViewModel';

interface TargetInsightsSettingsDialogProps {
  workspaceId: string;
  targetId: string;
  tool: ControlPlaneTargetToolItem;
  canEdit: boolean;
  savingTool: boolean;
  onClose: () => void;
  onToolUpdated: (tool: ControlPlaneTargetToolItem) => void;
}

export const TargetInsightsSettingsDialog: React.FC<TargetInsightsSettingsDialogProps> = ({
  workspaceId,
  targetId,
  tool,
  canEdit,
  savingTool,
  onClose,
  onToolUpdated
}) => {
  const { t } = useTranslation();
  const [aiSettings, setAiSettings] = React.useState<WorkspaceAiSettings | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [settingsSaving, setSettingsSaving] = React.useState(false);
  const [settingsDraft, setSettingsDraft] = React.useState<SettingsDraft>(() => settingsDraftFromTool(tool));
  const selectableModels = aiSettings?.allowedProviderModels[settingsDraft.provider as keyof WorkspaceAiSettings['allowedProviderModels']] || [];
  const learningReadiness = React.useMemo(() => resolveLearningReadiness(tool, aiSettings), [aiSettings, tool]);
  const numericSettingsFields: Array<{
    key: 'idleCheckpointDelayMinutes' | 'maxSnippetsPerRetrieval' | 'maxSnippetSizeBytes' | 'minimumObservationsBeforeGeneralization';
    label: string;
    min: number;
    max: number;
    step: number;
  }> = [
    {
      key: 'idleCheckpointDelayMinutes',
      label: t('tools.targetInsights.fields.idleCheckpointDelay'),
      min: 5,
      max: 1440,
      step: 5
    },
    {
      key: 'maxSnippetsPerRetrieval',
      label: t('tools.targetInsights.fields.maxSnippets'),
      min: 1,
      max: 8,
      step: 1
    },
    {
      key: 'maxSnippetSizeBytes',
      label: t('tools.targetInsights.fields.maxSnippetSize'),
      min: 512,
      max: 4096,
      step: 128
    },
    {
      key: 'minimumObservationsBeforeGeneralization',
      label: t('tools.targetInsights.fields.observationsBeforeGeneralization'),
      min: 2,
      max: 10,
      step: 1
    }
  ];

  React.useEffect(() => {
    setSettingsDraft(settingsDraftFromTool(tool));
  }, [tool]);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    controlPlaneApi.getWorkspaceAiSettings(workspaceId)
      .then((settings) => {
        if (!cancelled) setAiSettings(settings);
      })
      .catch(() => {
        if (!cancelled) setAiSettings(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  const saveSettings = async () => {
    if (!canEdit) return;
    setSettingsSaving(true);
    setError('');
    try {
      const checkpointModel = settingsDraft.checkpointModelMode === 'custom'
        ? { mode: 'custom' as const, provider: settingsDraft.provider as 'openai' | 'anthropic' | 'gemini', model: settingsDraft.model || selectableModels[0] || '' }
        : { mode: 'workspace_default' as const };
      const updated = await controlPlaneApi.updateTargetTool(workspaceId, targetId, tool.id, {
        enabled: settingsDraft.enabled,
        config: {
          learning: {
            idleCheckpointDelayMinutes: settingsDraft.idleCheckpointDelayMinutes,
            minimumObservationsBeforeGeneralization: settingsDraft.minimumObservationsBeforeGeneralization,
            checkpointModel
          },
          retrieval: {
            maxSnippetsPerRetrieval: settingsDraft.maxSnippetsPerRetrieval,
            maxSnippetSizeBytes: settingsDraft.maxSnippetSizeBytes
          }
        }
      });
      onToolUpdated(updated);
      onClose();
    } catch (err) {
      setError(formatError(err, t('tools.targetInsights.saveSettingsFailed'), 'targetInsights'));
    } finally {
      setSettingsSaving(false);
    }
  };

  return (
    <Dialog
      titleId="target-insights-settings-dialog-title"
      closeDisabled={settingsSaving || savingTool}
      onClose={onClose}
      className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-2xl"
    >
      <div className="flex items-start justify-between gap-4 border-b border-ui-border bg-ui-bg px-6 py-4">
        <div className="min-w-0">
          <h3 id="target-insights-settings-dialog-title" className="type-panel-title">{t('tools.targetInsights.settingsTitle')}</h3>
          <p className="type-caption mt-1 text-ui-text-muted">{t('tools.targetInsights.settingsBody')}</p>
          {learningReadiness && !learningReadiness.learningAvailable && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-status-warning/25 bg-status-warning-soft px-3 py-2 text-sm text-status-warning-text">
              <AlertTriangle className="h-4 w-4" />
              {t(pauseReasonKey(learningReadiness.learningPausedReason))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={settingsSaving || savingTool}
          className="rounded-lg p-1.5 text-ui-text-muted transition-colors hover:bg-ui-surface hover:text-accent-strong disabled:opacity-50"
          aria-label={t('tools.targetInsights.closeSettings')}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {loading ? (
        <div className="flex min-h-[18rem] items-center justify-center">
          <InlineLoadingIndicator label={t('tools.targetInsights.loadingSettings')} />
        </div>
      ) : (
        <>
          {error && (
            <div className="type-caption mx-6 mt-5 rounded-lg border border-status-danger/25 bg-status-danger-soft px-4 py-3 text-status-danger-text">
              {error}
            </div>
          )}
          <TargetInsightsSettingsPanel
            settingsDraft={settingsDraft}
            aiSettings={aiSettings}
            selectableModels={selectableModels}
            canEdit={canEdit}
            settingsSaving={settingsSaving}
            numericSettingsFields={numericSettingsFields}
            onSettingsDraftChange={setSettingsDraft}
          />
        </>
      )}
      <div className="flex items-center justify-end gap-3 border-t border-ui-border bg-ui-bg px-6 py-4">
        {!canEdit ? (
          <Button variant="secondary" size="sm" onClick={onClose} disabled={settingsSaving || savingTool}>{t('common.close')}</Button>
        ) : (
          <>
            <Button variant="secondary" size="sm" onClick={onClose} disabled={settingsSaving || savingTool}>{t('tools.targetInsights.cancel')}</Button>
            <Button variant="accent" size="sm" onClick={() => void saveSettings()} disabled={loading || settingsSaving || savingTool}>
              {settingsSaving ? t('common.saving') : t('tools.targetInsights.saveSettings')}
            </Button>
          </>
        )}
      </div>
    </Dialog>
  );
};
