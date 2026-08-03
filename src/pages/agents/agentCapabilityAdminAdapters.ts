import type {
  CapabilityMcpDataSource,
  CapabilitySkillsCatalog,
  CapabilitySkillDetail,
  CapabilitySkillsDataSource,
  CapabilitySubject,
  CapabilityToolItem,
  CapabilityToolsCatalog,
  CapabilityToolsDataSource,
  CreateMcpServerInput,
  McpServerRecord,
  McpServerTestConnectionResult,
  McpToolCatalog,
  McpToolCatalogItem,
  McpToolCatalogServer,
  UpdateMcpServerInput
} from '@/features/capabilities/admin';
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
  resolveAgentGitSkill,
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
import { countEnabledScheduleImpactForAgent } from '@/features/catalog/mcpCredentialModeImpact';

const textBytes = (value: string) => new TextEncoder().encode(value).byteLength;

export function toAgentCapabilitySubject(agent: AgentDefinition): CapabilitySubject {
  return {
    id: agent.id,
    workspaceId: agent.workspaceId,
    name: agent.name
  };
}

function mapAgentMcpTool(tool: AgentMcpToolApi, serverEnabled: boolean): McpToolCatalogItem {
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

function mapConnectionStatus(status?: string): McpToolCatalogServer['connectionStatus'] {
  if (status === 'ok' || status === 'connected') return 'ok';
  if (status === 'error') return 'error';
  return 'unknown';
}

function mapAgentMcpServer(server: AgentMcpServerApi): McpToolCatalogServer {
  const tools = server.tools.map((tool) => mapAgentMcpTool(tool, server.enabled));
  const readOnly = tools.filter((tool) => tool.capability === 'read').length;
  const writeCapable = tools.filter((tool) => tool.capability === 'write').length;
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
    isSystem: server.isSystem,
    canDelete: server.canDelete,
    canEditConnection: server.canEditConnection,
    canToggle: server.canToggle,
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
      readOnly,
      writeCapable,
      enabledConfigured,
      enabledEffective,
      writeConfigured,
      writeEffective
    },
    tools
  };
}

function mapAgentMcpInstallation(server: AgentMcpServerApi, agent: AgentDefinition): McpServerRecord {
  return {
    id: server.id,
    workspaceId: agent.workspaceId,
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

function mcpCatalog(agent: AgentDefinition, servers: AgentMcpServerApi[], canManageMcp: boolean): McpToolCatalog {
  return {
    workspaceId: agent.workspaceId,
    permissions: { canEdit: canManageMcp, editableRoles: [] },
    servers: servers.map(mapAgentMcpServer)
  };
}

export function createAgentMcpDataSource(agent: AgentDefinition, canManageMcp: boolean): CapabilityMcpDataSource {
  return {
    async getCatalog(workspaceId, subjectId) {
      return mcpCatalog(agent, await listAgentMcpServers(workspaceId, subjectId), canManageMcp);
    },
    async listServerTools(workspaceId, subjectId, serverId, options) {
      options.signal.throwIfAborted();
      const server = (await listAgentMcpServers(workspaceId, subjectId)).find((item) => item.id === serverId);
      return { items: server ? server.tools.map((tool) => mapAgentMcpTool(tool, server.enabled)) : [] };
    },
    async createServer(workspaceId, subjectId, input: CreateMcpServerInput) {
      const server = await createAgentMcpServer(workspaceId, subjectId, {
        name: input.name,
        url: input.url,
        credentialMode: input.credentialMode,
        authType: input.auth?.type,
        authHeaderName: input.auth?.headerName
      });
      return mapAgentMcpInstallation(server, agent);
    },
    async updateServer(workspaceId, subjectId, serverId, input: UpdateMcpServerInput) {
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
      const result: McpServerTestConnectionResult = {
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
      const currentServer = (await listAgentMcpServers(workspaceId, subjectId)).find((item) => item.id === serverId);
      const tool = await reviewAgentMcpTool(workspaceId, subjectId, serverId, toolName, {
        enabled: input.enabled,
        ...(currentServer?.isSystem ? {} : {
          capability: input.capability,
          reviewState: input.enabled ? 'approved' as const : undefined
        })
      });
      const server = (await listAgentMcpServers(workspaceId, subjectId)).find((item) => item.id === serverId);
      return mapAgentMcpTool(tool, server?.enabled !== false);
    }
  };
}

function mapAgentSkill(agent: AgentDefinition, skill: AgentSkillApi): CapabilitySkillDetail {
  const totalBytes = skill.files.reduce((total, file) => total + textBytes(file.content), 0);
  return {
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

export function createAgentSkillsDataSource(agent: AgentDefinition, canManageSkills: boolean): CapabilitySkillsDataSource {
  const getAgentSkill = async (workspaceId: string, subjectId: string, skillId: string) => {
    const skill = (await listAgentSkills(workspaceId, subjectId)).find((item) => item.id === skillId);
    if (!skill) throw new Error('The Agent skill could not be found.');
    return skill;
  };
  return {
    async listSkills(workspaceId, subjectId): Promise<CapabilitySkillsCatalog> {
      const items = (await listAgentSkills(workspaceId, subjectId)).map((skill) => mapAgentSkill(agent, skill));
      return {
        workspaceId,
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
          ref: input.source.ref,
          path: input.source.subpath,
          pinnedCommit: input.source.commitSha || ''
        }
      });
      return mapAgentSkill(agent, skill);
    },
    resolveSkill: (workspaceId, subjectId, input) => resolveAgentGitSkill(workspaceId, subjectId, input),
    deleteSkill: (workspaceId, subjectId, skillId) => deleteAgentSkill(workspaceId, subjectId, skillId),
    async reimportSkill(workspaceId, subjectId, skillId, input) {
      const current = await getAgentSkill(workspaceId, subjectId, skillId);
      const skill = await reimportAgentSkill(workspaceId, subjectId, skillId, {
        files: input.files,
        source: {
          type: 'git',
          provider: input.source.provider,
          url: input.source.repoUrl,
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
): CapabilityToolItem {
  return {
    id: tool.id,
    label: tool.title,
    description: tool.description,
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

export function createAgentToolsDataSource(agent: AgentDefinition, canManageTools: boolean): CapabilityToolsDataSource {
  let assignedToolIds = [...(agent.tools || [])];
  let toolConfigs = { ...(agent.nativeToolConfigs || {}) };
  let nativeTools: WorkspaceNativeToolApi[] = [];
  return {
    async listTools(workspaceId, _subjectId): Promise<CapabilityToolsCatalog> {
      const loadedNativeTools = await listWorkspaceNativeTools(workspaceId).catch(() => assignedToolIds.map<WorkspaceNativeToolApi>((toolId) => ({
        id: toolId,
        modelAlias: toolId,
        title: toolId,
        description: 'Workspace-native Agent tool.',
        semanticCapabilityId: toolId,
        invocationScopes: ['agent_chat'],
        authorizationClass: 'internal_artifact',
        auditOperation: 'read',
        approvalOperation: 'read',
        inputSchema: {},
        outputSchema: {}
      })));
      nativeTools = Array.isArray(loadedNativeTools)
        ? loadedNativeTools.filter((tool) => tool.invocationScopes.includes('agent_chat'))
        : [];
      return {
        workspaceId,
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
  return countEnabledScheduleImpactForAgent(workspaceId, agentId);
}
