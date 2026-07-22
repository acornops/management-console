import { describe, expect, it } from 'vitest';

import { ControlPlaneRequestError } from './http';
import {
  agentMcpConfigurationPath,
  parseMcpReadinessFailures,
  resolveMcpReadinessRecovery
} from './mcpReadinessRecovery';

describe('MCP readiness recovery', () => {
  it('builds one canonical Agent MCP configuration path', () => {
    expect(agentMcpConfigurationPath({
      workspaceId: 'workspace-1',
      agentId: 'agent-1',
      serverId: 'server-1',
      action: 'connect_mcp_server'
    })).toBe('/workspaces/workspace-1/agents?agent=agent-1&panel=profile&agentTab=capabilities&capabilityTab=mcp&mcpServer=server-1&mcpAction=connect_mcp_server');
  });

  it('parses only bounded public readiness fields', () => {
    const error = new ControlPlaneRequestError('not ready', 409, 'MCP_CONNECTION_REQUIRED', {
      readinessFailures: [{
        serverId: 'server-1', toolName: 'records.list',
        code: 'MCP_CONNECTION_ERROR', action: 'verify_mcp_server',
        credential: 'must-not-survive', url: 'https://private.example.test'
      }]
    });

    expect(parseMcpReadinessFailures(error)).toEqual([{
      serverId: 'server-1',
      toolName: 'records.list',
      code: 'MCP_CONNECTION_ERROR',
      action: 'verify_mcp_server'
    }]);
  });

  it('routes target chat recovery to the exact installation and action', () => {
    const error = new ControlPlaneRequestError('not ready', 409, 'MCP_CONNECTION_REQUIRED', {
      readinessFailures: [{
        serverId: 'server-1', toolName: 'records.list',
        code: 'MCP_CONNECTION_MISSING', action: 'connect_mcp_server'
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
    const error = new ControlPlaneRequestError('not ready', 409, 'MCP_CONNECTION_REQUIRED', {
      readinessFailures: [{
        serverId: 'server-1', toolName: 'records.list',
        code: 'MCP_CREDENTIAL_TOOL_UNAVAILABLE', action: 'verify_mcp_server'
      }]
    });

    expect(resolveMcpReadinessRecovery(error, {
      workspaceId: 'workspace-1', scopeType: 'agent', agentId: 'agent-1'
    })?.href).toBe('/workspaces/workspace-1/agents?agent=agent-1&panel=profile&agentTab=capabilities&capabilityTab=mcp&mcpServer=server-1&mcpAction=verify_mcp_server');
  });

  it('explains how to repair service-identity and individual-credential incompatibility', () => {
    const error = new ControlPlaneRequestError('not ready', 409, 'MCP_INDIVIDUAL_USER_PRINCIPAL_REQUIRED', {
      readinessFailures: [{
        serverId: 'server-1', toolName: 'records.list',
        code: 'MCP_INDIVIDUAL_USER_PRINCIPAL_REQUIRED'
      }]
    });

    expect(resolveMcpReadinessRecovery(error, {
      workspaceId: 'workspace-1', scopeType: 'agent', agentId: 'agent-1'
    })).toMatchObject({
      message: 'This run uses a service identity, but the required MCP server uses individual credentials. Switch the server to workspace-managed credentials or run the automation as a user.',
      label: 'Review credential ownership'
    });
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

  it('rejects unstructured readiness details', () => {
    const error = new ControlPlaneRequestError('not ready', 409, 'MCP_CONNECTION_REQUIRED', {
      message: 'Unstructured details are not part of the readiness contract.'
    });

    expect(resolveMcpReadinessRecovery(error, {
      workspaceId: 'workspace-1', scopeType: 'target', targetId: 'vm-1', targetType: 'virtual_machine'
    })).toBeNull();
  });
});
