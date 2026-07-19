import { describe, expect, it } from 'vitest';

import { ControlPlaneRequestError } from './http';
import {
  parseMcpReadinessFailures,
  resolveMcpReadinessRecovery
} from './mcpReadinessRecovery';

describe('MCP readiness recovery', () => {
  it('parses only bounded public readiness fields', () => {
    const error = new ControlPlaneRequestError('not ready', 409, 'MCP_PERSONAL_CONNECTION_REQUIRED', {
      readinessFailures: [{
        serverId: 'server-1', toolName: 'records.list',
        code: 'MCP_PERSONAL_CONNECTION_ERROR', action: 'verify_mcp_server',
        credential: 'must-not-survive', url: 'https://private.example.test'
      }]
    });

    expect(parseMcpReadinessFailures(error)).toEqual([{
      serverId: 'server-1',
      toolName: 'records.list',
      code: 'MCP_PERSONAL_CONNECTION_ERROR',
      action: 'verify_mcp_server'
    }]);
  });

  it('routes target chat recovery to the exact installation and action', () => {
    const error = new ControlPlaneRequestError('not ready', 409, 'MCP_PERSONAL_CONNECTION_REQUIRED', {
      readinessFailures: [{
        serverId: 'server-1', toolName: 'records.list',
        code: 'MCP_PERSONAL_CONNECTION_MISSING', action: 'connect_mcp_server'
      }]
    });

    expect(resolveMcpReadinessRecovery(error, {
      workspaceId: 'workspace-1', scopeType: 'target', targetId: 'cluster-1', targetType: 'kubernetes'
    })).toMatchObject({
      href: '/workspaces/workspace-1/kubernetes-clusters/cluster-1/mcp-servers?mcpServer=server-1&mcpAction=connect_mcp_server',
      label: 'Connect the required MCP server'
    });
  });

  it('routes Agent and workflow recovery to the exact Agent installation', () => {
    const error = new ControlPlaneRequestError('not ready', 409, 'MCP_PERSONAL_CONNECTION_REQUIRED', {
      readinessFailures: [{
        serverId: 'server-1', toolName: 'records.list',
        code: 'MCP_PERSONAL_TOOL_UNAVAILABLE', action: 'verify_mcp_server'
      }]
    });

    expect(resolveMcpReadinessRecovery(error, {
      workspaceId: 'workspace-1', scopeType: 'agent', agentId: 'agent-1'
    })?.href).toBe('/workspaces/workspace-1/agents?agent=agent-1&panel=profile&agentTab=capabilities&capabilityTab=mcp&mcpServer=server-1&mcpAction=verify_mcp_server');
  });

  it('describes unavailable target tools without implying another MCP installation is required', () => {
    const error = new ControlPlaneRequestError('not ready', 409, 'MCP_INSTALLATION_UNAVAILABLE', {
      readinessFailures: [{
        serverId: 'server-1', toolName: 'get_resource_logs',
        code: 'MCP_INSTALLATION_UNAVAILABLE'
      }]
    });

    expect(resolveMcpReadinessRecovery(error, {
      workspaceId: 'workspace-1', scopeType: 'target', targetId: 'cluster-1', targetType: 'kubernetes'
    })).toMatchObject({
      message: 'The required Kubernetes tool “get\\_resource\\_logs” is unavailable or disabled. Review its MCP server configuration before retrying.',
      href: '/workspaces/workspace-1/kubernetes-clusters/cluster-1/mcp-servers?mcpServer=server-1',
      label: 'Review target MCP tools'
    });
  });

  it('escapes untrusted tool names before placing them in chat Markdown', () => {
    const error = new ControlPlaneRequestError('not ready', 409, 'MCP_INSTALLATION_UNAVAILABLE', {
      readinessFailures: [{
        serverId: 'server-1', toolName: '[logs](https://example.test)',
        code: 'MCP_INSTALLATION_UNAVAILABLE'
      }]
    });

    expect(resolveMcpReadinessRecovery(error, {
      workspaceId: 'workspace-1', scopeType: 'target', targetId: 'vm-1', targetType: 'virtual_machine'
    })?.message).toContain('“\\[logs\\]\\(https://example\\.test\\)”');
  });

  it('falls back to the relevant MCP page for legacy string-only errors', () => {
    const error = new ControlPlaneRequestError('not ready', 409, 'MCP_PERSONAL_CONNECTION_REQUIRED', {
      readinessErrors: ['Connect a PAT for MCP tool server-1/records.list.']
    });

    expect(resolveMcpReadinessRecovery(error, {
      workspaceId: 'workspace-1', scopeType: 'target', targetId: 'vm-1', targetType: 'virtual_machine'
    })?.href).toBe('/workspaces/workspace-1/virtual-machines/vm-1/mcp-servers');
  });
});
