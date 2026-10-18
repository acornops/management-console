import { Button, InlineLoadingIndicator } from '@acornops/ui';
import { useTranslation } from 'react-i18next';
import { formatUserDateTime } from '@/utils/dateTime';
import type { ScheduleTimingPreview } from '@/pages/useScheduleTimingPreview';
import { formatScheduleCadence } from './WorkspaceSchedulesPage.helpers';

export function WorkspaceScheduleTimingPreview({ preview, timezone, cron }: { preview: ScheduleTimingPreview; timezone: string; cron: string }) {
  const { t, i18n } = useTranslation();
  return <section aria-labelledby="schedule-upcoming-runs" aria-busy={preview.loading} className="rounded-md border border-ui-border bg-ui-bg px-4 py-3">
    <h3 id="schedule-upcoming-runs" className="type-row-title">{t('schedules.form.upcomingRuns')}</h3>
    <p className="type-caption mt-1 text-ui-text-muted">{formatScheduleCadence(cron, t)}</p>
    <p className="type-caption mt-1 text-ui-text-muted">{t('schedules.form.previewTimezone', { timezone })}</p>
    {preview.loading ? <InlineLoadingIndicator label={t('schedules.form.previewLoading')} className="mt-3" />
      : preview.failed ? <div role="alert" className="mt-3">
        <p className="type-caption text-status-danger-text">{t('schedules.form.previewError')}</p>
        <Button size="sm" variant="secondary" className="mt-2" onClick={preview.retry}>{t('common.retry')}</Button>
      </div>
      : preview.valid ? <ol className="mt-3 space-y-1 type-caption text-ui-text">
        {preview.nextRunTimes.map((value) => <li key={value}><time dateTime={value}>{formatUserDateTime(value, { timeZone: timezone.trim(), locale: i18n.language })}</time></li>)}
      </ol>
      : <p className="type-caption mt-3 text-ui-text-muted">{t(preview.noOccurrences ? 'schedules.form.noOccurrences' : 'schedules.form.previewInvalid')}</p>}
    {preview.generalErrors.map((error, index) => <p role="alert" className="type-caption mt-2 text-status-danger-text" key={index}>{error}</p>)}
  </section>;
}
