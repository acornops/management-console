import { useTranslation } from 'react-i18next';
import { formatScheduleCadence } from './WorkspaceSchedulesPage.helpers';

export function WorkspaceScheduleCadence({ cron, timezone }: { cron: string; timezone: string }) {
  const { t } = useTranslation();
  return <div className="type-caption text-ui-text-muted">
    <p>{formatScheduleCadence(cron, t)} · {timezone}</p>
    <details className="mt-1"><summary className="cursor-pointer">{t('schedules.form.cron')}</summary><code className="break-words">{cron}</code></details>
  </div>;
}
