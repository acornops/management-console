import { getFixtureState } from './store';

interface FixtureResponse {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
}

interface CatalogRouteInput {
  request: Request;
  state: ReturnType<typeof getFixtureState>;
  path: string;
  method: string;
}

function json(body: unknown, status = 200): FixtureResponse {
  return { status, body, headers: { 'content-type': 'application/json' } };
}

function error(message: string, status: number): FixtureResponse {
  return json({ error: { code: 'FIXTURE_MODE_UNSUPPORTED', message } }, status);
}

async function bodyOf(request: Request): Promise<Record<string, any>> {
  try {
    const value = await request.json();
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, any>
      : {};
  } catch {
    return {};
  }
}

export async function routeCatalogFixtureRequest({
  request,
  state,
  path,
  method
}: CatalogRouteInput): Promise<FixtureResponse | null> {
  let match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/catalog\/sources$/);
  if (match) {
    if (method === 'GET') return json({ items: structuredClone(state.catalogSources), capabilities: { workspaceManagedSourcesEnabled: true, supportedNetworkRoutes: ['direct'] } });
    if (method === 'POST') {
      const input = await bodyOf(request);
      if (input.auth?.credential) return error('Catalog credentials are unavailable in frontend fixture mode.', 422);
      const source = { id: `fixture-source-${Math.random().toString(36).slice(2, 9)}`, workspaceId: decodeURIComponent(match[1]), displayName: input.displayName, baseUrl: input.baseUrl, authType: input.auth?.type || 'none', credentialConfigured: false, networkRoute: input.networkRoute || 'direct', enabled: input.enabled !== false, managementMode: 'workspace', bindings: [] };
      state.catalogSources.push(source);
      return json({ source }, 201);
    }
  }

  match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/catalog\/sources\/([^/]+)$/);
  if (match) {
    const source = state.catalogSources.find((item) => item.id === decodeURIComponent(match[2]));
    if (!source) return error('MCP registry not found.', 404);
    if (source.managementMode === 'bootstrap') return error('Deployment-managed MCP registries are configuration read-only.', 409);
    if (method === 'PATCH') {
      const input = await bodyOf(request);
      if (input.displayName !== undefined) source.displayName = input.displayName;
      if (input.baseUrl !== undefined) source.baseUrl = input.baseUrl;
      if (input.enabled !== undefined) source.enabled = input.enabled;
      if (input.auth?.type === 'none') {
        source.authType = 'none';
        source.credentialConfigured = false;
        delete source.authHeaderName;
      } else if (input.auth) {
        source.authType = input.auth.type;
        source.credentialConfigured = true;
        source.authHeaderName = input.auth.headerName;
      }
      return json({ source: structuredClone(source) });
    }
    if (method === 'DELETE') {
      state.catalogSources = state.catalogSources.filter((item) => item.id !== source.id);
      return { status: 204 };
    }
  }

  match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/catalog\/sources\/([^/]+)\/sync$/);
  if (match && method === 'POST') return json({ artifactCount: state.catalogArtifacts.length });
  match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/catalog\/artifacts$/);
  if (match && method === 'GET') return json({ items: structuredClone(state.catalogArtifacts) });
  return null;
}
