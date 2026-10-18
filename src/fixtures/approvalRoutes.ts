import { FIXTURE_IDS, type FixtureState } from './store';
import type { FixtureResponse } from './router';

const json = (body: unknown, status = 200): FixtureResponse => ({
  status,
  body,
  headers: { 'content-type': 'application/json' }
});

function browserApproval(row: Record<string, unknown>) {
  const gate = row.source === 'workflow_gate';
  return {
    id: row.approvalId, runId: row.runId, workspaceId: FIXTURE_IDS.workspace,
    ...(row.source === 'interactive_tool' ? { targetId: row.targetId, targetType: row.targetType } : { approvalKind: gate ? 'pre_step' : 'tool_write' }),
    toolCallId: `${row.approvalId}-call`, toolName: gate ? 'workflow.approval_gate' : row.toolName,
    summary: row.summary,
    arguments: gate ? { workflowId: row.workflowId, executionId: String(row.runId).replace(/-run$/, '') }
      : { namespace: 'payments', kind: 'Deployment', name: 'payments-worker' },
    status: row.status, executionStatus: row.executionStatus || 'not_started',
    requestedBy: row.requestedBy, createdAt: row.requestedAt, expiresAt: row.expiresAt,
    ...(row.decision ? { decision: row.decision, decidedBy: row.decidedBy, decidedAt: row.decidedAt } : {})
  };
}

function waitingGate(state: FixtureState, runId: string, now: string) {
  const execution = state.workflowExecutions.find((item) => item.rootRun?.id === runId);
  if (execution?.status !== 'waiting_for_approval') return undefined;
  return {
    approvalId: 'fixture-run-approval', runId, workflowId: execution.workflow.id, source: 'workflow_gate',
    toolName: 'workflow.approval_gate', summary: 'Review production health workflow dispatch.',
    requestedBy: FIXTURE_IDS.user, status: 'pending', requestedAt: now,
    expiresAt: new Date(Date.parse(now) + 15 * 60_000).toISOString()
  };
}

export async function routeApprovalFixtureRequest({
  request,
  state,
  path,
  method,
  url,
  now
}: {
  request: Request;
  state: FixtureState;
  path: string;
  method: string;
  url: URL;
  now: string;
}): Promise<FixtureResponse | null> {
  let match = path.match(/^\/api\/v1\/runs\/([^/]+)\/approvals$/);
  if (match && method === 'GET') {
    const runId = decodeURIComponent(match[1]);
    const rows = state.approvals.filter((item) => item.runId === runId);
    const gate = waitingGate(state, runId, now);
    return json(rows.length ? rows.map(browserApproval) : gate ? [browserApproval(gate)] : []);
  }

  match = path.match(/^\/api\/v1\/runs\/([^/]+)\/approvals\/([^/]+)\/decision$/);
  if (match && method === 'POST') {
    const runId = decodeURIComponent(match[1]);
    const approvalId = decodeURIComponent(match[2]);
    let approval = state.approvals.find((item) => item.runId === runId && item.approvalId === approvalId);
    if (!approval && approvalId === 'fixture-run-approval') {
      approval = waitingGate(state, runId, now);
      if (approval) state.approvals.push(approval);
    }
    if (!approval) return json({ error: { code: 'FIXTURE_NOT_FOUND', message: 'Approval was not found in the frontend fixture store.' } }, 404);
    const input = await request.json() as { decision?: string };
    const decision = input.decision === 'rejected' ? 'rejected' : 'approved';
    if (approval.status === 'pending' && Date.parse(approval.expiresAt) <= Date.parse(now)) approval.status = 'expired';
    if (approval.status !== 'pending') {
      if (approval.decision === decision) return json(browserApproval(approval));
      return json({
        error: { code: approval.status === 'expired' ? 'APPROVAL_EXPIRED' : 'APPROVAL_ALREADY_DECIDED', message: `Approval is already ${approval.status}`, retryable: false },
        approval: browserApproval(approval)
      }, 409);
    }
    Object.assign(approval, { status: decision, decision, decidedBy: 'Ning', decidedAt: now });
    return json(browserApproval(approval));
  }

  match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/approvals$/);
  if (!match || method !== 'GET') return null;
  const status = url.searchParams.get('status') || 'pending';
  const runId = url.searchParams.get('runId');
  const approvalId = url.searchParams.get('approvalId');
  const limit = Math.max(1, Number(url.searchParams.get('limit') || 50));
  const pendingCount = state.approvals.filter((item) => item.status === 'pending').length;
  const items = state.approvals
    .filter((item) => status === 'all' || (status === 'pending' ? item.status === 'pending' : item.status !== 'pending'))
    .filter((item) => !runId || item.runId === runId)
    .filter((item) => !approvalId || item.approvalId === approvalId)
    .slice(0, limit);
  return json({ items: structuredClone(items), pendingCount });
}
