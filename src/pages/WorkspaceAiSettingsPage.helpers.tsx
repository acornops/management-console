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

const SkeletonLine: React.FC<{ className: string }> = ({ className }) => (
  <div className={`rounded-full bg-ui-border/70 ${className}`} />
);

export const WorkspaceAiSettingsSkeleton: React.FC<{ label: string }> = ({ label }) => (
  <div role="status" aria-live="polite" aria-busy="true" className="motion-safe:animate-pulse">
    <span className="sr-only">{label}</span>
    <div aria-hidden="true">
      <section className="mb-10">
        <div className="mb-6 px-1">
          <SkeletonLine className="mb-3 h-5 w-36" />
          <SkeletonLine className="h-3 w-full max-w-xl" />
        </div>
        <div className="grid overflow-hidden rounded-xl border border-ui-border bg-ui-border sm:grid-cols-3 sm:gap-px">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="border-b border-ui-border bg-ui-surface p-5 last:border-b-0 sm:border-b-0">
              <SkeletonLine className="mb-4 h-2.5 w-24" />
              <SkeletonLine className="h-4 w-32 max-w-full" />
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <div className="mb-6 px-1">
          <SkeletonLine className="mb-3 h-5 w-44" />
          <SkeletonLine className="h-3 w-full max-w-2xl" />
        </div>
        <div className="overflow-hidden rounded-xl border border-ui-border bg-ui-surface shadow-sm">
          <div className="grid gap-5 p-6 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index}>
                <SkeletonLine className="mb-2 h-2.5 w-20" />
                <div className="h-11 rounded-lg border border-ui-border bg-ui-bg/70" />
              </div>
            ))}
          </div>
          <div className="flex justify-end border-t border-ui-border bg-ui-bg/35 px-6 py-4">
            <div className="h-9 w-full rounded-md bg-ui-border/70 sm:w-36" />
          </div>
        </div>
      </section>

      <section>
        <div className="mb-6 px-1">
          <SkeletonLine className="mb-3 h-5 w-32" />
          <SkeletonLine className="h-3 w-full max-w-lg" />
        </div>
        <div className="overflow-hidden rounded-xl border border-ui-border bg-ui-surface shadow-sm">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-center gap-4 border-b border-ui-border p-6 last:border-b-0">
              <div className="h-10 w-10 shrink-0 rounded-lg bg-ui-border/70" />
              <div className="min-w-0 flex-1">
                <SkeletonLine className="mb-3 h-3 w-24" />
                <SkeletonLine className="h-2.5 w-full max-w-sm" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  </div>
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
