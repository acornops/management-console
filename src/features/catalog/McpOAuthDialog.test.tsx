import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';

import i18n, { initializeI18n } from '@/i18n';
import {
  authorizationServerLabel,
  McpOAuthConsentReview,
  registrationMethodLabel
} from './McpOAuthDialog';

beforeAll(async () => {
  await initializeI18n();
  await i18n.changeLanguage('en');
});

describe('McpOAuthConsentReview', () => {
  it('shows the exact path-based issuer, scopes, DCR method, and offline access disclosure', () => {
    const candidate = {
      issuer: 'https://identity.example/realms/engineering',
      issuerOrigin: 'https://identity.example',
      registrationMethod: 'dcr' as const,
      scopes: ['mcp:read', 'offline_access'],
      offlineAccessRequested: true
    };
    const markup = renderToStaticMarkup(
      <McpOAuthConsentReview
        candidate={candidate}
        consentGranted={false}
        onConsentChange={() => undefined}
      />
    );

    expect(markup).toContain('https://identity.example');
    expect(markup).toContain('realms/engineering');
    expect(authorizationServerLabel(candidate)).toBe(candidate.issuer);
    expect(markup).toContain('Dynamic Client Registration (DCR)');
    expect(markup).toContain('mcp:read');
    expect(markup).toContain('offline_access');
    expect(markup).toContain('type="checkbox"');
    expect(markup).not.toContain('checked=""');
  });

  it('labels CIMD without presenting any client-secret field', () => {
    const candidate = {
      issuer: 'https://login.example',
      issuerOrigin: 'https://login.example',
      registrationMethod: 'cimd' as const,
      scopes: [],
      offlineAccessRequested: false
    };
    const markup = renderToStaticMarkup(
      <McpOAuthConsentReview
        candidate={candidate}
        consentGranted
        onConsentChange={() => undefined}
      />
    );

    expect(registrationMethodLabel(candidate)).toBe('Client ID Metadata Document (CIMD)');
    expect(markup).toContain('No scope was specified by the server.');
    expect(markup).not.toContain('password');
    expect(markup).not.toContain('client secret');
  });
});
