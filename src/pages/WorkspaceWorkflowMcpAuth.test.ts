import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

import {
  canConnectWorkflowMcpRequirement,
  workflowMcpCredentialMode
} from './WorkspaceWorkflowsPage.components';
import type { WorkflowMcpRequirementPreview } from '@/services/control-plane/workflowApi';

function requirement(
  overrides: Partial<Pick<WorkflowMcpRequirementPreview, 'authType' | 'connectionState' | 'action'>> = {}
): WorkflowMcpRequirementPreview {
  return {
    serverId: 'server-1',
    serverName: 'User-selected MCP server',
    authType: 'bearer_token',
    owningAgent: { id: 'agent-1', name: 'User-created Agent' },
    connectionState: 'connection_missing',
    authRequirement: {
      scope: 'individual',
      credentialLabel: 'API key or bearer token',
      requiredInformation: []
    },
    action: 'connect_mcp_server',
    ...overrides
  };
}

describe('workflow MCP authentication recovery', () => {
  it('offers generic credential connection for a missing individual connection', () => {
    const missing = requirement();
    expect(canConnectWorkflowMcpRequirement(missing)).toBe(true);
    expect(workflowMcpCredentialMode(missing)).toBe('connect');
  });

  it('offers credential replacement for an errored custom-header connection', () => {
    const errored = requirement({
      authType: 'custom_header',
      connectionState: 'connection_error',
      action: 'verify_mcp_server'
    });
    expect(canConnectWorkflowMcpRequirement(errored)).toBe(true);
    expect(workflowMcpCredentialMode(errored)).toBe('replace');
  });

  it('does not offer credential entry for a connected or inconsistent requirement', () => {
    expect(canConnectWorkflowMcpRequirement(requirement({ connectionState: 'connected', action: 'none' }))).toBe(false);
    expect(canConnectWorkflowMcpRequirement(requirement({ connectionState: 'connection_missing', action: 'none' }))).toBe(false);
  });
});

describe('workflow MCP OAuth callback route', () => {
  it('keeps a route-level result publisher and a correlated readiness consumer', () => {
    const page = readFileSync(new URL('./WorkspaceWorkflowsPage.tsx', import.meta.url), 'utf8');
    const components = readFileSync(new URL('./WorkspaceWorkflowsPage.components.tsx', import.meta.url), 'utf8');
    const scheduleDialog = readFileSync(new URL('./WorkspaceScheduleDialog.tsx', import.meta.url), 'utf8');

    expect(page).toContain('<WorkflowMcpOAuthResultBridge />');
    expect(components).toContain('useWorkflowMcpOAuthFeedback({');
    expect(components).toContain('oauthReturnPath={oauth.returnPath}');
    expect(scheduleDialog).toContain('<WorkflowMcpOAuthResultBridge />');
    expect(scheduleDialog).toContain('useWorkflowMcpOAuthFeedback({');
    expect(scheduleDialog).toContain('oauthReturnPath={oauth.returnPath}');
  });
});
