import type { FixtureResponse } from './router';
import { FIXTURE_IDS, type FixtureState } from './store';

const json = (body: unknown, status = 200): FixtureResponse => ({
  status,
  body,
  headers: { 'content-type': 'application/json' }
});
const noContent = (): FixtureResponse => ({ status: 204 });
const clone = <T,>(value: T): T => structuredClone(value);
const decode = (value: string): string => decodeURIComponent(value);
const id = (prefix: string): string => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
const notFound = (resource: string): FixtureResponse => json({
  error: {
    code: 'FIXTURE_NOT_FOUND',
    message: `${resource} was not found in the frontend fixture store.`
  }
}, 404);

async function bodyOf(request: Request): Promise<Record<string, any>> {
  try {
    const value = await request.json();
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, any>
      : {};
  } catch {
    return {};
  }
}

export async function routeAgentConversationFixtureRequest({
  method,
  path,
  request,
  state,
  now
}: {
  method: string;
  path: string;
  request: Request;
  state: FixtureState;
  now: string;
}): Promise<FixtureResponse | null> {
  let match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/agents\/([^/]+)\/conversations$/);
  if (match) {
    const workspaceId = decode(match[1]);
    const agentId = decode(match[2]);
    const agent = state.agents.find((item) => item.id === agentId && item.workspaceId === workspaceId);
    if (!agent) return notFound('Agent');
    if (method === 'GET') {
      return json({ items: clone(state.sessions.filter((item) => item.agentId === agentId)) });
    }
    if (method === 'POST') {
      const workspace = state.workspaces.find((item) => item.id === workspaceId);
      const accessMode = agent.permissionMode !== 'read_only'
        && Boolean((workspace?.permissions as Record<string, boolean> | undefined)?.create_read_write_runs)
        ? 'read_write'
        : 'read_only';
      const conversation = {
        id: id('fixture-agent-conversation'),
        workspaceId,
        agentId,
        title: agent.name,
        createdBy: FIXTURE_IDS.user,
        accessMode,
        permissionMode: agent.permissionMode || 'ask_before_changes',
        createdAt: now,
        expiresAt: new Date(Date.parse(now) + (30 * 24 * 60 * 60 * 1000)).toISOString(),
        status: 'open'
      };
      state.sessions.push(conversation);
      state.messages[conversation.id] = [];
      return json({ conversation: clone(conversation), messages: [], runs: [] }, 201);
    }
    return null;
  }

  match = path.match(/^\/api\/v1\/agent-conversations\/([^/]+)(?:\/(access|messages))?$/);
  if (!match) return null;
  const conversationId = decode(match[1]);
  const action = match[2];
  const conversation = state.sessions.find((item) => item.id === conversationId && item.agentId);
  if (!conversation) return notFound('Agent conversation');
  if (!action && method === 'GET') {
    return json({
      conversation: clone(conversation),
      messages: clone(state.messages[conversationId] || []),
      runs: clone(Object.values(state.runs).filter((run) => run.sessionId === conversationId))
    });
  }
  if (!action && method === 'DELETE') {
    state.sessions = state.sessions.filter((item) => item.id !== conversationId);
    delete state.messages[conversationId];
    return noContent();
  }
  if (action === 'access' && method === 'PATCH') {
    const input = await bodyOf(request);
    const agent = state.agents.find((item) => item.id === conversation.agentId);
    if (input.accessMode === 'read_write' && agent?.permissionMode === 'read_only') {
      return json({
        error: {
          code: 'AGENT_CONVERSATION_POLICY_READ_ONLY',
          message: 'This Agent conversation is read-only by its pinned Agent policy.'
        }
      }, 409);
    }
    conversation.accessMode = input.accessMode === 'read_write' ? 'read_write' : 'read_only';
    return json({ conversation: clone(conversation) });
  }
  if (action !== 'messages' || method !== 'POST') return null;

  const input = await bodyOf(request);
  const runId = id('fixture-agent-run');
  const messageId = id('fixture-agent-message');
  const assistantId = id('fixture-agent-message');
  const content = String(input.content || '');
  const assistantContent = 'Fixture Agent analysis complete. No external changes were made.';
  state.messages[conversationId] ||= [];
  state.messages[conversationId].push({ id: messageId, role: 'user', content, runId, createdAt: now });
  state.messages[conversationId].push({
    id: assistantId,
    role: 'assistant',
    content: assistantContent,
    runId,
    createdAt: now
  });
  state.runs[runId] = {
    id: runId,
    workspaceId: conversation.workspaceId,
    agentId: conversation.agentId,
    sessionId: conversationId,
    messageId,
    toolAccessMode: conversation.accessMode,
    status: 'completed',
    requestedAt: now,
    startedAt: now,
    endedAt: now,
    errorCode: null,
    assistantMessage: { content: assistantContent },
    events: [{
      schema_version: 1,
      run_id: runId,
      seq: 1,
      ts: now,
      type: 'run.completed',
      payload: { status: 'completed' }
    }]
  };
  return json({
    message_id: messageId,
    run_id: runId,
    status: 'completed'
  }, 202);
}
