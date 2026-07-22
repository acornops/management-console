import { FIXTURE_IDS, type FixtureState } from './store';
import type { FixtureResponse } from './router';

const NOW = '2026-07-15T08:30:00.000Z';

function json(body: unknown, status = 200): FixtureResponse {
  return { status, body, headers: { 'content-type': 'application/json' } };
}

function notFound(resource: string): FixtureResponse {
  return json({ error: { code: 'FIXTURE_NOT_FOUND', message: `${resource} was not found in the frontend fixture store.` } }, 404);
}

function decode(value: string): string {
  return decodeURIComponent(value);
}

function id(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function routeAutomationTemplateFixtureRequest({
  method,
  path,
  state
}: {
  method: string;
  path: string;
  state: FixtureState;
}): FixtureResponse | null {
  let match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/automation-templates$/);
  if (match && method === 'GET') return json({ templates: structuredClone(state.automationTemplates), installations: [] });

  match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/automation-templates\/([^/]+)\/install$/);
  if (match && method === 'POST') {
    const template = state.automationTemplates.find((candidate) => candidate.id === decode(match![2]));
    if (!template) return notFound('Automation template');
    if (template.workflowId && state.workflows.some((workflow) => workflow.id === template.workflowId)) {
      return json({ workflowId: template.workflowId, alreadyInstalled: true });
    }
    const workflowId = id('fixture-template-workflow');
    state.workflows.unshift({
      id: workflowId, workspaceId: decode(match[1]), version: 1,
      origin: { type: 'template', templateId: 'acornops-starter', templateVersion: template.version }, source: 'system',
      name: template.name, description: template.description, status: 'paused', createdBy: FIXTURE_IDS.user, createdAt: NOW,
      prompt: `Run ${template.name}.`, starterPrompt: `Run ${template.name}.`,
      agentIds: [FIXTURE_IDS.workflowAnalystAgent], executionMode: 'direct', targetConstraints: { targetTypes: [], targetIds: [] },
      tags: [], inputs: [], requiredPermissions: [],
      capabilityPolicy: { mode: template.id === 'target-remediation' ? 'read_write' : 'read_only', restrictionMode: 'restrict', semanticCapabilityIds: [], contextGrants: [], maxRuntimeSeconds: 900, retentionDays: 90, approvalRequirements: [] },
      readiness: { status: 'ready', reasons: [] }
    });
    Object.assign(template, { workflowId, installationStatus: 'ready', blockerCodes: [] });
    return json({ workflowId, alreadyInstalled: false }, 201);
  }

  match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/automation-templates\/([^/]+)\/activate$/);
  if (match && method === 'POST') {
    const template = state.automationTemplates.find((candidate) => candidate.id === decode(match![2]));
    if (!template?.workflowId) return notFound('Installed automation template');
    const workflow = state.workflows.find((candidate) => candidate.id === template.workflowId);
    if (!workflow) return notFound('Installed workflow');
    workflow.status = 'active';
    template.installationStatus = 'active';
    return json({ workflowId: workflow.id, status: 'active' });
  }

  return null;
}
