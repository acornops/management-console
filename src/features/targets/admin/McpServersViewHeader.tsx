import React from 'react';
import { useTranslation } from 'react-i18next';

import { PageHeader } from '@acornops/ui';
import { AddMcpServerAction } from '@/features/catalog/AddMcpServerAction';
import type { CapabilitySubject } from '@/features/capabilities/admin';
import { AppPaths } from '@/utils/routes';

interface McpServersViewHeaderProps {
  subject: CapabilitySubject;
  canEditServers: boolean;
  onConnectByUrl: () => void;
  catalogDestination?: string;
}

export const McpServersViewHeader: React.FC<McpServersViewHeaderProps> = ({
  subject,
  canEditServers,
  onConnectByUrl,
  catalogDestination = `target:${subject.id}`
}) => {
  const { t } = useTranslation();
  return (
    <PageHeader
      title={t('mcpServers.title')}
      description={t('mcpServers.description', { name: subject.name })}
      actions={(
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <AddMcpServerAction
            browseHref={AppPaths.workspaceCatalog(subject.workspaceId, { destination: catalogDestination })}
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
