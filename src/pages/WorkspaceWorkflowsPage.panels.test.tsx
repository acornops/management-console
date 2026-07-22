import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { WorkflowDefinition } from './workflows/workflowModel';
import { WorkflowRunsPanel } from './WorkspaceWorkflowsPage.panels';

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
    resourceRequirements: [],
    owner: 'AcornOps',
    tags: [],
    lastRun: 'Just now',
    agents: [],
    requiredPermissions: [],
    contextGrants: [],
    inputs: [],
    policy: { mode: 'read_only', approvals: [] },
    starterPrompt: 'Inspect @target[].',
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
      workflowSessionId=""
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
});
