import type { McpConnection } from '@/services/control-plane/catalogApi';

export type McpConnectionAction = NonNullable<McpConnection['action']>;

const oauthAuthorizationActions = new Set<McpConnectionAction>([
  'authorize_mcp_server',
  'select_authorization_server',
  'reauthorize_mcp_server'
]);

const recoveryActions = new Set<McpConnectionAction>([
  'connect_mcp_server',
  ...oauthAuthorizationActions,
  'verify_mcp_server'
]);

export function parseMcpRecoveryAction(
  value: string | null
): McpConnectionAction | undefined {
  return value && recoveryActions.has(value as McpConnectionAction)
    ? value as McpConnectionAction
    : undefined;
}

export function showsMcpConnectionAction(
  authType: string | undefined,
  action: McpConnection['action']
): boolean {
  return authType !== 'oauth' || Boolean(action && oauthAuthorizationActions.has(action));
}

export function mcpConnectAction(
  authType: string | undefined,
  action: McpConnection['action']
): McpConnectionAction {
  if (authType === 'oauth' && action && oauthAuthorizationActions.has(action)) {
    return action;
  }
  return authType === 'oauth' ? 'authorize_mcp_server' : 'connect_mcp_server';
}
