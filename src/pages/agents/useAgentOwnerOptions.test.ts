import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CursorCollectionController } from '@/hooks/useCursorCollection';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import type { ProjectMember } from '@/types';
import { agentOwnerCollectionOptions } from './useAgentOwnerOptions';
import { clearSessionDataCache } from '@/hooks/sessionDataCache';

const member = (number: number): ProjectMember => ({ userId: `user-${number}`, name: number < 3 ? 'Alex Chen' : `Member ${number}`, email: `member-${number}@example.test`, role: 'member', source: 'Internal' });
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

describe('Agent owner member discovery through the existing cursor API', () => {
  beforeEach(() => { vi.restoreAllMocks(); clearSessionDataCache(); });
  it('loads only requested bounded pages and makes member 125 available', async () => {
    const requests = vi.spyOn(controlPlaneApi, 'listWorkspaceMembers').mockImplementation(async (_workspaceId, options) => {
      const offset = options?.cursor === 'page-2' ? 50 : options?.cursor === 'page-3' ? 100 : 0;
      return { items: Array.from({ length: offset === 100 ? 25 : 50 }, (_, index) => member(offset + index + 1)), nextCursor: offset === 0 ? 'page-2' : offset === 50 ? 'page-3' : undefined };
    });
    const controller = new CursorCollectionController(agentOwnerCollectionOptions('workspace-1', true, ''));
    await controller.reset();
    expect(controller.getState().items).toHaveLength(50);
    expect(requests).toHaveBeenCalledTimes(1);
    await controller.loadMore(); await controller.loadMore();
    expect(controller.getState().items).toHaveLength(125);
    expect(controller.getState().items.at(-1)?.userId).toBe('user-125');
    expect(requests.mock.calls.map(([workspaceId, options]) => [workspaceId, options?.limit, options?.cursor])).toEqual([
      ['workspace-1', 50, undefined], ['workspace-1', 50, 'page-2'], ['workspace-1', 50, 'page-3']
    ]);
    expect(controller.getState().nextCursor).toBeUndefined();
  });
  it('sends literal search to the server and exposes a genuine empty result', async () => {
    const requests = vi.spyOn(controlPlaneApi, 'listWorkspaceMembers').mockResolvedValue({ items: [] });
    const controller = new CursorCollectionController(agentOwnerCollectionOptions('workspace-1', true, 'Alex_%[]'));
    await controller.reset();
    expect(requests).toHaveBeenCalledWith('workspace-1', expect.objectContaining({ q: 'Alex_%[]', limit: 50, cursor: undefined }));
    expect(controller.getState()).toEqual({ items: [], nextCursor: undefined, phase: 'ready' });
  });
  it('keeps duplicate display names distinct and deduplicates only the immutable identity', async () => {
    vi.spyOn(controlPlaneApi, 'listWorkspaceMembers')
      .mockResolvedValueOnce({ items: [member(1)], nextCursor: 'next' })
      .mockResolvedValueOnce({ items: [member(1), member(2)] });
    const controller = new CursorCollectionController(agentOwnerCollectionOptions('workspace-1', true, 'Alex'));
    await controller.reset(); await controller.loadMore();
    expect(controller.getState().items.map(({ userId, name, email }) => [userId, name, email])).toEqual([
      ['user-1', 'Alex Chen', 'member-1@example.test'], ['user-2', 'Alex Chen', 'member-2@example.test']
    ]);
  });
  it('retains known members after a failed page and retries that exact cursor', async () => {
    const requests = vi.spyOn(controlPlaneApi, 'listWorkspaceMembers')
      .mockResolvedValueOnce({ items: [member(1)], nextCursor: 'next' })
      .mockRejectedValueOnce(new Error('Member page unavailable'))
      .mockResolvedValueOnce({ items: [member(2)] });
    const controller = new CursorCollectionController(agentOwnerCollectionOptions('workspace-1', true, ''));
    await controller.reset(); await controller.loadMore();
    expect(controller.getState()).toEqual({ items: [member(1)], nextCursor: 'next', phase: 'error', error: 'Member page unavailable' });
    await controller.retry();
    expect(requests.mock.calls.map(([, options]) => options?.cursor)).toEqual([undefined, 'next', 'next']);
    expect(controller.getState().items.map(({ userId }) => userId)).toEqual(['user-1', 'user-2']);
  });
  it.each(['query', 'workspace'] as const)('ignores stale pages after a %s change and resets the cursor', async (change) => {
    const old = deferred<{ items: ProjectMember[]; nextCursor?: string }>();
    const requests = vi.spyOn(controlPlaneApi, 'listWorkspaceMembers').mockReturnValueOnce(old.promise).mockResolvedValueOnce({ items: [member(2)] });
    const controller = new CursorCollectionController(agentOwnerCollectionOptions('workspace-1', true, 'old'));
    const pending = controller.reset();
    controller.updateOptions(agentOwnerCollectionOptions(change === 'workspace' ? 'workspace-2' : 'workspace-1', true, change === 'query' ? 'new' : ''));
    await controller.reset();
    old.resolve({ items: [member(1)], nextCursor: 'stale' }); await pending;
    expect(controller.getState().items.map(({ userId }) => userId)).toEqual(['user-2']);
    expect(controller.getState().nextCursor).toBeUndefined();
    expect(requests.mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(requests.mock.calls[1][1]?.cursor).toBeUndefined();
  });
  it('does not discover identities without read-members permission', async () => {
    const requests = vi.spyOn(controlPlaneApi, 'listWorkspaceMembers');
    const controller = new CursorCollectionController(agentOwnerCollectionOptions('workspace-1', false, 'Alex'));
    await controller.reset();
    expect(requests).not.toHaveBeenCalled();
    expect(controller.getState().items).toEqual([]);
  });
});
