import { getFixtureState } from './store';

interface FixtureResponse {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
}

type FixtureState = ReturnType<typeof getFixtureState>;
type ScopeType = 'agent' | 'target';

function json(body: unknown, status = 200): FixtureResponse {
  return { status, body, headers: { 'content-type': 'application/json' } };
}

function connectionKey(scopeType: ScopeType, scopeId: string, serverId: string): string {
  return `${scopeType}:${scopeId}:${serverId}`;
}

function serverAuthType(server: Record<string, any>): 'bearer_token' | 'custom_header' {
  return (server.authType || server.auth_type) === 'custom_header' ? 'custom_header' : 'bearer_token';
}

export function personalConnection(
  state: FixtureState,
  scopeType: ScopeType,
  scopeId: string,
  server: Record<string, any>
): Record<string, any> {
  return state.mcpConnections[connectionKey(scopeType, scopeId, server.id)] || {
    serverId: server.id,
    status: 'missing',
    authType: serverAuthType(server),
    action: 'connect_mcp_server'
  };
}

function discoveredTool(scopeType: ScopeType, serverId: string): Record<string, any> {
  return scopeType === 'agent'
    ? {
        name: 'fixture_discovered_tool', serverId, alias: 'fixture_discovered_tool',
        description: 'Discovered after PAT verification.', capability: 'read', enabled: false,
        reviewState: 'pending', riskLevel: 'read_only', autoAllowed: false
      }
    : {
        name: 'fixture_discovered_tool', description: 'Discovered after PAT verification.',
        capability: 'read', version: '1.0.0', source: 'mcp', enabled: false,
        mcp_server_url: 'https://mcp.fixture.acornops.dev/manual', timeout_ms: 10000
      };
}

async function bodyOf(request: Request): Promise<Record<string, any>> {
  try {
    const value = await request.json();
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
  } catch {
    return {};
  }
}

export async function routeMcpParityConnection(input: {
  method: string;
  path: string;
  request: Request;
  state: FixtureState;
}): Promise<FixtureResponse | null> {
  const agentMatch = input.path.match(/^\/api\/v1\/workspaces\/([^/]+)\/agents\/([^/]+)\/mcp\/servers\/([^/]+)\/connection(?:\/(verify))?$/);
  const targetMatch = input.path.match(/^\/api\/v1\/workspaces\/([^/]+)\/targets\/([^/]+)\/mcp\/servers\/([^/]+)\/connection(?:\/(verify))?$/);
  const match = agentMatch || targetMatch;
  if (!match) return null;

  const scopeType: ScopeType = agentMatch ? 'agent' : 'target';
  const scopeId = decodeURIComponent(match[2]);
  const serverId = decodeURIComponent(match[3]);
  const server = scopeType === 'agent'
    ? input.state.agentMcpServers.find((candidate) => candidate.agentId === scopeId && candidate.id === serverId)
    : input.state.targetMcpServers.find((candidate) => candidate.target_id === scopeId && candidate.id === serverId);
  if (!server) {
    return json({ error: { code: 'FIXTURE_NOT_FOUND', message: `${scopeType === 'agent' ? 'Agent' : 'Target'} MCP server was not found in the frontend fixture store.` } }, 404);
  }

  const key = connectionKey(scopeType, scopeId, server.id);
  if (input.method === 'GET') return json({ connection: structuredClone(personalConnection(input.state, scopeType, scopeId, server)) });
  if (input.method === 'DELETE') {
    input.state.mcpConnections[key] = {
      ...personalConnection(input.state, scopeType, scopeId, server),
      status: 'missing',
      action: 'connect_mcp_server'
    };
    return { status: 204 };
  }

  let connected = true;
  if (input.method === 'PUT') {
    const body = await bodyOf(input.request);
    if (body.credential === 'fixture-rate-limit') {
      return {
        status: 429,
        body: { error: { code: 'MCP_PAT_RATE_LIMITED', message: 'Too many PAT attempts.' } },
        headers: { 'content-type': 'application/json', 'Retry-After': '2' }
      };
    }
    connected = body.credential !== 'fixture-invalid';
  } else if (input.method !== 'POST' || match[4] !== 'verify') {
    return null;
  }

  input.state.mcpConnections[key] = {
    serverId: server.id,
    status: connected ? 'connected' : 'error',
    authType: serverAuthType(server),
    action: connected ? undefined : 'verify_mcp_server'
  };
  if (connected && !server.tools.some((tool: Record<string, any>) => tool.name === 'fixture_discovered_tool')) {
    server.tools.push(discoveredTool(scopeType, server.id));
  }
  return json({ connection: structuredClone(input.state.mcpConnections[key]) });
}
