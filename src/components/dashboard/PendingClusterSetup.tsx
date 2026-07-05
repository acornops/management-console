import type React from 'react';
import { useTranslation } from 'react-i18next';

import { PendingAgentSetup } from '@/components/common/PendingAgentSetup';

interface PendingClusterSetupProps {
  clusterId: string;
  onInstallAgent?: (clusterId: string) => void;
}

export const PendingClusterSetup: React.FC<PendingClusterSetupProps> = ({
  clusterId,
  onInstallAgent
}) => {
  const { t } = useTranslation();

  return (
    <PendingAgentSetup
      targetId={clusterId}
      completedLabel={t('dashboard.clusterRegistered')}
      pendingLabel={t('dashboard.installAgent')}
      message={t('dashboard.installAgentMessage')}
      actionLabel={t('dashboard.installAgent')}
      actionDataAttribute="data-cluster-setup-action"
      onInstallAgent={onInstallAgent}
      showAction={false}
      showFooter={false}
    />
  );
};
