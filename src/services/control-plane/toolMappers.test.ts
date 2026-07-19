import { describe, expect, it } from 'vitest';

import {
  mapClusterTools,
  mapClusterToolsCatalog,
  mapClusterToolsFromCatalog,
  mapMcpServer,
  mapMcpServerTestConnectionResult
} from './toolMappers';

describe('tool mappers', () => {
  it('maps cluster tools with default capability and source fallbacks', () => {
    expect(
      mapClusterTools([
        {
          name: 'kubectl-get',
          mcp_server_url: 'https://mcp.example.com',
          timeout_ms: 1000,
          enabled: 1 as unknown as boolean
        },
        {
          name: 'apply-manifest',
          mcp_server_url: 'builtin://cluster',
          timeout_ms: 1000,
          enabled: false,
          capability: 'write',
          source: 'builtin',
          description: 'Apply manifests',
          version: 'v2'
        }
      ])
    ).toEqual([
      expect.objectContaining({
        toolId: 'kubectl-get',
        enabled: true,
        toolType: 'mcp',
        capability: 'read',
        sourceServerUrl: 'https://mcp.example.com'
      }),
      expect.objectContaining({
        toolId: 'apply-manifest',
        enabled: false,
        toolType: 'builtin',
        capability: 'write',
        description: 'Apply manifests',
        version: 'v2'
      })
    ]);
  });

  it('flattens catalog tool entries onto cluster tools', () => {
    expect(
      mapClusterToolsFromCatalog({
        workspaceId: 'workspace-1',
        clusterId: 'cluster-1',
        permissions: {
          canEdit: true,
          editableRoles: ['owner']
        },
        servers: [
          {
            id: 'server-1',
            name: 'Builtin tools',
            url: 'builtin://cluster',
            type: 'builtin',
            enabled: true,
            isSystem: true,
            canDelete: false,
            canEditConnection: false,
            authType: 'none',
            toolCounts: {
              total: 1,
              enabledConfigured: 1,
              enabledEffective: 1,
              writeConfigured: 0,
              writeEffective: 0
            },
            tools: [
              {
                name: 'describe',
                description: 'Describe resources',
                capability: 'read',
                version: 'v1',
                source: 'builtin',
                enabledConfigured: true,
                enabledEffective: true,
                effectiveDisabledReason: null
              }
            ]
          }
        ]
      })
    ).toEqual([
      expect.objectContaining({
        toolId: 'describe',
        sourceServerId: 'server-1',
        sourceServerName: 'Builtin tools',
        sourceServerUrl: 'builtin://cluster',
        enabledConfigured: true,
        enabledEffective: true
      })
    ]);
    const catalog = mapClusterToolsCatalog({
      workspaceId: 'workspace-1',
      clusterId: 'cluster-1',
      permissions: {
        canEdit: true,
        editableRoles: []
      },
      servers: [
        {
          id: 'server-1',
          name: 'Builtin tools',
          url: 'builtin://cluster',
          type: 'builtin',
          enabled: true,
          isSystem: true,
          canDelete: false,
          canEditConnection: false,
          authType: 'none',
          toolCounts: {
            total: 0,
            enabledConfigured: 0,
            enabledEffective: 0,
            writeConfigured: 0,
            writeEffective: 0
          },
          tools: []
        }
      ]
    });
    expect(catalog.servers[0].canToggle).toBe(true);
  });

  it('normalizes cluster tool catalog server defaults', () => {
    const catalog = mapClusterToolsCatalog({
      workspaceId: 'workspace-1',
      clusterId: 'cluster-1',
      permissions: {
        canEdit: 1 as unknown as boolean,
        editableRoles: 'owner' as unknown as string[]
      },
      servers: [
        {
          id: 'server-1',
          name: 'External MCP',
          url: 'https://mcp.example.com',
          type: 'mcp',
          enabled: 1 as unknown as boolean,
          isSystem: 0 as unknown as boolean,
          canDelete: 1 as unknown as boolean,
          canEditConnection: 0 as unknown as boolean,
          canToggle: false,
          authType: 'custom_header',
          connectionStatus: 'degraded' as 'unknown',
          toolCounts: {
            total: undefined as unknown as number,
            enabledConfigured: undefined as unknown as number,
            enabledEffective: undefined as unknown as number,
            writeConfigured: undefined as unknown as number,
            writeEffective: undefined as unknown as number
          },
          tools: [
            {
              name: 'write-tool',
              description: 'mutates state',
              capability: 'write',
              version: '',
              source: 'mcp',
              enabledConfigured: 1 as unknown as boolean,
              enabledEffective: 0 as unknown as boolean,
              effectiveDisabledReason: 'permission_denied' as null
            }
          ]
        }
      ]
    });

    expect(catalog.permissions).toEqual({
      canEdit: true,
      editableRoles: []
    });
    expect(catalog.servers).toEqual([
      expect.objectContaining({
        canToggle: false,
        connectionStatus: 'unknown',
        toolCounts: {
          total: 0,
          enabledConfigured: 0,
          enabledEffective: 0,
          writeConfigured: 0,
          writeEffective: 0
        },
        tools: [
          expect.objectContaining({
            version: 'v1',
            effectiveDisabledReason: null
          })
        ]
      })
    ]);
  });

  it('preserves target identity for target-scoped MCP catalogs', () => {
    const catalog = mapClusterToolsCatalog({
      workspaceId: 'workspace-1',
      targetId: 'vm-1',
      targetType: 'virtual_machine',
      permissions: {
        canEdit: false,
        editableRoles: []
      },
      servers: []
    });

    expect(catalog).toEqual(expect.objectContaining({
      workspaceId: 'workspace-1',
      clusterId: 'vm-1',
      targetId: 'vm-1',
      targetType: 'virtual_machine'
    }));
  });

  it('preserves agent write-disabled catalog reasons', () => {
    const catalog = mapClusterToolsCatalog({
      workspaceId: 'workspace-1',
      clusterId: 'cluster-1',
      permissions: {
        canEdit: true,
        editableRoles: []
      },
      servers: [
        {
          id: 'server-1',
          name: 'Built-in tools',
          url: 'local://builtin',
          type: 'builtin',
          enabled: true,
          isSystem: true,
          canDelete: false,
          canEditConnection: false,
          authType: 'none',
          toolCounts: {
            total: 1,
            enabledConfigured: 1,
            enabledEffective: 0,
            writeConfigured: 1,
            writeEffective: 0
          },
          tools: [
            {
              name: 'restart_workload',
              description: 'Restart workload',
              capability: 'write',
              version: 'v1',
              source: 'builtin',
              enabledConfigured: true,
              enabledEffective: false,
              effectiveDisabledReason: 'agent_write_disabled'
            }
          ]
        }
      ]
    });

    expect(catalog.servers[0].tools[0]).toEqual(expect.objectContaining({
      enabledConfigured: true,
      enabledEffective: false,
      effectiveDisabledReason: 'agent_write_disabled'
    }));
  });

  it('maps MCP servers and test results into UI models', () => {
    expect(
      mapMcpServer({
        id: 'server-1',
        workspace_id: 'workspace-1',
        target_id: 'cluster-1',
        target_type: 'kubernetes',
        server_name: 'External MCP',
        server_url: 'https://mcp.example.com',
        enabled: true,
        auth_type: 'bearer_token',
        auth_header_name: 'Authorization',
        auth_header_prefix: 'Bearer',
        public_headers: { 'X-Trace': '1' },
        connection_status: 'degraded' as 'unknown',
        last_discovery_at: undefined,
        last_discovery_error: undefined,
        tools: [
          {
            name: 'describe',
            mcp_server_url: 'https://mcp.example.com',
            timeout_ms: 1000,
            enabled: true
          }
        ]
      })
    ).toEqual(
      expect.objectContaining({
        workspaceId: 'workspace-1',
        targetId: 'cluster-1',
        authType: 'bearer_token',
        publicHeaders: { 'X-Trace': '1' },
        connectionStatus: 'unknown',
        lastDiscoveryAt: null,
        lastDiscoveryError: null,
        tools: [expect.objectContaining({ toolId: 'describe' })]
      })
    );

    expect(
      mapMcpServerTestConnectionResult({
        server_id: 'server-1',
        server_name: 'External MCP',
        server_url: 'https://mcp.example.com',
        connection_status: 'ok',
        last_discovery_at: '2026-05-25T00:00:00.000Z',
        discovered_tool_count: 2,
        discovered_tools: ['describe', 'write-tool'],
        error: ''
      })
    ).toEqual({
      serverId: 'server-1',
      serverName: 'External MCP',
      serverUrl: 'https://mcp.example.com',
      connectionStatus: 'ok',
      lastDiscoveryAt: '2026-05-25T00:00:00.000Z',
      discoveredToolCount: 2,
      discoveredTools: ['describe', 'write-tool'],
      error: null
    });
  });
});
