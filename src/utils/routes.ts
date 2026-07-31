export type ClusterSubview = 'overview' | 'resources' | 'mcpServers' | 'skills' | 'tools' | 'health' | 'chat' | 'settings';
export type VmSubview = 'overview' | 'resources' | 'services' | 'processes' | 'network' | 'logs' | 'mcpServers' | 'skills' | 'tools' | 'chat' | 'settings';
export type AgentSubview = 'chat' | 'mcpServers' | 'skills' | 'tools' | 'settings';
export type ClusterCatalogStatusFilter = 'all' | 'attention' | 'healthy' | 'not_installed';
export type VmCatalogStatusFilter = ClusterCatalogStatusFilter;
export type McpCatalogCompatibility = 'all' | 'compatible' | 'incompatible';
export type WorkflowActivityStateFilter = 'all' | 'open' | 'attention' | 'completed' | 'failed' | 'cancelled';
export type WorkflowActivityOriginFilter = 'manual' | 'external_integration' | 'schedule' | 'webhook';
export type WorkflowSection = 'all' | 'schedules' | 'incomingWebhooks';

export interface WorkflowActivityRouteState {
  q?: string;
  state?: WorkflowActivityStateFilter;
  origin?: WorkflowActivityOriginFilter;
  workflowId?: string;
  issueId?: string;
}

export interface McpCatalogRouteState {
  q?: string;
  source?: string;
  compatibility?: McpCatalogCompatibility;
  artifact?: string;
  destination?: string;
}

export interface ClusterCatalogRouteState {
  q?: string;
  status?: ClusterCatalogStatusFilter;
}

export interface ClusterCatalogReturnState {
  q?: string;
  status?: ClusterCatalogStatusFilter;
}

export type VmCatalogRouteState = ClusterCatalogRouteState;
export type VmCatalogReturnState = ClusterCatalogReturnState;

export type AppRoute =
  | { kind: 'home' }
  | { kind: 'workspaces' }
  | ({ kind: 'kubernetesClusters' } & ClusterCatalogRouteState)
  | { kind: 'accountSettings' }
  | { kind: 'help' }
  | { kind: 'externalIntegrationLink'; token?: string; status?: 'linked' | 'expired' | 'cancelled' }
  | { kind: 'workspaceOverview'; workspaceId: string }
  | { kind: 'workspaceAgents'; workspaceId: string }
  | { kind: 'workspaceAgentDetail'; workspaceId: string; agentId: string; tab: AgentSubview }
  | ({ kind: 'workspaceCatalog'; workspaceId: string } & McpCatalogRouteState)
  | {
      kind: 'workspaceWorkflows';
      workspaceId: string;
      section: WorkflowSection;
      create?: boolean;
      createWorkflowId?: string;
    }
  | ({ kind: 'workspaceActivity'; workspaceId: string } & WorkflowActivityRouteState)
  | { kind: 'workspaceRedirect'; workspaceId: string; target: string }
  | { kind: 'workspaceApprovals'; workspaceId: string; runId?: string; approvalId?: string }
  | { kind: 'workspaceMembers'; workspaceId: string }
  | { kind: 'workspaceAiSettings'; workspaceId: string; returnTo?: string }
  | { kind: 'workspaceSettings'; workspaceId: string }
  | { kind: 'workspaceWebhooks'; workspaceId: string }
  | { kind: 'workspaceAuditLog'; workspaceId: string }
  | ({ kind: 'workspaceKubernetesClusters'; workspaceId: string } & ClusterCatalogRouteState)
  | ({ kind: 'workspaceVirtualMachines'; workspaceId: string } & VmCatalogRouteState)
  | { kind: 'workspaceVirtualMachineDetail'; workspaceId: string; vmId: string; tab?: VmSubview; catalogState?: VmCatalogReturnState }
  | { kind: 'workspaceInvitation'; token: string }
  | { kind: 'kubernetesClusterDiagnostics'; clusterId: string; tab?: ClusterSubview; catalogState?: ClusterCatalogReturnState }
  | { kind: 'workspaceKubernetesClusterDiagnostics'; workspaceId: string; clusterId: string; tab?: ClusterSubview; catalogState?: ClusterCatalogReturnState }
  | { kind: 'notFound'; path: string };

