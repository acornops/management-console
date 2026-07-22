import React from 'react';
import { useTranslation } from 'react-i18next';

import { AddMcpServerAction } from '@/features/catalog/AddMcpServerAction';
import type { TargetDescriptor } from '@/features/targets/targetDescriptor';
import { AppPaths } from '@/utils/routes';

interface McpServersViewHeaderProps {
  target: TargetDescriptor;
  canEditServers: boolean;
  onConnectByUrl: () => void;
}

export const McpServersViewHeader: React.FC<McpServersViewHeaderProps> = ({
  target,
  canEditServers,
  onConnectByUrl
}) => {
  const { t } = useTranslation();
  return (
    <header className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <h1 className="type-route-title">{t('mcpServers.title')}</h1>
        <p className="type-body mt-2">{t('mcpServers.description', { name: target.name })}</p>
      </div>
      <AddMcpServerAction
        browseHref={AppPaths.workspaceCatalog(target.workspaceId, { destination: `target:${target.id}` })}
        onConnectByUrl={onConnectByUrl}
      />
      {!canEditServers && <p className="type-caption lg:max-w-xs">{t('mcpServers.manageNoAccess')}</p>}
    </header>
  );
};
