import type React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@acornops/ui';
import { ICONS } from '@/constants';

interface PendingVirtualMachineSetupProps {
  vmId: string;
  vmName: string;
  onInstallAgent?: (vmId: string) => void;
}

export const PendingVirtualMachineSetup: React.FC<PendingVirtualMachineSetupProps> = ({ vmId, vmName, onInstallAgent }) => {
  const { t } = useTranslation();

  return (
    <section
      data-vm-setup-telemetry="true"
      className="mx-4 flex min-h-[10rem] min-w-0 flex-1 items-center border-t border-ui-border/60 py-4"
      aria-label={t('virtualMachines.list.installAgentFor', { name: vmName })}
    >
      <div className="mx-auto flex w-full max-w-sm min-w-0 flex-col items-center gap-3 text-center">
        <div className="min-w-0">
          <p className="type-row-title text-ui-text">{t('dashboard.agentNotInstalled')}</p>
          <p className="type-caption mt-1 text-ui-text-muted">{t('virtualMachines.list.installAgentMessage')}</p>
        </div>
        <Button
          data-vm-setup-action="install"
          type="button"
          variant="primary"
          size="sm"
          disabled={!onInstallAgent}
          onClick={() => onInstallAgent?.(vmId)}
          className="pointer-events-auto shrink-0"
        >
          <ICONS.Wrench className="h-3.5 w-3.5" aria-hidden="true" />
          {t('dashboard.installAgent')}
        </Button>
      </div>
    </section>
  );
};
