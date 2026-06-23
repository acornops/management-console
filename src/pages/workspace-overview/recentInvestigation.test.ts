import { beforeEach, describe, expect, it, vi } from 'vitest';

import { safeStorage } from '@/utils/safeStorage';

import { clearRecentInvestigation, readRecentInvestigation, writeRecentInvestigation } from './recentInvestigation';

describe('recent investigation context', () => {
  const storageKey = 'acornops.workspace.recent-investigation';

  beforeEach(() => {
    vi.restoreAllMocks();
    const storage = new Map<string, string>();
    vi.spyOn(safeStorage, 'getItem').mockImplementation((key) => storage.get(key) ?? null);
    vi.spyOn(safeStorage, 'setItem').mockImplementation((key, value) => {
      storage.set(key, value);
    });
    vi.spyOn(safeStorage, 'removeItem').mockImplementation((key) => {
      storage.delete(key);
    });
    clearRecentInvestigation();
  });

  it('reads a stored recent investigation for the current workspace', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);

    writeRecentInvestigation({
      userId: 'user-a',
      workspaceId: 'workspace-a',
      path: '/workspaces/workspace-a/kubernetes-clusters/cluster-1/chat',
      targetName: 'cluster-1',
      targetType: 'kubernetes'
    });

    expect(readRecentInvestigation('workspace-a', 'user-a')).toEqual({
      workspaceId: 'workspace-a',
      path: '/workspaces/workspace-a/kubernetes-clusters/cluster-1/chat',
      targetName: 'cluster-1',
      targetType: 'kubernetes',
      timestamp: 1_700_000_000_000
    });
  });

  it('keeps separate recent investigations per user and workspace', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);

    writeRecentInvestigation({
      userId: 'user-a',
      workspaceId: 'workspace-a',
      path: '/workspaces/workspace-a/kubernetes-clusters/cluster-1/chat',
      targetName: 'cluster-1',
      targetType: 'kubernetes'
    });

    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_010_000);

    writeRecentInvestigation({
      userId: 'user-b',
      workspaceId: 'workspace-a',
      path: '/workspaces/workspace-a/virtual-machines/vm-1/chat',
      targetName: 'vm-1',
      targetType: 'virtual_machine'
    });

    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_020_000);

    writeRecentInvestigation({
      userId: 'user-a',
      workspaceId: 'workspace-b',
      path: '/workspaces/workspace-b/virtual-machines/vm-2/chat',
      targetName: 'vm-2',
      targetType: 'virtual_machine'
    });

    expect(readRecentInvestigation('workspace-a', 'user-a')?.targetName).toBe('cluster-1');
    expect(readRecentInvestigation('workspace-a', 'user-b')?.targetName).toBe('vm-1');
    expect(readRecentInvestigation('workspace-b', 'user-a')?.targetName).toBe('vm-2');
    expect(readRecentInvestigation('workspace-b', 'user-b')).toBeNull();
  });

  it('fails closed for expired entries and invalid payloads while preserving valid entries', () => {
    safeStorage.setItem(
      storageKey,
      JSON.stringify({
        version: 3,
        entries: {
          'user-a': {
            'workspace-a': {
              workspaceId: 'workspace-a',
              path: '/workspaces/workspace-a/kubernetes-clusters/cluster-1/chat',
              targetName: 'cluster-1',
              targetType: 'kubernetes',
              timestamp: 1_700_000_000_000
            }
          },
          'user-b': {
            'workspace-b': {
              workspaceId: 'workspace-b',
              path: '/workspaces/workspace-b/virtual-machines/vm-1/chat',
              targetName: 'vm-1',
              targetType: 'virtual_machine',
              timestamp: 1_700_000_000_000 + 1000 * 60 * 60 * 24 * 2
            }
          }
        }
      })
    );

    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000 + 1000 * 60 * 60 * 24 * 8);
    expect(readRecentInvestigation('workspace-a', 'user-a')).toBeNull();

    const storedAfterPrune = JSON.parse(safeStorage.getItem(storageKey) ?? '{}') as {
      entries?: Record<string, Record<string, { targetName: string }>>;
    };
    expect(storedAfterPrune.entries?.['user-a']).toBeUndefined();
    expect(storedAfterPrune.entries?.['user-b']?.['workspace-b']?.targetName).toBe('vm-1');

    safeStorage.setItem(storageKey, '{"version":2,"workspaceId":"workspace-a"}');
    expect(readRecentInvestigation('workspace-a', 'user-a')).toBeNull();
    expect(safeStorage.getItem(storageKey)).toBeNull();
  });
});
