import { afterEach, expect, it, vi } from 'vitest';
import type { Workspace } from '@/types';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import { emitSessionExpired, setAuthenticatedSession } from '@/services/control-plane/sessionLifecycle';
import { clearWorkspaceAccessStates, isWorkspaceSuspended, readWorkspaceAccessState, recordWorkspaceAccessState } from '@/services/control-plane/workspaceAccessState';
import { refreshLatestWorkspaceSummary } from './workspaceSummaryRefresh';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  setAuthenticatedSession(false);
  clearWorkspaceAccessStates();
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

const summary = (id: string, count: number): Workspace => ({
  id, name: id, description: '', members: [], clusterIds: ['unrelated-target'], clusterCount: count,
  quota: { members: { used: 1, limit: 5 }, kubernetesClusters: { used: count, limit: 10 }, virtualMachines: { used: count, limit: 10 } }
});

it('keeps the newer summary when overlapping target refreshes resolve in reverse order', async () => {
  const first = deferred<Workspace>();
  const second = deferred<Workspace>();
  vi.spyOn(controlPlaneApi, 'getWorkspace').mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  const applied: Partial<Workspace>[] = [];
  const older = refreshLatestWorkspaceSummary('ws', value => applied.push(value));
  const newer = refreshLatestWorkspaceSummary('ws', value => applied.push(value));
  second.resolve(summary('ws', 0));
  await newer;
  first.resolve(summary('ws', 1));
  await older;
  expect(applied).toHaveLength(1);
  expect(applied[0].quota?.virtualMachines.used).toBe(0);
  expect(applied[0]).not.toHaveProperty('clusterIds');
  expect(applied[0]).not.toHaveProperty('members');
});

it('does not discard a refresh for a different workspace', async () => {
  const first = deferred<Workspace>();
  const second = deferred<Workspace>();
  vi.spyOn(controlPlaneApi, 'getWorkspace').mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  const applied: string[] = [];
  const older = refreshLatestWorkspaceSummary('ws-a', value => applied.push(value.id!));
  const newer = refreshLatestWorkspaceSummary('ws-b', value => applied.push(value.id!));
  second.resolve(summary('ws-b', 0));
  first.resolve(summary('ws-a', 1));
  await Promise.all([older, newer]);
  expect(applied.sort()).toEqual(['ws-a', 'ws-b']);
});

it('a failed newer refresh cannot let an older summary overwrite current state', async () => {
  const first = deferred<Workspace>();
  const second = deferred<Workspace>();
  vi.spyOn(controlPlaneApi, 'getWorkspace').mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    .mockResolvedValueOnce(summary('ws', 0));
  const applied: Partial<Workspace>[] = [];
  const older = refreshLatestWorkspaceSummary('ws', value => applied.push(value));
  const newer = refreshLatestWorkspaceSummary('ws', value => applied.push(value));
  const failed = expect(newer).rejects.toThrow('unavailable');
  second.reject(new Error('unavailable'));
  await failed;
  first.resolve(summary('ws', 1));
  await older;
  expect(applied).toEqual([]);
  await refreshLatestWorkspaceSummary('ws', value => applied.push(value));
  expect(applied[0].clusterCount).toBe(0);
});

it.each([
  ['logout', 'active'], ['logout', 'suspended'], ['expiry', 'active'], ['expiry', 'suspended']
])('discards a pending %s session response with %s access after reauthentication', async (transition, access) => {
  setAuthenticatedSession(true);
  const accessState = deferred<Response>();
  const fetch = vi.fn().mockReturnValueOnce(accessState.promise);
  vi.stubGlobal('fetch', fetch);
  const apply = vi.fn();
  const pending = refreshLatestWorkspaceSummary('ws', apply);
  expect(fetch.mock.calls[0][0]).toMatch(/\/workspaces\/ws\/access-state$/);
  if (transition === 'logout') setAuthenticatedSession(false);
  else emitSessionExpired();
  clearWorkspaceAccessStates();
  setAuthenticatedSession(true);
  const freshAccess = { id: 'ws', name: 'Current workspace', accessState: 'active' as const };
  recordWorkspaceAccessState(freshAccess);
  const aborted = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  accessState.resolve(Response.json({ id: 'ws', name: 'Old session workspace', accessState: access }));
  await aborted;
  expect(apply).not.toHaveBeenCalled();
  expect(readWorkspaceAccessState('ws')).toEqual(freshAccess);
  expect(isWorkspaceSuspended('ws')).toBe(false);
  expect(fetch).toHaveBeenCalledTimes(1);
});

it('discards a summary already in flight when the session changes', async () => {
  setAuthenticatedSession(true);
  const response = deferred<Workspace>();
  vi.spyOn(controlPlaneApi, 'getWorkspace').mockReturnValueOnce(response.promise);
  const apply = vi.fn();
  const pending = refreshLatestWorkspaceSummary('ws', apply);
  setAuthenticatedSession(false);
  setAuthenticatedSession(true);
  response.resolve(summary('ws', 1));
  await pending;
  expect(apply).not.toHaveBeenCalled();
});
