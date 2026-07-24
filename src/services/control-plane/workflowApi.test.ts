import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  cancelWorkflowRun,
  createWorkflowSchedule,
  createWorkflow,
  createWorkflowSession,
  decideWorkflowRunApproval,
  deleteWorkflowSchedule,
  duplicateWorkflow,
  getWorkflowExecution,
  listWorkspaceApprovalInbox,
  listWorkspaceWorkflowSchedules,
  deleteWorkflow,
  listWorkflowOptions,
  listWorkflowRunApprovals,
  listWorkflowRunEvents,
  listWorkflowSessions,
  listWorkspaceWorkflows,
  normalizeWorkflowCapabilitiesPreview,
  postWorkflowSessionMessage,
  previewWorkflowCapabilities,
  previewWorkflowSchedule,
  updateWorkflow,
  updateWorkflowSchedule
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
        mcpServers: [{ value: 'github', label: 'GitHub' }],
        mcpTools: [{ value: 'github.prs.create', label: 'github.prs.create' }],
        skills: [{ value: 'acornops-open-pr', label: 'acornops-open-pr' }],
        agents: [{ value: 'agent-release-coordinator', label: 'Workflow Analyst' }],
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
      agents: [{ value: 'agent-release-coordinator', label: 'Workflow Analyst' }]
    });

    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8081/api/v1/workspaces/workspace-1/workflow-options');
  });

  it('loads sanitized coordinated execution children', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      execution: { id: 'execution-1', status: 'running' },
      attempts: [],
      coordination: {
        label: 'AcornOps coordination',
        status: 'running',
        children: [{
          id: 'delegation-1',
          capabilityId: 'target.diagnostics.read',
          target: { id: 'cluster-1', targetType: 'kubernetes' },
          agent: { id: 'agent-1', name: 'Workflow Analyst' },
          required: true,
          status: 'running'
        }]
      }
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await getWorkflowExecution('execution-1');

    expect(response.coordination?.children[0]).toMatchObject({
      capabilityId: 'target.diagnostics.read',
      agent: { name: 'Workflow Analyst' },
      status: 'running'
    });
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8081/api/v1/workflow-executions/execution-1');
  });

  it('creates V2 workflows with selected Agents and a server-derived execution mode', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrfToken: 'csrf-token-1' }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          workflow: {
            id: 'workflow-1',
            workspaceId: 'workspace-1',
            version: 1,
            origin: { type: 'manual' },
            name: 'Custom workflow',
            prompt: 'Inspect the repository.',
            agentIds: ['agent-1'],
            executionMode: 'direct',
            requiredPermissions: ['read_workspace_data'],
            capabilityPolicy: {
              mode: 'read_write',
              semanticCapabilityIds: ['scm.repository.read'],
              contextGrants: [],
              maxRuntimeSeconds: 1800,
              retentionDays: 90,
              approvalRequirements: ['Before write-capable tools run']
            }
          }
        }), { status: 201 })
      );
    vi.stubGlobal('fetch', fetchMock);

    await expect(createWorkflow('workspace-1', {
      name: 'Custom workflow',
      prompt: 'Inspect the repository.',
      agentIds: ['agent-1'],
      capabilityPolicy: {
        mode: 'read_write',
        semanticCapabilityIds: ['scm.repository.read'],
        contextGrants: [],
        approvalRequirements: ['Before write-capable tools run']
      }
    })).resolves.toMatchObject({
      id: 'workflow-1',
      origin: { type: 'manual' },
      agentIds: ['agent-1'],
      executionMode: 'direct'
    });

    const createCall = fetchMock.mock.calls[1];
    expect(createCall[0]).toBe('http://localhost:8081/api/v1/workspaces/workspace-1/workflows');
    expect(createCall[1]).toMatchObject({ method: 'POST', credentials: 'include' });
    expect(JSON.parse(createCall[1]?.body as string)).toEqual({
      name: 'Custom workflow',
      prompt: 'Inspect the repository.',
      agentIds: ['agent-1'],
      capabilityPolicy: {
        mode: 'read_write',
        semanticCapabilityIds: ['scm.repository.read'],
        contextGrants: [],
        approvalRequirements: ['Before write-capable tools run']
      }
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
          prompt: 'Run the updated workflow.'
        }
      }), { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(updateWorkflow('workspace-1', 'workflow-1', {
      agentIds: ['agent-1'],
      name: 'Updated workflow',
      prompt: 'Run the updated workflow.'
    })).resolves.toMatchObject({
      id: 'workflow-1',
      name: 'Updated workflow',
      prompt: 'Run the updated workflow.'
    });

    const updateCall = fetchMock.mock.calls.find((call) => String(call[0]).endsWith('/api/v1/workflows/workflow-1'));
    expect(updateCall?.[0]).toBe('http://localhost:8081/api/v1/workflows/workflow-1');
    expect(updateCall?.[1]).toMatchObject({ method: 'PATCH', credentials: 'include' });
    expect(JSON.parse(updateCall?.[1]?.body as string)).toEqual({
      workspaceId: 'workspace-1',
      agentIds: ['agent-1'],
      name: 'Updated workflow',
      prompt: 'Run the updated workflow.'
    });
  });

  it('duplicates an effective workflow definition into a custom draft', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.endsWith('/api/v1/auth/csrf')) return Promise.resolve(new Response(JSON.stringify({ csrfToken: 'csrf-token-1' }), { status: 200 }));
      return Promise.resolve(new Response(JSON.stringify({ workflow: { id: 'workflow-copy', workspaceId: 'workspace-1', version: 1, source: 'user', createdBy: 'user-1', name: 'Triage copy', status: 'draft', requiredPermissions: [], policy: { mode: 'read_only', maxRuntimeSeconds: 900, retentionDays: 90, approvalRequirements: [] }, steps: [] } }), { status: 201 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(duplicateWorkflow('workspace-1', 'cluster-triage', 'Triage copy')).resolves.toMatchObject({ id: 'workflow-copy', source: 'user', status: 'draft' });
    const call = fetchMock.mock.calls.find((item) => String(item[0]).endsWith('/api/v1/workflows/cluster-triage/duplicate'));
    expect(call?.[1]).toMatchObject({ method: 'POST', credentials: 'include' });
    expect(JSON.parse(call?.[1]?.body as string)).toEqual({ workspaceId: 'workspace-1', name: 'Triage copy' });
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

  it('loads workflow sessions with run history', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        items: [
          {
            id: 'workflow-session-1',
            runs: [
              {
                id: 'run-1',
                executionId: 'workflow-execution-1',
                executorRole: 'specialist',
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
            executionId: 'workflow-execution-1',
            executorRole: 'specialist',
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

  it('creates a workflow session with approved context grants without exposing compiled access scope', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.endsWith('/api/v1/auth/csrf')) {
        return Promise.resolve(new Response(JSON.stringify({ csrfToken: 'csrf-token-1' }), { status: 200 }));
      }
      return Promise.resolve(
        new Response(JSON.stringify({
          session: { id: 'workflow-session-1' }
        }), { status: 201 })
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(createWorkflowSession('workspace-1', 'workflow-1', {
      approvedContextGrants: ['workspace_metadata']
    })).resolves.toEqual({
      session: { id: 'workflow-session-1' }
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

  it('previews an exact workflow target without creating a session or run', async () => {
    const payload = {
      workflowId: 'workflow-1', workflowVersion: 4, mode: 'read_write', semanticCapabilityIds: ['target.remediation.write'],
      checkedAt: '2026-07-17T00:00:00.000Z', status: 'ready', reasonCodes: [], targetCandidates: [],
      selectedTarget: { id: 'cluster-1', name: 'Development', targetType: 'kubernetes', status: 'ready' },
      tools: { read: [], write: [] }, directMcpServers: [], enabledSkills: [], approvalRequirements: [],
      counts: { targets: 1, readyTargets: 1, tools: 0, readTools: 0, writeTools: 0, directMcpServers: 0, enabledSkills: 0, approvals: 0 }
    };
    const fetchMock = vi.fn().mockImplementation((url: string) => Promise.resolve(
      new Response(JSON.stringify(url.endsWith('/api/v1/auth/csrf') ? { csrfToken: 'csrf-token-1' } : payload), { status: 200 })
    ));
    vi.stubGlobal('fetch', fetchMock);

    await expect(previewWorkflowCapabilities('workspace-1', 'workflow-1', {
      approvedContextGrants: ['target_inventory'],
      content: 'Inspect @target[Development].'
    })).resolves.toEqual({ ...payload, mcpRequirements: [] });

    const previewCall = fetchMock.mock.calls.find((call) => String(call[0]).endsWith('/api/v1/workflows/workflow-1/capabilities-preview'))!;
    expect(previewCall[0]).toBe('http://localhost:8081/api/v1/workflows/workflow-1/capabilities-preview');
    expect(JSON.parse(previewCall[1]?.body as string)).toEqual({
      workspaceId: 'workspace-1', approvedContextGrants: ['target_inventory'],
      content: 'Inspect @target[Development].'
    });
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes('/sessions'))).toBe(false);
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes('/messages'))).toBe(false);
  });

  it('preserves generic MCP authentication recovery metadata without provider profiles', () => {
    const preview = normalizeWorkflowCapabilitiesPreview({
      workflowId: 'workflow-1', workflowVersion: 4, mode: 'read_only', semanticCapabilityIds: [],
      checkedAt: '2026-07-19T00:00:00.000Z', status: 'blocked', reasonCodes: ['MCP_CONNECTION_UNAVAILABLE'],
      targetCandidates: [], tools: { read: [], write: [] }, directMcpServers: [], enabledSkills: [], approvalRequirements: [],
      mcpRequirements: [{
        serverId: 'server-1', serverName: 'User-selected MCP server', authType: 'custom_header',
        owningAgent: { id: 'agent-1', name: 'User-created Agent' }, connectionState: 'connection_missing',
        authRequirement: { scope: 'individual', credentialLabel: 'Custom header credential', requiredInformation: [] },
        action: 'connect_mcp_server'
      }],
      counts: { targets: 0, readyTargets: 0, tools: 0, readTools: 0, writeTools: 0, directMcpServers: 0, enabledSkills: 0, approvals: 0 }
    });

    expect(preview.mcpRequirements).toEqual([{
      serverId: 'server-1', serverName: 'User-selected MCP server', authType: 'custom_header',
      owningAgent: { id: 'agent-1', name: 'User-created Agent' }, connectionState: 'connection_missing',
      authRequirement: { scope: 'individual', credentialLabel: 'Custom header credential', requiredInformation: [] },
      action: 'connect_mcp_server'
    }]);
  });

  it('posts only prompt content for a resource-bound workflow run', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: 'accepted' }), { status: 202 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(postWorkflowSessionMessage('workflow-session-1', {
      content: 'Triage @target[Development].'
    })).resolves.toEqual({ status: 'accepted' });

    const messageCall = fetchMock.mock.calls.at(-1);
    expect(messageCall?.[0]).toBe('http://localhost:8081/api/v1/workflow-sessions/workflow-session-1/messages');
    expect(JSON.parse(messageCall?.[1]?.body as string)).toEqual({
      content: 'Triage @target[Development].'
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
      principal: { type: 'user', id: 'user-1' },
      workflowId: 'workflow-1',
      name: 'Daily triage',
      cron: '0 9 * * 1-5',
      timezone: 'UTC',
      controlMessage: 'Inspect @target[Development].',
      approvedContextGrants: ['workspace_metadata']
    })).resolves.toMatchObject({ id: 'schedule-1' });
    await expect(previewWorkflowSchedule('workspace-1', {
      principal: { type: 'user', id: 'user-1' },
      workflowId: 'workflow-1',
      name: 'Daily triage',
      cron: '0 9 * * 1-5',
      timezone: 'UTC',
      controlMessage: 'Inspect @target[Development].',
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
      principal: { type: 'user', id: 'user-1' },
      workflowId: 'workflow-1',
      name: 'Daily triage',
      cron: '0 9 * * 1-5',
      timezone: 'UTC',
      controlMessage: 'Inspect @target[Development].',
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

    await expect(listWorkspaceApprovalInbox('workspace-1', {
      status: 'pending',
      limit: 25,
      runId: 'run-1',
      approvalId: 'approval-1'
    })).resolves.toMatchObject({
      pendingCount: 17,
      items: [{ approvalId: 'approval-1', source: 'workflow_gate', runId: 'run-1' }]
    });
    await expect(decideWorkflowRunApproval('run-1', 'approval-1', 'approved')).resolves.toMatchObject({ status: 'approved' });

    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8081/api/v1/workspaces/workspace-1/approvals?status=pending&limit=25&runId=run-1&approvalId=approval-1');
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
