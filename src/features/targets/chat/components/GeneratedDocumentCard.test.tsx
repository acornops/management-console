import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { TFunction } from 'i18next';
import { GeneratedDocumentCard } from './GeneratedDocumentCard';
import type { LiveRunTrace } from '@/features/targets/chat/types';

const t = ((key: string, options?: Record<string, unknown>) => {
  if (key === 'chat.generatedDocument') return 'Generated document';
  if (key === 'chat.downloadDocument') return 'Download document';
  if (key === 'chat.documentAvailableUntil') return `Available until ${String(options?.date || '')}`;
  if (key === 'chat.documentAuthenticatedDownload') return 'Authenticated download';
  if (key === 'chat.documentGenerationFailed') return 'Document generation failed';
  if (key === 'chat.documentGenerationFailedBody') return 'Try the request again.';
  return key;
}) as TFunction;

function trace(toolCalls: LiveRunTrace['toolCalls']): LiveRunTrace {
  return { runId: 'run-1', status: 'completed', steps: [], toolCalls };
}

describe('GeneratedDocumentCard', () => {
  it('renders the persisted document as an authenticated PDF download outside trace details', () => {
    const html = renderToStaticMarkup(
      <GeneratedDocumentCard
        t={t}
        trace={trace([{
          callId: 'call-1',
          tool: 'acornops_create_document',
          status: 'completed',
          isError: false,
          documentArtifact: {
            documentId: 'document-1',
            title: 'Payments outage incident report',
            mediaType: 'application/pdf',
            downloadUrl: '/api/v1/generated-documents/document-1/download',
            retentionExpiresAt: '2026-07-26T00:00:00.000Z'
          }
        }])}
      />
    );

    expect(html).toContain('Generated document');
    expect(html).toContain('Payments outage incident report');
    expect(html).toContain('Download document');
    expect(html).toContain('/api/v1/generated-documents/document-1/download');
    expect(html).toContain('download=""');
    expect(html).not.toContain('role="alert"');
  });

  it('renders an accessible error when document creation fails', () => {
    const html = renderToStaticMarkup(
      <GeneratedDocumentCard
        t={t}
        trace={trace([{
          callId: 'call-1',
          tool: 'acornops_create_document',
          status: 'completed',
          isError: true
        }])}
      />
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain('Document generation failed');
    expect(html).not.toContain('Download document');
  });

  it('renders a Markdown document download', () => {
    const html = renderToStaticMarkup(
      <GeneratedDocumentCard
        t={t}
        trace={trace([{
          callId: 'call-1',
          tool: 'acornops_create_document',
          status: 'completed',
          isError: false,
          documentArtifact: {
            documentId: 'document-2',
            title: 'Incident notes',
            mediaType: 'text/markdown',
            downloadUrl: '/api/v1/generated-documents/document-1/download'
          }
        }])}
      />
    );

    expect(html).toContain('Generated document');
    expect(html).toContain('Download document');
  });
});
