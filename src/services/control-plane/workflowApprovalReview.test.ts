import { afterEach, describe, expect, it, vi } from 'vitest';
import { listWorkflowRunApprovals, selectWorkflowApprovalReview } from './workflowApi';

const tool = {
  id: 'tool-1', runId: 'run-1', workspaceId: 'workspace-1', toolCallId: 'call-1',
  targetId: 'cluster-1', targetType: 'kubernetes', toolName: 'scale_workload',
  arguments: { namespace: 'payments', name: 'api', replicas: 0 }, summary: 'Scale safely',
  status: 'pending', expiresAt: '2026-10-19T00:00:00.000Z', requestedBy: 'operator-1'
};
const gate = {
  id: 'gate-1', runId: 'run-1', workspaceId: 'workspace-1', approvalKind: 'pre_step',
  toolCallId: 'workflow-gate-1', toolName: 'workflow.approval_gate', summary: 'Review workflow dispatch',
  arguments: { workflowId: 'workflow-1', executionId: 'execution-1' }, status: 'pending',
  executionStatus: 'not_started', createdAt: '2026-10-18T00:00:00.000Z', expiresAt: '2026-10-19T00:00:00.000Z'
};

describe('run-scoped approval review boundary', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('loads the existing run list and selects exact identity, not the first summary', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify([gate, tool]))));
    const records = await listWorkflowRunApprovals('run-1');
    expect(selectWorkflowApprovalReview(records, 'workspace-1', 'run-1', 'tool-1')).toMatchObject(tool);
  });

  it('preserves the real workflow gate discriminant without inventing a target', () => {
    expect(selectWorkflowApprovalReview([gate], 'workspace-1', 'run-1', 'gate-1')).toEqual(gate);
  });

  it.each([
    ['workspace-2', 'run-1', 'tool-1'], ['workspace-1', 'run-2', 'tool-1'],
    ['workspace-1', 'run-1', 'absent']
  ])('fails closed for mismatched scope %s %s %s', (workspaceId, runId, id) => {
    expect(() => selectWorkflowApprovalReview([tool], workspaceId, runId, id)).toThrow('Approval review context is not available');
  });

  it('does not turn bounded external metadata or missing arguments into an empty action', () => {
    // Literal projection from CP publicRunApproval: it intentionally omits
    // toolCallId, executable arguments, refs/digests, actors and tool results.
    const external = { id: tool.id, runId: tool.runId, workspaceId: tool.workspaceId, targetId: tool.targetId, targetType: tool.targetType, status: 'pending', toolName: tool.toolName, summary: tool.summary, expiresAt: tool.expiresAt };
    expect(() => selectWorkflowApprovalReview([external], 'workspace-1', 'run-1', tool.id)).toThrow('Approval review context is not available');
    expect(() => selectWorkflowApprovalReview([{ ...tool, arguments: undefined }], 'workspace-1', 'run-1', tool.id)).toThrow('Approval review context is not available');
    expect(() => selectWorkflowApprovalReview([{ ...tool, arguments: [] }], 'workspace-1', 'run-1', tool.id)).toThrow('Approval review context is not available');
  });

  it('rejects ambiguous identities and unknown workflow kinds', () => {
    expect(() => selectWorkflowApprovalReview([tool, tool], 'workspace-1', 'run-1', tool.id)).toThrow('Approval review context is not available');
    expect(() => selectWorkflowApprovalReview([{ ...tool, approvalKind: 'agent_gate' }], 'workspace-1', 'run-1', tool.id)).toThrow('Approval review context is not available');
  });
});
