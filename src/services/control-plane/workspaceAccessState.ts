/** Safe membership discovery is independent of workload permissions. */
export interface WorkspaceAccessState {
  id: string;
  name: string;
  accessState: 'active' | 'suspended';
  publicReason?: string;
  suspendedAt?: string;
}
export const WORKSPACE_ACCESS_CHANGED = 'acornops:workspace-access-changed';
export const WORKSPACE_SUSPENSION_DETECTED = 'acornops:workspace-suspension-detected';
let currentWorkspaceId: string | null = null;
export function setAccessWorkspaceContext(id: string | null) { currentWorkspaceId = id; }
export function requestWorkspaceId(path: string) {
  return workspaceIdFromPath(path) ?? (/^\/api\/v1\/(?:runs|sessions|targets|agents|workflows)(?:[/?]|$)/.test(path) ? currentWorkspaceId ?? undefined : undefined);
}
const states = new Map<string, WorkspaceAccessState>();
const blocked = new Set<string>();
const requests = new Map<AbortController, string>();

export function hasWorkspaceAccessDiscovery() { return states.size > 0; }
export function readWorkspaceAccessState(id: string) { return states.get(id); }
export function isWorkspaceSuspended(id: string) { return blocked.has(id); }
export function workspaceIdFromPath(path: string): string | undefined {
  const match = /^\/api\/v1\/workspaces\/([^/?]+)(?:[/?]|$)/.exec(path);
  return match ? decodeURIComponent(match[1]) : undefined;
}
export function recordWorkspaceAccessState(state: WorkspaceAccessState): void {
  const previous = states.get(state.id);
  const wasBlocked = blocked.has(state.id);
  states.set(state.id, state);
  if (wasBlocked && state.accessState === 'suspended' && JSON.stringify(previous) !== JSON.stringify(state) && typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(WORKSPACE_ACCESS_CHANGED, { detail: { workspaceId: state.id, metadataOnly: true } }));
  if (state.accessState === 'suspended') blockWorkspace(state.id);
}
export function blockWorkspace(id: string): void {
  const alreadyBlocked = blocked.has(id);
  blocked.add(id);
  for (const [controller, workspaceId] of requests) if (id === workspaceId) controller.abort();
  if (!alreadyBlocked && typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(WORKSPACE_ACCESS_CHANGED, { detail: { workspaceId: id } }));
}
export function notifyWorkspaceSuspended(id?: string): void {
  if (id) blockWorkspace(id);
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(WORKSPACE_SUSPENSION_DETECTED, { detail: { workspaceId: id } }));
}
export function trackWorkspaceRequest(controller: AbortController, workspaceId: string): () => void {
  requests.set(controller, workspaceId);
  return () => { requests.delete(controller); };
}
export function clearWorkspaceAccessStates(): void {
  for (const controller of requests.keys()) controller.abort();
  requests.clear(); states.clear(); blocked.clear();
}
