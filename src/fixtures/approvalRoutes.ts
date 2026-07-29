import { FIXTURE_IDS, type FixtureState } from './store';
import type { FixtureResponse } from './router';

const json = (body: unknown, status = 200): FixtureResponse => ({
  status,
  body,
  headers: { 'content-type': 'application/json' }
});

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
    const waiting = state.workflowExecutions.find((item) => item.rootRun?.id === runId)?.status === 'waiting_for_approval';
    return json(waiting ? [{
      id: 'fixture-run-approval',
      runId,
      workspaceId: FIXTURE_IDS.workspace,
      toolName: 'restart_workload',
      summary: 'Restart the affected workload after reviewing the current replica state.',
      status: 'pending',
      createdAt: now,
      expiresAt: new Date(Date.now() + 24 * 60 * 60_000).toISOString()
    }] : []);
  }

  match = path.match(/^\/api\/v1\/runs\/([^/]+)\/approvals\/([^/]+)\/decision$/);
  if (match && method === 'POST') {
    const runId = decodeURIComponent(match[1]);
    const approvalId = decodeURIComponent(match[2]);
    const approval = state.approvals.find((item) => item.runId === runId && item.approvalId === approvalId);
    if (!approval) return json({ error: { code: 'FIXTURE_NOT_FOUND', message: 'Approval was not found in the frontend fixture store.' } }, 404);
    const input = await request.json() as { decision?: string };
    const decision = input.decision === 'rejected' ? 'rejected' : 'approved';
    Object.assign(approval, { status: decision, decision, decidedBy: 'Ning', decidedAt: now });
    return json(structuredClone(approval));
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
