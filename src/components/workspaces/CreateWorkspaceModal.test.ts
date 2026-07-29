import { describe, expect, it } from 'vitest';
import { hasInheritedPlatformLlmCredential } from '@/components/workspaces/CreateWorkspaceModal.helpers';
import type { WorkspaceAiSettings } from '@/types';

function settings(
  providers: WorkspaceAiSettings['providers']
): WorkspaceAiSettings {
  return {
    workspaceId: 'workspace-1',
    defaultProvider: 'openai',
    defaultModel: 'gpt-5.5',
    reasoningSummaryMode: 'auto',
    reasoningEffort: 'low',
    allowedReasoningSummaryModes: ['off', 'auto'],
    allowedReasoningEfforts: ['off', 'low'],
    reasoningSummariesEnabled: true,
    allowedProviders: ['openai', 'anthropic', 'gemini'],
    allowedProviderModels: {
      openai: ['gpt-5.5'],
      anthropic: ['claude-sonnet-4-6'],
      gemini: ['gemini-2.5-flash']
    },
    allowedModels: ['gpt-5.5', 'claude-sonnet-4-6', 'gemini-2.5-flash'],
    providers
  };
}

describe('workspace creation AI setup', () => {
  it('skips the AI setup step when any platform default is inherited', () => {
    expect(hasInheritedPlatformLlmCredential(settings([
      { provider: 'openai', configured: false, enabled: true, source: 'none' },
      { provider: 'anthropic', configured: true, enabled: true, source: 'platform_default' },
      { provider: 'gemini', configured: false, enabled: true, source: 'none' }
    ]))).toBe(true);
  });

  it('keeps the AI setup step for workspace-only or missing credentials', () => {
    expect(hasInheritedPlatformLlmCredential(settings([
      { provider: 'openai', configured: true, enabled: true, source: 'workspace' },
      { provider: 'anthropic', configured: false, enabled: true, source: 'none' },
      { provider: 'gemini', configured: false, enabled: true, source: 'none' }
    ]))).toBe(false);
  });
});
