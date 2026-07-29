import type { TargetDescriptor } from '@/features/targets/targetDescriptor';
import type { McpServersDataSource } from '@/features/targets/admin/McpServersView';
import type { TargetSkillsDataSource } from '@/features/targets/admin/TargetSkillsView';
import type { TargetToolsDataSource } from '@/features/targets/admin/TargetToolsView';
import type {
  ControlPlaneTargetSkillDetail,
  ControlPlaneTargetSkillsCatalog,
  ControlPlaneTargetToolItem,
  ControlPlaneTargetToolsCatalog,
  CreateTargetMcpServerInput,
  TargetMcpServer,
  TargetMcpServerTestConnectionResult,
  UpdateTargetMcpServerInput
} from '@/services/controlPlaneApi';
import type { AgentDefinition } from '@/pages/agents/agentModel';
import {
  createAgentMcpServer,
  createAgentSkill,
  deleteAgentMcpServer,
  deleteAgentSkill,
  grantAgentNativeTool,
  importAgentSkill,
  listAgentMcpServers,
  listAgentSkills,
  listWorkspaceNativeTools,
  reimportAgentSkill,
  reviewAgentMcpTool,
  revokeAgentNativeTool,
  testAgentMcpServer,
  updateAgentMcpServer,
  updateAgentSkill,
  type AgentMcpServerApi,
  type AgentMcpToolApi,
  type AgentSkillApi,
  type WorkspaceNativeToolApi
} from '@/services/control-plane/agentApi';
import { enabledScheduleImpactForAgent } from '@/features/catalog/mcpCredentialModeImpact';
import { listWorkspaceWorkflowSchedules, listWorkspaceWorkflows } from '@/services/control-plane/workflowApi';
import type { TargetToolCatalog, TargetToolCatalogItem, TargetToolCatalogServer } from '@/features/targets/admin/targetMcpCatalogTypes';

const textBytes = (value: string) => new TextEncoder().encode(value).byteLength;

export function toAgentCapabilitySubject(agent: AgentDefinition): TargetDescriptor {
  return {
    id: agent.id,
    workspaceId: agent.workspaceId,
    // Shared capability views do not branch on target type. The Agent data sources
    // below keep every request on Agent-specific API routes.
    targetType: 'kubernetes',
    name: agent.name,
    chatSessions: [],
    mcpTools: []
  };
}

function mapAgentMcpTool(tool: AgentMcpToolApi, serverEnabled: boolean): TargetToolCatalogItem {
  const enabledEffective = serverEnabled && tool.enabled;
  return {
    name: tool.name,
    description: tool.description || tool.alias || tool.name,
    capability: tool.capability,
    version: 'v1',
    source: 'mcp',
    enabledConfigured: tool.enabled,
    enabledEffective,
    effectiveDisabledReason: tool.enabled && !serverEnabled ? 'server_disabled' : null
  };
}

function mapConnectionStatus(status?: string): TargetToolCatalogServer['connectionStatus'] {
  if (status === 'ok' || status === 'connected') return 'ok';
  if (status === 'error') return 'error';
  return 'unknown';
}

function mapAgentMcpServer(server: AgentMcpServerApi): TargetToolCatalogServer {
  const tools = server.tools.map((tool) => mapAgentMcpTool(tool, server.enabled));
  const enabledConfigured = tools.filter((tool) => tool.enabledConfigured).length;
  const enabledEffective = tools.filter((tool) => tool.enabledEffective).length;
  const writeConfigured = tools.filter((tool) => tool.enabledConfigured && tool.capability === 'write').length;
  const writeEffective = tools.filter((tool) => tool.enabledEffective && tool.capability === 'write').length;
  return {
    id: server.id,
    name: server.name,
    url: server.url,
    type: 'mcp',
    enabled: server.enabled,
    isSystem: false,
    canDelete: true,
    canEditConnection: true,
    canToggle: true,
    authType: server.authType === 'bearer_token' || server.authType === 'custom_header' ? server.authType : 'none',
    credentialMode: server.credentialMode,
    authHeaderName: server.authHeaderName,
    authHeaderPrefix: server.authHeaderPrefix,
    revision: server.revision,
    provenance: server.provenance,
    publicHeaders: {},
    connectionStatus: mapConnectionStatus(server.connectionStatus),
    lastDiscoveryAt: null,
    lastDiscoveryError: server.lastDiscoveryError || null,
    toolCounts: {
      total: tools.length,
      enabledConfigured,
      enabledEffective,
      writeConfigured,
      writeEffective
    },
    tools
  };
}

