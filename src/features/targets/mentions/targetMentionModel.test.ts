import { describe, expect, it } from 'vitest';

import {
  completeTargetMentionType,
  insertTargetMention,
  resolveTargetMentionKeyboardAction,
  resolveTargetMentionQuery
} from '@/features/targets/mentions/targetMentionModel';

describe('target mention autocomplete', () => {
  it('offers Target as the mention type from a bare or partial @ token', () => {
    expect(resolveTargetMentionQuery('Investigate @', 13)).toEqual({
      stage: 'type',
      start: 12,
      end: 13,
      query: ''
    });
    expect(resolveTargetMentionQuery('Investigate @ta', 15)).toEqual({
      stage: 'type',
      start: 12,
      end: 15,
      query: 'ta'
    });
  });

  it('completes the mention type and leaves the cursor ready for target filtering', () => {
    const query = resolveTargetMentionQuery('Investigate @ta later', 15);
    if (query?.stage !== 'type') throw new Error('Expected a mention-type query.');
    expect(completeTargetMentionType('Investigate @ta later', query)).toEqual({
      value: 'Investigate @target[ later',
      cursor: 20
    });
  });

  it('uses Tab to accept available suggestions without trapping ordinary focus navigation', () => {
    expect(resolveTargetMentionKeyboardAction('type', 'Tab', false, false)).toBe('complete_type');
    expect(resolveTargetMentionKeyboardAction('target', 'Tab', false, true)).toBe('select_target');
    expect(resolveTargetMentionKeyboardAction('target', 'Tab', false, false)).toBe('none');
    expect(resolveTargetMentionKeyboardAction('target', 'Tab', true, true)).toBe('none');
  });

  it('keeps arrows, Enter, and Escape available alongside Tab', () => {
    expect(resolveTargetMentionKeyboardAction('target', 'ArrowDown', false, true)).toBe('move_next');
    expect(resolveTargetMentionKeyboardAction('target', 'ArrowUp', false, true)).toBe('move_previous');
    expect(resolveTargetMentionKeyboardAction('target', 'Enter', false, true)).toBe('select_target');
    expect(resolveTargetMentionKeyboardAction('target', 'Escape', false, true)).toBe('dismiss');
  });

  it('opens for an unfinished @target token and exposes the typed target query', () => {
    expect(resolveTargetMentionQuery('Investigate @target', 19)).toEqual({
      stage: 'target',
      start: 12,
      end: 19,
      query: ''
    });
    expect(resolveTargetMentionQuery('Investigate @target[pay', 23)).toEqual({
      stage: 'target',
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
    if (query?.stage !== 'target') throw new Error('Expected a target query.');
    expect(insertTargetMention(value, query, 'Database VM')).toEqual({
      value: 'Compare @target[Database VM] with production',
      cursor: 28
    });
  });

  it('escapes closing brackets and backslashes in target names', () => {
    const query = resolveTargetMentionQuery('@target', 7);
    if (query?.stage !== 'target') throw new Error('Expected a target query.');
    expect(insertTargetMention('@target', query, 'Edge \\ VM]')).toEqual({
      value: '@target[Edge \\\\ VM\\]] ',
      cursor: 22
    });
  });
});
