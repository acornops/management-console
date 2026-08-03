import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

import { getMcpCreateFlowCopyKeys } from './McpServersDialogs';

describe('getMcpCreateFlowCopyKeys', () => {
  it('describes OAuth authorization before tool discovery', () => {
    expect(getMcpCreateFlowCopyKeys('oauth')).toEqual({
      nextStep: 'mcpServers.stepAuthorize',
      help: 'mcpServers.oauthCreateHelp',
      pending: 'mcpServers.addingServer',
      action: 'mcpServers.continueToAuthorization'
    });
  });

  it('describes credential connection for static authenticated servers', () => {
    expect(getMcpCreateFlowCopyKeys('bearer_token')).toEqual({
      nextStep: 'mcpServers.stepAddCredential',
      help: 'mcpServers.credentialCreateHelp',
      pending: 'mcpServers.addingServer',
      action: 'mcpServers.continueToCredentials'
    });
    expect(getMcpCreateFlowCopyKeys('custom_header')).toEqual(
      getMcpCreateFlowCopyKeys('bearer_token')
    );
  });

  it('keeps direct tool review for unauthenticated servers', () => {
    expect(getMcpCreateFlowCopyKeys('none')).toEqual({
      nextStep: 'mcpServers.stepReviewTools',
      help: 'mcpServers.createHelp',
      pending: 'mcpServers.discoveringTools',
      action: 'mcpServers.reviewToolsAction'
    });
  });
});

describe('MCP server form dialog layout', () => {
  it('keeps long discovered-tool reviews inside a scrollable dialog body', () => {
    const source = readFileSync(new URL('./McpServersDialogs.tsx', import.meta.url), 'utf8');

    expect(source).toContain('grid min-h-0 flex-1 gap-6 overflow-y-auto');
  });
});
