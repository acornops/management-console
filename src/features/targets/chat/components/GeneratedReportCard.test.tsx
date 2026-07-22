import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { TFunction } from 'i18next';
import { GeneratedReportCard } from './GeneratedReportCard';
import type { LiveRunTrace } from '@/features/targets/chat/types';

const t = ((key: string, options?: Record<string, unknown>) => {
  if (key === 'chat.generatedIncidentReport') return 'Generated incident report';
  if (key === 'chat.downloadPdf') return 'Download PDF';
  if (key === 'chat.reportAvailableUntil') return `Available until ${String(options?.date || '')}`;
  if (key === 'chat.reportAuthenticatedDownload') return 'Authenticated download';
  if (key === 'chat.incidentReportGenerationFailed') return 'Incident report generation failed';
  if (key === 'chat.incidentReportGenerationFailedBody') return 'Try the request again.';
  return key;
}) as TFunction;

function trace(toolCalls: LiveRunTrace['toolCalls']): LiveRunTrace {
  return { runId: 'run-1', status: 'completed', steps: [], toolCalls };
}

describe('GeneratedReportCard', () => {
  it('renders the persisted report as an authenticated PDF download outside trace details', () => {
    const html = renderToStaticMarkup(
      <GeneratedReportCard
        t={t}
        trace={trace([{
          callId: 'call-1',
          tool: 'acornops_generate_pdf_report',
          status: 'completed',
          isError: false,
          reportArtifact: {
            reportId: 'report-1',
            title: 'Payments outage incident report',
            mediaType: 'application/pdf',
            downloadUrl: '/api/v1/report-artifacts/report-1/download',
            retentionExpiresAt: '2026-07-26T00:00:00.000Z'
          }
        }])}
      />
    );

    expect(html).toContain('Generated incident report');
    expect(html).toContain('Payments outage incident report');
    expect(html).toContain('Download PDF');
    expect(html).toContain('/api/v1/report-artifacts/report-1/download');
    expect(html).toContain('download=""');
    expect(html).not.toContain('role="alert"');
  });

  it('renders an accessible error when the report function fails', () => {
    const html = renderToStaticMarkup(
      <GeneratedReportCard
        t={t}
        trace={trace([{
          callId: 'call-1',
          tool: 'acornops_generate_pdf_report',
          status: 'completed',
          isError: true
        }])}
      />
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain('Incident report generation failed');
    expect(html).not.toContain('Download PDF');
  });
});
