import { describe, expect, it } from 'vitest';
import { getReadyAiRuntimeModels, resolveAiRuntimeReadiness } from '@/features/ai/aiRuntimeReadiness';
import type { WorkspaceAiSettings } from '@/types';

function aiSettings(overrides: Partial<WorkspaceAiSettings> = {}): WorkspaceAiSettings {
  return {
    workspaceId: 'workspace-1',
    defaultProvider: 'openai',
    defaultModel: 'gpt-5',
    reasoningSummariesEnabled: true,
    reasoningSummaryMode: 'auto',
    reasoningEffort: 'medium',
    allowedProviders: ['openai'],
    allowedModels: ['gpt-5'],
    allowedProviderModels: { openai: ['gpt-5'], anthropic: [], gemini: [] },
    allowedReasoningSummaryModes: ['auto', 'off'],
    allowedReasoningEfforts: ['low', 'medium', 'high'],
    providers: [{ provider: 'openai', configured: true, enabled: true }],
    ...overrides
  };
}

describe('AI runtime readiness', () => {
  it('keeps loading and settings failures distinct from configuration state', () => {
    expect(resolveAiRuntimeReadiness({ settings: null, isLoading: true }).status).toBe('loading');
    expect(resolveAiRuntimeReadiness({ settings: null, isLoading: false, error: 'offline' }).status).toBe('unavailable');
    expect(resolveAiRuntimeReadiness({ settings: null, isLoading: false }).status).toBe('unconfigured');
  });

  it('requires an allowed model on an allowed, enabled, configured provider', () => {
    expect(resolveAiRuntimeReadiness({ settings: aiSettings(), isLoading: false }).status).toBe('ready');
    expect(resolveAiRuntimeReadiness({
      settings: aiSettings({ providers: [{ provider: 'openai', configured: true, enabled: false }] }),
      isLoading: false
    }).status).toBe('unconfigured');
    expect(resolveAiRuntimeReadiness({
      settings: aiSettings({ providers: [{ provider: 'openai', configured: false, enabled: true }] }),
      isLoading: false
    }).status).toBe('unconfigured');
    expect(resolveAiRuntimeReadiness({
      settings: aiSettings({ allowedProviderModels: { openai: [], anthropic: [], gemini: [] } }),
      isLoading: false
    }).status).toBe('unconfigured');
  });

  it('accepts any ready allowed provider instead of requiring the default provider', () => {
    const settings = aiSettings({
      allowedProviders: ['openai', 'anthropic'],
      allowedProviderModels: { openai: ['gpt-5'], anthropic: ['claude-sonnet-4-5'], gemini: [] },
      providers: [
        { provider: 'openai', configured: false, enabled: true },
        { provider: 'anthropic', configured: true, enabled: true }
      ]
    });

    expect(getReadyAiRuntimeModels(settings)).toEqual([
      { provider: 'anthropic', model: 'claude-sonnet-4-5' }
    ]);
    expect(resolveAiRuntimeReadiness({ settings, isLoading: false }).status).toBe('ready');
  });
});
