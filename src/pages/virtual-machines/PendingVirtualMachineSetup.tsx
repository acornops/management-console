import type React from 'react';
import { useTranslation } from 'react-i18next';

import { PendingAgentSetup } from '@/components/common/PendingAgentSetup';

interface PendingVirtualMachineSetupProps {
  vmId: string;
  onInstallAgent?: (vmId: string) => void;
}

export const PendingVirtualMachineSetup: React.FC<PendingVirtualMachineSetupProps> = ({
  vmId,
  onInstallAgent
}) => {
  const { t } = useTranslation();

  return (
    <PendingAgentSetup
      targetId={vmId}
      completedLabel={t('virtualMachines.list.vmRegistered')}
      pendingLabel={t('dashboard.installAgent')}
      message={t('virtualMachines.list.installAgentMessage')}
      actionLabel={t('dashboard.installAgent')}
      actionDataAttribute="data-vm-setup-action"
      onInstallAgent={onInstallAgent}
    />
  );
};
