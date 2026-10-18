import { http } from 'msw';
import { routeFixtureRequest, type FixtureResponse } from './router';
import { FIXTURE_IDS, getFixtureState, resetFixtureStore } from './store';

const forcedError = (code: string, status: number): FixtureResponse => ({
  status,
  body: { error: { code, message: 'This read is unavailable in the selected fixture scenario.', retryable: status === 503 } },
  headers: { 'content-type': 'application/json' }
});

/** One isolated request sequence per browser query (or stub process). No network. */
export function createFixtureScenarioRouter(params: URLSearchParams) {
  let initializedState: ReturnType<typeof getFixtureState> | undefined;
  const requests = new Map<string, number>();
  const nextRequest = (key: string) => {
    const count = (requests.get(key) || 0) + 1;
    requests.set(key, count);
    return count;
  };
  const matchesPath = (name: string, path: string) => (params.get(name) || '').split(',').filter(Boolean).some((part) => path.includes(part));

  return async (request: Request): Promise<FixtureResponse> => {
    if (initializedState !== getFixtureState()) {
      const clock = params.get('fixtureClock');
      if (clock && Number.isFinite(Date.parse(clock))) resetFixtureStore(clock);
      initializedState = getFixtureState();
      requests.clear();
      const state = initializedState;
      const quota = state.workspaces[0].quota as Record<string, { used: number; limit: number }>;
      if (params.get('fixtureMembers') === '125') {
        state.members = Array.from({ length: 125 }, (_, index) => ({
          ...state.members[index % 3], userId: index === 0 ? FIXTURE_IDS.user : `fixture-scale-member-${index + 1}`,
          email: `member-${index + 1}@fixture.acornops.dev`, displayName: `Fixture member ${index + 1}`
        }));
        state.workspaces[0].memberCount = 125;
        quota.members = { used: 125, limit: 250 };
      }
      if (params.get('fixtureMemberNames') === 'duplicate-long') {
        state.members[0].displayName = state.members[1].displayName = 'Alex Chen';
        state.members[2].displayName = 'Operations incident response and service reliability reviewer '.repeat(4).trim();
      }
      if (params.get('fixtureMcpTools') === '200') {
        const server = state.targetMcpServers.find((item) => item.target_id === FIXTURE_IDS.cluster)!;
        const tool = server.tools[0];
        server.tools = Array.from({ length: 200 }, (_, index) => ({
          ...tool, name: `fixture_tool_${String(index + 1).padStart(3, '0')}`,
          description: index === 0 ? 'Long fixture tool description '.repeat(20).trim() : `Offline tool ${index + 1}`,
          capability: index % 2 === 0 ? 'read' : 'write'
        }));
      }
      const emptyKubernetes = params.get('fixtureEmptyTargets') === '1' || params.get('fixtureEmptyKubernetesClusters') === '1';
      const emptyVirtualMachines = params.get('fixtureEmptyTargets') === '1' || params.get('fixtureEmptyVirtualMachines') === '1';
      if (emptyKubernetes) state.clusters = [];
      if (emptyVirtualMachines) state.virtualMachines = [];
      if (emptyKubernetes || emptyVirtualMachines) {
        const targets = new Set([...state.clusters, ...state.virtualMachines].map((target) => target.id));
        state.issues = state.issues.filter((issue) => targets.has(issue.targetId));
        state.resources = state.resources.filter((row) => targets.has(row.clusterId));
        state.virtualMachineResources = state.virtualMachineResources.filter((row) => targets.has(row.targetId));
        state.targetSkills = state.targetSkills.filter((skill) => targets.has(skill.target_id));
        state.targetMcpServers = state.targetMcpServers.filter((server) => targets.has(server.target_id));
        state.workspaces[0].clusterCount = state.clusters.length;
        quota.kubernetesClusters.used = state.clusters.length;
        quota.virtualMachines.used = state.virtualMachines.length;
      }
      const approvalState = params.get('fixtureApprovalState');
      if (approvalState === 'expired') Object.assign(state.approvals[0], {
        status: 'expired', expiresAt: new Date(Date.parse(state.clock) - 60_000).toISOString(), decision: undefined
      });
      if (approvalState === 'already-decided') Object.assign(state.approvals[0], {
        status: 'approved', decision: 'approved', decidedBy: 'Fixture reviewer', decidedAt: state.clock
      });
    }
    const path = new URL(request.url).pathname;
    if (params.get('fixtureAnonymous') === '1' && path === '/api/v1/me') return forcedError('UNAUTHENTICATED', 401);
    if (request.method === 'GET' && matchesPath('fixtureForbiddenPath', path)) return forcedError('FORBIDDEN', 403);
    if (matchesPath('fixtureFailurePath', path)) {
      const count = nextRequest(`failure:${path}`);
      const failureOn = Number(params.get('fixtureFailureOn'));
      if (!failureOn || count === failureOn) return forcedError('FIXTURE_FORCED_FAILURE', 503);
    }
    if (matchesPath('fixtureDelayPath', path)) {
      const count = nextRequest(`delay:${path}`);
      const sequence = params.get('fixtureDelaySequence')?.split(',').map(Number);
      const delayMs = sequence ? sequence[count - 1] || 0 : Number(params.get('fixtureDelayMs') || 0);
      if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, Math.min(delayMs, 5000)));
    }
    if (request.method === 'GET' && matchesPath('fixtureEmptyPath', path)) return { status: 200, body: { items: [] } };
    const response = await routeFixtureRequest(request);
    if (request.method === 'GET' && path.endsWith('/roles') && params.get('fixtureRoles') === 'custom-reordered') {
      const body = response.body as { items: Array<Record<string, unknown>> };
      const byKey = new Map(body.items.map((role) => [role.key, role]));
      response.body = { items: [
        byKey.get('viewer'),
        { key: 'incident-reviewer', displayName: 'Incident reviewer', description: 'Custom read-only role', kind: 'custom', capabilities: ['read_workspace_data', 'read_members'], protected: false, sortOrder: 15 },
        byKey.get('owner'), byKey.get('admin')
      ] };
    }
    return response;
  };
}

let scenarioKey: string | undefined;
let scenarioRouter: ReturnType<typeof createFixtureScenarioRouter>;

export const fixtureHandlers = [
  http.all(/\/api\/v1\/.*/, async ({ request }) => {
    if (scenarioKey !== window.location.search) {
      scenarioKey = window.location.search;
      scenarioRouter = createFixtureScenarioRouter(new URLSearchParams(scenarioKey));
    }
    const response = await scenarioRouter(request);
    const headers = new Headers(response.headers);
    if (response.body === undefined) {
      return new Response(null, { status: response.status, headers });
    }
    if (headers.get('content-type') === 'text/event-stream') {
      return new Response(String(response.body), { status: response.status, headers });
    }
    headers.set('content-type', 'application/json');
    return new Response(JSON.stringify(response.body), { status: response.status, headers });
  })
];
