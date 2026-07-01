import React from 'react';
import { useTranslation } from 'react-i18next';
import type { WorkspaceAiSettings } from '@/types';
import type { SettingsDraft } from '@/features/kubernetes-cluster-detail/components/detail/views/targetInsightsDialogViewModel';

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
          <input
            type="checkbox"
            checked={settingsDraft.enabled}
            disabled={!canEdit || settingsSaving}
            onChange={(event) => onSettingsDraftChange((current) => ({ ...current, enabled: event.target.checked }))}
            className="h-4 w-4 rounded border-ui-border text-accent focus:ring-accent/20"
          />
          <span className="type-label">{t('tools.targetInsights.fields.enabled')}</span>
        </label>
        <label className="block">
          <span className="type-label">{t('tools.targetInsights.fields.checkpointModel')}</span>
          <select className="mt-2 h-10 w-full rounded-md border border-ui-border bg-ui-bg px-3 text-sm outline-none" value={settingsDraft.checkpointModelMode} disabled={!canEdit || settingsSaving} onChange={(event) => onSettingsDraftChange((current) => ({ ...current, checkpointModelMode: event.target.value as typeof current.checkpointModelMode }))}>
            <option value="workspace_default">{t('tools.targetInsights.model.workspaceDefault')}</option>
            <option value="custom">{t('tools.targetInsights.model.custom')}</option>
          </select>
        </label>
        {settingsDraft.checkpointModelMode === 'custom' && (
          <label className="block">
            <span className="type-label">{t('tools.targetInsights.fields.provider')}</span>
            <select className="mt-2 h-10 w-full rounded-md border border-ui-border bg-ui-bg px-3 text-sm outline-none" value={settingsDraft.provider} disabled={!canEdit || settingsSaving} onChange={(event) => onSettingsDraftChange((current) => ({ ...current, provider: event.target.value as typeof current.provider, model: '' }))}>
              {(aiSettings?.allowedProviders || ['openai', 'anthropic', 'gemini']).map((provider) => <option key={provider} value={provider}>{provider}</option>)}
            </select>
          </label>
        )}
        {settingsDraft.checkpointModelMode === 'custom' && (
          <label className="block">
            <span className="type-label">{t('tools.targetInsights.fields.model')}</span>
            <select className="mt-2 h-10 w-full rounded-md border border-ui-border bg-ui-bg px-3 text-sm outline-none" value={settingsDraft.model || selectableModels[0] || ''} disabled={!canEdit || settingsSaving} onChange={(event) => onSettingsDraftChange((current) => ({ ...current, model: event.target.value }))}>
              {selectableModels.map((model) => <option key={model} value={model}>{model}</option>)}
            </select>
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
