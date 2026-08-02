import React from 'react';
import { useTranslation } from 'react-i18next';

import { Button, InlineAlert, PageHeader } from '@acornops/ui';
import { ICONS } from '@/constants';

interface WorkspaceSchedulesPageChromeProps {
  busy: boolean;
  canCreate: boolean;
  canManage: boolean;
  drawerToolbar: React.ReactNode;
  embedded: boolean;
  error: string;
  onCreate: () => void;
  onRefresh: () => void;
  showError: boolean;
  workspaceName: string;
}

export const WorkspaceSchedulesPageChrome: React.FC<WorkspaceSchedulesPageChromeProps> = ({
  busy,
  canCreate,
  canManage,
  drawerToolbar,
  embedded,
  error,
  onCreate,
  onRefresh,
  showError,
  workspaceName
}) => {
  const { t } = useTranslation();
  return (
    <>
      {!embedded && <PageHeader
        className="mb-5"
        title={t('schedules.title')}
        description={t('schedules.subtitle', { workspace: workspaceName })}
        actions={<>
          <Button size="md" variant="secondary" onClick={onRefresh} disabled={busy}>
            <ICONS.RefreshCw className="h-4 w-4" aria-hidden="true" />
            {t('common.refresh')}
          </Button>
          <Button size="md" variant="primary" onClick={onCreate} disabled={!canCreate}>
            <ICONS.Plus className="h-4 w-4" aria-hidden="true" />
            {t('schedules.actions.create')}
          </Button>
        </>}
      />}
      {embedded && drawerToolbar}
      {!canManage && (
        <div className="mb-5 rounded-md border border-ui-border bg-ui-surface px-4 py-3 type-ui text-ui-text-muted">
          {t('schedules.permissionNotice')}
        </div>
      )}
      {error && showError && <InlineAlert tone="danger" className="mb-5">{error}</InlineAlert>}
    </>
  );
};