function mapAgentMcpInstallation(server: AgentMcpServerApi, agent: AgentDefinition): TargetMcpServer {
  return {
    id: server.id,
    workspaceId: agent.workspaceId,
    targetId: agent.id,
    serverName: server.name,
    serverUrl: server.url,
    enabled: server.enabled,
    authType: server.authType === 'bearer_token' || server.authType === 'custom_header' ? server.authType : 'none',
    credentialMode: server.credentialMode,
    authHeaderName: server.authHeaderName,
    authHeaderPrefix: server.authHeaderPrefix,
    connectionStatus: mapConnectionStatus(server.connectionStatus),
    lastDiscoveryAt: null,
    lastDiscoveryError: server.lastDiscoveryError || null,
    revision: server.revision,
    provenance: server.provenance,
    tools: server.tools.map((tool) => ({
      toolId: tool.name,
      description: tool.description,
      capability: tool.capability,
      enabled: tool.enabled,
      toolType: 'mcp'
    }))
  };
}

function mcpCatalog(agent: AgentDefinition, servers: AgentMcpServerApi[], canManageMcp: boolean): TargetToolCatalog {
  return {
    workspaceId: agent.workspaceId,
    clusterId: agent.id,
    targetId: agent.id,
    permissions: { canEdit: canManageMcp, editableRoles: [] },
    servers: servers.map(mapAgentMcpServer)
  };
}

export function createAgentMcpDataSource(agent: AgentDefinition, canManageMcp: boolean): McpServersDataSource {
  return {
    async getCatalog(workspaceId, subjectId) {
      return mcpCatalog(agent, await listAgentMcpServers(workspaceId, subjectId), canManageMcp);
    },
    async listServerTools(workspaceId, subjectId, serverId, options) {
      options.signal.throwIfAborted();
      const server = (await listAgentMcpServers(workspaceId, subjectId)).find((item) => item.id === serverId);
      return { items: server ? server.tools.map((tool) => mapAgentMcpTool(tool, server.enabled)) : [] };
    },
    async createServer(workspaceId, subjectId, input: CreateTargetMcpServerInput) {
      const server = await createAgentMcpServer(workspaceId, subjectId, {
        name: input.name,
        url: input.url,
        credentialMode: input.credentialMode,
        authType: input.auth?.type,
        authHeaderName: input.auth?.headerName
      });
      return mapAgentMcpInstallation(server, agent);
    },
    async updateServer(workspaceId, subjectId, serverId, input: UpdateTargetMcpServerInput) {
      const server = await updateAgentMcpServer(workspaceId, subjectId, serverId, {
        name: input.name,
        enabled: input.enabled,
        credentialMode: input.credentialMode,
        authType: input.auth?.type,
        authHeaderName: input.auth?.headerName,
        expectedRevision: input.expectedRevision
      });
      return mapAgentMcpInstallation(server, agent);
    },
    deleteServer: (workspaceId, subjectId, serverId) => deleteAgentMcpServer(workspaceId, subjectId, serverId),
    async testServer(workspaceId, subjectId, serverId) {
      await testAgentMcpServer(workspaceId, subjectId, serverId);
      const server = (await listAgentMcpServers(workspaceId, subjectId)).find((item) => item.id === serverId);
      if (!server) throw new Error('The MCP server could not be reloaded after testing.');
      const result: TargetMcpServerTestConnectionResult = {
        serverId,
        serverName: server.name,
        serverUrl: server.url,
        connectionStatus: mapConnectionStatus(server.connectionStatus) === 'error' ? 'error' : 'ok',
        lastDiscoveryAt: new Date().toISOString(),
        discoveredToolCount: server.tools.length,
        discoveredTools: server.tools.map((tool) => tool.name),
        error: server.lastDiscoveryError || null
      };
      return result;
    },
    async updateServerTool(workspaceId, subjectId, serverId, toolName, input) {
      const tool = await reviewAgentMcpTool(workspaceId, subjectId, serverId, toolName, {
        enabled: input.enabled,
        capability: input.capability,
        reviewState: input.enabled ? 'approved' : undefined
      });
      const server = (await listAgentMcpServers(workspaceId, subjectId)).find((item) => item.id === serverId);
      return mapAgentMcpTool(tool, server?.enabled !== false);
    }
  };
}

