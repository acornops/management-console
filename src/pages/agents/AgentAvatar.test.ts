import { describe, expect, it } from 'vitest';

import {
  DEFAULT_AGENT_EMOJI,
  normalizeAgentEmoji,
  suggestAgentEmoji
} from './AgentAvatar';

describe('Agent emoji identity', () => {
  it('accepts one emoji grapheme including joined and flag sequences', () => {
    expect(normalizeAgentEmoji('🛠️')).toBe('🛠️');
    expect(normalizeAgentEmoji('👩🏽‍💻')).toBe('👩🏽‍💻');
    expect(normalizeAgentEmoji('🇸🇬')).toBe('🇸🇬');
  });

  it('rejects text, empty values, and multiple emojis', () => {
    expect(normalizeAgentEmoji('Agent')).toBeNull();
    expect(normalizeAgentEmoji('')).toBeNull();
    expect(normalizeAgentEmoji('🔎📝')).toBeNull();
  });

  it('suggests recognizable role-specific identities with a neutral fallback', () => {
    expect(suggestAgentEmoji('Kubernetes Specialist')).toBe('☸️');
    expect(suggestAgentEmoji('Incident Reporter')).toBe('📝');
    expect(suggestAgentEmoji('Target Diagnostics')).toBe('🔎');
    expect(suggestAgentEmoji('Custom helper')).toBe(DEFAULT_AGENT_EMOJI);
  });
});
