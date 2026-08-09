import { FIXTURE_IDS, getFixtureState } from './store';

type FixtureState = ReturnType<typeof getFixtureState>;
const NOW = new Date().toISOString();

export function fixtureTargetType(state: FixtureState, targetId: string) {
  return state.virtualMachines.some((target) => target.id === targetId)
    ? 'virtual_machine'
    : 'kubernetes';
}

export function targetSkillCatalog(state: FixtureState, targetId: string) {
  const targetType = fixtureTargetType(state, targetId);
  return {
    workspaceId: FIXTURE_IDS.workspace,
    targetId,
    targetType,
    clusterId: targetType === 'kubernetes' ? targetId : undefined,
    permissions: { canEdit: true, editableRoles: ['owner', 'admin'] },
    items: state.targetSkills.filter((skill) => skill.target_id === targetId).map((skill) => ({
      ...skill,
      id: skill.id,
      workspaceId: FIXTURE_IDS.workspace,
      targetId,
      targetType,
      validationStatus: 'valid',
      validationErrors: [],
      bundleStats: { fileCount: skill.files.length, totalBytes: skill.files.reduce((total: number, file: Record<string, any>) => total + file.content.length, 0) },
      source: { ...skill.source, type: skill.source.type === 'git' ? 'git_import' : 'manual', syncStatus: 'not_applicable' },
      createdAt: '2026-07-15T07:45:00.000Z',
      updatedAt: NOW,
      files: skill.files.map((file: Record<string, any>) => ({ ...file, sizeBytes: file.content.length }))
    }))
  };
}

function autoTriageSettings(state: FixtureState, targetId: string, input: Record<string, any> = {}) {
  const writeMode = input.writeMode || 'approval_required';
  const target = [...state.clusters, ...state.virtualMachines].find((item) => item.id === targetId);
  const targetPermissionMode = target?.permissionMode || 'ask_before_changes';
  const effectiveToolMode = writeMode === 'read_only' || targetPermissionMode === 'read_only'
    ? 'read_only'
    : 'read_write';
  const confirmationRequiredForWrite = effectiveToolMode === 'read_write'
    && (writeMode === 'approval_required' || targetPermissionMode === 'ask_before_changes');
  return {
    workspaceId: FIXTURE_IDS.workspace,
    targetId,
    enabled: input.enabled ?? false,
    minimumSeverity: input.minimumSeverity || 'warning',
    writeMode,
    additionalInstructions: input.additionalInstructions || '',
    namespaceInclude: input.namespaceInclude || [],
    namespaceExclude: input.namespaceExclude || [],
    includeClusterScopedIssues: input.includeClusterScopedIssues ?? true,
    revision: Number(input.expectedRevision || 0) + 1,
    canEdit: true,
    eligibleCurrentIssueCount: 0,
    queueSummary: { activeCount: 0, waitingCount: 0 },
    effectiveBehavior: {
      requestedWriteMode: writeMode,
      effectiveToolMode,
      confirmationRequiredForWrite,
      targetCeilingApplied: writeMode !== 'read_only' && effectiveToolMode === 'read_only',
      targetSupportsWrite: true,
      summary: effectiveToolMode === 'read_only'
        ? 'read_only'
        : confirmationRequiredForWrite
          ? 'approval_required'
          : 'full_write'
    },
    readiness: { status: 'ready', reasons: [], unavailableOptionalMcpToolCount: 0 }
  };
}

export async function routeTargetFixtureRequest({
  method,
  path,
  request,
  state
}: {
  method: string;
  path: string;
  request: Request;
  state: FixtureState;
}) {
  let match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/targets\/([^/]+)\/auto-triage$/);
  if (match && (method === 'GET' || method === 'PATCH')) {
    const targetId = decodeURIComponent(match[2]);
    const targetExists = state.virtualMachines.some((target) => target.id === targetId)
      || state.clusters.some((target) => target.id === targetId);
    if (!targetExists) {
      return {
        status: 404,
        body: { error: { code: 'FIXTURE_NOT_FOUND', message: 'Target was not found in the frontend fixture store.' } },
        headers: { 'content-type': 'application/json' }
      };
    }
    let input: Record<string, any> = {};
    if (method === 'PATCH') {
      try {
        const value = await request.json();
        if (value && typeof value === 'object' && !Array.isArray(value)) input = value;
      } catch {
        // Match the fixture router's empty-body behavior.
      }
    }
    return {
      status: 200,
      body: autoTriageSettings(state, targetId, input),
      headers: { 'content-type': 'application/json' }
    };
  }

  match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/targets\/([^/]+)\/auto-triage\/investigations$/);
  if (match && method === 'POST') {
    return {
      status: 200,
      body: { queuedCount: 0, alreadyExistsCount: 0, skippedCount: 0 },
      headers: { 'content-type': 'application/json' }
    };
  }

  match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/targets\/([^/]+)\/assistant\/capabilities-preview$/);
  if (match && method === 'GET') {
    const workspaceId = decodeURIComponent(match[1]);
    const targetId = decodeURIComponent(match[2]);
    const accessMode = new URL(request.url).searchParams.get('toolAccessMode') === 'read_write'
      ? 'read_write'
      : 'read_only';
    const target = [...state.clusters, ...state.virtualMachines].find((item) => item.id === targetId);
    const targetPermissionMode = target?.permissionMode || 'ask_before_changes';
    const hostPolicyPending = Boolean(target && 'pendingAgentAccessPolicy' in target && target.pendingAgentAccessPolicy);
    const runAllowsWrite = accessMode === 'read_write' && targetPermissionMode !== 'read_only' && !hostPolicyPending;
    const targetTools = state.targetMcpServers.find((server) => server.target_id === targetId)?.tools ?? [];
    const tools = targetTools.filter((tool) => runAllowsWrite || tool.capability === 'read');
    const skills = state.targetSkills.filter((skill) => skill.target_id === targetId);
    const writeAllowed = tools.filter((tool) => tool.capability === 'write').length;
    return {
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: {
        workspaceId,
        targetId,
        targetType: fixtureTargetType(state, targetId),
        toolAccessMode: accessMode,
        confirmationRequiredForWrite: runAllowsWrite && targetPermissionMode === 'ask_before_changes' && writeAllowed > 0,
        writeUnavailableReason: !runAllowsWrite
          && targetTools.some((tool) => tool.capability === 'write')
          ? 'run_read_only'
          : null,
        toolSummary: {
          totalAllowed: tools.length,
          nativeAllowed: tools.length,
          readAllowed: tools.filter((tool) => tool.capability === 'read').length,
          writeAllowed,
        },
        skillSummary: { totalAvailable: skills.length },
        tools: tools.map((tool) => ({
          id: tool.name,
          name: tool.name,
          label: tool.name,
          description: tool.description,
          capability: tool.capability,
          runtimeKind: 'function',
          source: 'builtin',
        })),
        skills: skills.map((skill) => ({
          id: skill.id,
          name: skill.name,
          description: skill.description,
          source: 'manual',
        })),
      }
    };
  }

  return null;
}
