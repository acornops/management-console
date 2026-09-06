import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearWorkspaceAccessStates, recordWorkspaceAccessState, setAccessWorkspaceContext, trackWorkspaceRequest } from './workspaceAccessState';
import { requestJson, readJsonEventStream, requestEventStream } from './http';

afterEach(() => { clearWorkspaceAccessStates(); setAccessWorkspaceContext(null); vi.unstubAllGlobals(); });
describe('suspended workspace request boundary', () => {
  it('blocks workspace and current-run requests before fetch and aborts existing streams', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    const controller = new AbortController(); trackWorkspaceRequest(controller, 'ws');
    setAccessWorkspaceContext('ws');
    recordWorkspaceAccessState({ id: 'ws', name: 'Workspace', accessState: 'suspended' });
    await expect(requestJson('/api/v1/workspaces/ws/targets')).rejects.toMatchObject({ code: 'WORKSPACE_SUSPENDED' });
    await expect(requestJson('/api/v1/runs/run-1')).rejects.toMatchObject({ code: 'WORKSPACE_SUSPENDED' });
    expect(fetch).not.toHaveBeenCalled(); expect(controller.signal.aborted).toBe(true);
  });
  it('keeps a suspension latched until a deliberate fresh application load', async () => {
    vi.stubGlobal('fetch', vi.fn());
    recordWorkspaceAccessState({ id: 'ws', name: 'Workspace', accessState: 'suspended' });
    recordWorkspaceAccessState({ id: 'ws', name: 'Workspace', accessState: 'active' });
    await expect(requestJson('/api/v1/workspaces/ws/targets')).rejects.toMatchObject({ code: 'WORKSPACE_SUSPENDED' });
  });
  it('consumes SSE suspension control frames without delivering them as tenant data', async () => {
    const dispatchEvent = vi.fn(); vi.stubGlobal('window', { dispatchEvent });
    const onEvent = vi.fn();
    await readJsonEventStream(new Response('event: workspace_suspended\ndata: {"workspaceId":"ws"}\n\n'), onEvent);
    expect(onEvent).not.toHaveBeenCalled(); expect(dispatchEvent).toHaveBeenCalled();
  });
  it('binds the producer suspension frame without an ID to its originating stream workspace', async () => {
    vi.stubGlobal('window', { dispatchEvent: vi.fn() });
    const fetch = vi.fn().mockResolvedValue(new Response('event: workspace_suspended\ndata: {"code":"WORKSPACE_SUSPENDED"}\n\n', { headers: { 'content-type': 'text/event-stream' } }));
    vi.stubGlobal('fetch', fetch);
    recordWorkspaceAccessState({ id: 'ws', name: 'Workspace', accessState: 'active' });
    await requestEventStream('/api/v1/workspaces/ws/activity/stream');
    await expect(requestJson('/api/v1/workspaces/ws/targets')).rejects.toMatchObject({ code: 'WORKSPACE_SUSPENDED' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

});