function mapAgentSkill(agent: AgentDefinition, skill: AgentSkillApi): ControlPlaneTargetSkillDetail {
  const totalBytes = skill.files.reduce((total, file) => total + textBytes(file.content), 0);
  return {
    targetId: agent.id,
    targetType: 'kubernetes',
    id: skill.id,
    workspaceId: agent.workspaceId,
    name: skill.name,
    description: skill.description,
    enabled: skill.enabled,
    validationStatus: 'valid',
    validationErrors: [],
    bundleStats: { fileCount: skill.files.length, totalBytes },
    source: {
      type: skill.source.type === 'git' ? 'git_import' : 'manual',
      provider: skill.source.provider,
      repoUrl: skill.source.url,
      apiBaseUrl: skill.source.apiBaseUrl,
      ref: skill.source.ref,
      subpath: skill.source.path,
      commitSha: skill.source.pinnedCommit,
      syncStatus: skill.source.type === 'git' ? 'current' : 'not_applicable'
    },
    files: skill.files.map((file) => ({
      path: file.path,
      content: file.content,
      sizeBytes: textBytes(file.content)
    })),
    createdAt: '',
    updatedAt: ''
  };
}

const nameFromSkillFiles = (files: Array<{ path: string; content: string }>) => {
  const markdown = files.find((file) => file.path === 'SKILL.md')?.content || '';
  return markdown.match(/^name:\s*(.+)$/m)?.[1]?.trim() || 'untitled-skill';
};

export function createAgentSkillsDataSource(agent: AgentDefinition, canManageSkills: boolean): TargetSkillsDataSource {
  const getAgentSkill = async (workspaceId: string, subjectId: string, skillId: string) => {
    const skill = (await listAgentSkills(workspaceId, subjectId)).find((item) => item.id === skillId);
    if (!skill) throw new Error('The Agent skill could not be found.');
    return skill;
  };
  return {
    async listSkills(workspaceId, subjectId): Promise<ControlPlaneTargetSkillsCatalog> {
      const items = (await listAgentSkills(workspaceId, subjectId)).map((skill) => mapAgentSkill(agent, skill));
      return {
        workspaceId,
        targetId: subjectId,
        targetType: 'kubernetes',
        permissions: { canEdit: canManageSkills, editableRoles: [] },
        items
      };
    },
    async getSkill(workspaceId, subjectId, skillId) {
      return mapAgentSkill(agent, await getAgentSkill(workspaceId, subjectId, skillId));
    },
    async createSkill(workspaceId, subjectId, input) {
      const skill = await createAgentSkill(workspaceId, subjectId, {
        name: nameFromSkillFiles(input.files),
        files: input.files
      });
      return mapAgentSkill(agent, skill);
    },
    async updateSkill(workspaceId, subjectId, skillId, input) {
      const current = await getAgentSkill(workspaceId, subjectId, skillId);
      const skill = await updateAgentSkill(workspaceId, subjectId, skillId, {
        enabled: input.enabled,
        files: input.files,
        expectedRevision: current.revision
      });
      return mapAgentSkill(agent, skill);
    },
    async importSkill(workspaceId, subjectId, input) {
      const skill = await importAgentSkill(workspaceId, subjectId, {
        files: input.files,
        source: {
          type: 'git',
          provider: input.source.provider,
          url: input.source.repoUrl,
          apiBaseUrl: input.source.apiBaseUrl,
          ref: input.source.ref,
          path: input.source.subpath,
          pinnedCommit: input.source.commitSha || ''
        }
      });
      return mapAgentSkill(agent, skill);
    },
    deleteSkill: (workspaceId, subjectId, skillId) => deleteAgentSkill(workspaceId, subjectId, skillId),
    async reimportSkill(workspaceId, subjectId, skillId, input) {
      const current = await getAgentSkill(workspaceId, subjectId, skillId);
      const skill = await reimportAgentSkill(workspaceId, subjectId, skillId, {
        files: input.files,
        source: {
          type: 'git',
          provider: input.source.provider,
          url: input.source.repoUrl,
          apiBaseUrl: input.source.apiBaseUrl,
          ref: input.source.ref,
          path: input.source.subpath,
          pinnedCommit: input.source.commitSha || ''
        },
        expectedRevision: current.revision
      });
      return mapAgentSkill(agent, skill);
    }
  };
}

