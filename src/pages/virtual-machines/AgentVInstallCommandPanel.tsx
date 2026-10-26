import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ControlPlaneVirtualMachineInstallInstructions } from '@/services/controlPlaneApi';
import { AgentCommandPanel } from '@/features/targets/agent-maintenance/AgentCommandPanel';

export const AgentVInstallCommandPanel: React.FC<{
  instructions: ControlPlaneVirtualMachineInstallInstructions;
  isAgentConnected: boolean;
  isRegenerating?: boolean;
  onRegenerateEnrollment?: () => void | Promise<void>;
}> = ({ instructions, isAgentConnected, isRegenerating = false, onRegenerateEnrollment }) => {
  const { t } = useTranslation();
  return <AgentCommandPanel
    instructions={instructions}
    label={t('virtualMachines.list.installInstructions')}
    sensitive={instructions.enrollmentExpiresAt && !isAgentConnected ? 'enrollment' : undefined}
    showExpiry={!isAgentConnected}
    regenerating={isRegenerating}
    onRegenerate={onRegenerateEnrollment}
  />;
};
