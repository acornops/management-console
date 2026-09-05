import { describe, expect, it } from 'vitest';
import { ControlPlaneRequestError } from '@/services/control-plane/http';

import {
  isManagedMcpServer,
  isMcpCredentialCleanupIncomplete,
  isValidRemoteMcpEndpoint,
  mcpServerFormSubmission,
  type ServerFormState
} from './mcpServersCatalog';

const form = (
  authType: ServerFormState['authType'],
  credentialMode: ServerFormState['credentialMode'],
  headerName = ''
): ServerFormState => ({
  name: 'Direct MCP server',
  url: 'https://mcp.example.test/server',
  enabled: true,
  authType,
  credentialMode,
  headerName,
  publicHeaders: []
});

describe('direct MCP server registration credentials', () => {
  it('matches the producer endpoint-shape policy before registration', () => {
    expect(isValidRemoteMcpEndpoint('https://mcp.example/mcp?tenant=operations')).toBe(true);
    expect(isValidRemoteMcpEndpoint('HTTPS://mcp.example/mcp')).toBe(true);
    expect(isValidRemoteMcpEndpoint('https://mcp.example/service.git')).toBe(true);
    for (const endpoint of [
      'http://mcp.example/mcp',
      'https:example.com/mcp',
      'https://user:password@mcp.example/mcp',
      'https://mcp.example/mcp#fragment',
      'https://mcp.example/mcp?ToKeN=secret',
      'npx @acme/server'
    ]) {
      expect(isValidRemoteMcpEndpoint(endpoint), endpoint).toBe(false);
    }
  });

  it('returns translated inline feedback for an unsafe registration endpoint', () => {
    const unsafe = form('none', 'none');
    unsafe.url = 'https://user:password@mcp.example/mcp';
    const submission = mcpServerFormSubmission(unsafe, null, (key) => key);

    expect(submission.serverUrlValidationError).toBe('mcpServers.serverUrlInvalid');
    expect(submission.serverFormIsValid).toBe(false);
  });

  it('uses explicit platform ownership instead of inferring it from the URL', () => {
    expect(isManagedMcpServer({ type: 'mcp', isSystem: false })).toBe(false);
    expect(isManagedMcpServer({ type: 'mcp', isSystem: true })).toBe(true);
    expect(isManagedMcpServer({ type: 'builtin', isSystem: false })).toBe(true);
  });

  it('recognizes only the retryable credential-cleanup failure contract', () => {
    expect(isMcpCredentialCleanupIncomplete(new ControlPlaneRequestError(
      'cleanup pending',
      503,
      'MCP_CREDENTIAL_CLEANUP_INCOMPLETE'
    ))).toBe(true);
    expect(isMcpCredentialCleanupIncomplete(new ControlPlaneRequestError(
      'service unavailable',
      503,
      'SERVICE_UNAVAILABLE'
    ))).toBe(false);
  });

  it.each([
    ['none', 'none', '', { type: 'none' }],
    ['bearer_token', 'workspace', '', {
      type: 'bearer_token',
      headerName: 'Authorization',
      headerPrefix: 'Bearer '
    }],
    ['bearer_token', 'individual', '', {
      type: 'bearer_token',
      headerName: 'Authorization',
      headerPrefix: 'Bearer '
    }],
    ['custom_header', 'workspace', 'X-API-Key', {
      type: 'custom_header',
      headerName: 'X-API-Key',
      headerPrefix: ''
    }],
    ['custom_header', 'individual', 'X-API-Key', {
      type: 'custom_header',
      headerName: 'X-API-Key',
      headerPrefix: ''
    }],
    ['oauth', 'individual', '', { type: 'oauth' }]
  ] as const)(
    'keeps %s registration valid with %s credential ownership',
    (authType, credentialMode, headerName, expectedAuth) => {
      const submission = mcpServerFormSubmission(
        form(authType, credentialMode, headerName),
        null,
        (key) => key
      );

      expect(submission.serverFormIsValid).toBe(true);
      expect(submission.buildAuthPayload()).toEqual(expectedAuth);
    }
  );

  it('clears a bearer prefix when an existing server changes to custom-header auth', () => {
    const submission = mcpServerFormSubmission(
      form('custom_header', 'workspace', 'X-API-Key'),
      {
        id: 'server-1', name: 'Direct MCP server', url: 'https://mcp.example.test/server',
        type: 'mcp', enabled: true, isSystem: false, canDelete: true,
        canEditConnection: true, canToggle: true, authType: 'bearer_token', credentialMode: 'workspace',
        authHeaderName: 'Authorization', authHeaderPrefix: 'Bearer ', revision: 1,
        connectionStatus: 'ok', lastDiscoveryAt: null, lastDiscoveryError: null,
        toolCounts: { total: 0, readOnly: 0, writeCapable: 0, enabledConfigured: 0, enabledEffective: 0, writeConfigured: 0, writeEffective: 0 },
        tools: []
      },
      (key) => key
    );

    expect(submission.buildAuthPayload()).toEqual({
      type: 'custom_header',
      headerName: 'X-API-Key',
      headerPrefix: ''
    });
    expect(submission.connectionSettingsChanged).toBe(true);
  });

  it('preserves an existing custom-header prefix during unrelated edits', () => {
    const submission = mcpServerFormSubmission(
      form('custom_header', 'workspace', 'X-API-Key'),
      {
        id: 'server-1', name: 'Direct MCP server', url: 'https://mcp.example.test/server',
        type: 'mcp', enabled: true, isSystem: false, canDelete: true,
        canEditConnection: true, canToggle: true, authType: 'custom_header', credentialMode: 'workspace',
        authHeaderName: 'X-API-Key', authHeaderPrefix: 'Token ', revision: 1,
        connectionStatus: 'ok', lastDiscoveryAt: null, lastDiscoveryError: null,
        toolCounts: { total: 0, readOnly: 0, writeCapable: 0, enabledConfigured: 0, enabledEffective: 0, writeConfigured: 0, writeEffective: 0 },
        tools: []
      },
      (key) => key
    );

    expect(submission.buildAuthPayload()).toBeUndefined();
    expect(submission.connectionSettingsChanged).toBe(false);
  });

  it('rejects a case-insensitive collision between public and custom credential headers', () => {
    const colliding = form('custom_header', 'workspace', 'X-Company');
    colliding.publicHeaders = [{ id: 'company', name: 'x-company', value: 'acornops' }];

    const submission = mcpServerFormSubmission(colliding, null, (key) => key);

    expect(submission.publicHeadersValidationError)
      .toBe('mcpServers.publicHeaderAuthCollision');
    expect(submission.serverFormIsValid).toBe(false);
  });

  it.each([
    ['X Invalid', 'mcpServers.authHeaderNameInvalid'],
    [`X-${'a'.repeat(127)}`, 'mcpServers.authHeaderNameInvalid'],
    [' x-company', 'mcpServers.authHeaderNameInvalid'],
    ['x-run-id', 'mcpServers.authHeaderReserved'],
    ['MCP-Session-Id', 'mcpServers.authHeaderReserved']
  ])('rejects producer-invalid custom auth header %s inline', (headerName, expectedError) => {
    const submission = mcpServerFormSubmission(
      form('custom_header', 'workspace', headerName),
      null,
      (key) => key
    );

    expect(submission.authHeaderValidationError).toBe(expectedError);
    expect(submission.serverFormIsValid).toBe(false);
  });

  it('treats public-header changes as a connection trust change independent of row order', () => {
    const editingServer = {
      id: 'server-1', name: 'Direct MCP server', url: 'https://mcp.example.test/server',
      type: 'mcp' as const, enabled: true, isSystem: false, canDelete: true,
      canEditConnection: true, canToggle: true, authType: 'bearer_token' as const,
      credentialMode: 'workspace' as const, authHeaderName: 'Authorization',
      authHeaderPrefix: 'Bearer ', revision: 1,
      publicHeaders: { 'X-Region': 'sg', 'X-Client': 'console' },
      connectionStatus: 'ok' as const, lastDiscoveryAt: null, lastDiscoveryError: null,
      toolCounts: { total: 0, readOnly: 0, writeCapable: 0, enabledConfigured: 0, enabledEffective: 0, writeConfigured: 0, writeEffective: 0 },
      tools: []
    };
    const unchanged = form('bearer_token', 'workspace');
    unchanged.publicHeaders = [
      { id: 'client', name: 'X-Client', value: 'console' },
      { id: 'region', name: 'X-Region', value: 'sg' }
    ];
    const changed = { ...unchanged, publicHeaders: [
      ...unchanged.publicHeaders.slice(0, 1),
      { id: 'region', name: 'X-Region', value: 'us' }
    ] };

    expect(mcpServerFormSubmission(unchanged, editingServer, (key) => key).connectionSettingsChanged)
      .toBe(false);
    expect(mcpServerFormSubmission(changed, editingServer, (key) => key).connectionSettingsChanged)
      .toBe(true);
  });
});