function mapNativeTool(
  tool: WorkspaceNativeToolApi,
  enabled: boolean,
  config: Record<string, unknown> | undefined,
  canManageTools: boolean
): ControlPlaneTargetToolItem {
  return {
    id: tool.id,
    label: tool.title,
    description: tool.targetCatalogDescription || tool.description,
    enabled,
    toggleable: true,
    origin: 'platform_native',
    capability: tool.approvalOperation,
    runtimeKind: 'function',
    visibility: {
      appearsInAssistantToolList: enabled,
      appearsInRunEnabledTools: enabled,
      appearsInToolCalls: enabled
    },
    permissions: { canEdit: canManageTools },
    config: config || {}
  };
}

export function createAgentToolsDataSource(agent: AgentDefinition, canManageTools: boolean): TargetToolsDataSource {
  let assignedToolIds = [...(agent.tools || [])];
  let toolConfigs = { ...(agent.nativeToolConfigs || {}) };
  let nativeTools: WorkspaceNativeToolApi[] = [];
  return {
    async listTools(workspaceId, subjectId): Promise<ControlPlaneTargetToolsCatalog> {
      const loadedNativeTools = await listWorkspaceNativeTools(workspaceId).catch(() => assignedToolIds.map<WorkspaceNativeToolApi>((toolId) => ({
        id: toolId,
        modelAlias: toolId,
        title: toolId,
        description: 'Workspace-native Agent tool.',
        semanticCapabilityId: toolId,
        invocationScopes: ['workflow'],
        authorizationClass: 'prompt_resource',
        auditOperation: 'read',
        approvalOperation: 'read',
        inputSchema: {},
        outputSchema: {}
      })));
      nativeTools = Array.isArray(loadedNativeTools) ? loadedNativeTools : [];
      return {
        workspaceId,
        targetId: subjectId,
        targetType: 'kubernetes',
        permissions: { canEdit: canManageTools, editableRoles: [] },
        items: nativeTools.map((tool) => mapNativeTool(
          tool,
          assignedToolIds.includes(tool.id),
          toolConfigs[tool.id],
          canManageTools
        ))
      };
    },
    async updateTool(workspaceId, subjectId, toolId, input) {
      const updated = input.enabled
        ? await grantAgentNativeTool(workspaceId, subjectId, toolId, input.config as Record<string, unknown> | undefined)
        : await revokeAgentNativeTool(workspaceId, subjectId, toolId);
      assignedToolIds = [...(updated.tools || [])];
      toolConfigs = { ...(updated.nativeToolConfigs || {}) };
      const tool = nativeTools.find((item) => item.id === toolId);
      if (!tool) throw new Error('The Agent tool could not be reloaded.');
      return mapNativeTool(tool, assignedToolIds.includes(toolId), toolConfigs[toolId], canManageTools);
    }
  };
}

export async function countAgentCredentialModeScheduleImpact(
  workspaceId: string,
  agentId: string
): Promise<number> {
  const [workflows, schedules] = await Promise.all([
    listWorkspaceWorkflows(workspaceId),
    listWorkspaceWorkflowSchedules(workspaceId)
  ]);
  return enabledScheduleImpactForAgent(workflows, schedules.items, agentId).length;
}
