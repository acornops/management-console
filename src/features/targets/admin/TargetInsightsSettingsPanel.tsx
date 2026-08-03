import React from 'react';
import { useTranslation } from 'react-i18next';
import type { WorkspaceAiSettings } from '@/types';
import type { SettingsDraft } from '@/features/targets/admin/targetInsightsDialogViewModel';
import { TARGET_INSIGHTS_RECOMMENDED_TUNING } from '@/features/targets/admin/targetInsightsDialogViewModel';
import { Button } from '@acornops/ui';
import { Checkbox } from '@acornops/ui';
import { Select } from '@acornops/ui';
import { TextInput } from '@acornops/ui';

interface TargetInsightsSettingsPanelProps {
  settingsDraft: SettingsDraft;
  aiSettings: WorkspaceAiSettings | null;
  selectableModels: string[];
  canEdit: boolean;
  settingsSaving: boolean;
  numericSettingsFields: Array<{
    key: 'idleCheckpointDelayMinutes' | 'maxSnippetsPerRetrieval' | 'maxSnippetSizeBytes' | 'minimumObservationsBeforeGeneralization';
    label: string;
    min: number;
    max: number;
    step: number;
  }>;
  onSettingsDraftChange: React.Dispatch<React.SetStateAction<SettingsDraft>>;
}

export const TargetInsightsSettingsPanel: React.FC<TargetInsightsSettingsPanelProps> = ({
  settingsDraft,
  aiSettings,
  selectableModels,
  canEdit,
  settingsSaving,
  numericSettingsFields,
  onSettingsDraftChange
}) => {
  const { t } = useTranslation();
  const usesRecommendedTuning = Object.entries(TARGET_INSIGHTS_RECOMMENDED_TUNING).every(
    ([key, value]) => settingsDraft[key as keyof typeof TARGET_INSIGHTS_RECOMMENDED_TUNING] === value
  );

  const restoreRecommendedTuning = () => {
    onSettingsDraftChange((current) => ({
      ...current,
      ...TARGET_INSIGHTS_RECOMMENDED_TUNING
    }));
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-6 custom-scrollbar">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex min-h-10 items-center gap-3 rounded-md border border-ui-border bg-ui-bg px-3 py-2">
          <Checkbox
            checked={settingsDraft.enabled}
            disabled={!canEdit || settingsSaving}
            onChange={(event) => onSettingsDraftChange((current) => ({ ...current, enabled: event.target.checked }))}
          />
          <span className="type-label">{t('tools.targetInsights.fields.enabled')}</span>
        </label>
        <label className="block">
          <span className="type-label">{t('tools.targetInsights.fields.checkpointModel')}</span>
          <Select value={settingsDraft.checkpointModelMode} options={[
            { value: 'workspace_default', label: t('tools.targetInsights.model.workspaceDefault') },
            { value: 'custom', label: t('tools.targetInsights.model.custom') }
          ]} disabled={!canEdit || settingsSaving} onChange={(checkpointModelMode) => onSettingsDraftChange((current) => ({ ...current, checkpointModelMode }))} className="mt-2" ariaLabel={t('tools.targetInsights.fields.checkpointModel')} />
        </label>
        {settingsDraft.checkpointModelMode === 'custom' && (
          <label className="block">
            <span className="type-label">{t('tools.targetInsights.fields.provider')}</span>
            <Select value={settingsDraft.provider} options={(aiSettings?.allowedProviders || ['openai', 'anthropic', 'gemini']).map((provider) => ({ value: provider, label: provider }))} disabled={!canEdit || settingsSaving} onChange={(provider) => onSettingsDraftChange((current) => ({ ...current, provider, model: '' }))} className="mt-2" ariaLabel={t('tools.targetInsights.fields.provider')} />
          </label>
        )}
        {settingsDraft.checkpointModelMode === 'custom' && (
          <label className="block">
            <span className="type-label">{t('tools.targetInsights.fields.model')}</span>
            <Select value={settingsDraft.model || selectableModels[0] || ''} options={selectableModels.map((model) => ({ value: model, label: model }))} disabled={!canEdit || settingsSaving} onChange={(model) => onSettingsDraftChange((current) => ({ ...current, model }))} className="mt-2" ariaLabel={t('tools.targetInsights.fields.model')} />
          </label>
        )}
        <details className="rounded-lg border border-ui-border bg-ui-bg md:col-span-2">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 [&::-webkit-details-marker]:hidden">
            <span>
              <span className="type-label block text-ui-text">{t('tools.targetInsights.advancedTuning')}</span>
              <span className="type-caption mt-1 block text-ui-text-muted">
                {t(usesRecommendedTuning ? 'tools.targetInsights.recommendedTuning' : 'tools.targetInsights.customTuning')}
              </span>
            </span>
            <span className="type-caption type-emphasis text-ui-text-muted">{t('tools.targetInsights.advancedTuningAction')}</span>
          </summary>
          <div className="border-t border-ui-border p-4">
            <div className="grid gap-4 md:grid-cols-2">
              {numericSettingsFields.map((field) => (
                <label key={field.key} className="block">
                  <span className="type-label">{field.label}</span>
                  <TextInput
                    type="number"
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    className="mt-2 h-10 w-full rounded-md border border-ui-border bg-ui-surface px-3 type-body outline-none"
                    value={settingsDraft[field.key]}
                    readOnly={!canEdit}
                    disabled={settingsSaving}
                    onChange={(event) => onSettingsDraftChange((current) => ({ ...current, [field.key]: Number(event.target.value) }))}
                  />
                </label>
              ))}
            </div>
            {canEdit && (
              <div className="mt-4 flex justify-end border-t border-ui-border pt-4">
                <Button type="button" variant="secondary" size="sm" onClick={restoreRecommendedTuning} disabled={settingsSaving || usesRecommendedTuning}>
                  {t('tools.targetInsights.restoreRecommended')}
                </Button>
              </div>
            )}
          </div>
        </details>
      </div>
    </div>
  );
};
