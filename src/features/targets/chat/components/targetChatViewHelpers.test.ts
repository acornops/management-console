import { describe, expect, it } from 'vitest';
import {
  getHistoryFocusWrapIndex,
  resolveComposerReasoningEffort,
  resolveComposerRuntimeSelection,
  isMessageOwnedByCurrentUser,
  shouldDismissHistoryOnKeyDown
} from '@/features/targets/chat/components/targetChatViewHelpers';
import type { ChatMessage, ChatRuntimeSelection, ChatSession, WorkspaceAiSettings } from '@/types';

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
    providers: [{ provider: 'openai', configured: true, enabled: true, source: 'workspace' }],
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

  it('preserves legacy manual ownership while requiring per-message authorship in shared investigations', () => {
    const message = { createdBy: undefined } as ChatMessage;
    expect(isMessageOwnedByCurrentUser(
      { origin: 'manual', createdBy: 'user-1' } as ChatSession,
      message,
      'user-1'
    )).toBe(true);
    expect(isMessageOwnedByCurrentUser(
      { origin: 'auto_triage', createdBy: 'system-auto-triage' } as ChatSession,
      message,
      'user-1'
    )).toBe(false);
    expect(isMessageOwnedByCurrentUser(
      { origin: 'auto_triage', createdBy: 'system-auto-triage' } as ChatSession,
      { ...message, createdBy: 'user-1' },
      'user-1'
    )).toBe(true);
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

  it('restores a valid conversation runtime and preserves an unavailable model without substitution', () => {
    const settings = aiSettings();
    expect(resolveComposerRuntimeSelection(settings, {
      provider: 'openai',
      model: 'gpt-5-nano',
      reasoningEffort: 'high'
    })).toEqual({
      selection: { provider: 'openai', model: 'gpt-5-nano', reasoningEffort: 'high' },
      reasoningAdjusted: false
    });
    expect(resolveComposerRuntimeSelection(settings, {
      provider: 'gemini',
      model: 'removed-model',
      reasoningEffort: 'high'
    })).toEqual({
      selection: { provider: 'gemini', model: 'removed-model', reasoningEffort: 'high' },
      reasoningAdjusted: false
    });
  });

  it('preserves unavailable defaults and missing credentials even when alternatives are ready', () => {
    for (const settings of [
      aiSettings({ defaultModel: 'removed-model' }),
      aiSettings({ providers: [{ provider: 'openai', configured: false, enabled: true, source: 'none' }] }),
      aiSettings({ allowedProviders: [], allowedProviderModels: { openai: [], anthropic: [], gemini: [] } })
    ]) {
      expect(resolveComposerRuntimeSelection(settings)).toEqual({
        selection: { provider: settings.defaultProvider, model: settings.defaultModel, reasoningEffort: 'medium' },
        reasoningAdjusted: false
      });
    }
  });

  it('normalizes only reasoning while preserving the selected model and provider', () => {
    const settings = aiSettings({ allowedReasoningEfforts: ['low'] });
    const selected: ChatRuntimeSelection = { provider: 'anthropic', model: 'chosen-model', reasoningEffort: 'high' };
    expect(resolveComposerRuntimeSelection(settings, selected)).toEqual({
      selection: { ...selected, reasoningEffort: 'low' }, reasoningAdjusted: true
    });
    expect(resolveComposerRuntimeSelection(settings, {
      provider: 'openai', model: 'gpt-5-nano', reasoningEffort: 'low'
    })).toEqual({ selection: { provider: 'openai', model: 'gpt-5-nano', reasoningEffort: 'low' }, reasoningAdjusted: false });
  });
});
