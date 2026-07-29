import { describe, expect, it } from 'vitest';
import type { ChatSession } from '@/types';
import {
  automaticInvestigationViewedStorageKey,
  countUnseenAutomaticInvestigations,
  newestAutomaticInvestigationAt,
  resolveInitialInvestigationViewedAt
} from '@/features/targets/chat/hooks/useAutomaticInvestigationViewState';

function session(overrides: Partial<ChatSession>): ChatSession {
  return {
    id: 'session-1',
    name: 'Investigation',
    messages: [],
    timestamp: 100,
    ...overrides
  };
}

describe('automatic investigation view state', () => {
  it('scopes the browser marker by user, workspace, and target', () => {
    expect(automaticInvestigationViewedStorageKey('user-1', 'workspace-1', 'target-1'))
      .toBe('acornops.target-investigations.viewed.v1:user-1:workspace-1:target-1');
    expect(automaticInvestigationViewedStorageKey('', 'workspace-1', 'target-1')).toBe('');
  });

  it('counts only automatic sessions created after the marker', () => {
    const sessions = [
      session({ id: 'manual', origin: 'manual', createdTimestamp: 500 }),
      session({ id: 'seen', origin: 'auto_triage', createdTimestamp: 200 }),
      session({ id: 'new', origin: 'auto_triage', createdTimestamp: 300 })
    ];

    expect(countUnseenAutomaticInvestigations(sessions, 200)).toBe(1);
    expect(newestAutomaticInvestigationAt(sessions)).toBe(300);
  });

  it('uses the existing session timestamp when creation metadata is unavailable', () => {
    const sessions = [session({ origin: 'auto_triage', timestamp: 400 })];
    expect(countUnseenAutomaticInvestigations(sessions, 300)).toBe(1);
    expect(newestAutomaticInvestigationAt(sessions)).toBe(400);
  });

  it('limits the first unseen window while preserving an existing marker', () => {
    const now = 1_700_000_000_000;
    expect(resolveInitialInvestigationViewedAt(null, now)).toBe(now - 24 * 60 * 60 * 1000);
    expect(resolveInitialInvestigationViewedAt('1234', now)).toBe(1234);
  });
});
