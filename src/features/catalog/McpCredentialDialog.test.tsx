import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';

import i18n, { initializeI18n } from '@/i18n';
import { McpCredentialDialog } from './McpCredentialDialog';

beforeAll(async () => {
  await initializeI18n();
  await i18n.changeLanguage('en');
});

const renderDialog = (
  credentialMode: 'workspace' | 'individual',
  serverUrl = 'https://mcp.example.com/tools?token=must-not-render'
) => renderToStaticMarkup(
  <McpCredentialDialog
    serverName="Example MCP"
    serverUrl={serverUrl}
    authType="custom_header"
    authHeaderName="X-API-Key"
    credentialMode={credentialMode}
    mode="connect"
    onClose={() => undefined}
    onSubmit={async () => undefined}
  />
);

describe('McpCredentialDialog', () => {
  it('explains workspace credential scope and keeps submission gated by consent and a value', () => {
    const markup = renderDialog('workspace');

    expect(markup).toContain('Connect workspace credential');
    expect(markup).toContain('Authorized users and automations, including service identities, will use it.');
    expect(markup).toContain('used for other authorized users and unattended runs');
    expect(markup).toContain('type="password"');
    expect(markup).toMatch(/<button[^>]*type="submit"[^>]*disabled/);
  });

  it('explains individual isolation and displays only the destination origin', () => {
    const markup = renderDialog('individual');

    expect(markup).toContain('Connect your credential');
    expect(markup).toContain('private to you. Your MCP requests and user-owned schedules that run as you will use it.');
    expect(markup).toContain('used only for my requests to this MCP installation');
    expect(markup).toContain('https://mcp.example.com');
    expect(markup).not.toContain('must-not-render');
    expect(markup).toContain('X-API-Key');
  });

  it('does not echo a malformed destination that could contain secrets', () => {
    const markup = renderDialog('individual', 'not a URL?token=must-not-render');

    expect(markup).toContain('>Unavailable<');
    expect(markup).not.toContain('must-not-render');
  });
});