function parseClusterSubview(value?: string): ClusterSubview | undefined {
  if (!value) return undefined;
  if (value === 'mcp-servers') return 'mcpServers';
  if (value === 'skills') return 'skills';
  if (value === 'tools') return 'tools';
  if (
    value === 'overview' ||
    value === 'resources' ||
    value === 'health' ||
    value === 'chat' ||
    value === 'settings'
  ) {
    return value;
  }
  return undefined;
}

function parseAgentSubview(value?: string): AgentSubview {
  if (value === 'mcp-servers') return 'mcpServers';
  if (value === 'chat' || value === 'skills' || value === 'tools' || value === 'settings') return value;
  return 'chat';
}

function agentSubviewPathSegment(tab: AgentSubview): string {
  return tab === 'mcpServers' ? 'mcp-servers' : tab;
}

function clusterSubviewPathSegment(tab: ClusterSubview): string {
  if (tab === 'mcpServers') return 'mcp-servers';
  return tab;
}

function parseVmSubview(value?: string): VmSubview | undefined {
  if (!value) return undefined;
  if (value === 'mcp-servers') return 'mcpServers';
  if (value === 'skills') return 'skills';
  if (value === 'tools') return 'tools';
  if (
    value === 'overview' ||
    value === 'resources' ||
    value === 'services' ||
    value === 'processes' ||
    value === 'network' ||
    value === 'logs' ||
    value === 'chat' ||
    value === 'settings'
  ) {
    return value;
  }
  return undefined;
}

function vmSubviewPathSegment(tab: VmSubview): string {
  if (tab === 'mcpServers') return 'mcp-servers';
  return tab;
}

function decodeParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function splitRoutePath(path: string): { pathname: string; params: URLSearchParams } {
  const queryIndex = path.indexOf('?');
  if (queryIndex === -1) return { pathname: path, params: new URLSearchParams() };
  return {
    pathname: path.slice(0, queryIndex) || '/',
    params: new URLSearchParams(path.slice(queryIndex + 1))
  };
}

function parseExternalIntegrationLinkStatus(value: string | null): 'linked' | 'expired' | 'cancelled' | undefined {
  if (value === 'linked' || value === 'expired' || value === 'cancelled') return value;
  return undefined;
}

function parseClusterCatalogStatus(value: string | null): ClusterCatalogStatusFilter | undefined {
  if (
    value === 'all' ||
    value === 'attention' ||
    value === 'healthy' ||
    value === 'not_installed'
  ) {
    return value;
  }
  // Preserve useful intent for links created before operational filters replaced agent-state filters.
  if (value === 'connected') return 'healthy';
  if (value === 'disconnected') return 'attention';
  return undefined;
}

