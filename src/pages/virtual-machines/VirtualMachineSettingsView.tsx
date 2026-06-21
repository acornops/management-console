import React from 'react';
import { KeyRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { ICONS } from '@/constants';
import type { ControlPlaneVirtualMachine } from '@/services/controlPlaneApi';
import type { Workspace } from '@/types';
import { formatSnapshotTime, getVmStatusLabel } from '@/pages/virtual-machines/virtualMachineUi';

const SettingSection: React.FC<{
  title: string;
  description: string;
  children: React.ReactNode;
}> = ({ title, description, children }) => (
  <section className="mb-10 last:mb-0">
    <div className="mb-6 px-1">
      <h2 className="mb-1 text-xl font-bold tracking-tight text-ui-text">{title}</h2>
      <p className="max-w-3xl text-sm leading-6 text-ui-text-muted">{description}</p>
    </div>
    <div className="overflow-hidden rounded-xl border border-ui-border bg-ui-surface shadow-sm">{children}</div>
  </section>
);

const SettingRow: React.FC<{
  icon: React.ElementType;
  label: string;
  description: React.ReactNode;
  action?: React.ReactNode;
}> = ({ icon: Icon, label, description, action }) => (
  <div className="flex flex-col gap-5 border-b border-ui-border p-6 transition-colors last:border-0 hover:bg-ui-bg/20 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex min-w-0 items-center gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-ui-border bg-ui-bg text-accent-strong shadow-sm">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="mb-0.5 text-sm font-bold text-ui-text">{label}</p>
        <div className="break-words text-xs leading-5 text-ui-text-muted">{description}</div>
      </div>
    </div>
    {action && <div className="w-full shrink-0 sm:w-auto">{action}</div>}
  </div>
);

export const VirtualMachineSettingsView: React.FC<{
  vm: ControlPlaneVirtualMachine;
  workspace: Workspace;
  installInstructions: string | null;
  onRotateKey: () => void | Promise<void>;
}> = ({ vm, workspace, installInstructions, onRotateKey }) => {
  const { t } = useTranslation();
  const allowedLogs = vm.allowedLogSources?.join(', ') || t('virtualMachines.settings.defaultAllowedLogs');

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-ui-bg px-4 py-6 custom-scrollbar stable-scrollbar-gutter sm:px-6 lg:px-10 lg:py-8">
      <header className="mb-8">
        <h1 className="type-route-title">{t('virtualMachines.settings.title')}</h1>
        <p className="type-body mt-2">
          {t('virtualMachines.settings.subtitle', { name: vm.name })}
        </p>
      </header>

      <div className="max-w-4xl">
        <SettingSection
          title={t('virtualMachines.settings.identityTitle')}
          description={t('virtualMachines.settings.identityBody')}
        >
          <SettingRow
            icon={ICONS.Server}
            label={t('virtualMachines.settings.vmName')}
            description={vm.name}
          />
          <SettingRow
            icon={ICONS.LayoutGrid}
            label={t('virtualMachines.settings.workspace')}
            description={workspace.name || workspace.id}
          />
          <SettingRow
            icon={ICONS.Activity}
            label={t('virtualMachines.settings.agentState')}
            description={getVmStatusLabel(vm.status, t)}
          />
          <SettingRow
            icon={ICONS.Clock}
            label={t('virtualMachines.settings.lastSnapshot')}
            description={formatSnapshotTime(vm)}
          />
        </SettingSection>

        <SettingSection
          title={t('virtualMachines.settings.collectionTitle')}
          description={t('virtualMachines.settings.collectionBody')}
        >
          <SettingRow
            icon={ICONS.Layers}
            label={t('virtualMachines.settings.osFamily')}
            description={vm.osFamily || t('common.unknown')}
          />
          <SettingRow
            icon={ICONS.Terminal}
            label={t('virtualMachines.settings.serviceManager')}
            description={vm.serviceManager || t('common.unknown')}
          />
          <SettingRow
            icon={ICONS.BookOpen}
            label={t('virtualMachines.settings.allowedLogs')}
            description={allowedLogs}
          />
        </SettingSection>

        <SettingSection
          title={t('virtualMachines.settings.agentInstallTitle')}
          description={t('virtualMachines.settings.agentInstallBody')}
        >
          <SettingRow
            icon={KeyRound}
            label={t('virtualMachines.settings.agentKey')}
            description={t('virtualMachines.settings.agentKeyBody')}
            action={(
              <Button onClick={onRotateKey} variant="secondary" size="sm" className="w-full sm:w-auto">
                <KeyRound className="h-4 w-4" />
                {t('virtualMachines.settings.rotateKey')}
              </Button>
            )}
          />
          {installInstructions && (
            <div className="border-t border-ui-border bg-ui-bg/60 p-6">
              <p className="mb-2 text-sm font-bold text-ui-text">{t('virtualMachines.settings.installInstructions')}</p>
              <pre className="max-h-80 overflow-auto rounded-md border border-ui-border bg-ui-surface p-4 text-xs leading-5 text-ui-text">
                {installInstructions}
              </pre>
            </div>
          )}
        </SettingSection>
      </div>
    </div>
  );
};
