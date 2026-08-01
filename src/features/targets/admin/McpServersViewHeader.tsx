import React from 'react';
import { useTranslation } from 'react-i18next';

import { PageHeader } from '@acornops/ui';
import { AddMcpServerAction } from '@/features/catalog/AddMcpServerAction';
import type { TargetDescriptor } from '@/features/targets/targetDescriptor';
import { AppPaths } from '@/utils/routes';

interface McpServersViewHeaderProps {
  target: TargetDescriptor;
  canEditServers: boolean;
  onConnectByUrl: () => void;
  catalogDestination?: string;
}

export const McpServersViewHeader: React.FC<McpServersViewHeaderProps> = ({
  target,
  canEditServers,
  onConnectByUrl,
  catalogDestination = `target:${target.id}`
}) => {
  const { t } = useTranslation();
  return (
    <PageHeader
      title={t('mcpServers.title')}
      description={t('mcpServers.description', { name: target.name })}
      actions={(
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <AddMcpServerAction
            browseHref={AppPaths.workspaceCatalog(target.workspaceId, { destination: catalogDestination })}
            disabled={!canEditServers}
            onConnectByUrl={onConnectByUrl}
          />
          {!canEditServers && (
            <p className="type-caption max-w-xs type-emphasis text-ui-text-muted sm:text-right">
              {t('mcpServers.manageNoAccess')}
            </p>
          )}
        </div>
      )}
    />
  );
};
