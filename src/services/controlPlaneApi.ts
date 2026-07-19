import {
  ChatRuntimeSelection,
  ProjectMember,
  User,
  Workspace,
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
import type {
  ControlPlaneVirtualMachine,
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
  ControlPlaneSession,
  ControlPlaneSessionListPage,
  ControlPlaneSessionMessageListPage,
  ControlPlaneUser,
  ControlPlaneWorkspace,
  ControlPlaneWorkspaceAuditEvent,
  ControlPlaneWorkspaceInvitation,
  ControlPlaneWorkspaceMember,
  PagedResult
} from './control-plane/types';
import type {
  ControlPlaneTargetChatActivity,
  ControlPlaneTargetChatActivityEvent
} from './control-plane/sessionActivityTypes';

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
  ControlPlaneWorkspaceInvitation,
  ControlPlaneWorkspaceAuditEvent,
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
  GitTargetSkillImportInput,
  GitTargetSkillImportSource,
  ImportTargetSkillInput,
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
export type {
  ControlPlaneVirtualMachineMetricHistoryPoint,
  ControlPlaneVirtualMachineMetricsHistoryResponse
} from './control-plane/virtualMachineTypes';
export type {
  ControlPlaneTargetChatActivity,
  ControlPlaneTargetChatActivityEvent
} from './control-plane/sessionActivityTypes';
export type { ControlPlaneVirtualMachine, RegisterVirtualMachineResponse } from './control-plane/virtualMachineTypes';

export const controlPlaneApi = {
  ...controlPlaneAuthApi,
  ...catalogApi,

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
    input: { email: string; displayName?: string; role: ProjectMember['role'] }
  ): Promise<ProjectMember> {
    const member = await requestJson<ControlPlaneWorkspaceMember>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/members`,
      { method: 'POST', body: JSON.stringify(input) }
    );
    return mapWorkspaceMember(member);
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
    return options?.signal
      ? requestJson<PagedResult<ControlPlaneVirtualMachine>>(path, { signal: options.signal })
      : requestJson<PagedResult<ControlPlaneVirtualMachine>>(path);
  },

  async registerVirtualMachine(
    workspaceId: string,
    input: { name: string; hostname?: string; allowedLogSources?: string[] }
  ): Promise<RegisterVirtualMachineResponse> {
    return requestJson<RegisterVirtualMachineResponse>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/virtual-machines`,
      { method: 'POST', body: JSON.stringify(input) }
    );
  },

  async getVirtualMachine(workspaceId: string, vmId: string): Promise<ControlPlaneVirtualMachine> {
    return requestJson<ControlPlaneVirtualMachine>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/virtual-machines/${encodeURIComponent(vmId)}`
    );
  },

  async updateVirtualMachine(workspaceId: string, vmId: string, input: { name?: string; hostname?: string; allowedLogSources?: string[] }): Promise<ControlPlaneVirtualMachine> {
    return requestJson<ControlPlaneVirtualMachine>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/virtual-machines/${encodeURIComponent(vmId)}`,
      { method: 'PATCH', body: JSON.stringify(input) }
    );
  },

  async deleteVirtualMachine(workspaceId: string, vmId: string): Promise<void> {
    await requestJson<void>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/virtual-machines/${encodeURIComponent(vmId)}`,
      { method: 'DELETE' }
    );
  },

  async rotateVirtualMachineAgentKey(workspaceId: string, vmId: string): Promise<{ targetId: string; agentKey: string; keyVersion: number; installInstructions: string }> {
    return requestJson<{ targetId: string; agentKey: string; keyVersion: number; installInstructions: string }>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/virtual-machines/${encodeURIComponent(vmId)}/rotate-agent-key`,
      { method: 'POST' }
    );
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

  async createTargetSession(workspaceId: string, targetId: string, title: string): Promise<ControlPlaneSession> {
    return requestJson<ControlPlaneSession>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/targets/${encodeURIComponent(targetId)}/sessions`,
      { method: 'POST', body: JSON.stringify({ title }) }
    );
  },

  async listTargetSessions(workspaceId: string, targetId: string, options?: { limit?: number; cursor?: string; q?: string; status?: string }): Promise<ControlPlaneSessionListPage> {
    return requestJson<ControlPlaneSessionListPage>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/targets/${encodeURIComponent(targetId)}/sessions${pageQuery(options)}`
    );
  },

  async getTargetChatActivity(workspaceId: string, targetId: string, options?: { windowSeconds?: number }): Promise<ControlPlaneTargetChatActivity> {
    return requestJson<ControlPlaneTargetChatActivity>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/targets/${encodeURIComponent(targetId)}/chat-activity${pageQuery({
        filters: { windowSeconds: options?.windowSeconds ? String(options.windowSeconds) : undefined }
      })}`
    );
  },

  async streamTargetChatActivity(
    workspaceId: string,
    targetId: string,
    options?: {
      signal?: AbortSignal;
      after?: string;
      onEvent?: (event: ControlPlaneTargetChatActivityEvent) => void;
    }
  ): Promise<void> {
    const afterQuery = options?.after ? `?after=${encodeURIComponent(options.after)}` : '';
    await requestEventStream<ControlPlaneTargetChatActivityEvent>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/targets/${encodeURIComponent(targetId)}/chat-activity/stream${afterQuery}`,
      options
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
    runtimeSelection?: ChatRuntimeSelection
  ): Promise<{ messageId: string; runId: string; runtimeSelection?: ChatRuntimeSelection }> {
    const accepted = await requestJson<ControlPlaneAcceptedMessage>(
      `/api/v1/sessions/${encodeURIComponent(sessionId)}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({
          content,
          toolAccessMode,
          clientMessageId,
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