function cleanQueryParam(value: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function parseWorkflowActivityRouteState(params: URLSearchParams): WorkflowActivityRouteState {
  const stateValue = params.get('state');
  const state = stateValue === 'open' || stateValue === 'attention' || stateValue === 'completed'
    || stateValue === 'failed' || stateValue === 'cancelled' || stateValue === 'all'
    ? stateValue
    : undefined;
  const originValue = params.get('origin');
  const origin = originValue === 'manual' || originValue === 'external_integration'
    || originValue === 'schedule' || originValue === 'webhook'
    ? originValue
    : undefined;
  return {
    ...(cleanQueryParam(params.get('q')) ? { q: cleanQueryParam(params.get('q')) } : {}),
    ...(state ? { state } : {}),
    ...(origin ? { origin } : {}),
    ...(cleanQueryParam(params.get('workflow')) ? { workflowId: cleanQueryParam(params.get('workflow')) } : {}),
    ...(cleanQueryParam(params.get('issue')) ? { issueId: cleanQueryParam(params.get('issue')) } : {})
  };
}

function withWorkflowActivityRouteState(path: string, state?: WorkflowActivityRouteState): string {
  const params = new URLSearchParams();
  if (state?.q?.trim()) params.set('q', state.q.trim());
  if (state?.state && state.state !== 'all') params.set('state', state.state);
  if (state?.origin) params.set('origin', state.origin);
  if (state?.workflowId) params.set('workflow', state.workflowId);
  if (state?.issueId) params.set('issue', state.issueId);
  return appendQuery(path, params);
}

function parseMcpCatalogRouteState(params: URLSearchParams): McpCatalogRouteState {
  const compatibilityValue = params.get('compatibility');
  const compatibility = compatibilityValue === 'compatible' || compatibilityValue === 'incompatible' || compatibilityValue === 'all'
    ? compatibilityValue
    : undefined;
  const destination = cleanQueryParam(params.get('destination'));
  return {
    ...(cleanQueryParam(params.get('q')) ? { q: cleanQueryParam(params.get('q')) } : {}),
    ...(cleanQueryParam(params.get('source')) ? { source: cleanQueryParam(params.get('source')) } : {}),
    ...(compatibility ? { compatibility } : {}),
    ...(cleanQueryParam(params.get('artifact')) ? { artifact: cleanQueryParam(params.get('artifact')) } : {}),
    ...(destination && /^(agent|target):.+/.test(destination) ? { destination } : {})
  };
}

function withMcpCatalogRouteState(path: string, state?: McpCatalogRouteState): string {
  const params = new URLSearchParams();
  if (state?.q?.trim()) params.set('q', state.q.trim());
  if (state?.source?.trim()) params.set('source', state.source.trim());
  if (state?.compatibility && state.compatibility !== 'all') params.set('compatibility', state.compatibility);
  if (state?.artifact?.trim()) params.set('artifact', state.artifact.trim());
  if (state?.destination?.trim()) params.set('destination', state.destination.trim());
  return appendQuery(path, params);
}

function parseClusterCatalogRouteState(params: URLSearchParams): ClusterCatalogRouteState {
  const q = cleanQueryParam(params.get('q'));
  const status = parseClusterCatalogStatus(params.get('status'));
  return {
    ...(q ? { q } : {}),
    ...(status ? { status } : {})
  };
}

function parseClusterCatalogReturnState(params: URLSearchParams): ClusterCatalogReturnState | undefined {
  const state = {
    q: cleanQueryParam(params.get('catalogQ')),
    status: parseClusterCatalogStatus(params.get('catalogStatus'))
  };
  return state.q || state.status ? state : undefined;
}

function appendQuery(path: string, params: URLSearchParams): string {
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export function validateAssistantReturnTo(value: string | null | undefined, workspaceId: string): string | undefined {
  const candidate = value?.trim();
  if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//')) return undefined;
  if (candidate.includes('\\') || candidate.includes('#') || /[\u0000-\u001f\u007f]/.test(candidate)) return undefined;

  try {
    decodeURIComponent(candidate);
  } catch {
    return undefined;
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate, 'https://console.acornops.invalid');
  } catch {
    return undefined;
  }
  if (parsed.origin !== 'https://console.acornops.invalid') return undefined;

  const normalized = `${parsed.pathname}${parsed.search}`;
  if (normalized !== candidate) return undefined;
  const assistantPathMatches = [
    parsed.pathname.match(/^\/workspaces\/([^/]+)\/kubernetes-clusters\/([^/]+)\/chat$/),
    parsed.pathname.match(/^\/workspaces\/([^/]+)\/virtual-machines\/([^/]+)\/chat$/)
  ];
  const match = assistantPathMatches.find((candidateMatch) => candidateMatch !== null);
  if (!match || decodeParam(match[1]) !== workspaceId) return undefined;
  return normalized;
}

export function withAssistantSession(path: string, sessionId?: string | null): string {
  if (!sessionId?.trim()) return path;
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}session=${encodeURIComponent(sessionId.trim())}`;
}

export function assistantSessionFromLocation(
  location: Pick<Location, 'hash' | 'search'>
): string | null {
  const params = location.hash.startsWith('#/')
    ? new URL(location.hash.slice(1), 'https://console.acornops.invalid').searchParams
    : new URLSearchParams(location.search);
  const sessionId = params.get('session')?.trim();
  return sessionId || null;
}

export function getCurrentAppPath(): string {
  if (typeof window === 'undefined') return '/';
  if (window.location.hash.startsWith('#/')) return window.location.hash.slice(1) || '/';

  const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');
  const pathname = baseUrl && baseUrl !== '/' && window.location.pathname.startsWith(baseUrl)
    ? window.location.pathname.slice(baseUrl.length) || '/'
    : window.location.pathname || '/';
  return `${pathname}${window.location.search}`;
}

function withClusterCatalogRouteState(path: string, state?: ClusterCatalogRouteState): string {
  const params = new URLSearchParams();
  if (state?.q?.trim()) params.set('q', state.q.trim());
  if (state?.status && state.status !== 'all') params.set('status', state.status);
  return appendQuery(path, params);
}

function withClusterCatalogReturnState(path: string, state?: ClusterCatalogReturnState): string {
  const params = new URLSearchParams();
  if (state?.q?.trim()) params.set('catalogQ', state.q.trim());
  if (state?.status && state.status !== 'all') params.set('catalogStatus', state.status);
  return appendQuery(path, params);
}

/**
 * Parses a management console route path into a typed route union.
 */
export function parseAppRoute(path: string): AppRoute {
  const { pathname, params } = splitRoutePath(path);

  if (pathname === '/') return { kind: 'home' };
  if (pathname === '/workspaces') return { kind: 'workspaces' };
  if (pathname === '/kubernetes-clusters') return { kind: 'kubernetesClusters', ...parseClusterCatalogRouteState(params) };
  if (pathname === '/account') return { kind: 'accountSettings' };
  if (pathname === '/help') return { kind: 'help' };
  if (pathname === '/integrations/external/link') {
    return {
      kind: 'externalIntegrationLink',
      token: params.get('token') || undefined,
      status: parseExternalIntegrationLinkStatus(params.get('status'))
    };
  }

  const inviteMatch = pathname.match(/^\/invites\/([^/]+)$/);
  if (inviteMatch) {
    return { kind: 'workspaceInvitation', token: decodeParam(inviteMatch[1]) };
  }

  const workspaceWorkflowMatch = pathname.match(
    /^\/workspaces\/([^/]+)\/workflows(?:\/(schedules|incoming-webhooks))?$/
  );
  if (workspaceWorkflowMatch) {
    const workspaceId = decodeParam(workspaceWorkflowMatch[1]);
    const section: WorkflowSection = workspaceWorkflowMatch[2] === 'schedules'
      ? 'schedules'
      : workspaceWorkflowMatch[2] === 'incoming-webhooks'
        ? 'incomingWebhooks'
        : 'all';
    const createValue = params.get('create');
    const create = section === 'schedules'
      ? createValue === 'schedule'
      : section === 'incomingWebhooks' && createValue === 'webhook';
    const createWorkflowId = create
      ? cleanQueryParam(params.get('workflowId'))
      : undefined;
    return {
      kind: 'workspaceWorkflows',
      workspaceId,
      section,
      ...(create ? { create: true } : {}),
      ...(createWorkflowId ? { createWorkflowId } : {})
    };
  }

  const legacyAutomationMatch = pathname.match(
    /^\/workspaces\/([^/]+)\/(runs|triggers|schedules|event-triggers)$/
  );
  if (legacyAutomationMatch) {
    const workspaceId = decodeParam(legacyAutomationMatch[1]);
    const legacySection = legacyAutomationMatch[2];
    if (legacySection === 'runs') {
      return {
        kind: 'workspaceRedirect',
        workspaceId,
        target: AppPaths.workspaceActivity(workspaceId, parseWorkflowActivityRouteState(params))
      };
    }
    const incomingWebhook = legacySection === 'event-triggers'
      || (legacySection === 'triggers' && (
        params.get('type') === 'webhook'
        || params.get('type') === 'acornops_event'
        || params.get('create') === 'webhook'
        || params.get('create') === 'acornops_event'
      ));
    const section: WorkflowSection = incomingWebhook ? 'incomingWebhooks' : 'schedules';
    const create = incomingWebhook
      ? params.get('create') === 'webhook'
      : params.get('create') === 'schedule';
    const target = AppPaths.workspaceWorkflows(workspaceId, section, {
      ...(create ? { create: true } : {}),
      ...(cleanQueryParam(params.get('workflowId'))
        ? { workflowId: cleanQueryParam(params.get('workflowId')) }
        : {})
    });
    return { kind: 'workspaceRedirect', workspaceId, target };
  }

  const workspaceSectionMatch = pathname.match(/^\/workspaces\/([^/]+)\/(overview|agents|catalog|activity|approvals|members|ai-settings|webhooks|settings|audit-log)$/);
  if (workspaceSectionMatch) {
    const workspaceId = decodeParam(workspaceSectionMatch[1]);
    const section = workspaceSectionMatch[2];
    if (section === 'overview') return { kind: 'workspaceOverview', workspaceId };
    if (section === 'agents') return { kind: 'workspaceAgents', workspaceId };
    if (section === 'catalog') return { kind: 'workspaceCatalog', workspaceId, ...parseMcpCatalogRouteState(params) };
    if (section === 'activity') return { kind: 'workspaceActivity', workspaceId, ...parseWorkflowActivityRouteState(params) };
    if (section === 'approvals') {
      const runId = params.get('runId') || undefined;
      const approvalId = params.get('approvalId') || undefined;
      return {
        kind: 'workspaceApprovals',
        workspaceId,
        ...(runId ? { runId } : {}),
        ...(approvalId ? { approvalId } : {})
      };
    }
    if (section === 'ai-settings') {
      const returnTo = validateAssistantReturnTo(params.get('returnTo'), workspaceId);
      return { kind: 'workspaceAiSettings', workspaceId, ...(returnTo ? { returnTo } : {}) };
    }
    if (section === 'settings') return { kind: 'workspaceSettings', workspaceId };
    if (section === 'webhooks') return { kind: 'workspaceWebhooks', workspaceId };
    if (section === 'audit-log') return { kind: 'workspaceAuditLog', workspaceId };
    return { kind: 'workspaceMembers', workspaceId };
  }

  const workspaceAgentDetailMatch = pathname.match(
    /^\/workspaces\/([^/]+)\/agents\/([^/]+)(?:\/(chat|mcp-servers|skills|tools|settings))?$/
  );
  if (workspaceAgentDetailMatch) {
    return {
      kind: 'workspaceAgentDetail',
      workspaceId: decodeParam(workspaceAgentDetailMatch[1]),
      agentId: decodeParam(workspaceAgentDetailMatch[2]),
      tab: parseAgentSubview(workspaceAgentDetailMatch[3])
    };
  }

  const workspaceKubernetesClustersMatch = pathname.match(/^\/workspaces\/([^/]+)\/kubernetes-clusters$/);
  if (workspaceKubernetesClustersMatch) {
    return {
      kind: 'workspaceKubernetesClusters',
      workspaceId: decodeParam(workspaceKubernetesClustersMatch[1]),
      ...parseClusterCatalogRouteState(params)
    };
  }

  const workspaceVirtualMachinesMatch = pathname.match(/^\/workspaces\/([^/]+)\/virtual-machines$/);
  if (workspaceVirtualMachinesMatch) {
    return {
      kind: 'workspaceVirtualMachines',
      workspaceId: decodeParam(workspaceVirtualMachinesMatch[1]),
      ...parseClusterCatalogRouteState(params)
    };
  }

  const workspaceVirtualMachineDetailMatch = pathname.match(
    /^\/workspaces\/([^/]+)\/virtual-machines\/([^/]+)(?:\/(overview|resources|services|processes|network|logs|mcp-servers|skills|tools|chat|settings))?$/
  );
  if (workspaceVirtualMachineDetailMatch) {
    const catalogState = parseClusterCatalogReturnState(params);
    return {
      kind: 'workspaceVirtualMachineDetail',
      workspaceId: decodeParam(workspaceVirtualMachineDetailMatch[1]),
      vmId: decodeParam(workspaceVirtualMachineDetailMatch[2]),
      tab: parseVmSubview(workspaceVirtualMachineDetailMatch[3]),
      ...(catalogState ? { catalogState } : {})
    };
  }

  const workspaceKubernetesClusterDiagnosticsMatch = pathname.match(
    /^\/workspaces\/([^/]+)\/kubernetes-clusters\/([^/]+)(?:\/(overview|resources|mcp-servers|skills|tools|health|chat|settings))?$/
  );
  if (workspaceKubernetesClusterDiagnosticsMatch) {
    const catalogState = parseClusterCatalogReturnState(params);
    return {
      kind: 'workspaceKubernetesClusterDiagnostics',
      workspaceId: decodeParam(workspaceKubernetesClusterDiagnosticsMatch[1]),
      clusterId: decodeParam(workspaceKubernetesClusterDiagnosticsMatch[2]),
      tab: parseClusterSubview(workspaceKubernetesClusterDiagnosticsMatch[3]),
      ...(catalogState ? { catalogState } : {})
    };
  }

  const kubernetesClusterDiagnosticsMatch = pathname.match(/^\/kubernetes-clusters\/([^/]+)(?:\/(overview|resources|mcp-servers|skills|tools|health|chat|settings))?$/);
  if (kubernetesClusterDiagnosticsMatch) {
    const catalogState = parseClusterCatalogReturnState(params);
    return {
      kind: 'kubernetesClusterDiagnostics',
      clusterId: decodeParam(kubernetesClusterDiagnosticsMatch[1]),
      tab: parseClusterSubview(kubernetesClusterDiagnosticsMatch[2]),
      ...(catalogState ? { catalogState } : {})
    };
  }

  return { kind: 'notFound', path: pathname };
}

export const AppPaths = {
  externalIntegrationLink: (token: string): string => `/integrations/external/link?token=${encodeURIComponent(token)}`,
  externalIntegrationLinkStatus: (status: 'linked' | 'expired' | 'cancelled'): string => `/integrations/external/link?status=${status}`,
  workspaceInvitation: (token: string): string => `/invites/${encodeURIComponent(token)}`,
  workspaceInvitationShareUrl: (token: string): string => {
    const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');
    const basePath = baseUrl && baseUrl !== '/' ? baseUrl : '';
    return `${window.location.origin}${basePath}/#/invites/${encodeURIComponent(token)}`;
  },
  workspaces: (): string => '/workspaces',
  kubernetesClusters: (state?: ClusterCatalogRouteState): string => withClusterCatalogRouteState('/kubernetes-clusters', state),
  accountSettings: (): string => '/account',
  help: (): string => '/help',
  workspaceOverview: (workspaceId: string): string => `/workspaces/${encodeURIComponent(workspaceId)}/overview`,
  workspaceAgents: (workspaceId: string): string =>
    `/workspaces/${encodeURIComponent(workspaceId)}/agents`,
  workspaceAgentDetail: (workspaceId: string, agentId: string, tab: AgentSubview = 'chat'): string =>
    `/workspaces/${encodeURIComponent(workspaceId)}/agents/${encodeURIComponent(agentId)}/${agentSubviewPathSegment(tab)}`,
  workspaceAgentMcp: (workspaceId: string, agentId: string, action?: 'connect_by_url'): string => {
    const params = new URLSearchParams();
    if (action) params.set('mcpAction', action);
    return appendQuery(AppPaths.workspaceAgentDetail(workspaceId, agentId, 'mcpServers'), params);
  },
  workspaceCatalog: (workspaceId: string, state?: McpCatalogRouteState): string =>
    withMcpCatalogRouteState(`/workspaces/${encodeURIComponent(workspaceId)}/catalog`, state),
  workspaceWorkflows: (
    workspaceId: string,
    section: WorkflowSection = 'all',
    create?: { create?: boolean; workflowId?: string }
  ): string => {
    const base = `/workspaces/${encodeURIComponent(workspaceId)}/workflows`;
    const path = section === 'schedules'
      ? `${base}/schedules`
      : section === 'incomingWebhooks'
        ? `${base}/incoming-webhooks`
        : base;
    if (!create?.create || section === 'all') return path;
    const params = new URLSearchParams({
      create: section === 'schedules' ? 'schedule' : 'webhook'
    });
    if (create.workflowId) params.set('workflowId', create.workflowId);
    return appendQuery(path, params);
  },
  workspaceWorkflowRun: (workspaceId: string, workflowId: string, executionId: string): string => {
    const params = new URLSearchParams({
      workflow: workflowId,
      tab: 'runs',
      execution: executionId
    });
    return appendQuery(`/workspaces/${encodeURIComponent(workspaceId)}/workflows`, params);
  },
  workspaceActivity: (workspaceId: string, state?: WorkflowActivityRouteState): string =>
    withWorkflowActivityRouteState(`/workspaces/${encodeURIComponent(workspaceId)}/activity`, state),
  workspaceScheduleCreate: (workspaceId: string, workflowId: string): string =>
    AppPaths.workspaceWorkflows(workspaceId, 'schedules', { create: true, workflowId }),
  workspaceWebhookCreate: (workspaceId: string, workflowId?: string): string =>
    AppPaths.workspaceWorkflows(workspaceId, 'incomingWebhooks', { create: true, workflowId }),
  workspaceApprovals: (workspaceId: string, focus?: { runId?: string; approvalId?: string }): string => {
    const params = new URLSearchParams();
    if (focus?.runId) params.set('runId', focus.runId);
    if (focus?.approvalId) params.set('approvalId', focus.approvalId);
    const query = params.toString();
    return `/workspaces/${encodeURIComponent(workspaceId)}/approvals${query ? `?${query}` : ''}`;
  },
  workspaceMembers: (workspaceId: string): string => `/workspaces/${encodeURIComponent(workspaceId)}/members`,
  workspaceAiSettings: (workspaceId: string, returnTo?: string): string => {
    const base = `/workspaces/${encodeURIComponent(workspaceId)}/ai-settings`;
    const validReturnTo = validateAssistantReturnTo(returnTo, workspaceId);
    if (!validReturnTo) return base;
    return appendQuery(base, new URLSearchParams({ returnTo: validReturnTo }));
  },
  workspaceSettings: (workspaceId: string): string => `/workspaces/${encodeURIComponent(workspaceId)}/settings`,
  workspaceWebhooks: (workspaceId: string): string => `/workspaces/${encodeURIComponent(workspaceId)}/webhooks`,
  workspaceMcpRegistries: (workspaceId: string): string =>
    `/workspaces/${encodeURIComponent(workspaceId)}/settings?section=mcp-registries`,
  workspaceAuditLog: (workspaceId: string): string => `/workspaces/${encodeURIComponent(workspaceId)}/audit-log`,
  workspaceKubernetesClusters: (workspaceId: string, state?: ClusterCatalogRouteState): string =>
    withClusterCatalogRouteState(`/workspaces/${encodeURIComponent(workspaceId)}/kubernetes-clusters`, state),
  workspaceVirtualMachines: (workspaceId: string, state?: VmCatalogRouteState): string =>
    withClusterCatalogRouteState(`/workspaces/${encodeURIComponent(workspaceId)}/virtual-machines`, state),
  workspaceVirtualMachineDetail: (workspaceId: string, vmId: string, tab?: VmSubview, catalogState?: VmCatalogReturnState): string => {
    const base = `/workspaces/${encodeURIComponent(workspaceId)}/virtual-machines/${encodeURIComponent(vmId)}`;
    return withClusterCatalogReturnState(tab ? `${base}/${vmSubviewPathSegment(tab)}` : base, catalogState);
  },
  workspaceTargetMcp: (
    workspaceId: string,
    targetId: string,
    targetType: 'kubernetes' | 'virtual_machine',
    action?: 'connect_by_url'
  ): string => {
    const base = targetType === 'kubernetes'
      ? `/workspaces/${encodeURIComponent(workspaceId)}/kubernetes-clusters/${encodeURIComponent(targetId)}/mcp-servers`
      : `/workspaces/${encodeURIComponent(workspaceId)}/virtual-machines/${encodeURIComponent(targetId)}/mcp-servers`;
    const params = new URLSearchParams();
    if (action) params.set('mcpAction', action);
    return appendQuery(base, params);
  },
  kubernetesClusterDiagnostics: (clusterId: string, tab?: ClusterSubview, catalogState?: ClusterCatalogReturnState): string => {
    const base = `/kubernetes-clusters/${encodeURIComponent(clusterId)}`;
    return withClusterCatalogReturnState(tab ? `${base}/${clusterSubviewPathSegment(tab)}` : base, catalogState);
  },
  workspaceKubernetesClusterDiagnostics: (workspaceId: string, clusterId: string, tab?: ClusterSubview, catalogState?: ClusterCatalogReturnState): string => {
    const base = `/workspaces/${encodeURIComponent(workspaceId)}/kubernetes-clusters/${encodeURIComponent(clusterId)}`;
    return withClusterCatalogReturnState(tab ? `${base}/${clusterSubviewPathSegment(tab)}` : base, catalogState);
  }
};
