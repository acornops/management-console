import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { AgentDefinition } from './agents/agentModel';
import type { WorkflowDefinition } from './workflows/workflowModel';
import { WorkflowCapabilitiesPanel, WorkflowRunsPanel } from './WorkspaceWorkflowsPage.panels';
import { mapWorkflowRunSummary } from './workflows/workflowPageHelpers';

function workflowWithRun(run: WorkflowDefinition['runs'][number]): WorkflowDefinition {
  return {
    id: 'workflow-1',
    workspaceId: 'workspace-1',
    name: 'Target diagnostics',
    description: 'Inspect one target.',
    status: 'active',
    agentIds: ['agent-1'],
    executionMode: 'direct',
    semanticCapabilityIds: ['target.diagnostics.read'],
    capabilityRestrictionMode: 'restrict',
    owner: 'AcornOps',
    tags: [],
    lastRun: 'Just now',
    agents: [],
    requiredPermissions: [],
    contextGrants: [],
    policy: { mode: 'read_only', approvals: [] },
    starterPrompt: 'Inspect production health.',
    runs: [run]
  };
}

function renderRunsPanel(workflow: WorkflowDefinition): string {
  return renderToStaticMarkup(
    <WorkflowRunsPanel
      workflow={workflow}
      approvalError=""
      runLogError=""
      cancelRunError=""
      approvalRecords={{}}
      expandedRunLogId=""
      runEventsByRunId={{}}
      cancelRunAction=""
      workflowActions={{
        stopWorkflowRun: vi.fn(),
        decideApproval: vi.fn(),
        toggleRunLogs: vi.fn(),
        updateWorkflowRunMessageDraft: vi.fn(),
        sendWorkflowRunMessage: vi.fn()
      }}
      approvalAction=""
      workflowSessionIds={{}}
      runMessagesByRunId={{}}
      runMessageDrafts={{}}
      runMessageSendingId=""
      runMessageErrorByRunId={{}}
      runMessageRecoveryByRunId={{}}
      setExpandedRunLogId={vi.fn()}
    />
  );
}

describe('WorkflowRunsPanel run identity boundary', () => {
  it('does not expose server run-history controls for an optimistic local run', () => {
    const html = renderRunsPanel(workflowWithRun({
      id: 'local-workflow-run-1784621869248',
      status: 'dispatching',
      actor: 'You',
      duration: 'Starting',
      approvals: 0,
      output: 'Starting workflow run.',
      startedAt: 'Just now'
    }));

    expect(html).toContain('Starting workflow run.');
    expect(html).not.toContain('aria-label="Stop workflow run"');
    expect(html).not.toContain('Show run details');
  });

  it('keeps server run-history controls available after the control plane returns a run ID', () => {
    const html = renderRunsPanel(workflowWithRun({
      id: 'workflow-run-1',
      runId: 'run-1',
      status: 'running',
      actor: 'You',
      duration: 'In progress',
      approvals: 0,
      output: 'Workflow run is in progress.',
      startedAt: 'Just now'
    }));

    expect(html).toContain('aria-label="Stop workflow run"');
    expect(html).toContain('Show run details');
  });

  it('labels approval and review pauses without implying that work is still progressing', () => {
    const waiting = mapWorkflowRunSummary({
      id: 'run-waiting',
      executionId: 'execution-waiting',
      status: 'waiting_for_approval',
      requestedAt: '2026-07-15T08:00:00.000Z'
    });
    const needsReview = mapWorkflowRunSummary({
      id: 'run-review',
      executionId: 'execution-review',
      status: 'needs_review',
      requestedAt: '2026-07-15T08:00:00.000Z'
    });

    const waitingHtml = renderRunsPanel(workflowWithRun(waiting));
    const reviewHtml = renderRunsPanel(workflowWithRun(needsReview));

    expect(waiting.duration).toBe('Waiting for approval');
    expect(waiting.output).toBe('Workflow run is waiting for approval.');
    expect(waitingHtml).toContain('Waiting for approval');
    expect(waitingHtml).not.toContain('Workflow run is in progress.');
    expect(waitingHtml).not.toContain('Workflow running');
    expect(reviewHtml).toContain('workflowActivity.status.needs_review');
    expect(reviewHtml).not.toContain('Working');
  });
});

describe('WorkflowCapabilitiesPanel', () => {
  it('groups tools by Agent and labels write tools that require approval', () => {
    const workflow = workflowWithRun({
      id: 'workflow-run-1',
      runId: 'run-1',
      status: 'running',
      actor: 'You',
      duration: 'In progress',
      approvals: 0,
      output: 'Workflow run is in progress.',
      startedAt: 'Just now'
    });
    workflow.agents = [{ agentId: 'agent-1', name: 'Kubernetes Operator', role: 'Direct', required: true }];
    const agent: AgentDefinition = {
      id: 'agent-1', workspaceId: 'workspace-1', name: 'Kubernetes Operator', avatarEmoji: 'K',
      description: '', instructions: '', status: 'active', origin: { type: 'manual' }, reviewState: 'reviewed',
      providerType: 'internal', createdBy: 'user-1', owner: 'Operator', version: 1,
      mcpServers: [], tools: ['patch_resource'], nativeToolConfigs: {}, skills: [], semanticCapabilityIds: [],
      targetScope: ['workspace'], contextScope: [], permissionMode: 'ask_before_changes',
      trustPolicy: { boundary: 'Workspace', dataEgress: 'Blocked' },
      capabilities: [{ source: 'builtin_tool', resourceType: 'kubernetes', resourceScope: 'target', toolId: 'patch_resource', operation: 'write', requiresApproval: true }],
      workflowsUsingAgent: [], workflowUsage: { workflowRunCount: 0 }, readiness: { status: 'ready', reasons: [] }
    };

    const html = renderToStaticMarkup(
      <WorkflowCapabilitiesPanel workflow={workflow} agents={[agent]} catalogFailures={[]} onRetryCatalog={vi.fn()} />
    );

    expect(html).toContain('Capabilities');
    expect(html).toContain('Kubernetes Operator');
    expect(html).toContain('patch_resource');
    expect(html).toContain('Write');
    expect(html).toContain('Approval required');
    expect(html).toContain('Approval required before every write-capable tool');
    expect(html).not.toContain('Workflow approval gates');
  });
});
