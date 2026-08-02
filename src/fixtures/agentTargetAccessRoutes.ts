import type { FixtureResponse } from './router';
import type { FixtureState } from './store';
import { targetSummary } from './presenters';

const json = (body: unknown, status = 200): FixtureResponse => ({
  status,
  body,
  headers: { 'content-type': 'application/json' }
});
const clone = <T,>(value: T): T => structuredClone(value);
const decode = (value: string): string => decodeURIComponent(value);
const fixtureError = (message: string, code: string): FixtureResponse => json({ error: { code, message } }, 400);
const notFound = (resource: string): FixtureResponse => json({
  error: { code: 'FIXTURE_NOT_FOUND', message: `${resource} was not found in the frontend fixture store.` }
}, 404);

async function bodyOf(request: Request): Promise<Record<string, unknown>> {
  try {
    const value = await request.json();
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

export async function routeAgentTargetAccessFixtureRequest({
  method,
  path,
  request,
  state
}: {
  method: string;
  path: string;
  request: Request;
  state: FixtureState;
}): Promise<FixtureResponse | null> {
  const match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/agents\/([^/]+)\/mcp\/servers\/([^/]+)\/target-access$/);
  if (!match || (method !== 'GET' && method !== 'PUT')) return null;
  const workspaceId = decode(match[1]);
  const agentId = decode(match[2]);
  const serverId = decode(match[3]);
  const agent = state.agents.find((item) => item.workspaceId === workspaceId && item.id === agentId);
  const server = state.agentMcpServers.find((item) => (
    item.agentId === agentId
    && item.id === serverId
    && item.isSystem
    && item.name === 'AcornOps Targets'
  ));
  if (!agent) return notFound('Agent');
  if (!server) return notFound('Targets MCP server');
  const targets = [...state.clusters, ...state.virtualMachines]
    .filter((target) => target.workspaceId === workspaceId)
    .map(targetSummary)
    .map((target) => ({ id: target.id, name: target.name, targetType: target.targetType, status: target.status }));

  if (method === 'PUT') {
    const input = await bodyOf(request);
    if (!['all', 'allowlist', 'denylist'].includes(String(input.mode)) || !Array.isArray(input.targetIds)) {
      return fixtureError('Invalid target access policy.', 'AGENT_TARGET_ACCESS_INVALID');
    }
    const knownTargetIds = new Set(targets.map((target) => target.id));
    const targetIds = [...new Set(input.targetIds
      .filter((targetId): targetId is string => typeof targetId === 'string')
      .map((targetId) => targetId.trim())
      .filter(Boolean))].sort();
    if (targetIds.some((targetId) => !knownTargetIds.has(targetId))) {
      return fixtureError('Target access policy contains targets outside this workspace.', 'AGENT_TARGET_ACCESS_TARGET_INVALID');
    }
    agent.targetAccessPolicy = {
      mode: input.mode,
      targetIds: input.mode === 'all' ? [] : targetIds
    };
  }
  return json({
    policy: clone(agent.targetAccessPolicy || { mode: 'all', targetIds: [] }),
    targets
  });
}
