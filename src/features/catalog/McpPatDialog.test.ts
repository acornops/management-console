import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const dialogSource = readFileSync(resolve(__dirname, 'McpPatDialog.tsx'), 'utf8');

describe('MCP personal credential dialog security and accessibility', () => {
  it('keeps the credential masked and out of persistent browser storage', () => {
    expect(dialogSource).toContain("type={showCredential ? 'text' : 'password'}");
    expect(dialogSource).toContain('autoComplete="new-password"');
    expect(dialogSource).not.toMatch(/localStorage|sessionStorage/);
    expect(dialogSource).not.toMatch(/credential\.trim\(\)/);
  });

  it('requires explicit consent and uses the focus-trapped dialog primitive', () => {
    expect(dialogSource).toContain('<Dialog');
    expect(dialogSource).toContain('initialFocusRef={credentialRef}');
    expect(dialogSource).toContain('consentGranted && !pending');
    expect(dialogSource).toContain('role="alert"');
  });

  it('shows only the destination origin and configured header mode', () => {
    expect(dialogSource).toContain('destination.origin');
    expect(dialogSource).not.toContain('destinationOrigin = serverUrl');
    expect(dialogSource).toContain("authType === 'custom_header'");
    expect(dialogSource).toContain("'Authorization: Bearer'");
    expect(dialogSource).toContain("credentialLabel || t('mcpServers.patLabel')");
    expect(dialogSource).not.toContain('McpPatProfileGuidance');
    expect(dialogSource).not.toContain('profile.providerLabel');
  });

  it('enforces the byte limit and control-character rule before submitting', () => {
    expect(dialogSource).toContain('new TextEncoder().encode(credential).byteLength');
    expect(dialogSource).toContain('credentialByteLength > 8192');
    expect(dialogSource).toContain('/\\p{Cc}/u.test(credential)');
    expect(dialogSource).toContain('credential.length > 0 && !credentialValidationError');
  });

  it('keeps submission disabled for the bounded retry window', () => {
    expect(dialogSource).toContain('retryAfterSeconds === 0');
    expect(dialogSource).toContain('retryAfterSeconds > 0');
    expect(dialogSource).toContain('Try again in ${retryAfterSeconds}s');
    expect(dialogSource).toContain('formatMcpError(submissionError');
  });
});
