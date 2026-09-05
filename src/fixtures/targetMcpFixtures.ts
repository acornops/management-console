import { FIXTURE_IDS, getFixtureState } from './store';
import { fixtureTargetType } from './targetFixtureRoutes';

export function fixtureCursorPage<T>(
  items: T[],
  url: URL,
  scope: string,
  defaultLimit = 50
): { items: T[]; nextCursor?: string } {
  const requestedLimit = Number(url.searchParams.get('limit'));
  const limit = Number.isInteger(requestedLimit) && requestedLimit > 0
    ? Math.min(requestedLimit, 100)
    : defaultLimit;
  const cursorPrefix = `fixture:${scope}:`;
  const cursor = url.searchParams.get('cursor');
  const requestedOffset = cursor?.startsWith(cursorPrefix)
    ? Number(cursor.slice(cursorPrefix.length))
    : 0;
  const offset = Number.isInteger(requestedOffset) && requestedOffset >= 0
    ? requestedOffset
    : 0;
  const pageItems = items.slice(offset, offset + limit);
  const nextOffset = offset + pageItems.length;
  return {
    items: pageItems,
    ...(nextOffset < items.length ? { nextCursor: `${cursorPrefix}${nextOffset}` } : {})
  };
}

export function targetMcpCatalogFixture(
  state: ReturnType<typeof getFixtureState>,
  targetId: string,
  url: URL
) {
  const servers = state.targetMcpServers
    .filter((server) => server.target_id === targetId)
    .map((server) => {
      const isSystem = server.server_url.startsWith('builtin:');
      const inherited = server.inherited === true;
      return {
        id: server.id,
        name: server.server_name,
        url: server.server_url,
        type: isSystem ? 'builtin' : 'mcp',
        enabled: server.enabled,
        isSystem,
        canDelete: !isSystem && !inherited,
        canEditConnection: !isSystem && !inherited,
        canToggle: !inherited,
        authType: server.auth_type,
        credentialMode: server.credential_mode,
        authHeaderName: server.auth_header_name,
        authHeaderPrefix: server.auth_header_prefix,
        revision: server.revision,
        publicHeaders: server.public_headers || {},
        credentialTransitioning: server.credential_transitioning === true,
        connectionStatus: server.connection_status,
        lastDiscoveryAt: server.last_discovery_at,
        lastDiscoveryError: server.last_discovery_error,
        inherited,
        toolCounts: { total: server.tools.length, readOnly: server.tools.filter((tool: Record<string, any>) => tool.capability === 'read').length, writeCapable: server.tools.filter((tool: Record<string, any>) => tool.capability === 'write').length, enabledConfigured: server.tools.filter((tool: Record<string, any>) => tool.enabled).length, enabledEffective: server.tools.filter((tool: Record<string, any>) => tool.enabled).length, writeConfigured: server.tools.filter((tool: Record<string, any>) => tool.capability === 'write' && tool.enabled).length, writeEffective: server.tools.filter((tool: Record<string, any>) => tool.capability === 'write' && tool.enabled).length },
        tools: server.tools.map((tool: Record<string, any>) => ({ name: tool.name, description: tool.description, capability: tool.capability, version: tool.version, source: tool.source, enabledConfigured: tool.enabled, enabledEffective: tool.enabled, effectiveDisabledReason: null }))
      };
    });
  const page = fixtureCursorPage(servers, url, `target-mcp-catalog:${targetId}`);
  return { workspaceId: FIXTURE_IDS.workspace, clusterId: targetId === FIXTURE_IDS.cluster ? targetId : undefined, targetId, targetType: fixtureTargetType(state, targetId), permissions: { canEdit: true, editableRoles: ['owner', 'admin'] }, servers: page.items, nextCursor: page.nextCursor };
}
