import React from 'react';
import { useTranslation } from 'react-i18next';
import { Select, SettingsSection, type SelectOption } from '@acornops/ui';
import { ICONS } from '@/constants';
import { SettingsRow } from '@/components/common/SettingsRow';
import type { RunPermissionMode } from '@/services/control-plane/runPermissionTypes';

export interface RunPermissionSettingsSectionProps {
  titleId?: string;
  title: React.ReactNode;
  description: React.ReactNode;
  permissionMode: RunPermissionMode;
  disabled?: boolean;
  disabledReason?: React.ReactNode;
  note?: React.ReactNode;
  busy?: boolean;
  onChange?: (permissionMode: RunPermissionMode) => void | Promise<void>;
}

export const RunPermissionSettingsSection: React.FC<RunPermissionSettingsSectionProps> = ({
  titleId,
  title,
  description,
  permissionMode,
  disabled = false,
  disabledReason,
  note,
  busy = false,
  onChange
}) => {
  const { t } = useTranslation();
  const [pendingMode, setPendingMode] = React.useState<RunPermissionMode | null>(null);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const displayedMode = pendingMode ?? permissionMode;
  const options = React.useMemo<Array<SelectOption<RunPermissionMode>>>(() => [
    { value: 'read_only', label: t('agentChat.permissionSettings.modes.read_only.label') },
    { value: 'ask_before_changes', label: t('agentChat.permissionSettings.modes.ask_before_changes.label') },
    { value: 'auto_allowed_changes', label: t('agentChat.permissionSettings.modes.auto_allowed_changes.label') }
  ], [t]);
  const isDisabled = disabled || busy || isUpdating || !onChange;

  React.useEffect(() => {
    setPendingMode(null);
  }, [permissionMode]);

  const updatePermissionMode = async (nextMode: RunPermissionMode) => {
    if (nextMode === displayedMode || isDisabled || !onChange) return;
    setPendingMode(nextMode);
    setIsUpdating(true);
    try {
      await onChange(nextMode);
    } finally {
      setPendingMode(null);
      setIsUpdating(false);
    }
  };

  return (
    <SettingsSection
      titleId={titleId}
      title={title}
      description={description}
      data-run-permission-settings="true"
    >
      <SettingsRow
        icon={ICONS.Shield}
        label={t('agentChat.permissionSettings.modeLabel')}
        description={(
          <span>
            <span className="block">{t(`agentChat.permissionSettings.modes.${displayedMode}.description`)}</span>
            {disabledReason && <span className="mt-0.5 block type-emphasis">{disabledReason}</span>}
            {note && <span className="mt-0.5 block">{note}</span>}
          </span>
        )}
        action={(
          <Select<RunPermissionMode>
            value={displayedMode}
            options={options}
            onChange={(value) => {
              void updatePermissionMode(value);
            }}
            disabled={isDisabled}
            size="sm"
            className="w-full sm:w-56"
            ariaLabel={t('agentChat.permissionSettings.modeLabel')}
          />
        )}
      />
    </SettingsSection>
  );
};
