import React from 'react';
import type { TFunction } from 'i18next';
import { Download, FileText } from 'lucide-react';
import { getControlPlaneUrl } from '@/services/control-plane/http';
import type { LiveRunTrace } from '@/features/targets/chat/types';
import { formatUserDateTime } from '@/utils/dateTime';

interface GeneratedReportCardProps {
  trace?: LiveRunTrace;
  t: TFunction;
}

const REPORT_TOOL_NAMES = new Set([
  'acornops_generate_pdf_report',
  'reports.pdf.generate'
]);

export const GeneratedReportCard: React.FC<GeneratedReportCardProps> = ({ trace, t }) => {
  const reportCalls = trace?.toolCalls.filter((call) => call.reportArtifact) || [];
  const reports = reportCalls
    .map((call) => call.reportArtifact!)
    .filter((report, index, items) => items.findIndex((item) => item.reportId === report.reportId) === index);
  const generationFailed = Boolean(trace?.toolCalls.some((call) => (
    REPORT_TOOL_NAMES.has(call.tool)
    && call.status === 'completed'
    && call.isError
    && !call.reportArtifact
  )));

  if (reports.length === 0 && !generationFailed) return null;

  return (
    <div className="mt-3 w-full max-w-[72ch] space-y-2" aria-live="polite">
      {reports.map((report) => (
        <section
          key={report.reportId}
          className="flex flex-col gap-3 rounded-lg border border-ui-border bg-ui-surface p-4 sm:flex-row sm:items-center sm:justify-between"
          aria-labelledby={`generated-report-${report.reportId}`}
        >
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-status-success-soft text-status-success-text">
              <FileText className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="type-micro-label text-ui-text-muted">{t('chat.generatedIncidentReport')}</p>
              <h3 id={`generated-report-${report.reportId}`} className="mt-0.5 truncate text-sm font-semibold text-ui-text">
                {report.title}
              </h3>
              <p className="type-caption mt-1 text-ui-text-muted">
                {report.retentionExpiresAt
                  ? t('chat.reportAvailableUntil', {
                      date: formatUserDateTime(Date.parse(report.retentionExpiresAt), { fallback: report.retentionExpiresAt })
                    })
                  : t('chat.reportAuthenticatedDownload')}
              </p>
            </div>
          </div>
          <a
            className="control-target inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-ui-border bg-ui-surface px-3 text-xs font-semibold text-ui-text transition-colors hover:bg-ui-surface/75 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/20"
            href={getControlPlaneUrl(report.downloadUrl).toString()}
            download
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            {t('chat.downloadPdf')}
          </a>
        </section>
      ))}
      {generationFailed && (
        <div className="rounded-lg border border-status-danger/30 bg-status-danger-soft px-4 py-3 text-sm text-status-danger-text" role="alert">
          <p className="font-semibold">{t('chat.incidentReportGenerationFailed')}</p>
          <p className="type-caption mt-1">{t('chat.incidentReportGenerationFailedBody')}</p>
        </div>
      )}
    </div>
  );
};
