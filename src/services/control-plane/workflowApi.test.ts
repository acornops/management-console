import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  cancelWorkflowRun,
  createWorkflowSchedule,
  createWorkflow,
  createWorkflowMcpServer,
  createWorkflowSession,
  decideWorkflowRunApproval,
  deleteWorkflowSchedule,
  listWorkspaceApprovalInbox,
  listWorkspaceWorkflowSchedules,
  deleteWorkflow,
  listWorkflowMcpServers,
  listWorkflowMcpServerTools,
  listWorkflowOptions,
  listWorkflowRunApprovals,
  listWorkflowRunEvents,
  listWorkflowSessions,
  listWorkspaceWorkflows,
  postWorkflowSessionMessage,
  previewWorkflowSchedule,
  testWorkflowMcpServerConnection,
  updateWorkflow,
  updateWorkflowSchedule,
  updateWorkflowMcpServer
} from './workflowApi';

describe('workflow control-plane api', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('loads workspace workflow definitions from the control plane', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ items: [{ id: 'workflow-1', name: 'Audit tools' }] }), { status: 200 })
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(listWorkspaceWorkflows('workspace-1')).resolves.toEqual([
      { id: 'workflow-1', name: 'Audit tools' }
    ]);

    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8081/api/v1/workspaces/workspace-1/workflows');
  });

  it('loads workflow authoring options for dropdowns', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        clusters: [{ value: 'cluster-1', label: 'Cluster 1' }],
        repositories: [{ value: 'repo-1', label: 'Repo 1' }],
        mcpServers: [{ value: 'github', label: 'GitHub' }],
        mcpTools: [{ value: 'github.prs.create', label: 'github.prs.create' }],
        skills: [{ value: 'acornops-open-pr', label: 'acornops-open-pr' }],
        agents: [{ value: 'agent-release-coordinator', label: 'Repository Operator' }],
        chatSessions: [],
        outputFormats: [{ value: 'pdf', label: 'PDF' }],
        approvalPolicies: [],
        runtimeLimits: [],
        retentionPolicies: []
      }), { status: 200 })
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(listWorkflowOptions('workspace-1')).resolves.toMatchObject({
      mcpServers: [{ value: 'github', label: 'GitHub' }],
      skills: [{ value: 'acornops-open-pr', label: 'acornops-open-pr' }],
      agents: [{ value: 'agent-release-coordinator', label: 'Repository Operator' }]
    });

    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8081/api/v1/workspaces/workspace-1/workflow-options');
  });

  it('creates user-authored workflows with workflow-level MCP and skill scope', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrfToken: 'csrf-token-1' }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          workflow: {
            id: 'workflow-1',
            workspaceId: 'workspace-1',
            version: 1,
            source: 'user',
            name: 'Custom workflow',
            requiredPermissions: ['read_workspace_data'],
            enabledMcpServers: ['github'],
            enabledSkills: ['acornops-open-pr'],
            policy: {
              mode: 'read_write',
              maxRuntimeSeconds: 1800,
              retentionDays: 90,
              approvalRequirements: ['Before write-capable tools run']
            },
            steps: []
          }
        }), { status: 201 })
      );
    vi.stubGlobal('fetch', fetchMock);

    await expect(createWorkflow('workspace-1', {
      name: 'Custom workflow',
      enabledMcpServers: ['github'],
      enabledSkills: ['acornops-open-pr']
    })).resolves.toMatchObject({
      id: 'workflow-1',
      source: 'user',
      enabledMcpServers: ['github'],
      enabledSkills: ['acornops-open-pr']
    });

    const createCall = fetchMock.mock.calls[1];
    expect(createCall[0]).toBe('http://localhost:8081/api/v1/workspaces/workspace-1/workflows');
    expect(createCall[1]).toMatchObject({ method: 'POST', credentials: 'include' });
    expect(JSON.parse(createCall[1]?.body as string)).toEqual({
      name: 'Custom workflow',
      enabledMcpServers: ['github'],
      enabledSkills: ['acornops-open-pr']
    });
  });

  it('updates user-authored workflow definitions from the workflow route', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.endsWith('/api/v1/auth/csrf')) {
        return Promise.resolve(new Response(JSON.stringify({ csrfToken: 'csrf-token-1' }), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify({
        workflow: {
          id: 'workflow-1',
          name: 'Updated workflow',
          starterPrompt: 'Run the updated workflow.'
        }
      }), { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(updateWorkflow('workspace-1', 'workflow-1', {
      name: 'Updated workflow',
      starterPrompt: 'Run the updated workflow.'
    })).resolves.toMatchObject({
      id: 'workflow-1',
      name: 'Updated workflow',
      starterPrompt: 'Run the updated workflow.'
    });

    const updateCall = fetchMock.mock.calls.find((call) => String(call[0]).endsWith('/api/v1/workflows/workflow-1'));
    expect(updateCall?.[0]).toBe('http://localhost:8081/api/v1/workflows/workflow-1');
    expect(updateCall?.[1]).toMatchObject({ method: 'PATCH', credentials: 'include' });
    expect(JSON.parse(updateCall?.[1]?.body as string)).toEqual({
      workspaceId: 'workspace-1',
      name: 'Updated workflow',
      starterPrompt: 'Run the updated workflow.'
    });
  });

  it('deletes user-authored workflows from the workflow route', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.endsWith('/api/v1/auth/csrf')) {
        return Promise.resolve(new Response(JSON.stringify({ csrfToken: 'csrf-token-1' }), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify({ deleted: true }), { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(deleteWorkflow('workspace-1', 'workflow-1')).resolves.toBeUndefined();

    const deleteCall = fetchMock.mock.calls.find((call) => String(call[0]).endsWith('/api/v1/workflows/workflow-1'));
    expect(deleteCall?.[0]).toBe('http://localhost:8081/api/v1/workflows/workflow-1');
    expect(deleteCall?.[1]).toMatchObject({ method: 'DELETE', credentials: 'include' });
    expect(JSON.parse(deleteCall?.[1]?.body as string)).toEqual({ workspaceId: 'workspace-1' });
  });

  it('manages workspace MCP servers for workflow configuration', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.endsWith('/api/v1/auth/csrf')) {
        return Promise.resolve(new Response(JSON.stringify({ csrfToken: 'csrf-token-1' }), { status: 200 }));
      }
      if (url.endsWith('/api/v1/workspaces/workspace-1/mcp/servers') && !init?.method) {
        return Promise.resolve(new Response(JSON.stringify({ items: [{ id: 'github', name: 'GitHub' }] }), { status: 200 }));
      }
      if (url.endsWith('/api/v1/workspaces/workspace-1/mcp/servers') && init?.method === 'POST') {
        return Promise.resolve(new Response(JSON.stringify({ server: { id: 'pagerduty', name: 'PagerDuty' } }), { status: 201 }));
      }
      if (url.endsWith('/api/v1/workspaces/workspace-1/mcp/servers/pagerduty') && init?.method === 'PATCH') {
        return Promise.resolve(new Response(JSON.stringify({ server: { id: 'pagerduty', name: 'PagerDuty API' } }), { status: 200 }));
      }
      if (url.endsWith('/api/v1/workspaces/workspace-1/mcp/servers/pagerduty/test-connection')) {
        return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify({ items: ['pagerduty.incidents.read'] }), { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(listWorkflowMcpServers('workspace-1')).resolves.toEqual([{ id: 'github', name: 'GitHub' }]);
    await expect(createWorkflowMcpServer('workspace-1', { name: 'PagerDuty', url: 'https://mcp.example.com' })).resolves.toEqual({ id: 'pagerduty', name: 'PagerDuty' });
    await expect(updateWorkflowMcpServer('workspace-1', 'pagerduty', { name: 'PagerDuty API' })).resolves.toEqual({ id: 'pagerduty', name: 'PagerDuty API' });
    await expect(testWorkflowMcpServerConnection('workspace-1', 'pagerduty')).resolves.toEqual({ ok: true });
    await expect(listWorkflowMcpServerTools('workspace-1', 'pagerduty')).resolves.toEqual(['pagerduty.incidents.read']);

    const listCall = fetchMock.mock.calls.find((call) => String(call[0]).endsWith('/api/v1/workspaces/workspace-1/mcp/servers') && !call[1]?.method);
    const createCall = fetchMock.mock.calls.find((call) => String(call[0]).endsWith('/api/v1/workspaces/workspace-1/mcp/servers') && call[1]?.method === 'POST');
    const updateCall = fetchMock.mock.calls.find((call) => String(call[0]).endsWith('/api/v1/workspaces/workspace-1/mcp/servers/pagerduty') && call[1]?.method === 'PATCH');
    const testCall = fetchMock.mock.calls.find((call) => String(call[0]).endsWith('/api/v1/workspaces/workspace-1/mcp/servers/pagerduty/test-connection'));
    const toolsCall = fetchMock.mock.calls.find((call) => String(call[0]).endsWith('/api/v1/workspaces/workspace-1/mcp/servers/pagerduty/tools'));
    expect(listCall?.[0]).toBe('http://localhost:8081/api/v1/workspaces/workspace-1/mcp/servers');
    expect(createCall?.[1]).toMatchObject({ method: 'POST', credentials: 'include' });
    expect(updateCall?.[1]).toMatchObject({ method: 'PATCH', credentials: 'include' });
    expect(testCall?.[0]).toBe('http://localhost:8081/api/v1/workspaces/workspace-1/mcp/servers/pagerduty/test-connection');
    expect(toolsCall?.[0]).toBe('http://localhost:8081/api/v1/workspaces/workspace-1/mcp/servers/pagerduty/tools');
  });

  it('loads workflow sessions with run history', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        items: [
          {
            id: 'workflow-session-1',
            runs: [
              {
                id: 'run-1',
                workflowRunId: 'workflow-run-1',
                status: 'completed',
                createdBy: 'user-1',
                requestedAt: '2026-06-23T00:00:00.000Z',
                assistantMessage: { content: 'Audit complete' }
              }
            ]
          }
        ]
      }), { status: 200 })
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(listWorkflowSessions('workspace-1', 'workflow-1')).resolves.toEqual([
      {
        id: 'workflow-session-1',
        runs: [
          {
            id: 'run-1',
            workflowRunId: 'workflow-run-1',
            status: 'completed',
            createdBy: 'user-1',
            requestedAt: '2026-06-23T00:00:00.000Z',
            assistantMessage: { content: 'Audit complete' }
          }
        ]
      }
    ]);

    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8081/api/v1/workflows/workflow-1/sessions?workspaceId=workspace-1');
  });

  it('creates a workflow session with approved context grants and returns compiled access scope', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.endsWith('/api/v1/auth/csrf')) {
        return Promise.resolve(new Response(JSON.stringify({ csrfToken: 'csrf-token-1' }), { status: 200 }));
      }
      return Promise.resolve(
        new Response(JSON.stringify({
          session: { id: 'workflow-session-1' },
          compiledAccessScope: {
            workflowId: 'workflow-1',
            tools: ['mcp.tools.list'],
            contextGrants: ['workspace_metadata']
          }
        }), { status: 201 })
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(createWorkflowSession('workspace-1', 'workflow-1', {
      approvedContextGrants: ['workspace_metadata']
    })).resolves.toEqual({
      session: { id: 'workflow-session-1' },
      compiledAccessScope: {
        workflowId: 'workflow-1',
        tools: ['mcp.tools.list'],
        contextGrants: ['workspace_metadata']
      }
    });

    const sessionCall = fetchMock.mock.calls.find((call) => String(call[0]).endsWith('/api/v1/workflows/workflow-1/sessions'));
    expect(sessionCall?.[0]).toBe('http://localhost:8081/api/v1/workflows/workflow-1/sessions');
    const init = sessionCall?.[1];
    expect(init).toMatchObject({ method: 'POST', credentials: 'include' });
    expect(JSON.parse(init?.body as string)).toEqual({
      workspaceId: 'workspace-1',
      approvedContextGrants: ['workspace_metadata']
    });
  });

  it('posts workflow chat messages with workspace scope', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: 'accepted' }), { status: 202 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(postWorkflowSessionMessage('workspace-1', 'workflow-session-1', {
      content: 'Scope is all servers',
      inputs: { scope: 'all' }
    })).resolves.toEqual({ status: 'accepted' });

    const messageCall = fetchMock.mock.calls.at(-1);
    expect(messageCall?.[0]).toBe('http://localhost:8081/api/v1/workflow-sessions/workflow-session-1/messages');
    expect(JSON.parse(messageCall?.[1]?.body as string)).toEqual({
      workspaceId: 'workspace-1',
      content: 'Scope is all servers',
      inputs: { scope: 'all' }
    });
  });

  it('loads workflow run approvals through the public run history boundary', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([
        {
          id: 'approval-1',
          runId: 'run-1',
          workspaceId: 'workspace-1',
          toolCallId: 'tool-call-1',
          toolName: 'mcp.tools.list',
          status: 'pending',
          arguments: {},
          expiresAt: '2026-06-23T01:00:00.000Z'
        }
      ]), { status: 200 })
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(listWorkflowRunApprovals('run-1')).resolves.toEqual([
      {
        id: 'approval-1',
        runId: 'run-1',
        workspaceId: 'workspace-1',
        toolCallId: 'tool-call-1',
        toolName: 'mcp.tools.list',
        status: 'pending',
        arguments: {},
        expiresAt: '2026-06-23T01:00:00.000Z'
      }
    ]);

    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8081/api/v1/runs/run-1/approvals');
  });

  it('loads workflow run events for inline logs', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([
        {
          schema_version: 1,
          run_id: 'run-1',
          seq: 1,
          ts: '2026-06-23T01:00:00.000Z',
          type: 'run_started',
          payload: { message: 'started' }
        }
      ]), { status: 200 })
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(listWorkflowRunEvents('run-1')).resolves.toEqual([
      {
        schema_version: 1,
        run_id: 'run-1',
        seq: 1,
        ts: '2026-06-23T01:00:00.000Z',
        type: 'run_started',
        payload: { message: 'started' }
      }
    ]);

    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8081/api/v1/runs/run-1/events');
  });

  it('cancels active workflow runs through the public run boundary', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.endsWith('/api/v1/auth/csrf')) {
        return Promise.resolve(new Response(JSON.stringify({ csrfToken: 'csrf-token-1' }), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify({ status: 'accepted' }), { status: 202 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(cancelWorkflowRun('run-1')).resolves.toBeUndefined();

    const cancelCall = fetchMock.mock.calls.find((call) => String(call[0]).endsWith('/api/v1/runs/run-1/cancel'));
    expect(cancelCall?.[0]).toBe('http://localhost:8081/api/v1/runs/run-1/cancel');
    expect(cancelCall?.[1]).toMatchObject({ method: 'POST', credentials: 'include' });
  });

  it('decides workflow run approvals with CSRF protected POSTs', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.endsWith('/api/v1/auth/csrf')) {
        return Promise.resolve(new Response(JSON.stringify({ csrfToken: 'csrf-token-1' }), { status: 200 }));
      }
      return Promise.resolve(
        new Response(JSON.stringify({
          id: 'approval-1',
          runId: 'run-1',
          workspaceId: 'workspace-1',
          toolCallId: 'tool-call-1',
          toolName: 'mcp.tools.list',
          status: 'approved',
          arguments: {},
          expiresAt: '2026-06-23T01:00:00.000Z'
        }), { status: 200 })
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(decideWorkflowRunApproval('run-1', 'approval-1', 'approved')).resolves.toMatchObject({
      id: 'approval-1',
      status: 'approved'
    });

    const approvalCall = fetchMock.mock.calls.find((call) => String(call[0]).includes('/approvals/approval-1/decision'));
    expect(approvalCall).toBeDefined();
    if (!approvalCall) return;
    expect(approvalCall[0]).toBe('http://localhost:8081/api/v1/runs/run-1/approvals/approval-1/decision');
    expect(approvalCall[1]).toMatchObject({
      method: 'POST',
      credentials: 'include'
    });
    expect(new Headers(approvalCall[1]?.headers).get('x-csrf-token')).toBe('csrf-token-1');
    expect(JSON.parse(approvalCall[1]?.body as string)).toEqual({ decision: 'approved' });
  });

  it('manages workflow schedules through the workspace schedule endpoints', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.endsWith('/api/v1/auth/csrf')) {
        return Promise.resolve(new Response(JSON.stringify({ csrfToken: 'csrf-token-1' }), { status: 200 }));
      }
      if (url.endsWith('/api/v1/workspaces/workspace-1/workflow-schedules') && !init?.method) {
        return Promise.resolve(new Response(JSON.stringify({
          items: [{ id: 'schedule-1', workflowId: 'workflow-1', name: 'Daily triage' }],
          summary: { active: 1, paused: 0, approvalGated: 1, nextRunAt: '2026-06-28T09:00:00.000Z' }
        }), { status: 200 }));
      }
      if (url.endsWith('/api/v1/workspaces/workspace-1/workflow-schedules') && init?.method === 'POST') {
        return Promise.resolve(new Response(JSON.stringify({ schedule: { id: 'schedule-1', name: 'Daily triage' } }), { status: 201 }));
      }
      if (url.endsWith('/api/v1/workspaces/workspace-1/workflow-schedules/preview') && init?.method === 'POST') {
        return Promise.resolve(new Response(JSON.stringify({
          valid: true,
          summary: 'Weekdays at 09:00 (UTC)',
          nextRunTimes: ['2026-06-29T09:00:00.000Z'],
          errors: []
        }), { status: 200 }));
      }
      if (url.endsWith('/api/v1/workflow-schedules/schedule-1') && init?.method === 'PATCH') {
        return Promise.resolve(new Response(JSON.stringify({ schedule: { id: 'schedule-1', status: 'paused' } }), { status: 200 }));
      }
      return Promise.resolve(new Response(null, { status: 204 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(listWorkspaceWorkflowSchedules('workspace-1')).resolves.toMatchObject({
      items: [{ id: 'schedule-1', name: 'Daily triage' }],
      summary: { active: 1, approvalGated: 1 }
    });
    await expect(createWorkflowSchedule('workspace-1', {
      workflowId: 'workflow-1',
      name: 'Daily triage',
      cron: '0 9 * * 1-5',
      timezone: 'UTC',
      inputDefaults: { clusterId: 'cluster-primary' },
      approvedContextGrants: ['workspace_metadata']
    })).resolves.toMatchObject({ id: 'schedule-1' });
    await expect(previewWorkflowSchedule('workspace-1', {
      workflowId: 'workflow-1',
      name: 'Daily triage',
      cron: '0 9 * * 1-5',
      timezone: 'UTC',
      inputDefaults: { clusterId: 'cluster-primary' },
      approvedContextGrants: ['workspace_metadata']
    })).resolves.toMatchObject({ valid: true, summary: 'Weekdays at 09:00 (UTC)' });
    await expect(updateWorkflowSchedule('workspace-1', 'schedule-1', { enabled: false })).resolves.toMatchObject({
      id: 'schedule-1',
      status: 'paused'
    });
    await expect(deleteWorkflowSchedule('workspace-1', 'schedule-1')).resolves.toBeUndefined();

    expect(fetchMock.mock.calls.some((call) => call[0] === 'http://localhost:8081/api/v1/workspaces/workspace-1/workflow-schedules')).toBe(true);
    const createCall = fetchMock.mock.calls.find((call) => call[1]?.method === 'POST' && String(call[0]).endsWith('/workflow-schedules'));
    expect(JSON.parse(createCall?.[1]?.body as string)).toEqual({
      workflowId: 'workflow-1',
      name: 'Daily triage',
      cron: '0 9 * * 1-5',
      timezone: 'UTC',
      inputDefaults: { clusterId: 'cluster-primary' },
      approvedContextGrants: ['workspace_metadata']
    });
    const patchCall = fetchMock.mock.calls.find((call) => call[1]?.method === 'PATCH');
    expect(JSON.parse(patchCall?.[1]?.body as string)).toEqual({ workspaceId: 'workspace-1', enabled: false });
    const deleteCall = fetchMock.mock.calls.find((call) => call[1]?.method === 'DELETE');
    expect(JSON.parse(deleteCall?.[1]?.body as string)).toEqual({ workspaceId: 'workspace-1' });
  });

  it('loads the unified workspace approval inbox and decides rows by run id', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.endsWith('/api/v1/auth/csrf')) {
        return Promise.resolve(new Response(JSON.stringify({ csrfToken: 'csrf-token-1' }), { status: 200 }));
      }
      if (url.includes('/api/v1/workspaces/workspace-1/approvals')) {
        return Promise.resolve(new Response(JSON.stringify({
          pendingCount: 17,
          items: [{
            approvalId: 'approval-1',
            runId: 'run-1',
            source: 'workflow_gate',
            workflowId: 'workflow-1',
            summary: 'Before write-capable tools',
            toolName: 'workflow.approval_gate',
            requestedBy: 'user-1',
            expiresAt: '2026-06-28T09:05:00.000Z',
            status: 'pending',
            requestedAt: '2026-06-28T09:00:00.000Z'
          }]
        }), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify({ id: 'approval-1', status: 'approved' }), { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(listWorkspaceApprovalInbox('workspace-1', { status: 'pending', limit: 25 })).resolves.toMatchObject({
      pendingCount: 17,
      items: [{ approvalId: 'approval-1', source: 'workflow_gate', runId: 'run-1' }]
    });
    await expect(decideWorkflowRunApproval('run-1', 'approval-1', 'approved')).resolves.toMatchObject({ status: 'approved' });

    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8081/api/v1/workspaces/workspace-1/approvals?status=pending&limit=25');
  });

  it('hides unavailable pending counts from older or invalid producers', async () => {
    const responses = [
      { items: [], pendingCount: '4' },
      { items: [], pendingCount: -1 },
      { items: [] }
    ];
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => Promise.resolve(
      new Response(JSON.stringify(responses.shift()), { status: 200 })
    )));

    await expect(listWorkspaceApprovalInbox('workspace-1')).resolves.toEqual({ items: [] });
    await expect(listWorkspaceApprovalInbox('workspace-1')).resolves.toEqual({ items: [] });
    await expect(listWorkspaceApprovalInbox('workspace-1')).resolves.toEqual({ items: [] });
  });
});
