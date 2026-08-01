import { describe, expect, it } from 'vitest';

import {
  insertTargetMention,
  resolveTargetMentionQuery
} from '@/features/targets/mentions/targetMentionModel';

describe('target mention autocomplete', () => {
  it('opens for an unfinished @target token and exposes the typed target query', () => {
    expect(resolveTargetMentionQuery('Investigate @target', 19)).toEqual({
      start: 12,
      end: 19,
      query: ''
    });
    expect(resolveTargetMentionQuery('Investigate @target[pay', 23)).toEqual({
      start: 12,
      end: 23,
      query: 'pay'
    });
  });

  it('ignores completed mentions, email addresses, and other @ tokens', () => {
    expect(resolveTargetMentionQuery('Inspect @target[Payments VM].', 28)).toBeNull();
    expect(resolveTargetMentionQuery('Email ops@example.com', 21)).toBeNull();
    expect(resolveTargetMentionQuery('Ask @chat', 9)).toBeNull();
  });

  it('replaces only the active token with a plain-text target mention', () => {
    const value = 'Compare @target[data with production';
    const query = resolveTargetMentionQuery(value, 20);
    expect(query).not.toBeNull();
    expect(insertTargetMention(value, query!, 'Database VM')).toEqual({
      value: 'Compare @target[Database VM] with production',
      cursor: 28
    });
  });

  it('escapes closing brackets and backslashes in target names', () => {
    const query = resolveTargetMentionQuery('@target', 7);
    expect(insertTargetMention('@target', query!, 'Edge \\ VM]')).toEqual({
      value: '@target[Edge \\\\ VM\\]] ',
      cursor: 22
    });
  });
});
