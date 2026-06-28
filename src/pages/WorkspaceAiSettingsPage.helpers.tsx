import React from 'react';
import { LlmProvider, ReasoningEffort, ReasoningSummaryMode, WorkspaceAiSettings } from '@/types';

export const SettingSection: React.FC<{
  title: string;
  description: string;
  children: React.ReactNode;
  sectionRef?: React.Ref<HTMLElement>;
  className?: string;
}> = ({ title, description, children, sectionRef, className = '' }) => (
  <section ref={sectionRef} className={`mb-10 ${className} last:mb-0`}>
    <div className="mb-6 px-1">
      <h2 className="mb-1 text-xl font-bold tracking-tight text-ui-text">{title}</h2>
      <p className="max-w-3xl text-sm leading-6 text-ui-text-muted">{description}</p>
    </div>
    <div className="overflow-hidden rounded-xl border border-ui-border bg-ui-surface shadow-sm">{children}</div>
  </section>
);

export const PROVIDERS: LlmProvider[] = ['openai', 'anthropic', 'gemini'];
export const REASONING_SUMMARY_MODES: ReasoningSummaryMode[] = ['off', 'auto', 'concise', 'detailed'];
export const REASONING_EFFORTS: ReasoningEffort[] = ['off', 'low', 'medium', 'high'];
export const EMPTY_PROVIDER_KEYS: Record<LlmProvider, string> = {
  openai: '',
  anthropic: '',
  gemini: ''
};
export const EMPTY_CREDENTIAL_ERRORS: Record<LlmProvider, string> = {
  openai: '',
  anthropic: '',
  gemini: ''
};

export interface BehaviorDraft {
  defaultProvider: LlmProvider;
  defaultModel: string;
  reasoningSummaryMode: ReasoningSummaryMode;
  reasoningEffort: ReasoningEffort;
}

export const DEFAULT_BEHAVIOR_DRAFT: BehaviorDraft = {
  defaultProvider: 'openai',
  defaultModel: 'gpt-5.5',
  reasoningSummaryMode: 'auto',
  reasoningEffort: 'low'
};

export function providerLabel(provider: LlmProvider): string {
  if (provider === 'openai') return 'OpenAI';
  if (provider === 'anthropic') return 'Anthropic';
  return 'Gemini';
}

export function reasoningModeLabel(mode: ReasoningSummaryMode): string {
  return `workspaceAiSettings.reasoningMode.${mode}`;
}

export function reasoningEffortLabel(effort: ReasoningEffort): string {
  return `workspaceAiSettings.reasoningEffort.${effort}`;
}

export function modelsForProvider(settings: WorkspaceAiSettings | null, provider: LlmProvider): string[] {
  return settings?.allowedProviderModels[provider] || [];
}

export function behaviorDraftFromSettings(settings: WorkspaceAiSettings): BehaviorDraft {
  return {
    defaultProvider: settings.defaultProvider,
    defaultModel: settings.defaultModel,
    reasoningSummaryMode: settings.reasoningSummaryMode,
    reasoningEffort: settings.reasoningEffort
  };
}

export function behaviorDraftChanged(settings: WorkspaceAiSettings, draft: BehaviorDraft): boolean {
  return (
    settings.defaultProvider !== draft.defaultProvider ||
    settings.defaultModel !== draft.defaultModel ||
    settings.reasoningSummaryMode !== draft.reasoningSummaryMode ||
    settings.reasoningEffort !== draft.reasoningEffort
  );
}

export function reasoningPolicyDisabled(settings: WorkspaceAiSettings | null): boolean {
  // The control plane collapses deployment-disabled summaries to allowed modes ["off"].
  // reasoningSummariesEnabled is the effective current state, not the edit policy.
  return Boolean(settings && !settings.allowedReasoningSummaryModes.some((mode) => mode !== 'off'));
}
