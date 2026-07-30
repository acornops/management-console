export type McpVerificationKind =
  | 'authenticationRejected'
  | 'discoveryResponseTooLarge'
  | 'discoveryTimeout'
  | 'egressBlocked'
  | 'endpointNotFound'
  | 'endpointUnavailable'
  | 'protocolError'
  | 'toolDiscoveryFailed';

export const MCP_CONNECTION_STATUS_KEYS = {
  missing: 'mcpServers.connectionStatusMissing',
  pending_authorization: 'mcpServers.connectionStatusPendingAuthorization',
  connected: 'mcpServers.connectionStatusConnected',
  reauthorization_required: 'mcpServers.connectionStatusReauthorizationRequired'
} as const;

export const MCP_VERIFICATION_STATUS_KEYS: Record<McpVerificationKind, string> = {
  authenticationRejected: 'mcpServers.connectionStatusAuthenticationRejected',
  discoveryResponseTooLarge: 'mcpServers.connectionStatusDiscoveryResponseTooLarge',
  discoveryTimeout: 'mcpServers.connectionStatusDiscoveryTimeout',
  egressBlocked: 'mcpServers.connectionStatusEgressBlocked',
  endpointNotFound: 'mcpServers.connectionStatusEndpointNotFound',
  endpointUnavailable: 'mcpServers.connectionStatusEndpointUnavailable',
  protocolError: 'mcpServers.connectionStatusProtocolError',
  toolDiscoveryFailed: 'mcpServers.connectionStatusVerificationFailed'
};

export const MCP_VERIFICATION_DETAIL_KEYS: Record<McpVerificationKind, string> = {
  authenticationRejected: 'mcpServers.connectionDetailAuthenticationRejected',
  discoveryResponseTooLarge: 'mcpServers.connectionDetailDiscoveryResponseTooLarge',
  discoveryTimeout: 'mcpServers.connectionDetailDiscoveryTimeout',
  egressBlocked: 'mcpServers.connectionDetailEgressBlocked',
  endpointNotFound: 'mcpServers.connectionDetailEndpointNotFound',
  endpointUnavailable: 'mcpServers.connectionDetailEndpointUnavailable',
  protocolError: 'mcpServers.connectionDetailProtocolError',
  toolDiscoveryFailed: 'mcpServers.oauthConnectionVerificationDetail'
};

const MCP_VERIFICATION_KINDS: Record<string, McpVerificationKind> = {
  MCP_AUTHENTICATION_REJECTED: 'authenticationRejected',
  MCP_DISCOVERY_INVALID_RESPONSE: 'protocolError',
  MCP_DISCOVERY_RESPONSE_TOO_LARGE: 'discoveryResponseTooLarge',
  MCP_DISCOVERY_TIMEOUT: 'discoveryTimeout',
  MCP_EGRESS_BLOCKED: 'egressBlocked',
  MCP_ENDPOINT_NOT_FOUND: 'endpointNotFound',
  MCP_ENDPOINT_UNAVAILABLE: 'endpointUnavailable',
  MCP_PROTOCOL_ERROR: 'protocolError',
  MCP_TOOL_DISCOVERY_FAILED: 'toolDiscoveryFailed'
};

export function mcpVerificationKind(errorCode?: string): McpVerificationKind {
  return MCP_VERIFICATION_KINDS[errorCode || ''] || 'toolDiscoveryFailed';
}

export function isSafeMcpOAuthCallbackResult(result: string): boolean {
  return /^MCP_OAUTH_[A-Z0-9_]+$/.test(result) || result in MCP_VERIFICATION_KINDS;
}

export function oauthAuthorizationCompletedDespiteVerificationFailure(
  status: string | undefined,
  errorCode?: string
): boolean {
  return status === 'error'
    && Boolean(errorCode && errorCode in MCP_VERIFICATION_KINDS)
    && mcpVerificationKind(errorCode) !== 'authenticationRejected';
}
