import {
  ChatAssistantReference,
  ChatRuntimeSelection,
  ProjectMember,
  User,
  Workspace,
  WorkspaceMemberCandidate,
  WorkspaceMemberDiscoveryMode,
  WorkspaceAiSettings,
  WorkspaceAuditCategory,
  WorkspaceAuditEvent
} from '@/types';
import { toArray } from './control-plane/formatters';
import {
  delay,
  requestEventStream,
  requestArtifact,
  requestJson
} from './control-plane/http';
import { controlPlaneAuthApi } from './control-plane/authApi';
import { kubernetesClusterApi } from './control-plane/kubernetesClusterApi';
import { catalogApi } from './control-plane/catalogApi';
import { pageQuery } from './control-plane/query';
import {
  getTarget,
  listTargetsForWorkspace
} from './control-plane/targetApi';
import { userFromControlPlane } from './control-plane/userMappers';
import { mapVirtualMachineMetricsHistoryResponse } from './control-plane/virtualMachineMetricMappers';
import {
  parseControlPlaneVirtualMachine,
  parseVirtualMachineInstallInstructions,
  parseVirtualMachineInstructionResponse
} from './control-plane/virtualMachineTypes';
import { createVirtualMachineAgentAccessPolicyUpdate } from './control-plane/virtualMachineAgentAccessApi';
import type {
  ControlPlaneVirtualMachine,
  ControlPlaneVirtualMachineInstallInstructions,
  ControlPlaneVirtualMachineMetricsHistoryResponse,
  RegisterVirtualMachineResponse
} from './control-plane/virtualMachineTypes';
import { mapWorkspace, mapWorkspaceMember } from './control-plane/workspaceMappers';
import type {
  ControlPlaneAcceptWorkspaceInvitationResult,
  ControlPlaneAcceptedMessage,
  ControlPlaneIssueItem,
  ControlPlaneIssueObservationItem,
  ControlPlaneTargetIssueSummary,
  ControlPlaneRun,
  ControlPlaneRunEvent,
  ControlPlaneRunToolApproval,
  ControlPlaneRoleTemplate,
  ControlPlaneSessionMessageListPage,
  ControlPlaneUser,
  ControlPlaneWorkspace,
  ControlPlaneWorkspaceAuditEvent,
  ControlPlaneWorkspaceInvitation,
  ControlPlaneWorkspaceMemberCandidateResponse,
  ControlPlaneWorkspaceMember,
  PagedResult
} from './control-plane/types';
import { webhookApi } from './control-plane/webhookApi';
import { autoTriageApi } from './control-plane/autoTriageApi';
import { targetSessionApi } from './control-plane/targetSessionApi';
import type { RunPermissionMode } from './control-plane/runPermissionTypes';

export type {
  ControlPlaneAcceptWorkspaceInvitationResult,
  ControlPlaneAuthConfig,
  ControlPlaneAuthMethods,
  ControlPlanePodLogs,
  ControlPlanePodLogsOptions,
  ControlPlaneResourcePageItem,
  ControlPlaneIssueItem,
  ControlPlaneIssueObservationItem,
  ControlPlaneTargetIssueSummary,
  ControlPlaneRun,
  ControlPlaneRunEvent,
  ControlPlaneRunToolApproval,
  ControlPlaneRunStatus,
  ControlPlaneSession,
  ControlPlaneSessionListPage,
  ControlPlaneSessionMessage,
  ControlPlaneExternalIntegrationGrantableWorkspace,
  ControlPlaneExternalIntegrationLinkSummary,
  ControlPlaneExternalIntegrationWorkspaceGrant,
  ControlPlaneWorkspaceCapability,
  ControlPlaneWorkspaceInvitation,
  ControlPlaneWorkspaceAuditEvent,
  ControlPlaneWebhookCreated,
  ControlPlaneWebhookEventType,
  ControlPlaneWebhookHistory,
  ControlPlaneWebhookInput,
  ControlPlaneWebhookPatch,
  ControlPlaneWebhookSubscription,
  ControlPlaneRoleTemplate,
  TargetType,
  TargetSummary,
  ControlPlaneTargetSkillDetail,
  ControlPlaneTargetSkillsCatalog,
  ControlPlaneTargetToolItem,
  ControlPlaneTargetToolsCatalog,
  ControlPlaneTargetInsightsCatalog,
  ControlPlaneTargetInsightsEntry,
  ControlPlaneTargetInsightsEntryStatus,
  CreateTargetMcpServerInput,
  CreateTargetSkillInput,
  GitTargetSkillImportSource,
  ImportTargetSkillInput,
  ResolveGitTargetSkillInput,
  ReimportTargetSkillInput,
  TargetSkillImportProvider,
  TargetMcpServer,
  TargetSkillSourceType,
  TargetSkillValidationStatus,
  TargetSkillSyncStatus,
  TargetMcpServerAuthInput,
  TargetMcpServerTestConnectionResult,
  TargetMcpServerToolInput,
  UpdateTargetSkillInput,
  UpdateTargetMcpServerInput,
  UpdateTargetToolInput,
  TargetInsightsEntryInput
} from './control-plane/types';
export { CONTROL_PLANE_WEBHOOK_EVENT_TYPES } from './control-plane/types';
export type {
  ControlPlaneVirtualMachineMetricHistoryPoint,
  ControlPlaneVirtualMachineMetricsHistoryResponse
} from './control-plane/virtualMachineTypes';
export type {
  ControlPlaneTargetChatActivity,
  ControlPlaneTargetChatActivityEvent
} from './control-plane/sessionActivityTypes';
export type {
  ControlPlaneVirtualMachine,
  ControlPlaneVirtualMachineInstallInstructions,
  RegisterVirtualMachineResponse
} from './control-plane/virtualMachineTypes';
export type {
  AutomaticInvestigationSummary,
  AutoTriageMinimumSeverity,
  AutoTriageReadinessReason,
  AutoTriageWriteMode,
  StartExistingAutoTriageInvestigationsResult,
  TargetAutoTriageSettings
} from './control-plane/autoTriageTypes';

