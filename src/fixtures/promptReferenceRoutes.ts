import type { FixtureResponse } from './router';
import type { FixtureState } from './store';

const NOW = '2026-07-15T08:30:00.000Z';

function json(body: unknown): FixtureResponse {
  return { status: 200, body, headers: { 'content-type': 'application/json' } };
}

async function bodyOf(request: Request): Promise<Record<string, unknown>> {
  try {
    const value = await request.json();
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

export async function routePromptReferenceFixtureRequest({
  request,
  state,
  path,
  method,
  url
}: {
  request: Request;
  state: FixtureState;
  path: string;
  method: string;
  url: URL;
}): Promise<FixtureResponse | null> {
  if (/^\/api\/v1\/workspaces\/[^/]+\/prompt-reference-types$/.test(path) && method === 'GET') {
    return json({ items: [
      { type: 'target', displayName: 'Target', description: 'A workspace target.', icon: 'target', placeholderLabel: 'Target name', availability: 'available', minimum: 0, maximum: 1, allowPinnedReferences: true, provider: 'fixture.target', providerVersion: '1' },
      { type: 'chat', displayName: 'Chat', description: 'An active target chat.', icon: 'chat', placeholderLabel: 'Chat title', availability: 'available', minimum: 0, maximum: 20, allowPinnedReferences: false, provider: 'fixture.chat', providerVersion: '1' },
      { type: 'repository', displayName: 'Repository', description: 'A source-control repository.', icon: 'repository', placeholderLabel: 'Repository', availability: 'unavailable', unavailableReason: 'Install a source-control integration.', minimum: 0, maximum: 20, allowPinnedReferences: true, provider: 'fixture.repository', providerVersion: '1' }
    ] });
  }
  if (/^\/api\/v1\/workspaces\/[^/]+\/prompt-references\/suggestions$/.test(path) && method === 'GET') {
    const type = url.searchParams.get('type');
    const query = (url.searchParams.get('q') || '').toLocaleLowerCase();
    const candidates = type === 'target'
      ? [...state.clusters, ...state.virtualMachines].map((target) => ({ type, id: target.id, label: target.name, provider: 'fixture.target', availability: 'available' }))
      : type === 'chat'
        ? state.sessions.map((session) => ({ type, id: session.id, label: session.title, provider: 'fixture.chat', availability: 'available' }))
        : [];
    return json({ items: candidates.filter((candidate) => !query || candidate.label.toLocaleLowerCase().includes(query)) });
  }
  if (/^\/api\/v1\/workspaces\/[^/]+\/prompt-references\/resolve$/.test(path) && method === 'POST') {
    const input = await bodyOf(request);
    const prompt = String(input.prompt || '');
    return json({ prompt, promptDigest: 'a'.repeat(64), bindingDigest: 'b'.repeat(64), tokens: [], candidates: [], bindings: [], blockers: [], resolvedAt: NOW });
  }
  return null;
}
