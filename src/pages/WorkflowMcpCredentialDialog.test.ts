import { describe, expect, it, vi } from 'vitest';

import {
  findWorkflowMcpOAuthRequirement,
  refreshWorkflowMcpOAuth,
  workflowMcpOAuthCallbackMatchesRequirement
} from '@/pages/WorkflowMcpCredentialDialog';
import type { WorkflowMcpRequirementPreview } from '@/services/control-plane/workflowApi';

function requirement(serverId: string, agentId: string): WorkflowMcpRequirementPreview {
  return {
    serverId,
    serverName: serverId,
    authType: 'oauth',
    owningAgent: { id: agentId, name: agentId },
    connectionState: 'connection_missing',
    authRequirement: {
      scope: 'individual',
      credentialLabel: 'OAuth',
      requiredInformation: []
    },
    action: 'authorize_mcp_server'
  };
}

describe('workflow MCP OAuth return handling', () => {
  it('reloads only the correlated connection when concurrent flows return out of order', async () => {
    const older = requirement('older-server', 'agent-1');
    const current = requirement('current-server', 'agent-2');
    const reloadConnection = vi.fn(async () => undefined);
    const reloadReadiness = vi.fn(async () => undefined);

    await refreshWorkflowMcpOAuth({
      requirements: [older, current],
      callbackServerId: 'older-server',
      reloadConnection,
      reloadReadiness,
      onRefreshError: vi.fn()
    });

    expect(findWorkflowMcpOAuthRequirement([older, current], 'older-server')).toBe(older);
    expect(reloadConnection).toHaveBeenCalledWith(older);
    expect(reloadConnection).not.toHaveBeenCalledWith(current);
    expect(reloadReadiness).toHaveBeenCalledOnce();
    expect(workflowMcpOAuthCallbackMatchesRequirement('older-server', current)).toBe(false);
    expect(workflowMcpOAuthCallbackMatchesRequirement('current-server', current)).toBe(true);
    expect(workflowMcpOAuthCallbackMatchesRequirement(null, current)).toBe(false);
  });

  it('uses a generic readiness refresh when callback correlation is unavailable', async () => {
    const reloadConnection = vi.fn(async () => undefined);
    const reloadReadiness = vi.fn(async () => undefined);

    await refreshWorkflowMcpOAuth({
      requirements: [requirement('server-1', 'agent-1')],
      callbackServerId: null,
      reloadConnection,
      reloadReadiness,
      onRefreshError: vi.fn()
    });

    expect(reloadConnection).not.toHaveBeenCalled();
    expect(reloadReadiness).toHaveBeenCalledOnce();
  });

  it('surfaces connection refresh failures without rejecting the callback', async () => {
    const refreshError = new Error('connection refresh failed');
    const onRefreshError = vi.fn();

    await expect(refreshWorkflowMcpOAuth({
      requirements: [requirement('server-1', 'agent-1')],
      callbackServerId: 'server-1',
      reloadConnection: async () => { throw refreshError; },
      reloadReadiness: async () => undefined,
      onRefreshError
    })).resolves.toBeUndefined();

    expect(onRefreshError).toHaveBeenCalledWith(refreshError);
  });
});
