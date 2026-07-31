import type { FixtureState } from './store';

interface FixtureResponse {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
}

const json = (body: unknown, status = 200): FixtureResponse => ({
  status,
  body,
  headers: { 'content-type': 'application/json' }
});
const clone = <T,>(value: T): T => structuredClone(value);
const decode = (value: string): string => decodeURIComponent(value);

export function routeWorkflowActivityFixtureRequest(input: {
  method: string;
  path: string;
  url: URL;
  state: FixtureState;
}): FixtureResponse | null {
  const { method, path, url, state } = input;
  const match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/workflow-executions$/);
  if (match && method === 'GET') {
    const terminal = new Set(['completed', 'failed', 'cancelled']);
    const stateFilter = url.searchParams.get('state') || 'all';
    const searchFilter = (url.searchParams.get('search') || '').trim().toLowerCase();
    const originFilter = url.searchParams.get('origin') || '';
    const workflowFilter = url.searchParams.get('workflowId') || '';
    const issueFilter = url.searchParams.get('sourceIssueId') || '';
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 50), 1), 100);
    const offset = Math.max(Number(url.searchParams.get('cursor') || 0), 0);
    const all = state.workflowExecutions.filter((item) => item.workspaceId === decode(match[1]));
    const filtered = all.filter((item) => {
      if (stateFilter === 'open' && terminal.has(item.status)) return false;
      if (stateFilter === 'attention' && !['waiting_for_approval', 'needs_review'].includes(item.status)) return false;
      if (!['all', 'open', 'attention'].includes(stateFilter) && item.status !== stateFilter) return false;
      if (originFilter && item.origin.kind !== originFilter) return false;
      if (workflowFilter && item.workflow.id !== workflowFilter) return false;
      if (issueFilter) {
        const issueTargetId = issueFilter === 'fixture-vm-issue'
          ? 'fixture-vm'
          : 'fixture-cluster';
        if (item.origin.kind !== 'historical_event' || item.rootRun?.targetId !== issueTargetId) return false;
      }
      if (searchFilter) {
        const searchable = [
          item.id,
          item.workflow.id,
          item.workflow.name,
          item.origin.label,
          item.rootRun?.targetId,
          item.rootRun?.targetName
        ].filter(Boolean).join(' ').toLowerCase();
        if (!searchable.includes(searchFilter)) return false;
      }
      return true;
    });
    const nextOffset = offset + limit;
    return json({
      items: clone(filtered.slice(offset, nextOffset)),
      nextCursor: nextOffset < filtered.length ? String(nextOffset) : null,
      summary: {
        openCount: all.filter((item) => !terminal.has(item.status)).length,
        attentionCount: all.filter((item) => (
          ['waiting_for_approval', 'needs_review'].includes(item.status)
        )).length,
        latestUpdatedAt: all.reduce<string | undefined>((latest, item) => (
          !latest || Date.parse(item.updatedAt) > Date.parse(latest) ? item.updatedAt : latest
        ), undefined)
      }
    });
  }
  const executionMatch = path.match(/^\/api\/v1\/workflow-executions\/([^/]+)$/);
  if (executionMatch && method === 'GET') {
    const execution = state.workflowExecutions.find(
      (item) => item.id === decode(executionMatch[1])
    );
    return execution
      ? json({ execution: clone(execution), attempts: [] })
      : json({ error: { code: 'NOT_FOUND', message: 'Workflow execution not found' } }, 404);
  }
  const sessionMatch = path.match(/^\/api\/v1\/workflows\/([^/]+)\/sessions$/);
  if (sessionMatch && method === 'GET') {
    const workflowId = decode(sessionMatch[1]);
    return json({ items: [{
      id: 'fixture-workflow-session',
      workflowId,
      workspaceId: state.workflowExecutions[0]?.workspaceId,
      workflowVersion: 2,
      runs: state.workflowExecutions
        .filter((execution) => execution.workflow.id === workflowId)
        .map((execution) => ({
          id: execution.rootRun.id,
          executionId: execution.id,
          status: execution.status,
          requestedAt: execution.rootRun.requestedAt,
          startedAt: execution.startedAt,
          endedAt: execution.endedAt,
          ...(execution.output ? { assistantMessage: { content: execution.output } } : {})
        }))
    }] });
  }
  return null;
}
