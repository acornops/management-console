import { beforeEach, describe, expect, it } from 'vitest';
import { mapClusterResourcePageItems } from '@/services/control-plane/clusterMappers';
import { FIXTURE_IDS, getFixtureState, resetFixtureStore } from './store';
import { routeFixtureRequest } from './router';

function request(path: string, init?: RequestInit): Request {
  return new Request(`http://localhost:8081${path}`, init);
}

describe('frontend fixture router', () => {
  beforeEach(() => {
    resetFixtureStore();
  });

  it('serves representative workspace, Kubernetes, VM, automation, catalog, and settings reads', async () => {
    const paths = [
      '/api/v1/me',
      '/api/v1/workspaces?limit=50',
      `/api/v1/workspaces/${FIXTURE_IDS.workspace}/kubernetes-clusters`,
      `/api/v1/workspaces/${FIXTURE_IDS.workspace}/virtual-machines`,
      `/api/v1/workspaces/${FIXTURE_IDS.workspace}/agents`,
      `/api/v1/workspaces/${FIXTURE_IDS.workspace}/automation-templates`,
      `/api/v1/workspaces/${FIXTURE_IDS.workspace}/workflows`,
      `/api/v1/workspaces/${FIXTURE_IDS.workspace}/catalog/artifacts`,
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

  it('keeps dynamically registered VMs on virtual-machine capability contracts', async () => {
    const created = await routeFixtureRequest(request(
      `/api/v1/workspaces/${FIXTURE_IDS.workspace}/virtual-machines`,
      { method: 'POST', body: JSON.stringify({ name: 'New fixture VM' }) }
    ));
    const virtualMachine = (created.body as { virtualMachine: { id: string } }).virtualMachine;

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

  it('fails closed for unmatched API requests', async () => {
    const response = await routeFixtureRequest(request('/api/v1/unhandled-live-request'));
    expect(response.status).toBe(501);
    expect(response.body).toMatchObject({ error: { code: 'FIXTURE_ROUTE_UNMATCHED' } });
  });
});
