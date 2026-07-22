import { describe, expect, it } from 'vitest';
import {
  getHistoryFocusWrapIndex,
  resolveComposerReasoningEffort,
  resolveComposerRuntimeSelection,
  buildComposerModelOptions,
  shouldDismissHistoryOnKeyDown
} from '@/features/targets/chat/components/targetChatViewHelpers';
import type { WorkspaceAiSettings } from '@/types';

function aiSettings(overrides: Partial<WorkspaceAiSettings> = {}): WorkspaceAiSettings {
  return {
    workspaceId: 'workspace-1',
    defaultProvider: 'openai',
    defaultModel: 'gpt-5-nano',
    reasoningSummaryMode: 'auto',
    reasoningEffort: 'medium',
    allowedReasoningSummaryModes: ['off', 'auto', 'concise', 'detailed'],
    allowedReasoningEfforts: ['off', 'low', 'medium', 'high'],
    reasoningSummariesEnabled: true,
    allowedProviders: ['openai'],
    allowedProviderModels: { openai: ['gpt-5-nano'], anthropic: [], gemini: [] },
    allowedModels: [],
    providers: [{ provider: 'openai', configured: true, enabled: true }],
    ...overrides
  };
}

describe('target chat view helpers', () => {
  it('wraps Tab focus within the mobile history drawer', () => {
    expect(getHistoryFocusWrapIndex(2, 3, false)).toBe(0);
    expect(getHistoryFocusWrapIndex(0, 3, true)).toBe(2);
    expect(getHistoryFocusWrapIndex(1, 3, false)).toBeNull();
  });

  it('dismisses history with Escape only when it is an overlay', () => {
    expect(shouldDismissHistoryOnKeyDown('Escape', true)).toBe(true);
    expect(shouldDismissHistoryOnKeyDown('Escape', false)).toBe(false);
    expect(shouldDismissHistoryOnKeyDown('Tab', true)).toBe(false);
  });

  it('uses the workspace reasoning effort default until the user changes the composer effort', () => {
    expect(resolveComposerReasoningEffort(aiSettings(), 'low', false)).toBe('medium');
    expect(resolveComposerReasoningEffort(aiSettings(), 'high', true)).toBe('high');
  });

  it('falls back when the configured workspace reasoning effort is outside policy', () => {
    expect(
      resolveComposerReasoningEffort(
        aiSettings({ reasoningEffort: 'high', allowedReasoningEfforts: ['off', 'low'] }),
        'medium',
        true
      )
    ).toBe('low');
    expect(
      resolveComposerReasoningEffort(
        aiSettings({ reasoningEffort: 'high', allowedReasoningEfforts: ['off'] }),
        'medium',
        false
      )
    ).toBe('off');
  });

  it('restores a valid conversation runtime and falls back when it is no longer available', () => {
    const settings = aiSettings();
    const options = buildComposerModelOptions(settings);
    expect(resolveComposerRuntimeSelection(settings, options, {
      provider: 'openai',
      model: 'gpt-5-nano',
      reasoningEffort: 'high'
    })).toEqual({
      selection: { provider: 'openai', model: 'gpt-5-nano', reasoningEffort: 'high' },
      fellBack: false
    });
    expect(resolveComposerRuntimeSelection(settings, options, {
      provider: 'gemini',
      model: 'removed-model',
      reasoningEffort: 'high'
    })).toEqual({
      selection: { provider: 'openai', model: 'gpt-5-nano', reasoningEffort: 'medium' },
      fellBack: true
    });
  });
});
