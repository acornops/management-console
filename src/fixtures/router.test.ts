import { beforeEach, describe, expect, it } from 'vitest';
import { mapClusterResourcePageItems } from '@/services/control-plane/clusterMappers';
import { FIXTURE_IDS, getFixtureState, resetFixtureStore } from './store';
import { routeFixtureRequest } from './router';
import { completeFixtureResourceInventory } from './resourceFixtures';

function request(path: string, init?: RequestInit): Request {
  return new Request(`http://localhost:8081${path}`, init);
}

describe('frontend fixture router', () => {
  beforeEach(() => {
    resetFixtureStore();
  });

  it('serves representative workspace, Kubernetes, VM, automation, and settings reads', async () => {
    const paths = [
      '/api/v1/me',
      '/api/v1/workspaces?limit=50',
      `/api/v1/workspaces/${FIXTURE_IDS.workspace}/kubernetes-clusters`,
      `/api/v1/workspaces/${FIXTURE_IDS.workspace}/virtual-machines`,
      `/api/v1/workspaces/${FIXTURE_IDS.workspace}/agents`,
      `/api/v1/workspaces/${FIXTURE_IDS.workspace}/automation-templates`,
      `/api/v1/workspaces/${FIXTURE_IDS.workspace}/workflows`,
      `/api/v1/workspaces/${FIXTURE_IDS.workspace}/ai-settings`
    ];
    for (const path of paths) {
      const response = await routeFixtureRequest(request(path));
      expect(response.status, path).toBe(200);
      expect(response.body, path).toBeTruthy();
    }
  });

  it('keeps resource page fixture items aligned with the normalized resource contract', () => {
    const mapped = mapClusterResourcePageItems(getFixtureState().resources);

    expect(mapped.workloads).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'checkout-api', type: 'Deployment', namespace: 'production' }),
      expect.objectContaining({ name: 'payments-worker-7c5b9f-demo', status: 'CrashLoopBackOff' }),
      expect.objectContaining({ name: 'checkout-api-6f8c7d9d4c-rollout', status: 'Pending' })
    ]));
  });

  it('filters Kubernetes resource families and reports matching category counts', async () => {
    const root = `/api/v1/workspaces/${FIXTURE_IDS.workspace}/kubernetes-clusters/${FIXTURE_IDS.cluster}`;
    const detail = await routeFixtureRequest(request(root));
    const all = await routeFixtureRequest(request(`${root}/resources`));
    const rows = (all.body as { items: Array<{ family: string }> }).items;
    expect((detail.body as { summary: { resourceCount: number } }).summary.resourceCount).toBe(rows.length);
    for (const family of ['workloads', 'network', 'storage', 'cluster']) {
      const response = await routeFixtureRequest(request(`${root}/resources?family=${family}`));
      const items = (response.body as { items: Array<{ family: string }> }).items;
      expect(items.every((item) => item.family === family)).toBe(true);
      expect(items.length).toBe((detail.body as { summary: { resourceFamilyCounts: Record<string, number> } }).summary.resourceFamilyCounts[family] || 0);
    }
    const filtered = await routeFixtureRequest(request(`${root}/resources?kind=Pod&q=payments&namespace=production`));
    expect((filtered.body as { items: Array<{ name: string }> }).items.map((item) => item.name)).toEqual(['payments-worker-7c5b9f-demo']);
  });

  it('returns VM resources in their requested category, not Kubernetes family fields', async () => {
    const response = await routeFixtureRequest(request(`/api/v1/workspaces/${FIXTURE_IDS.workspace}/virtual-machines/${FIXTURE_IDS.virtualMachine}/resources?category=services`));
    expect(response.body).toMatchObject({ items: [{ category: 'services', name: 'payments-api.service' }] });
    expect((response.body as { items: unknown[] }).items).toHaveLength(1);
    const processes = await routeFixtureRequest(request(`/api/v1/workspaces/${FIXTURE_IDS.workspace}/virtual-machines/${FIXTURE_IDS.virtualMachine}/resources?category=processes`));
    expect(processes.body).toMatchObject({ items: [{ category: 'processes', name: 'payments-worker' }] });
    expect((processes.body as { items: unknown[] }).items).toHaveLength(1);
  });

  it('puts the partially ready Deployment in attention, not healthy, consistently with its rendered state', async () => {
    const root = `/api/v1/workspaces/${FIXTURE_IDS.workspace}/kubernetes-clusters/${FIXTURE_IDS.cluster}/resources`;
    const attention = await routeFixtureRequest(request(`${root}?kind=Deployment&health=attention`));
    const attentionItems = (attention.body as { items: ReturnType<typeof getFixtureState>['resources'] }).items;
    expect(attentionItems.map(({ name, status }) => ({ name, status }))).toEqual([
      { name: 'payments-worker', status: 'Unknown' }
    ]);
    expect(mapClusterResourcePageItems(attentionItems).workloads[0].status).toBe('Pending');
    const healthy = await routeFixtureRequest(request(`${root}?kind=Deployment&health=healthy`));
    expect((healthy.body as { items: Array<{ name: string; status: string }> }).items.map(({ name, status }) => ({ name, status }))).toEqual([
      { name: 'checkout-api', status: 'Running' }
    ]);
  });

  it('filters producer attention statuses instead of relying on fixture-only health aliases', async () => {
    const state = getFixtureState();
    const row = state.resources[0];
    const statuses = ['Unknown', 'Failed', 'CrashLoopBackOff', 'NotReady', 'Pending', 'ImagePullBackOff', 'ErrImagePull', 'OOMKilled', 'CreateContainerConfigError', 'unknown', 'Running', 'Ready', 'Bound', 'Active', 'Critical', 'Warning'];
    state.resources = statuses.map((status) => ({ ...row, id: status, name: status, status }));
    const root = `/api/v1/workspaces/${FIXTURE_IDS.workspace}/kubernetes-clusters/${FIXTURE_IDS.cluster}/resources`;
    const attention = await routeFixtureRequest(request(`${root}?health=attention`));
    expect((attention.body as { items: Array<{ status: string }> }).items.map((item) => item.status)).toEqual([
      'Unknown', 'Failed', 'CrashLoopBackOff', 'NotReady', 'Pending', 'ImagePullBackOff', 'ErrImagePull', 'OOMKilled', 'CreateContainerConfigError', 'unknown'
    ]);
    const healthy = await routeFixtureRequest(request(`${root}?health=healthy`));
    expect((healthy.body as { items: Array<{ status: string }> }).items.map((item) => item.status)).toEqual([
      'Running', 'Ready', 'Bound', 'Active', 'Critical', 'Warning'
    ]);
  });

  it('derives snapshot statuses while preserving the richer unhealthy Pod payload', () => {
    const state = getFixtureState();
    const pod = state.resources.find((row) => row.name === 'payments-worker-7c5b9f-demo')!;
    const originalPayload = structuredClone(pod.item);
    const snapshot = state.clusters[0].latestSnapshot.data.resources;
    snapshot.deployments[0].readyReplicas = 0;
    snapshot.nodes[0].status.conditions[0].status = 'False';
    snapshot.namespaces[0].status = '';
    completeFixtureResourceInventory(state);
    expect(pod.item).toEqual(originalPayload);
    expect(pod.status).toBe('CrashLoopBackOff');
    for (const [kind, name, status] of [
      ['Deployment', 'checkout-api', 'Failed'], ['Deployment', 'payments-worker', 'Unknown'],
      ['Node', 'fixture-control-plane', 'NotReady'], ['Namespace', 'default', 'Unknown'],
      ['PersistentVolumeClaim', 'checkout-cache', 'Bound'], ['Service', 'checkout-api', 'Unknown']
    ]) {
      expect(state.resources.find((row) => row.kind === kind && row.name === name)?.status, `${kind}/${name}`).toBe(status);
    }
    expect(state.clusters[0].summary.resourceCount).toBe(11);
  });

  it('does not leak target skills into Agent skill installations', async () => {
    const agent = getFixtureState().agents.find((item) => item.id === FIXTURE_IDS.specialistAgent)!;
    agent.skillInstallations = [{ id: 'agent-owned-skill', name: 'Agent skill', description: '', enabled: true, revision: 1, contentDigest: 'sha256:agent-skill', source: { type: 'manual' }, files: [] }];
    const owned = await routeFixtureRequest(request(`/api/v1/workspaces/${FIXTURE_IDS.workspace}/agents/${agent.id}/skills`));
    expect(owned.body).toEqual({ items: agent.skillInstallations });
    const empty = await routeFixtureRequest(request(`/api/v1/workspaces/${FIXTURE_IDS.workspace}/agents/${FIXTURE_IDS.virtualMachineAgent}/skills`));
    expect(empty.body).toEqual({ items: [] });
  });

  it('supports a successful RBAC profile read for cluster onboarding', async () => {
    const response = await routeFixtureRequest(request(`/api/v1/workspaces/${FIXTURE_IDS.workspace}/kubernetes-rbac-additions`));
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ version: expect.any(Number), items: expect.any(Array) });
  });

  it('keeps dynamically registered VMs on virtual-machine capability contracts', async () => {
    const created = await routeFixtureRequest(request(
      `/api/v1/workspaces/${FIXTURE_IDS.workspace}/virtual-machines`,
      { method: 'POST', body: JSON.stringify({ name: 'New fixture VM', agentAccessMode: 'read_write', restartServices: ['nginx.service'] }) }
    ));
    const virtualMachine = (created.body as { virtualMachine: { id: string; agentAccessMode: string; restartServices: string[] } }).virtualMachine;

    expect(virtualMachine).toMatchObject({ agentAccessMode: 'read_write', restartServices: ['nginx.service'] });

    const tools = await routeFixtureRequest(request(
      `/api/v1/workspaces/${FIXTURE_IDS.workspace}/targets/${virtualMachine.id}/tools`
    ));
    const preview = await routeFixtureRequest(request(
      `/api/v1/workspaces/${FIXTURE_IDS.workspace}/targets/${virtualMachine.id}/assistant/capabilities-preview`
    ));
    const autoTriage = await routeFixtureRequest(request(
      `/api/v1/workspaces/${FIXTURE_IDS.workspace}/targets/${virtualMachine.id}/auto-triage`
    ));

    expect(tools.body).toMatchObject({ targetId: virtualMachine.id, targetType: 'virtual_machine' });
    expect(preview.body).toMatchObject({ targetId: virtualMachine.id, targetType: 'virtual_machine' });
    expect(autoTriage.body).toMatchObject({ targetId: virtualMachine.id, readiness: { status: 'ready' } });
  });

  it('previews AgentV tools for the connected VM write-approval fixture', async () => {
    const preview = await routeFixtureRequest(request(
      `/api/v1/workspaces/${FIXTURE_IDS.workspace}/targets/${FIXTURE_IDS.virtualMachine}/assistant/capabilities-preview?toolAccessMode=read_write`
    ));

    expect(preview.body).toMatchObject({
      targetType: 'virtual_machine',
      toolAccessMode: 'read_write',
      confirmationRequiredForWrite: true,
      toolSummary: { readAllowed: 1, writeAllowed: 1 },
      tools: expect.arrayContaining([
        expect.objectContaining({ name: 'get_service', capability: 'read' }),
        expect.objectContaining({ name: 'restart_service', capability: 'write' })
      ])
    });

    const readOnlyPreview = await routeFixtureRequest(request(
      `/api/v1/workspaces/${FIXTURE_IDS.workspace}/targets/${FIXTURE_IDS.virtualMachine}/assistant/capabilities-preview?toolAccessMode=read_only`
    ));
    expect(readOnlyPreview.body).toMatchObject({
      confirmationRequiredForWrite: false,
      writeUnavailableReason: 'run_read_only',
      toolSummary: { readAllowed: 1, writeAllowed: 0 }
    });

    await routeFixtureRequest(request(
      `/api/v1/workspaces/${FIXTURE_IDS.workspace}/virtual-machines/${FIXTURE_IDS.virtualMachine}`,
      { method: 'PATCH', body: JSON.stringify({ permissionModeOverride: 'auto_allowed_changes' }) }
    ));
    const automaticPreview = await routeFixtureRequest(request(
      `/api/v1/workspaces/${FIXTURE_IDS.workspace}/targets/${FIXTURE_IDS.virtualMachine}/assistant/capabilities-preview?toolAccessMode=read_write`
    ));
    expect(automaticPreview.body).toMatchObject({
      confirmationRequiredForWrite: false,
      toolSummary: { writeAllowed: 1 }
    });
  });

  it('keeps VM writes closed while a fixture host policy command is pending', async () => {
    const update = await routeFixtureRequest(request(
      `/api/v1/workspaces/${FIXTURE_IDS.workspace}/virtual-machines/${FIXTURE_IDS.virtualMachine}/agent-access-policy-updates`,
      { method: 'POST', body: JSON.stringify({ agentAccessMode: 'read_write', restartServices: ['payments-worker.service'] }) }
    ));
    expect(update.status).toBe(201);
    expect(update.body).toMatchObject({
      virtualMachine: {
        agentAccessMode: 'read_write',
        restartServices: ['payments-api.service'],
        pendingAgentAccessPolicy: { accessMode: 'read_write', restartServices: ['payments-worker.service'] }
      },
      installInstructions: { command: expect.stringContaining('--replace-credential') }
    });

    const preview = await routeFixtureRequest(request(
      `/api/v1/workspaces/${FIXTURE_IDS.workspace}/targets/${FIXTURE_IDS.virtualMachine}/assistant/capabilities-preview?toolAccessMode=read_write`
    ));
    expect(preview.body).toMatchObject({
      writeUnavailableReason: 'run_read_only',
      toolSummary: { writeAllowed: 0 }
    });
  });

  it('serves and persists Agent target access settings', async () => {
    const path = `/api/v1/workspaces/${FIXTURE_IDS.workspace}/agents/${FIXTURE_IDS.kubernetesAgent}/mcp/servers/${FIXTURE_IDS.targetsMcpServer}/target-access`;
    const initial = await routeFixtureRequest(request(path));
    expect(initial.body).toMatchObject({
      policy: { mode: 'all', targetIds: [] },
      targets: expect.arrayContaining([
        expect.objectContaining({ id: FIXTURE_IDS.cluster, targetType: 'kubernetes' }),
        expect.objectContaining({ id: FIXTURE_IDS.virtualMachine, targetType: 'virtual_machine' })
      ])
    });

    const updated = await routeFixtureRequest(request(path, {
      method: 'PUT',
      body: JSON.stringify({ mode: 'allowlist', targetIds: [FIXTURE_IDS.cluster] })
    }));
    expect(updated.body).toMatchObject({
      policy: { mode: 'allowlist', targetIds: [FIXTURE_IDS.cluster] }
    });
    expect(getFixtureState().agents.find((agent) => agent.id === FIXTURE_IDS.kubernetesAgent)?.targetAccessPolicy)
      .toEqual({ mode: 'allowlist', targetIds: [FIXTURE_IDS.cluster] });
  });

  it('persists workspace, membership, settings, agent, workflow, session, and message mutations', async () => {
    const createdWorkspace = await routeFixtureRequest(request('/api/v1/workspaces', {
      method: 'POST',
      body: JSON.stringify({ name: 'Mutable fixture workspace' })
    }));
    expect(createdWorkspace.status).toBe(201);
    expect(getFixtureState().workspaces).toHaveLength(2);
    const createdWorkspaceId = (createdWorkspace.body as { id: string }).id;
    for (const path of [
      `/api/v1/workspaces/${createdWorkspaceId}/kubernetes-clusters`,
      `/api/v1/workspaces/${createdWorkspaceId}/virtual-machines`,
      `/api/v1/workspaces/${createdWorkspaceId}/targets`,
      `/api/v1/workspaces/${createdWorkspaceId}/issues`
    ]) {
      const response = await routeFixtureRequest(request(path));
      expect(response.body, path).toEqual({ items: [] });
    }

    await routeFixtureRequest(request(`/api/v1/workspaces/${FIXTURE_IDS.workspace}/members`, {
      method: 'POST',
      body: JSON.stringify({ email: 'new@fixture.dev', role: 'viewer' })
    }));
    expect(getFixtureState().members.some((member) => member.email === 'new@fixture.dev')).toBe(true);

    await routeFixtureRequest(request(`/api/v1/workspaces/${FIXTURE_IDS.workspace}/ai-settings`, {
      method: 'PATCH',
      body: JSON.stringify({ reasoningEffort: 'high' })
    }));
    expect(getFixtureState().aiSettings.reasoningEffort).toBe('high');

    await routeFixtureRequest(request(`/api/v1/workspaces/${FIXTURE_IDS.workspace}/agents`, {
      method: 'POST',
      body: JSON.stringify({ name: 'Fixture mutation agent', instructions: 'Test fixture mutations.' })
    }));
    await routeFixtureRequest(request(`/api/v1/workspaces/${FIXTURE_IDS.workspace}/workflows`, {
      method: 'POST',
      body: JSON.stringify({ name: 'Fixture mutation workflow', prompt: 'Run the fixture workflow.', agentIds: [FIXTURE_IDS.workflowAnalystAgent] })
    }));
    expect(getFixtureState().agents.some((agent) => agent.name === 'Fixture mutation agent')).toBe(true);
    expect(getFixtureState().workflows.some((workflow) => workflow.name === 'Fixture mutation workflow')).toBe(true);

    const templateInstall = await routeFixtureRequest(request(`/api/v1/workspaces/${FIXTURE_IDS.workspace}/automation-templates/infrastructure-remediation/install`, { method: 'POST' }));
    expect(templateInstall.status).toBe(201);
    const installedWorkflowId = (templateInstall.body as { workflowId: string }).workflowId;
    expect(getFixtureState().workflows.some((workflow) => workflow.id === installedWorkflowId && workflow.status === 'paused')).toBe(true);
    const templateActivation = await routeFixtureRequest(request(`/api/v1/workspaces/${FIXTURE_IDS.workspace}/automation-templates/infrastructure-remediation/activate`, { method: 'POST' }));
    expect(templateActivation.status).toBe(200);
    expect(getFixtureState().workflows.find((workflow) => workflow.id === installedWorkflowId)?.status).toBe('active');

    const sessionResponse = await routeFixtureRequest(request(
      `/api/v1/workspaces/${FIXTURE_IDS.workspace}/targets/${FIXTURE_IDS.cluster}/sessions`,
      { method: 'POST', body: JSON.stringify({ title: 'Mutable session' }) }
    ));
    const session = sessionResponse.body as { id: string };
    const messageResponse = await routeFixtureRequest(request(`/api/v1/sessions/${session.id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content: 'Run a deterministic fixture analysis.' })
    }));
    expect(messageResponse.status).toBe(202);
    const runId = (messageResponse.body as { run_id: string }).run_id;
    expect(getFixtureState().runs[runId].status).toBe('completed');
    expect(getFixtureState().messages[session.id]).toHaveLength(2);
  });

  it('resets mutable state to the seeded snapshot', async () => {
    getFixtureState().workspaces[0].name = 'Changed';
    await routeFixtureRequest(request('/api/v1/__fixtures/reset', { method: 'POST' }));
    expect(getFixtureState().workspaces[0].name).toBe('AcornOps Fixture Lab');
    expect(getFixtureState().workspaces).toHaveLength(1);
  });

  it('serves a populated approval inbox and persists a decision', async () => {
    const inbox = await routeFixtureRequest(request(`/api/v1/workspaces/${FIXTURE_IDS.workspace}/approvals?status=pending`));
    expect(inbox.body).toMatchObject({
      pendingCount: 1,
      items: [expect.objectContaining({ approvalId: 'fixture-workspace-approval', status: 'pending' })]
    });

    const decision = await routeFixtureRequest(request(
      '/api/v1/runs/fixture-execution-review-run/approvals/fixture-workspace-approval/decision',
      { method: 'POST', body: JSON.stringify({ decision: 'approved' }) }
    ));
    expect(decision.body).toMatchObject({ status: 'approved', decision: 'approved' });
    expect(getFixtureState().approvals[0]).toMatchObject({ status: 'approved' });
  });

  it('switches fixture workspace roles without dropping readable capabilities', async () => {
    const response = await routeFixtureRequest(request('/api/v1/__fixtures/role', {
      method: 'POST',
      body: JSON.stringify({ role: 'viewer' })
    }));
    expect(response.body).toMatchObject({
      role: 'viewer',
      permissions: { read_workspace_data: true, manage_agents: false, delete_workspace: false }
    });
    expect(getFixtureState().workspaces[0]).toMatchObject({ currentUserRole: 'viewer' });
  });

  it('returns explicit fixture-mode failures for unsupported external operations', async () => {
    const operations = [
      request(`/api/v1/workspaces/${FIXTURE_IDS.workspace}/ai-provider-credentials/openai`, { method: 'PUT', body: '{}' }),
      request('/api/v1/auth/external-integrations/link/preview', { method: 'POST', body: '{}' }),
      request(`/api/v1/workspaces/${FIXTURE_IDS.workspace}/targets/${FIXTURE_IDS.cluster}/skills/import`, { method: 'POST', body: '{}' })
    ];
    for (const operation of operations) {
      const response = await routeFixtureRequest(operation);
      expect(response.status).toBe(422);
      expect(response.body).toMatchObject({ error: { code: 'FIXTURE_MODE_UNSUPPORTED' } });
    }
  });

  it('pages target MCP catalogs and preserves inherited starter provenance', async () => {
    getFixtureState().targetMcpServers.push({
      id: 'platform-default:fixture-starter',
      workspace_id: FIXTURE_IDS.workspace,
      target_id: FIXTURE_IDS.cluster,
      target_type: 'kubernetes',
      server_name: 'Fixture workspace starter',
      server_url: 'https://mcp.example.test',
      enabled: false,
      auth_type: 'bearer_token',
      credential_mode: 'individual',
      auth_header_name: 'Authorization',
      auth_header_prefix: 'Bearer ',
      public_headers: { 'X-Client-Version': 'fixture' },
      credential_transitioning: false,
      inherited: true,
      connection_status: 'unknown',
      last_discovery_at: null,
      last_discovery_error: null,
      revision: 1,
      tools: []
    });

    const first = await routeFixtureRequest(request(
      `/api/v1/workspaces/${FIXTURE_IDS.workspace}/targets/${FIXTURE_IDS.cluster}/mcp/catalog?limit=1`
    ));
    const firstPage = first.body as { servers: Array<{ id: string }>; nextCursor?: string };
    expect(firstPage.servers).toHaveLength(1);
    expect(firstPage.nextCursor).toBeTruthy();

    const second = await routeFixtureRequest(request(
      `/api/v1/workspaces/${FIXTURE_IDS.workspace}/targets/${FIXTURE_IDS.cluster}/mcp/catalog?limit=1&cursor=${encodeURIComponent(firstPage.nextCursor!)}`
    ));
    expect(second.body).toMatchObject({
      servers: [{
        id: 'platform-default:fixture-starter',
        inherited: true,
        canDelete: false,
        canEditConnection: false,
        canToggle: false,
        authHeaderName: 'Authorization',
        authHeaderPrefix: 'Bearer ',
        publicHeaders: { 'X-Client-Version': 'fixture' }
      }]
    });
  });

  it('pages target MCP server tools with opaque cursors', async () => {
    const first = await routeFixtureRequest(request(
      `/api/v1/workspaces/${FIXTURE_IDS.workspace}/targets/${FIXTURE_IDS.cluster}/mcp/servers/fixture-mcp/tools?limit=1`
    ));
    const firstPage = first.body as { items: Array<{ name: string }>; nextCursor?: string };
    expect(firstPage.items).toHaveLength(1);
    expect(firstPage.nextCursor).toBeTruthy();

    const second = await routeFixtureRequest(request(
      `/api/v1/workspaces/${FIXTURE_IDS.workspace}/targets/${FIXTURE_IDS.cluster}/mcp/servers/fixture-mcp/tools?limit=1&cursor=${encodeURIComponent(firstPage.nextCursor!)}`
    ));
    const secondPage = second.body as { items: Array<{ name: string }>; nextCursor?: string };
    expect(secondPage.items).toHaveLength(1);
    expect(secondPage.items[0]?.name).not.toBe(firstPage.items[0]?.name);
    expect(secondPage.nextCursor).toBeUndefined();
  });

  it('fails closed for unmatched API requests', async () => {
    const response = await routeFixtureRequest(request('/api/v1/unhandled-live-request'));
    expect(response.status).toBe(501);
    expect(response.body).toMatchObject({ error: { code: 'FIXTURE_ROUTE_UNMATCHED' } });
  });
});
