import { fixtureAgentVEnrollmentInstructions } from './agentVInstallInstructions';
import type { FixtureResponse } from './router';
import type { FixtureState } from './store';

const json = (body: unknown, status = 200): FixtureResponse => ({
  status,
  body,
  headers: { 'content-type': 'application/json' }
});

async function bodyOf(request: Request): Promise<Record<string, unknown>> {
  try {
    const value = await request.json();
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

export async function routeAgentVAccessPolicyFixtureRequest({
  method,
  path,
  request,
  state
}: {
  method: string;
  path: string;
  request: Request;
  state: FixtureState;
}): Promise<FixtureResponse | null> {
  const match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/virtual-machines\/([^/]+)\/agent-access-policy-updates$/);
  if (!match || method !== 'POST') return null;

  const target = state.virtualMachines.find((item) => item.id === decodeURIComponent(match[2]));
  if (!target) {
    return json({
      error: { code: 'FIXTURE_NOT_FOUND', message: 'Virtual machine was not found in the frontend fixture store.' }
    }, 404);
  }
  const input = await bodyOf(request);
  const accessMode = input.agentAccessMode === 'read_write' ? 'read_write' : 'read_only';
  target.pendingAgentAccessPolicy = {
    accessMode,
    restartServices: accessMode === 'read_write' && Array.isArray(input.restartServices)
      ? input.restartServices.filter((service): service is string => typeof service === 'string')
      : []
  };
  target.updatedAt = new Date().toISOString();
  return json({
    virtualMachine: structuredClone(target),
    installInstructions: fixtureAgentVEnrollmentInstructions('replace')
  }, 201);
}
