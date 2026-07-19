import { FIXTURE_IDS, getFixtureState, resetFixtureStore } from './store';
import { routeAutomationTemplateFixtureRequest } from './automationTemplateRoutes';
import { routeCatalogFixtureRequest } from './catalogRoutes';
import { personalConnection, routeMcpParityConnection } from './mcpParity';
import { targetSummary, targetToolCatalog, workflowOptions } from './presenters';
import { workflowCapabilityPreview } from './workflowCapabilityPreview';

export interface FixtureResponse {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
}

const NOW = '2026-07-15T08:30:00.000Z';

function json(body: unknown, status = 200): FixtureResponse {
  return { status, body, headers: { 'content-type': 'application/json' } };
}

function noContent(): FixtureResponse {
  return { status: 204 };
}

function fixtureError(message: string, status = 422, code = 'FIXTURE_MODE_UNSUPPORTED'): FixtureResponse {
  return json({ error: { code, message } }, status);
}

function notFound(resource: string): FixtureResponse {
  return json({ error: { code: 'FIXTURE_NOT_FOUND', message: `${resource} was not found in the frontend fixture store.` } }, 404);
}

function decode(value: string): string {
  return decodeURIComponent(value);
}

async function bodyOf(request: Request): Promise<Record<string, any>> {
  try {
    const value = await request.json();
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
  } catch {
    return {};
  }
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function id(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function targetSkillCatalog(state: ReturnType<typeof getFixtureState>, targetId: string) {
  const targetType = targetId === FIXTURE_IDS.virtualMachine ? 'virtual_machine' : 'kubernetes';
  return {
    workspaceId: FIXTURE_IDS.workspace,
    targetId,
    targetType,
    clusterId: targetType === 'kubernetes' ? targetId : undefined,
    permissions: { canEdit: true, editableRoles: ['owner', 'admin'] },
    items: state.targetSkills.map((skill) => ({
      ...skill,
      id: skill.id,
      workspaceId: FIXTURE_IDS.workspace,
      targetId,
      targetType,
      validationStatus: 'valid',
      validationErrors: [],
      bundleStats: { fileCount: skill.files.length, totalBytes: skill.files.reduce((total: number, file: Record<string, any>) => total + file.content.length, 0) },
      source: { ...skill.source, type: skill.source.type === 'git' ? 'git_import' : 'manual', syncStatus: 'not_applicable' },
      createdAt: '2026-07-15T07:45:00.000Z',
      updatedAt: NOW,
      files: skill.files.map((file: Record<string, any>) => ({ ...file, sizeBytes: file.content.length }))
    }))
  };
}

function mcpCatalog(state: ReturnType<typeof getFixtureState>, targetId: string) {
  const servers = state.targetMcpServers
    .filter((server) => server.target_id === FIXTURE_IDS.cluster || targetId === FIXTURE_IDS.virtualMachine)
    .map((server) => ({
      id: server.id,
      name: server.server_name,
      url: server.server_url,
      type: server.server_url.startsWith('builtin:') ? 'builtin' : 'mcp',
      enabled: server.enabled,
      isSystem: server.server_url.startsWith('builtin:'),
      canDelete: !server.server_url.startsWith('builtin:'),
      canEditConnection: !server.server_url.startsWith('builtin:'),
      canToggle: true,
      authType: server.auth_type,
      authScope: server.auth_scope,
      connectionStatus: server.connection_status,
      lastDiscoveryAt: server.last_discovery_at,
      lastDiscoveryError: server.last_discovery_error,
      toolCounts: { total: server.tools.length, enabledConfigured: server.tools.filter((tool: Record<string, any>) => tool.enabled).length, enabledEffective: server.tools.filter((tool: Record<string, any>) => tool.enabled).length, writeConfigured: server.tools.filter((tool: Record<string, any>) => tool.capability === 'write' && tool.enabled).length, writeEffective: server.tools.filter((tool: Record<string, any>) => tool.capability === 'write' && tool.enabled).length },
      tools: server.tools.map((tool: Record<string, any>) => ({ name: tool.name, description: tool.description, capability: tool.capability, version: tool.version, source: tool.source, enabledConfigured: tool.enabled, enabledEffective: tool.enabled, effectiveDisabledReason: null }))
    }));
  return { workspaceId: FIXTURE_IDS.workspace, clusterId: targetId === FIXTURE_IDS.cluster ? targetId : undefined, targetId, targetType: targetId === FIXTURE_IDS.virtualMachine ? 'virtual_machine' : 'kubernetes', permissions: { canEdit: true, editableRoles: ['owner', 'admin'] }, servers };
}

export async function routeFixtureRequest(request: Request): Promise<FixtureResponse> {
  const state = getFixtureState();
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, '') || '/';
  const method = request.method.toUpperCase();
  const mcpParityMode = request.headers.get('x-acornops-fixture-mode') === 'mcp-parity';

  if (!path.startsWith('/api/v1/')) {
    return fixtureError(`Fixture mode blocked an unexpected request to ${path}.`, 501, 'FIXTURE_ROUTE_UNMATCHED');
  }

  if (/\/auth\/oidc\//.test(path) || /\/external-integrations\//.test(path)) {
    return fixtureError('External OAuth and integration linking are unavailable in frontend fixture mode.');
  }
  if (/\/ai-provider-credentials\//.test(path) || (!mcpParityMode && /\/connection(?:\/verify)?$/.test(path))) {
    return fixtureError('External credentials are unavailable in frontend fixture mode.');
  }
  if (mcpParityMode) {
    const connectionResponse = await routeMcpParityConnection({ method, path, request, state });
    if (connectionResponse) return connectionResponse;
  }
  if (/\/skills\/(?:import|[^/]+\/reimport)$/.test(path)) {
    return fixtureError('Remote Git operations are unavailable in frontend fixture mode.');
  }

  if (path === '/api/v1/auth/config' && method === 'GET') {
    return json({ oidcEnabled: false, oidcProviderName: 'Fixture mode', passwordAuthEnabled: false, passwordSignupEnabled: false, passwordEmailVerificationRequired: false, passwordResetEnabled: false });
  }
  if (path === '/api/v1/auth/csrf' && method === 'GET') return json({ csrfToken: 'fixture-csrf-token' });
  if (path === '/api/v1/auth/methods' && method === 'GET') return json({ methods: [], capabilities: { canChangePassword: false, canLinkOidc: false, canAddPassword: false } });
  if (path === '/api/v1/auth/logout' && method === 'POST') return noContent();
  if (path.startsWith('/api/v1/auth/password/')) return fixtureError('Password authentication is unavailable in frontend fixture mode.');
  if (path === '/api/v1/me' && method === 'GET') return json(clone(state.user));

  if (path === '/api/v1/workspaces' && method === 'GET') return json({ items: clone(state.workspaces) });
  if (path === '/api/v1/workspaces' && method === 'POST') {
    const input = await bodyOf(request);
    const workspace = { ...clone(state.workspaces[0]), id: id('fixture-workspace'), name: String(input.name || 'Untitled fixture workspace'), clusterCount: 0, memberCount: 1 };
    state.workspaces.push(workspace);
    return json(workspace, 201);
  }

  let match = path.match(/^\/api\/v1\/workspaces\/([^/]+)$/);
  if (match) {
    const workspaceId = decode(match[1]);
    const workspace = state.workspaces.find((item) => item.id === workspaceId);
    if (!workspace) return notFound('Workspace');
    if (method === 'GET') return json(clone(workspace));
    if (method === 'DELETE') {
      state.workspaces = state.workspaces.filter((item) => item.id !== workspaceId);
      return noContent();
    }
  }

  match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/roles$/);
  if (match && method === 'GET') {
    const capabilities = Object.keys(state.workspaces[0]?.permissions || {});
    return json({ items: [
      { key: 'owner', displayName: 'Owner', description: 'Full workspace access', kind: 'system', capabilities, protected: true, sortOrder: 10 },
      { key: 'admin', displayName: 'Admin', description: 'Manage workspace resources', kind: 'system', capabilities: capabilities.filter((item) => item !== 'delete_workspace'), protected: true, sortOrder: 20 },
      { key: 'viewer', displayName: 'Viewer', description: 'Read workspace data', kind: 'system', capabilities: ['read_workspace_data', 'read_members', 'read_audit_log'], protected: true, sortOrder: 30 }
    ] });
  }

  match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/members$/);
  if (match) {
    if (method === 'GET') return json({ items: clone(state.members) });
    if (method === 'POST') {
      const input = await bodyOf(request);
      const member = { workspaceId: decode(match[1]), userId: id('fixture-member'), email: String(input.email || 'member@fixture.acornops.dev'), displayName: String(input.displayName || input.email || 'Fixture member'), role: String(input.role || 'viewer'), source: 'internal' };
      state.members.push(member);
      return json(member, 201);
    }
  }

  match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/members\/([^/]+)$/);
  if (match) {
    const userId = decode(match[2]);
    const member = state.members.find((item) => item.userId === userId);
    if (!member) return notFound('Member');
    if (method === 'PATCH') {
      Object.assign(member, await bodyOf(request));
      return json(clone(member));
    }
    if (method === 'DELETE') {
      state.members = state.members.filter((item) => item.userId !== userId);
      return noContent();
    }
  }

  match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/invitations$/);
  if (match) {
    if (method === 'GET') return json({ items: clone(state.invitations) });
    if (method === 'POST') {
      const input = await bodyOf(request);
      const invitation = { id: id('fixture-invitation'), workspaceId: decode(match[1]), workspaceName: state.workspaces[0]?.name, email: input.email, role: input.role || 'viewer', invitedBy: FIXTURE_IDS.user, status: 'pending', createdAt: NOW, expiresAt: '2026-07-22T08:30:00.000Z', token: id('fixture-token') };
      state.invitations.push(invitation);
      return json(invitation, 201);
    }
  }

  match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/invitations\/([^/]+)$/);
  if (match && method === 'DELETE') {
    const invitation = state.invitations.find((item) => item.id === decode(match![2]));
    if (!invitation) return notFound('Invitation');
    invitation.status = 'revoked';
    invitation.revokedAt = NOW;
    return json(clone(invitation));
  }

  match = path.match(/^\/api\/v1\/workspace-invitations\/([^/]+)(?:\/accept)?$/);
  if (match) {
    const invitation = state.invitations.find((item) => item.token === decode(match![1]));
    if (!invitation) return notFound('Invitation');
    if (method === 'GET') return json(clone(invitation));
    if (method === 'POST' && path.endsWith('/accept')) {
      invitation.status = 'accepted';
      invitation.acceptedBy = FIXTURE_IDS.user;
      invitation.acceptedAt = NOW;
      return json({ workspaceId: invitation.workspaceId, member: clone(state.members[0]) });
    }
  }

  match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/ai-settings$/);
  if (match) {
    if (method === 'GET') return json(clone(state.aiSettings));
    if (method === 'PATCH') {
      Object.assign(state.aiSettings, await bodyOf(request));
      return json(clone(state.aiSettings));
    }
  }

  match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/audit-log$/);
  if (match && method === 'GET') return json({ items: clone(state.auditEvents) });

  match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/issues$/);
  if (match && method === 'GET') return json({ items: clone(state.issues) });
  match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/issues\/([^/]+)$/);
  if (match && method === 'GET') {
    const issue = state.issues.find((item) => item.id === decode(match![2]));
    return issue ? json(clone(issue)) : notFound('Issue');
  }
  match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/issues\/([^/]+)\/observations$/);
  if (match && method === 'GET') return json({ items: state.issues.length ? [{ id: 'fixture-observation', issueId: decode(match[2]), workspaceId: decode(match[1]), targetId: FIXTURE_IDS.cluster, targetType: 'kubernetes', snapshotTs: NOW, severity: 'critical', title: 'CrashLoopBackOff observed', message: 'Container restart back-off remains active.', reason: 'CrashLoopBackOff', evidence: { restartCount: 4 }, createdAt: NOW }] : [] });

  match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/targets$/);
  if (match && method === 'GET') return json({ items: [...state.clusters, ...state.virtualMachines].map(targetSummary) });
  match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/targets\/([^/]+)$/);
  if (match && method === 'GET') {
    const target = [...state.clusters, ...state.virtualMachines].find((item) => item.id === decode(match![2]));
    return target ? json(targetSummary(target)) : notFound('Target');
  }

  match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/kubernetes-clusters\/metrics\/history$/);
  if (match && method === 'GET') {
    const points = [{ timestamp: '2026-07-15T08:00:00.000Z', cpuCores: 0.25, memoryBytes: 734003200 }, { timestamp: NOW, cpuCores: 0.325, memoryBytes: 805306368 }];
    return json({ workspaceId: decode(match[1]), windowMs: 21600000, items: state.clusters.map((cluster) => ({ clusterId: cluster.id, points })) });
  }
  match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/kubernetes-clusters$/);
  if (match) {
    if (method === 'GET') return json({ items: clone(state.clusters) });
    if (method === 'POST') {
      const input = await bodyOf(request);
      const cluster = { ...clone(state.clusters[0]), id: id('fixture-cluster'), workspaceId: decode(match[1]), name: String(input.name || 'Fixture cluster'), status: 'offline', latestSnapshot: null };
      state.clusters.push(cluster);
      return json({ cluster, agentKey: 'ak_fixture_local_only', installInstructions: { command: 'fixture-mode: no agent installation is required', warnings: ['This command is illustrative and cannot connect an external cluster.'] } }, 201);
    }
  }
  match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/kubernetes-clusters\/([^/]+)\/resources$/);
  if (match && method === 'GET') return json({ items: clone(state.resources) });
  match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/kubernetes-clusters\/([^/]+)\/metrics\/history$/);
  if (match && method === 'GET') return json({ workspaceId: decode(match[1]), clusterId: decode(match[2]), windowMs: 21600000, points: [{ timestamp: '2026-07-15T08:00:00.000Z', cpuCores: 0.25, memoryBytes: 734003200 }, { timestamp: NOW, cpuCores: 0.325, memoryBytes: 805306368 }] });
  match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/kubernetes-clusters\/([^/]+)\/pods\/([^/]+)\/([^/]+)\/logs$/);
  if (match && method === 'GET') return json({ name: decode(match[4]), namespace: decode(match[3]), container: url.searchParams.get('container') || 'worker', logs: '2026-07-15T08:29:58Z starting payments worker\n2026-07-15T08:29:59Z missing PAYMENT_QUEUE_URL\n2026-07-15T08:29:59Z exiting with status 1', tailLines: Number(url.searchParams.get('tailLines') || 100), previous: url.searchParams.get('previous') === 'true', fetchedAt: NOW });
  match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/kubernetes-clusters\/([^/]+)\/rotate-agent-key$/);
  if (match && method === 'POST') return json({ clusterId: decode(match[2]), agentKey: 'ak_fixture_rotated_local_only', keyVersion: 2, installInstructions: { command: 'fixture-mode: no agent installation is required', warnings: [] } });
  match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/kubernetes-clusters\/([^/]+)$/);
  if (match) {
    const clusterId = decode(match[2]);
    const cluster = state.clusters.find((item) => item.id === clusterId);
    if (!cluster) return notFound('Kubernetes cluster');
    if (method === 'GET') return json(clone(cluster));
    if (method === 'PATCH') {
      const input = await bodyOf(request);
      Object.assign(cluster, input);
      if ('writeConfirmationRequiredOverride' in input) cluster.writeConfirmationPolicy = { effectiveRequired: input.writeConfirmationRequiredOverride ?? true, overrideRequired: input.writeConfirmationRequiredOverride, source: input.writeConfirmationRequiredOverride === null ? 'deployment_default' : 'cluster_override' };
      return json(clone(cluster));
    }
    if (method === 'DELETE') {
      state.clusters = state.clusters.filter((item) => item.id !== clusterId);
      return noContent();
    }
  }

  match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/virtual-machines$/);
  if (match) {
    if (method === 'GET') return json({ items: clone(state.virtualMachines) });
    if (method === 'POST') {
      const input = await bodyOf(request);
      const virtualMachine = { ...clone(state.virtualMachines[0]), id: id('fixture-vm'), workspaceId: decode(match[1]), name: String(input.name || 'Fixture VM'), hostname: input.hostname, status: 'offline', createdAt: NOW, updatedAt: NOW, latestSnapshot: null };
      state.virtualMachines.push(virtualMachine);
      return json({ virtualMachine, agentKey: 'ak_fixture_vm_local_only', keyVersion: 1, installInstructions: 'Fixture mode does not connect external machines.' }, 201);
    }
  }
  match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/virtual-machines\/([^/]+)\/resources$/);
  if (match && method === 'GET') return json({ items: [
    { id: 'fixture-vm-service', targetId: decode(match[2]), family: 'services', kind: 'service', name: 'payments-api.service', status: 'running', item: { activeState: 'active', subState: 'running', enabled: true } },
    { id: 'fixture-vm-process', targetId: decode(match[2]), family: 'processes', kind: 'process', name: 'payments-worker', status: 'running', item: { pid: 1842, cpuPercent: 4.2, memoryPercent: 8.1 } }
  ] });
  match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/virtual-machines\/([^/]+)\/metrics\/history$/);
  if (match && method === 'GET') return json({ workspaceId: decode(match[1]), targetId: decode(match[2]), windowMs: 21600000, points: [{ timestamp: '2026-07-15T08:00:00.000Z', loadAverage1m: 0.8, loadAverage5m: 0.7, loadAverage15m: 0.6, cpuUsagePercent: 31, memoryUsedBytes: 3221225472, memoryTotalBytes: 8589934592, memoryFreeBytes: 5368709120, memoryUsedPercent: 37.5, swapUsedBytes: 0, swapTotalBytes: 2147483648, swapUsedPercent: 0, rootDiskUsedBytes: 32212254720, rootDiskTotalBytes: 107374182400, rootDiskUsedPercent: 30 }] });
  match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/virtual-machines\/([^/]+)\/logs$/);
  if (match && method === 'GET') return json({ entries: [{ id: 'fixture-log', timestamp: NOW, source: 'system', severity: 'warning', message: 'payments-worker restarted after configuration reload', unit: 'payments-worker.service' }] });
  match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/virtual-machines\/([^/]+)\/rotate-agent-key$/);
  if (match && method === 'POST') return json({ targetId: decode(match[2]), agentKey: 'ak_fixture_vm_rotated_local_only', keyVersion: 2, installInstructions: 'Fixture mode does not connect external machines.' });
  match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/virtual-machines\/([^/]+)$/);
  if (match) {
    const targetId = decode(match[2]);
    const target = state.virtualMachines.find((item) => item.id === targetId);
    if (!target) return notFound('Virtual machine');
    if (method === 'GET') return json(clone(target));
    if (method === 'PATCH') { Object.assign(target, await bodyOf(request), { updatedAt: NOW }); return json(clone(target)); }
    if (method === 'DELETE') { state.virtualMachines = state.virtualMachines.filter((item) => item.id !== targetId); return noContent(); }
  }

  match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/(?:kubernetes-clusters|targets)\/([^/]+)\/sessions$/);
  if (match) {
    const targetId = decode(match[2]);
    if (method === 'GET') return json({ items: clone(state.sessions.filter((item) => item.targetId === targetId)) });
    if (method === 'POST') {
      const input = await bodyOf(request);
      const session = { id: id('fixture-session'), workspaceId: decode(match[1]), targetId, targetType: targetId === FIXTURE_IDS.virtualMachine ? 'virtual_machine' : 'kubernetes', clusterId: targetId === FIXTURE_IDS.cluster ? targetId : undefined, createdBy: FIXTURE_IDS.user, createdByUser: { id: FIXTURE_IDS.user, displayName: 'Ning' }, title: String(input.title || 'Fixture conversation'), status: 'open', createdAt: NOW, updatedAt: NOW, lastMessageAt: NOW, expiresAt: '2026-08-14T08:30:00.000Z' };
      state.sessions.push(session);
      state.messages[session.id] = [];
      return json(session, 201);
    }
  }
  match = path.match(/^\/api\/v1\/sessions\/([^/]+)\/messages$/);
  if (match) {
    const sessionId = decode(match[1]);
    if (method === 'GET') return json({ items: clone(state.messages[sessionId] || []) });
    if (method === 'POST') {
      const input = await bodyOf(request);
      const runId = id('fixture-run');
      const messageId = id('fixture-message');
      const assistantId = id('fixture-message');
      state.messages[sessionId] ||= [];
      state.messages[sessionId].push({ id: messageId, sessionId, runId, role: 'user', kind: 'user', content: String(input.content || ''), clientMessageId: input.clientMessageId, createdAt: NOW });
      const content = 'Fixture analysis complete: the available target evidence is stable, and the simulated run made no external changes.';
      state.messages[sessionId].push({ id: assistantId, sessionId, runId, role: 'assistant', kind: 'assistant_final', content, createdAt: NOW });
      const session = state.sessions.find((item) => item.id === sessionId);
      state.runs[runId] = { id: runId, workspaceId: session?.workspaceId || FIXTURE_IDS.workspace, sessionId, messageId, targetId: session?.targetId, targetType: session?.targetType, clusterId: session?.clusterId, status: 'completed', requestedAt: NOW, startedAt: NOW, endedAt: NOW, usage: { input_tokens: 128, output_tokens: 24, tool_calls: 1 }, assistantMessage: { content, format: 'markdown' } };
      return json({ message_id: messageId, run_id: runId }, 202);
    }
  }
  match = path.match(/^\/api\/v1\/sessions\/([^/]+)$/);
  if (match && method === 'DELETE') {
    const sessionId = decode(match[1]);
    state.sessions = state.sessions.filter((item) => item.id !== sessionId);
    delete state.messages[sessionId];
    return noContent();
  }

  match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/targets\/([^/]+)\/chat-activity$/);
  if (match && method === 'GET') {
    const targetId = decode(match[2]);
    const target = [...state.clusters, ...state.virtualMachines].find((item) => item.id === targetId);
    return json({ targetId, targetType: targetId === FIXTURE_IDS.virtualMachine ? 'virtual_machine' : 'kubernetes', targetName: target?.name || 'Fixture target', windowSeconds: Number(url.searchParams.get('windowSeconds') || 300), generatedAt: NOW, recentActivity: state.sessions.filter((session) => session.targetId === targetId).map((session) => ({ sessionId: session.id, title: session.title, createdBy: session.createdBy, createdByUser: session.createdByUser, lastActivityAt: session.lastMessageAt, lastRunId: FIXTURE_IDS.run, lastRunStatus: 'completed', hasActiveRun: false, hasRecentWriteCapableRun: false, latestToolAccessMode: 'read_only' })) });
  }
  if (/\/chat-activity\/stream$/.test(path) && method === 'GET') return { status: 200, body: '', headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' } };

  match = path.match(/^\/api\/v1\/runs\/([^/]+)\/stream$/);
  if (match && method === 'GET') {
    const runId = decode(match[1]);
    const event = { schema_version: 1, run_id: runId, seq: 1, ts: NOW, type: 'run.completed', payload: { status: 'completed' } };
    return { status: 200, body: `data: ${JSON.stringify(event)}\n\n`, headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' } };
  }
  match = path.match(/^\/api\/v1\/runs\/([^/]+)\/events$/);
  if (match && method === 'GET') return json([{ schema_version: 1, run_id: decode(match[1]), seq: 1, ts: NOW, type: 'run.completed', payload: { status: 'completed' } }]);
  match = path.match(/^\/api\/v1\/runs\/([^/]+)\/approvals$/);
  if (match && method === 'GET') return json([]);
  match = path.match(/^\/api\/v1\/runs\/([^/]+)\/cancel$/);
  if (match && method === 'POST') {
    const run = state.runs[decode(match[1])];
    if (run) run.status = 'cancelled';
    return noContent();
  }
  match = path.match(/^\/api\/v1\/runs\/([^/]+)$/);
  if (match && method === 'GET') {
    const run = state.runs[decode(match[1])];
    return run ? json(clone(run)) : notFound('Run');
  }

  match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/agents$/);
  if (match) {
    if (method === 'GET') return json({ items: clone(state.agents) });
    if (method === 'POST') {
      const input = await bodyOf(request);
      const agent = { id: id('fixture-agent'), workspaceId: decode(match[1]), name: input.name, description: input.description || '', instructions: input.instructions || '', status: input.status || 'draft', origin: { type: 'manual' }, kind: 'specialist', reviewState: input.reviewState || 'draft', providerType: 'internal', createdBy: FIXTURE_IDS.user, version: 1, permissionMode: input.permissionMode || 'read_only', semanticCapabilityIds: input.semanticCapabilityIds || [], targetScope: input.targetScope || { type: 'workspace', targetTypes: [], targetIds: [] }, contextScope: input.contextScope || [], contextGrants: input.contextGrants || [], readiness: { status: 'ready', reasons: [] }, createdAt: NOW, updatedAt: NOW };
      state.agents.push(agent);
      return json({ agent }, 201);
    }
  }
  match = path.match(/^\/api\/v1\/agents\/([^/]+)\/duplicate$/);
  if (match && method === 'POST') {
    const original = state.agents.find((item) => item.id === decode(match![1]));
    if (!original) return notFound('Agent');
    const input = await bodyOf(request);
    const agent = { ...clone(original), id: id('fixture-agent'), name: input.name || `${original.name} copy`, origin: { type: 'manual' }, status: 'draft', reviewState: 'draft', createdAt: NOW, updatedAt: NOW };
    state.agents.push(agent);
    return json({ agent }, 201);
  }
  match = path.match(/^\/api\/v1\/agents\/([^/]+)$/);
  if (match) {
    const agentId = decode(match[1]);
    const agent = state.agents.find((item) => item.id === agentId);
    if (!agent) return notFound('Agent');
    if (method === 'GET') return json({ agent: clone(agent) });
    if (method === 'PATCH') { Object.assign(agent, await bodyOf(request), { updatedAt: NOW, version: Number(agent.version || 0) + 1 }); return json({ agent: clone(agent) }); }
    if (method === 'DELETE') { state.agents = state.agents.filter((item) => item.id !== agentId); return noContent(); }
  }
  match = path.match(/^\/api\/v1\/agents\/([^/]+)\/versions$/);
  if (match) {
    const agent = state.agents.find((item) => item.id === decode(match![1]));
    if (!agent) return notFound('Agent');
    const version = { id: `fixture-agent-version-${agent.version}`, agentId: agent.id, workspaceId: agent.workspaceId, version: agent.version || 1, snapshot: clone(agent), createdBy: FIXTURE_IDS.user, createdAt: NOW };
    return method === 'GET' ? json({ items: [version] }) : json({ version }, 201);
  }
  match = path.match(/^\/api\/v1\/agents\/([^/]+)\/activity$/);
  if (match && method === 'GET') return json({ items: [{ id: 'fixture-agent-activity', agentId: decode(match[1]), workspaceId: FIXTURE_IDS.workspace, agentVersion: 1, status: 'completed', createdAt: NOW, updatedAt: NOW }] });
  match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/agents\/([^/]+)\/runs$/);
  if (match && method === 'POST') {
    const agentId = decode(match[2]);
    const unavailable = state.agentMcpServers.find((server) => {
      if (server.agentId !== agentId || server.authScope !== 'personal') return false;
      return personalConnection(state, 'agent', agentId, server).status !== 'connected';
    });
    if (unavailable) {
      const connection = personalConnection(state, 'agent', agentId, unavailable);
      const action = connection.status === 'missing' ? 'connect_mcp_server' : 'verify_mcp_server';
      return json({ error: {
        code: 'MCP_PERSONAL_CONNECTION_REQUIRED',
        message: 'A required personal MCP connection is not ready.',
        retryable: false,
        details: {
          readinessErrors: ['A required personal MCP connection is not ready.'],
          readinessFailures: [{
            serverId: unavailable.id,
            toolName: 'fixture_discovered_tool',
            code: connection.status === 'missing' ? 'MCP_PERSONAL_CONNECTION_MISSING' : 'MCP_PERSONAL_CONNECTION_ERROR',
            action
          }]
        }
      } }, 409);
    }
    return json({ runId: FIXTURE_IDS.run, activityId: 'fixture-agent-activity', source: 'agent', status: 'completed' }, 202);
  }
  match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/agents\/([^/]+)\/mcp\/servers$/);
  if (match) {
    const agentId = decode(match[2]);
    if (method === 'GET') return json({ items: clone(state.agentMcpServers.filter((server) => server.agentId === agentId)) });
    if (method === 'POST') {
      const input = await bodyOf(request);
      const server = {
        id: id('fixture-agent-mcp'), name: input.name, url: input.url, type: 'mcp', enabled: true,
        isSystem: false, canDelete: true, canEditConnection: true, canToggle: true,
        authType: input.authType || 'none', authScope: input.authScope || 'none',
        authHeaderName: input.authHeaderName, agentId, revision: 1,
        targetConstraints: { targetTypes: [], targetIds: [] }, connectionStatus: 'unknown',
        lastDiscoveryAt: null, lastDiscoveryError: null, tools: []
      };
      state.agentMcpServers.push(server);
      return json({ server: clone(server) }, 201);
    }
  }
  match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/agents\/([^/]+)\/skills$/);
  if (match && method === 'GET') return json({ items: clone(state.targetSkills) });
  match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/service-identities$/);
  if (match && method === 'GET') return json({ items: [] });
  const automationTemplateResponse = routeAutomationTemplateFixtureRequest({ method, path, state });
  if (automationTemplateResponse) return automationTemplateResponse;

  match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/workflow-options$/);
  if (match && method === 'GET') return json(workflowOptions(state));
  match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/workflows$/);
  if (match) {
    if (method === 'GET') return json({ items: clone(state.workflows) });
    if (method === 'POST') {
      const input = await bodyOf(request);
      const agentIds = Array.isArray(input.agentIds) ? input.agentIds : [];
      const workflow = { id: id('fixture-workflow'), workspaceId: decode(match[1]), version: 1, origin: { type: 'manual' }, source: 'user', name: input.name, description: input.description || '', status: input.status || 'draft', createdBy: FIXTURE_IDS.user, createdAt: NOW, ...input, agentIds, executionMode: agentIds.length > 1 ? 'coordinated' : 'direct', readiness: { status: 'ready', reasons: [] } };
      state.workflows.push(workflow);
      return json({ workflow }, 201);
    }
  }
  match = path.match(/^\/api\/v1\/workflows\/([^/]+)\/duplicate$/);
  if (match && method === 'POST') {
    const original = state.workflows.find((item) => item.id === decode(match![1]));
    if (!original) return notFound('Workflow');
    const input = await bodyOf(request);
    const workflow = { ...clone(original), id: id('fixture-workflow'), name: input.name || `${original.name} copy`, status: 'draft', origin: { type: 'manual' }, createdAt: NOW };
    state.workflows.push(workflow);
    return json({ workflow }, 201);
  }
  match = path.match(/^\/api\/v1\/workflows\/([^/]+)$/);
  if (match) {
    const workflowId = decode(match[1]);
    const workflow = state.workflows.find((item) => item.id === workflowId);
    if (!workflow) return notFound('Workflow');
    if (method === 'PATCH') { Object.assign(workflow, await bodyOf(request), { version: Number(workflow.version || 0) + 1 }); return json({ workflow: clone(workflow) }); }
    if (method === 'DELETE') { state.workflows = state.workflows.filter((item) => item.id !== workflowId); return json({ deleted: true }); }
  }
  match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/workflow-schedules$/);
  if (match) {
    if (method === 'GET') return json({ items: clone(state.workflowSchedules), summary: { total: state.workflowSchedules.length, active: state.workflowSchedules.filter((item) => item.status === 'enabled').length, paused: state.workflowSchedules.filter((item) => item.status === 'paused').length, approvalGated: 0 } });
    if (method === 'POST') {
      const input = await bodyOf(request);
      const schedule = { id: id('fixture-schedule'), workspaceId: decode(match[1]), workflowVersion: 1, status: input.enabled === false ? 'paused' : 'enabled', inputDefaults: {}, approvedContextGrants: [], createdBy: { userId: FIXTURE_IDS.user, displayName: 'Ning' }, updatedAt: NOW, ...input };
      state.workflowSchedules.push(schedule);
      return json({ schedule }, 201);
    }
  }
  match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/workflow-schedules\/preview$/);
  if (match && method === 'POST') return json({ valid: true, summary: 'Runs on the configured fixture schedule.', nextRunTimes: ['2026-07-17T01:00:00.000Z', '2026-07-20T01:00:00.000Z'], errors: [] });
  match = path.match(/^\/api\/v1\/workflow-schedules\/([^/]+)$/);
  if (match) {
    const scheduleId = decode(match[1]);
    const schedule = state.workflowSchedules.find((item) => item.id === scheduleId);
    if (!schedule) return notFound('Workflow schedule');
    if (method === 'PATCH') { Object.assign(schedule, await bodyOf(request), { updatedAt: NOW }); return json({ schedule: clone(schedule) }); }
    if (method === 'DELETE') { state.workflowSchedules = state.workflowSchedules.filter((item) => item.id !== scheduleId); return noContent(); }
  }
  match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/approvals$/);
  if (match && method === 'GET') return json({ items: [], pendingCount: 0 });
  match = path.match(/^\/api\/v1\/workflows\/([^/]+)\/capabilities-preview$/);
  if (match && method === 'POST') {
    const workflowId = decode(match[1]);
    const preview = workflowCapabilityPreview(state, workflowId, await bodyOf(request));
    return preview ? json(preview) : notFound('Workflow');
  }
  match = path.match(/^\/api\/v1\/workflows\/([^/]+)\/sessions$/);
  if (match) {
    const workflowId = decode(match[1]);
    if (method === 'GET') return json({ items: [{ id: 'fixture-workflow-session', workflowId, workspaceId: FIXTURE_IDS.workspace, workflowVersion: 2, runs: [{ id: FIXTURE_IDS.run, status: 'completed', requestedAt: NOW, assistantMessage: { content: 'Fixture workflow completed successfully.' } }] }] });
    if (method === 'POST') return json({ session: { id: 'fixture-workflow-session', workflowId, workspaceId: FIXTURE_IDS.workspace, workflowVersion: 2 }, compiledAccessScope: { targetIds: [FIXTURE_IDS.cluster, FIXTURE_IDS.virtualMachine], mode: 'read_only' } }, 201);
  }
  match = path.match(/^\/api\/v1\/workflow-sessions\/([^/]+)\/messages$/);
  if (match && method === 'POST') return json({ message_id: id('fixture-workflow-message'), run_id: FIXTURE_IDS.run, workflow_run_id: FIXTURE_IDS.run, executionId: 'fixture-workflow-execution', status: 'completed', compiledAccessScope: { mode: 'read_only', allowedToolNames: ['get_resource'] } }, 202);

  const catalogResponse = await routeCatalogFixtureRequest({ request, state, path, method });
  if (catalogResponse) return catalogResponse;

  match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/targets\/([^/]+)\/mcp\/catalog$/);
  if (match && method === 'GET') return json(mcpCatalog(state, decode(match[2])));
  match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/targets\/([^/]+)\/tools$/);
  if (match && method === 'GET') return json(targetToolCatalog(state, decode(match[2])));
  match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/targets\/([^/]+)\/tools\/([^/]+)$/);
  if (match && method === 'PATCH') {
    const catalog = targetToolCatalog(state, decode(match[2]));
    const tool = catalog.items.find((item) => item.id === decode(match![3]));
    if (!tool) return notFound('Target tool');
    Object.assign(tool, await bodyOf(request));
    const stored = state.targetTools.find((item) => item.id === tool.id);
    if (stored) stored.enabledConfigured = tool.enabled;
    return json(tool);
  }
  match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/targets\/([^/]+)\/assistant\/capabilities-preview$/);
  if (match && method === 'GET') {
    const accessMode = url.searchParams.get('toolAccessMode') === 'read_write' ? 'read_write' : 'read_only';
    const tools = state.targetTools.filter((tool) => accessMode === 'read_write' || tool.capability === 'read');
    return json({ workspaceId: decode(match[1]), targetId: decode(match[2]), targetType: decode(match[2]) === FIXTURE_IDS.virtualMachine ? 'virtual_machine' : 'kubernetes', toolAccessMode: accessMode, confirmationRequiredForWrite: true, writeUnavailableReason: accessMode === 'read_only' ? 'run_read_only' : null, toolSummary: { totalAllowed: tools.length, nativeAllowed: tools.length, readAllowed: tools.filter((tool) => tool.capability === 'read').length, writeAllowed: tools.filter((tool) => tool.capability === 'write').length }, skillSummary: { totalAvailable: state.targetSkills.length }, tools: tools.map((tool) => ({ id: tool.id, name: tool.name, label: tool.name, description: tool.description, capability: tool.capability, runtimeKind: 'function', source: 'builtin' })), skills: state.targetSkills.map((skill) => ({ id: skill.id, name: skill.name, description: skill.description, source: 'manual' })) });
  }
  match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/targets\/([^/]+)\/skills$/);
  if (match) {
    if (method === 'GET') return json(targetSkillCatalog(state, decode(match[2])));
    if (method === 'POST') {
      const input = await bodyOf(request);
      const skill = { id: id('fixture-skill'), name: String(input.files?.[0]?.path || 'Fixture skill').replace(/\/SKILL\.md$/i, ''), description: 'Frontend fixture skill', enabled: true, revision: 1, contentDigest: 'sha256:fixture-created', source: { type: 'manual' }, files: input.files || [] };
      state.targetSkills.push(skill);
      return json(targetSkillCatalog(state, decode(match[2])).items.at(-1), 201);
    }
  }
  match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/targets\/([^/]+)\/skills\/([^/]+)$/);
  if (match) {
    const skillId = decode(match[3]);
    const skill = state.targetSkills.find((item) => item.id === skillId);
    if (!skill) return notFound('Target skill');
    if (method === 'GET') return json(targetSkillCatalog(state, decode(match[2])).items.find((item) => item.id === skillId));
    if (method === 'PATCH') { Object.assign(skill, await bodyOf(request), { revision: Number(skill.revision || 0) + 1 }); return json(targetSkillCatalog(state, decode(match[2])).items.find((item) => item.id === skillId)); }
    if (method === 'DELETE') { state.targetSkills = state.targetSkills.filter((item) => item.id !== skillId); return noContent(); }
  }
  match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/targets\/([^/]+)\/mcp\/servers$/);
  if (match) {
    if (method === 'GET') return json(clone(state.targetMcpServers));
    if (method === 'POST') {
      const input = await bodyOf(request);
      if (input.auth?.credential || input.bearerToken || input.customHeaderValue) return fixtureError('External credentials are unavailable in frontend fixture mode.');
      const authType = input.auth?.type || input.authType || 'none';
      const server = { id: id('fixture-mcp'), workspace_id: decode(match[1]), target_id: decode(match[2]), target_type: decode(match[2]) === FIXTURE_IDS.virtualMachine ? 'virtual_machine' : 'kubernetes', server_name: input.name || input.serverName, server_url: input.url || input.serverUrl, enabled: input.enabled !== false, auth_type: authType, auth_scope: authType === 'none' ? 'none' : 'personal', auth_header_name: input.auth?.headerName, auth_header_prefix: input.auth?.headerPrefix, connection_status: 'unknown', last_discovery_at: null, last_discovery_error: null, revision: 1, tools: input.tools || [] };
      state.targetMcpServers.push(server);
      return json(server, 201);
    }
  }

  match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/targets\/([^/]+)\/mcp\/servers\/([^/]+)\/tools$/);
  if (match && method === 'GET') {
    const server = state.targetMcpServers.find((candidate) => candidate.target_id === decode(match![2]) && candidate.id === decode(match![3]));
    if (!server) return notFound('Target MCP server');
    return json({ items: server.tools.map((tool: Record<string, any>) => ({
      name: tool.name, description: tool.description, capability: tool.capability || 'read',
      version: tool.version, source: tool.source || 'mcp', enabledConfigured: tool.enabled === true,
      enabledEffective: tool.enabled === true, effectiveDisabledReason: null
    })) });
  }

  match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/targets\/([^/]+)\/issues\/summary$/);
  if (match && method === 'GET') {
    const items = state.issues.filter((issue) => issue.targetId === decode(match![2]));
    return json({ total: items.length, active: items.filter((issue) => issue.status === 'active').length, recovering: items.filter((issue) => issue.status === 'recovering').length, critical: items.filter((issue) => issue.severity === 'critical').length, warning: items.filter((issue) => issue.severity === 'warning').length, info: items.filter((issue) => issue.severity === 'info').length });
  }
  match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/targets\/([^/]+)\/issues$/);
  if (match && method === 'GET') return json({ items: clone(state.issues.filter((issue) => issue.targetId === decode(match![2]))) });
  match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/targets\/([^/]+)\/target-insights$/);
  if (match && method === 'GET') return json({ workspaceId: decode(match[1]), targetId: decode(match[2]), targetType: decode(match[2]) === FIXTURE_IDS.virtualMachine ? 'virtual_machine' : 'kubernetes', permissions: { canEdit: true }, items: [{ id: 'fixture-insight', workspaceId: decode(match[1]), targetId: decode(match[2]), targetType: decode(match[2]) === FIXTURE_IDS.virtualMachine ? 'virtual_machine' : 'kubernetes', title: 'Payments worker startup dependency', status: 'active', bodyMarkdown: 'Validate queue configuration before restarting the worker.', frontmatter: {}, tags: ['payments', 'startup'], signals: {}, scope: { namespace: 'production' }, evidenceSummary: 'Observed across four restarts.', observationCount: 4, confidence: 0.92, firstObservedAt: '2026-07-15T07:45:00.000Z', lastObservedAt: NOW, createdAt: '2026-07-15T07:45:00.000Z', updatedAt: NOW }] });

  if (path === '/api/v1/__fixtures/reset' && method === 'POST') {
    resetFixtureStore();
    return json({ status: 'reset' });
  }

  return fixtureError(
    `No frontend fixture route handles ${method} ${path}. The request was blocked instead of reaching a live control plane.`,
    501,
    'FIXTURE_ROUTE_UNMATCHED'
  );
}
