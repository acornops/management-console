import type React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { ICONS } from '@/constants';

interface PendingVirtualMachineSetupProps {
  vmId: string;
  vmName: string;
  onInstallAgent?: (vmId: string) => void;
}

export const PendingVirtualMachineSetup: React.FC<PendingVirtualMachineSetupProps> = ({
  vmId,
  vmName,
  onInstallAgent
}) => {
  const { t } = useTranslation();
  const metrics = [
    { label: t('virtualMachines.list.load1m'), Icon: ICONS.Activity },
    { label: t('virtualMachines.list.memory'), Icon: ICONS.HardDrive }
  ];

  return (
    <section className="shrink-0 px-4 pb-3" aria-label={t('virtualMachines.list.installAgentFor', { name: vmName })}>
      <dl className="grid min-w-0 grid-cols-2 gap-4 border-t border-ui-border/60 py-3">
        {metrics.map(({ label, Icon }) => (
          <div key={label} className="min-w-0">
            <dt className="type-micro-label flex min-w-0 items-center gap-1.5 text-ui-text-muted">
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{label}</span>
            </dt>
            <dd className="type-caption mt-1 font-semibold text-ui-text-muted">{t('dashboard.unavailable')}</dd>
          </div>
        ))}
      </dl>
      <div className="relative h-[104px] overflow-hidden">
        <svg viewBox="0 0 180 108" preserveAspectRatio="none" className="absolute inset-0 h-full w-full text-ui-border/55" aria-hidden="true">
          <line x1="0" x2="180" y1="20" y2="20" className="stroke-current" strokeWidth="1" />
          <line x1="0" x2="180" y1="54" y2="54" className="stroke-current" strokeWidth="1" />
          <line x1="0" x2="180" y1="88" y2="88" className="stroke-current" strokeWidth="1" />
        </svg>
        <div className="absolute inset-0 z-10 flex items-center justify-between gap-3 px-2">
          <div className="min-w-0">
            <p className="type-row-title text-ui-text">{t('dashboard.agentNotInstalled')}</p>
            <p className="type-caption mt-1 line-clamp-2 text-ui-text-muted">{t('virtualMachines.list.installAgentMessage')}</p>
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
            <span className="hidden min-[1440px]:inline">{t('dashboard.installAgent')}</span>
            <span className="min-[1440px]:hidden">{t('dashboard.setUp')}</span>
          </Button>
        </div>
      </div>
      <div className="type-caption mt-1.5 grid grid-cols-3 gap-2 font-medium text-ui-text-muted" aria-hidden="true">
        <span className="truncate">{t('virtualMachines.list.vmRegistered')}</span>
        <span className="truncate text-center">{t('dashboard.telemetryPending')}</span>
        <span className="truncate text-right">{t('dashboard.agentRequired')}</span>
      </div>
    </section>
  );
};
