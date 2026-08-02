import React from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@acornops/ui';
import { ICONS } from '@/constants';

interface WorkspaceScheduleDrawerToolbarProps {
  busy: boolean;
  canCreate: boolean;
  count: number;
  loading?: boolean;
  onCreate: () => void;
  onRefresh: () => void;
  total: number;
}

export const WorkspaceScheduleDrawerToolbar: React.FC<WorkspaceScheduleDrawerToolbarProps> = ({
  busy,
  canCreate,
  count,
  loading = false,
  onCreate,
  onRefresh,
  total
}) => {
  const { t } = useTranslation();
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <p className="type-caption text-ui-text-muted">
        {loading ? t('schedules.loading') : t('schedules.filters.showing', { count, total })}
      </p>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="secondary" onClick={onRefresh} disabled={busy} aria-label={t('common.refresh')}>
          <ICONS.RefreshCw className="h-4 w-4" aria-hidden="true" />
          {t('common.refresh')}
        </Button>
        <Button size="sm" variant="primary" onClick={onCreate} disabled={!canCreate}>
          <ICONS.Plus className="h-4 w-4" aria-hidden="true" />
          {t('schedules.actions.create')}
        </Button>
      </div>
    </div>
  );
};
