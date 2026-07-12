import React from 'react';
import { useTranslation } from 'react-i18next';
import type { WorkspaceAiSettings } from '@/types';
import type { SettingsDraft } from '@/features/targets/admin/targetInsightsDialogViewModel';
import { Checkbox } from '@/components/common/Checkbox';
import { Select } from '@/components/common/Select';

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
        {numericSettingsFields.map((field) => (
          <label key={field.key} className="block">
            <span className="type-label">{field.label}</span>
            <input
              type="number"
              min={field.min}
              max={field.max}
              step={field.step}
              className="mt-2 h-10 w-full rounded-md border border-ui-border bg-ui-bg px-3 text-sm outline-none"
              value={settingsDraft[field.key]}
              readOnly={!canEdit}
              disabled={settingsSaving}
              onChange={(event) => onSettingsDraftChange((current) => ({ ...current, [field.key]: Number(event.target.value) }))}
            />
          </label>
        ))}
      </div>
    </div>
  );
};