export const controlPlaneApi = {
  ...controlPlaneAuthApi,
  ...catalogApi,
  ...webhookApi,
  ...autoTriageApi,
  ...targetSessionApi,

  async getCurrentUser(options?: { initialSessionProbe?: boolean }): Promise<User> {
    return userFromControlPlane(await requestJson<ControlPlaneUser>('/api/v1/me', {
      sessionExpiry: options?.initialSessionProbe ? 'ignore' : 'notify'
    }));
  },

  async getWorkspaces(_currentUser: User): Promise<Workspace[]> {
    const page = await requestJson<PagedResult<ControlPlaneWorkspace>>('/api/v1/workspaces?limit=50');
    return page.items.map((workspace) => mapWorkspace(workspace, []));
  },

  async getWorkspace(workspaceId: string, _currentUser?: User): Promise<Workspace> {
    const workspace = await requestJson<ControlPlaneWorkspace>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}`
    );
    return mapWorkspace(workspace, []);
  },

  async createWorkspace(name: string, _currentUser: User): Promise<Workspace> {
    const workspace = await requestJson<ControlPlaneWorkspace>('/api/v1/workspaces', {
      method: 'POST',
      body: JSON.stringify({ name })
    });
    return mapWorkspace(workspace, []);
  },

  async getWorkspaceMembers(workspaceId: string): Promise<ProjectMember[]> {
    const page = await this.listWorkspaceMembers(workspaceId, { limit: 50 });
    return page.items;
  },

  async getWorkspaceRoles(workspaceId: string): Promise<ControlPlaneRoleTemplate[]> {
    const page = await requestJson<PagedResult<ControlPlaneRoleTemplate>>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/roles`
    );
    return toArray(page.items);
  },

  async getWorkspaceAiSettings(workspaceId: string): Promise<WorkspaceAiSettings> {
    return requestJson<WorkspaceAiSettings>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/ai-settings`
    );
  },

  async updateWorkspaceAiSettings(
    workspaceId: string,
    input: {
      defaultProvider: WorkspaceAiSettings['defaultProvider'];
      defaultModel: WorkspaceAiSettings['defaultModel'];
      reasoningSummaryMode: WorkspaceAiSettings['reasoningSummaryMode'];
      reasoningEffort: WorkspaceAiSettings['reasoningEffort'];
    }
  ): Promise<WorkspaceAiSettings> {
    return requestJson<WorkspaceAiSettings>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/ai-settings`,
      { method: 'PATCH', body: JSON.stringify(input) }
    );
  },

  async saveWorkspaceAiProviderCredential(
    workspaceId: string,
    provider: WorkspaceAiSettings['defaultProvider'],
    apiKey: string
  ): Promise<WorkspaceAiSettings> {
    return requestJson<WorkspaceAiSettings>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/ai-provider-credentials/${encodeURIComponent(provider)}`,
      { method: 'PUT', body: JSON.stringify({ apiKey }) }
    );
  },

  async deleteWorkspaceAiProviderCredential(
    workspaceId: string,
    provider: WorkspaceAiSettings['defaultProvider']
  ): Promise<WorkspaceAiSettings> {
    return requestJson<WorkspaceAiSettings>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/ai-provider-credentials/${encodeURIComponent(provider)}`,
      { method: 'DELETE' }
    );
  },

  async listWorkspaceMembers(
    workspaceId: string,
    options?: { limit?: number; cursor?: string; q?: string; role?: ProjectMember['role'] | 'all'; source?: ProjectMember['source'] | 'all'; signal?: AbortSignal }
  ): Promise<PagedResult<ProjectMember>> {
    const source = options?.source === 'OIDC' ? 'oidc' : options?.source === 'Internal' ? 'internal' : undefined;
    const path = `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/members${pageQuery({
        limit: options?.limit,
        cursor: options?.cursor,
        q: options?.q,
        filters: {
          role: options?.role && options.role !== 'all' ? options.role : undefined,
          source
        }
      })}`;
    const page = options?.signal
      ? await requestJson<PagedResult<ControlPlaneWorkspaceMember>>(path, { signal: options.signal })
      : await requestJson<PagedResult<ControlPlaneWorkspaceMember>>(path);
    return { items: toArray(page.items).map(mapWorkspaceMember), nextCursor: page.nextCursor };
  },

  async addWorkspaceMember(
    workspaceId: string,
    input: { userId: string; email: string; role: ProjectMember['role'] }
  ): Promise<ProjectMember> {
    const member = await requestJson<ControlPlaneWorkspaceMember>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/members`,
      { method: 'POST', body: JSON.stringify(input) }
    );
    return mapWorkspaceMember(member);
  },

  async searchWorkspaceMemberCandidates(
    workspaceId: string,
    query: string,
    signal?: AbortSignal
  ): Promise<{ mode: WorkspaceMemberDiscoveryMode; items: WorkspaceMemberCandidate[] }> {
    const path = `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/member-candidates${pageQuery({ q: query })}`;
    const response = signal
      ? await requestJson<ControlPlaneWorkspaceMemberCandidateResponse>(path, { signal })
      : await requestJson<ControlPlaneWorkspaceMemberCandidateResponse>(path);
    return {
      mode: response.mode,
      items: toArray(response.items).map((candidate) => ({
        userId: candidate.userId,
        email: candidate.email,
        name: candidate.displayName || candidate.email,
        authMethods: candidate.authMethods,
        status: candidate.status
      }))
    };
  },

  async createWorkspaceInvitation(
    workspaceId: string,
    input: { email: string; role: ProjectMember['role']; expiresInDays?: number }
  ): Promise<ControlPlaneWorkspaceInvitation> {
    return requestJson<ControlPlaneWorkspaceInvitation>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/invitations`,
      { method: 'POST', body: JSON.stringify(input) }
    );
  },

  async listWorkspaceInvitations(workspaceId: string): Promise<ControlPlaneWorkspaceInvitation[]> {
    const page = await this.listWorkspaceInvitationsPage(workspaceId, { limit: 50 });
    return page.items;
  },

  async listWorkspaceInvitationsPage(
    workspaceId: string,
    options?: { limit?: number; cursor?: string; q?: string; role?: ProjectMember['role']; status?: string; signal?: AbortSignal }
  ): Promise<PagedResult<ControlPlaneWorkspaceInvitation>> {
    const path = `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/invitations${pageQuery({
        limit: options?.limit,
        cursor: options?.cursor,
        q: options?.q,
        filters: { role: options?.role, status: options?.status }
      })}`;
    return options?.signal
      ? requestJson<PagedResult<ControlPlaneWorkspaceInvitation>>(path, { signal: options.signal })
      : requestJson<PagedResult<ControlPlaneWorkspaceInvitation>>(path);
  },

  async listWorkspaceIssues(
    workspaceId: string,
    options?: { limit?: number; cursor?: string; q?: string; status?: string; severity?: string; targetType?: string; targetId?: string; namespace?: string; signal?: AbortSignal }
  ): Promise<PagedResult<ControlPlaneIssueItem>> {
    const path = `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/issues${pageQuery({
        limit: options?.limit,
        cursor: options?.cursor,
        q: options?.q,
        filters: {
          status: options?.status,
          severity: options?.severity,
          targetType: options?.targetType,
          targetId: options?.targetId,
          namespace: options?.namespace
        }
      })}`;
    return options?.signal
      ? requestJson<PagedResult<ControlPlaneIssueItem>>(path, { signal: options.signal })
      : requestJson<PagedResult<ControlPlaneIssueItem>>(path);
  },

  async getWorkspaceIssue(workspaceId: string, issueId: string): Promise<ControlPlaneIssueItem> {
    return requestJson<ControlPlaneIssueItem>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/issues/${encodeURIComponent(issueId)}`
    );
  },

  async listIssueObservations(
    workspaceId: string,
    issueId: string,
    options?: { limit?: number; cursor?: string }
  ): Promise<PagedResult<ControlPlaneIssueObservationItem>> {
    return requestJson<PagedResult<ControlPlaneIssueObservationItem>>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/issues/${encodeURIComponent(issueId)}/observations${pageQuery({
        limit: options?.limit,
        cursor: options?.cursor
      })}`
    );
  },

  async listTargetIssues(
    workspaceId: string,
    targetId: string,
    options?: { limit?: number; cursor?: string; q?: string; status?: string; severity?: string; namespace?: string }
  ): Promise<PagedResult<ControlPlaneIssueItem>> {
    return requestJson<PagedResult<ControlPlaneIssueItem>>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/targets/${encodeURIComponent(targetId)}/issues${pageQuery({
        limit: options?.limit,
        cursor: options?.cursor,
        q: options?.q,
        filters: {
          status: options?.status,
          severity: options?.severity,
          namespace: options?.namespace
        }
      })}`
    );
  },

  async getTargetIssueSummary(workspaceId: string, targetId: string): Promise<ControlPlaneTargetIssueSummary> {
    return requestJson<ControlPlaneTargetIssueSummary>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/targets/${encodeURIComponent(targetId)}/issues/summary`
    );
  },

  async listWorkspaceAuditEvents(
    workspaceId: string,
    options?: {
      limit?: number;
      cursor?: string;
      category?: WorkspaceAuditCategory | 'all';
      eventType?: string;
      actorUserId?: string;
      objectType?: string;
      from?: string;
      to?: string;
      signal?: AbortSignal;
    }
  ): Promise<PagedResult<WorkspaceAuditEvent>> {
    const path = `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/audit-log${pageQuery({
        limit: options?.limit,
        cursor: options?.cursor,
        filters: {
          category: options?.category && options.category !== 'all' ? options.category : undefined,
          eventType: options?.eventType,
          actorUserId: options?.actorUserId,
          objectType: options?.objectType,
          from: options?.from,
          to: options?.to
        }
      })}`;
    const page = options?.signal
      ? await requestJson<PagedResult<ControlPlaneWorkspaceAuditEvent>>(path, { signal: options.signal })
      : await requestJson<PagedResult<ControlPlaneWorkspaceAuditEvent>>(path);
    return { items: toArray(page.items), nextCursor: page.nextCursor };
  },

  async revokeWorkspaceInvitation(workspaceId: string, invitationId: string): Promise<ControlPlaneWorkspaceInvitation> {
    return requestJson<ControlPlaneWorkspaceInvitation>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/invitations/${encodeURIComponent(invitationId)}`,
      { method: 'DELETE' }
    );
  },

  async getWorkspaceInvitation(token: string): Promise<ControlPlaneWorkspaceInvitation> {
    return requestJson<ControlPlaneWorkspaceInvitation>(
      `/api/v1/workspace-invitations/${encodeURIComponent(token)}`
    );
  },

  async acceptWorkspaceInvitation(token: string): Promise<ControlPlaneAcceptWorkspaceInvitationResult> {
    return requestJson<ControlPlaneAcceptWorkspaceInvitationResult>(
      `/api/v1/workspace-invitations/${encodeURIComponent(token)}/accept`,
      { method: 'POST' }
    );
  },

  async updateWorkspaceMemberRole(workspaceId: string, userId: string, role: ProjectMember['role']): Promise<ProjectMember> {
    const member = await requestJson<ControlPlaneWorkspaceMember>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/members/${encodeURIComponent(userId)}`,
      { method: 'PATCH', body: JSON.stringify({ role }) }
    );
    return mapWorkspaceMember(member);
  },

  async deleteWorkspaceMember(workspaceId: string, userId: string): Promise<void> {
    await requestJson<void>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/members/${encodeURIComponent(userId)}`,
      { method: 'DELETE' }
    );
  },

  listTargetsForWorkspace,
  getTarget,
  ...kubernetesClusterApi,

  async listVirtualMachinesForWorkspace(
    workspaceId: string,
    options?: { limit?: number; cursor?: string; q?: string; status?: string; signal?: AbortSignal }
  ): Promise<PagedResult<ControlPlaneVirtualMachine>> {
    const path = `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/virtual-machines${pageQuery({
        limit: options?.limit,
        cursor: options?.cursor,
        q: options?.q,
        filters: { status: options?.status }
      })}`;
    const response = options?.signal
      ? requestJson<PagedResult<ControlPlaneVirtualMachine>>(path, { signal: options.signal })
      : requestJson<PagedResult<ControlPlaneVirtualMachine>>(path);
    const page = await response;
    return { ...page, items: page.items.map(parseControlPlaneVirtualMachine) };
  },

  async registerVirtualMachine(
    workspaceId: string,
    input: { name: string; hostname?: string; allowedLogSources?: string[]; agentAccessMode: 'read_only' | 'read_write'; restartServices: string[] }
  ): Promise<RegisterVirtualMachineResponse> {
    const response = await requestJson<unknown>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/virtual-machines`,
      { method: 'POST', body: JSON.stringify(input) }
    );
    if (!response || typeof response !== 'object' || Array.isArray(response) || 'agentKey' in response
      || !('virtualMachine' in response) || !('installInstructions' in response)) {
      throw new Error('Control plane returned an invalid virtual machine registration response');
    }
    return {
      virtualMachine: parseControlPlaneVirtualMachine(response.virtualMachine),
      installInstructions: parseVirtualMachineInstallInstructions(response.installInstructions)
    };
  },

  async getVirtualMachine(workspaceId: string, vmId: string): Promise<ControlPlaneVirtualMachine> {
    return parseControlPlaneVirtualMachine(await requestJson<unknown>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/virtual-machines/${encodeURIComponent(vmId)}`
    ));
  },

  async updateVirtualMachine(
    workspaceId: string,
    vmId: string,
    input: { name?: string; hostname?: string; allowedLogSources?: string[]; permissionModeOverride?: RunPermissionMode | null }
  ): Promise<ControlPlaneVirtualMachine> {
    return parseControlPlaneVirtualMachine(await requestJson<unknown>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/virtual-machines/${encodeURIComponent(vmId)}`,
      { method: 'PATCH', body: JSON.stringify(input) }
    ));
  },

  async deleteVirtualMachine(workspaceId: string, vmId: string): Promise<void> {
    await requestJson<void>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/virtual-machines/${encodeURIComponent(vmId)}`,
      { method: 'DELETE' }
    );
  },

  async createVirtualMachineAgentEnrollment(workspaceId: string, vmId: string, purpose: 'initial' | 'replace'): Promise<{ targetId: string; installInstructions: ControlPlaneVirtualMachineInstallInstructions }> {
    const response = await requestJson<unknown>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/virtual-machines/${encodeURIComponent(vmId)}/agent-enrollments`,
      { method: 'POST', body: JSON.stringify({ purpose }) }
    );
    return parseVirtualMachineInstructionResponse(response);
  },

  createVirtualMachineAgentAccessPolicyUpdate,

  async getVirtualMachineInstallInstructions(workspaceId: string, vmId: string): Promise<{ targetId: string; installInstructions: ControlPlaneVirtualMachineInstallInstructions }> {
    const response = await requestJson<unknown>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/virtual-machines/${encodeURIComponent(vmId)}/install-instructions`,
      { method: 'POST' }
    );
    return parseVirtualMachineInstructionResponse(response);
  },

  async listVirtualMachineInventory(workspaceId: string, vmId: string): Promise<PagedResult<Record<string, unknown>>> {
    return requestJson<PagedResult<Record<string, unknown>>>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/virtual-machines/${encodeURIComponent(vmId)}/resources`
    );
  },

  async getVirtualMachineMetricsHistory(workspaceId: string, vmId: string): Promise<ControlPlaneVirtualMachineMetricsHistoryResponse> {
    const response = await requestJson<ControlPlaneVirtualMachineMetricsHistoryResponse>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/virtual-machines/${encodeURIComponent(vmId)}/metrics/history?window=6h&limit=48`
    );
    return mapVirtualMachineMetricsHistoryResponse(response);
  },

  async getVirtualMachineLogs(workspaceId: string, vmId: string, options?: { q?: string; source?: string }): Promise<{ entries?: Record<string, unknown>[] }> {
    return requestJson<{ entries?: Record<string, unknown>[] }>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/virtual-machines/${encodeURIComponent(vmId)}/logs${pageQuery({
        filters: { q: options?.q, source: options?.source }
      })}`
    );
  },

  async deleteWorkspace(workspaceId: string): Promise<void> {
    await requestJson<void>(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}`, { method: 'DELETE' });
  },

  async deleteSession(sessionId: string): Promise<void> {
    await requestJson<void>(`/api/v1/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
  },

  async getSessionMessages(sessionId: string, options?: { limit?: number; cursor?: string }): Promise<ControlPlaneSessionMessageListPage> {
    return requestJson<ControlPlaneSessionMessageListPage>(
      `/api/v1/sessions/${encodeURIComponent(sessionId)}/messages${pageQuery(options)}`
    );
  },

  async postSessionMessage(
    sessionId: string,
    content: string,
    toolAccessMode?: 'read_only' | 'read_write',
    clientMessageId?: string,
    runtimeSelection?: ChatRuntimeSelection,
    assistantReferences: ChatAssistantReference[] = []
  ): Promise<{ messageId: string; runId: string; runtimeSelection?: ChatRuntimeSelection }> {
    const accepted = await requestJson<ControlPlaneAcceptedMessage>(
      `/api/v1/sessions/${encodeURIComponent(sessionId)}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({
          content,
          toolAccessMode,
          clientMessageId,
          ...(assistantReferences.length > 0
            ? { references: assistantReferences.map(({ kind, id }) => ({ kind, id })) }
            : {}),
          ...(runtimeSelection
            ? {
                llm: {
                  provider: runtimeSelection.provider,
                  model: runtimeSelection.model,
                  reasoningEffort: runtimeSelection.reasoningEffort
                }
              }
            : {})
        })
      }
    );
    return { messageId: accepted.message_id, runId: accepted.run_id, runtimeSelection: accepted.runtimeSelection };
  },

  async getRun(runId: string): Promise<ControlPlaneRun> {
    return requestJson<ControlPlaneRun>(`/api/v1/runs/${encodeURIComponent(runId)}`);
  },

  async getRunEvents(runId: string): Promise<ControlPlaneRunEvent[]> {
    return requestJson<ControlPlaneRunEvent[]>(`/api/v1/runs/${encodeURIComponent(runId)}/events`);
  },

  async getToolResultArtifact(runId: string, artifactId: string): Promise<unknown> {
    return requestArtifact(
      `/api/v1/runs/${encodeURIComponent(runId)}/tool-result-artifacts/${encodeURIComponent(artifactId)}`
    );
  },

  async listRunApprovals(runId: string): Promise<ControlPlaneRunToolApproval[]> {
    return requestJson<ControlPlaneRunToolApproval[]>(`/api/v1/runs/${encodeURIComponent(runId)}/approvals`);
  },

  async decideRunApproval(runId: string, approvalId: string, decision: 'approved' | 'rejected'): Promise<ControlPlaneRunToolApproval> {
    return requestJson<ControlPlaneRunToolApproval>(
      `/api/v1/runs/${encodeURIComponent(runId)}/approvals/${encodeURIComponent(approvalId)}/decision`,
      { method: 'POST', body: JSON.stringify({ decision }) }
    );
  },

  async cancelRun(runId: string): Promise<void> {
    await requestJson<void>(`/api/v1/runs/${encodeURIComponent(runId)}/cancel`, { method: 'POST' });
  },

  async waitForRunTerminalState(runId: string, options?: { timeoutMs?: number; pollIntervalMs?: number }): Promise<ControlPlaneRun> {
    const timeoutMs = options?.timeoutMs ?? 120000;
    const pollIntervalMs = options?.pollIntervalMs ?? 1200;
    const deadline = Date.now() + timeoutMs;

    while (true) {
      const run = await this.getRun(runId);
      if (run.status === 'completed' || run.status === 'failed' || run.status === 'cancelled') return run;
      if (Date.now() >= deadline) throw new Error(`Run ${runId} did not complete within ${timeoutMs}ms`);
      await delay(pollIntervalMs);
    }
  },

  async streamRunEvents(runId: string, options?: { signal?: AbortSignal; onEvent?: (event: ControlPlaneRunEvent) => void }): Promise<void> {
    await requestEventStream<ControlPlaneRunEvent>(`/api/v1/runs/${encodeURIComponent(runId)}/stream`, options);
  },

};
