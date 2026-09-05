import React from 'react';
import { ChevronDown, Link2, Plus, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
  ActionMenu,
  Button,
  getFloatingMenuPosition,
  MenuItem,
  StatusBadge
} from '@acornops/ui';

export const getMcpMenuPosition = getFloatingMenuPosition;

interface AddMcpServerActionProps {
  disabled?: boolean;
  onConnectByUrl: () => void;
  size?: React.ComponentProps<typeof Button>['size'];
}

export const AddMcpServerMenuItems: React.FC<{
  close: () => void;
  onConnectByUrl: () => void;
}> = ({ close, onConnectByUrl }) => {
  const { t } = useTranslation();

  return (
    <>
      <MenuItem
        disabled
        aria-disabled="true"
        className="min-h-11 items-start rounded-md py-2 sm:min-h-11"
      >
        <Search className="mt-0.5 h-4 w-4 shrink-0 text-ui-text-muted" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className="type-body type-emphasis">{t('mcpServers.addFromRegistry')}</span>
            <StatusBadge tone="neutral" size="compact" className="shrink-0">
              {t('mcpServers.comingSoon')}
            </StatusBadge>
          </span>
          <span className="type-caption mt-0.5 block text-ui-text-muted">
            {t('mcpServers.registryComingSoonHelp')}
          </span>
        </span>
      </MenuItem>
      <MenuItem
        className="min-h-11 items-start rounded-md py-2 sm:min-h-11"
        onClick={() => {
          close();
          onConnectByUrl();
        }}
      >
        <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-ui-text-muted" aria-hidden="true" />
        <span>
          <span className="block type-body type-emphasis">{t('mcpServers.connectByUrl')}</span>
          <span className="type-caption text-ui-text-muted">{t('mcpServers.connectByUrlHelp')}</span>
        </span>
      </MenuItem>
    </>
  );
};

export const AddMcpServerAction: React.FC<AddMcpServerActionProps> = ({ disabled = false, onConnectByUrl, size = 'md' }) => {
  const { t } = useTranslation();

  return (
    <ActionMenu
      label={t('mcpServers.add')}
      disabled={disabled}
      estimatedHeight={144}
      width={256}
      className="p-1.5"
      trigger={(
        <Button type="button" variant="primary" size={size}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t('mcpServers.add')}
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </Button>
      )}
    >
      {(close) => (
        <AddMcpServerMenuItems close={close} onConnectByUrl={onConnectByUrl} />
      )}
    </ActionMenu>
  );
};
