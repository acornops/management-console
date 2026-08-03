import React from 'react';
import { KeyRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, InlineAlert, SettingsSection } from '@acornops/ui';
import { PageHeader, PageShell } from '@acornops/ui';
import { SettingsRow } from '@/components/common/SettingsRow';
import { ICONS } from '@/constants';
import { TargetDeleteZone } from '@/features/targets/TargetDeleteZone';
import { TargetAutoTriageSettingsSection } from '@/features/targets/auto-triage/TargetAutoTriageSettingsSection';
import type { ControlPlaneVirtualMachine } from '@/services/controlPlaneApi';
import type { Workspace } from '@/types';
import { formatSnapshotTime, getVmStatusLabel } from '@/pages/virtual-machines/virtualMachineUi';

export const VirtualMachineSettingsView: React.FC<{
  vm: ControlPlaneVirtualMachine;
  workspace: Workspace;
  installInstructions: string | null;
  onRotateKey?: () => void | Promise<void>;
  isRotatingKey?: boolean;
  rotationError?: string | null;
  onDeleteVirtualMachine?: () => void | Promise<void>;
  canManageTargets?: boolean;
  canCreateReadWriteRuns?: boolean;
}> = ({
  vm,
  workspace,
  installInstructions,
  onRotateKey,
  isRotatingKey = false,
  rotationError,
  onDeleteVirtualMachine,
  canManageTargets = false,
  canCreateReadWriteRuns = false
}) => {
  const { t } = useTranslation();
  const allowedLogs = vm.allowedLogSources?.join(', ') || t('virtualMachines.settings.defaultAllowedLogs');

  return (
    <PageShell>
      <PageHeader title={t('virtualMachines.settings.title')} description={t('virtualMachines.settings.subtitle', { name: vm.name })} />

      <div className="max-w-4xl">
        <SettingsSection
          title={t('virtualMachines.settings.identityTitle')}
          description={t('virtualMachines.settings.identityBody')}
        >
          <SettingsRow
            icon={ICONS.Server}
            label={t('virtualMachines.settings.vmName')}
            description={vm.name}
          />
          <SettingsRow
            icon={ICONS.LayoutGrid}
            label={t('virtualMachines.settings.workspace')}
            description={workspace.name || workspace.id}
          />
          <SettingsRow
            icon={ICONS.Activity}
            label={t('virtualMachines.settings.agentState')}
            description={getVmStatusLabel(vm.status, t)}
          />
          <SettingsRow
            icon={ICONS.Clock}
            label={t('virtualMachines.settings.lastSnapshot')}
            description={formatSnapshotTime(vm)}
          />
        </SettingsSection>

        <SettingsSection
          title={t('virtualMachines.settings.collectionTitle')}
          description={t('virtualMachines.settings.collectionBody')}
        >
          <SettingsRow
            icon={ICONS.Layers}
            label={t('virtualMachines.settings.osFamily')}
            description={vm.osFamily || t('common.unknown')}
          />
          <SettingsRow
            icon={ICONS.Terminal}
            label={t('virtualMachines.settings.serviceManager')}
            description={vm.serviceManager || t('common.unknown')}
          />
          <SettingsRow
            icon={ICONS.BookOpen}
            label={t('virtualMachines.settings.allowedLogs')}
            description={allowedLogs}
          />
          <SettingsRow
            icon={ICONS.Clock}
            label={t('virtualMachines.settings.snapshotCadence')}
            description={t('virtualMachines.settings.defaultSnapshotCadence')}
          />
        </SettingsSection>

        <TargetAutoTriageSettingsSection
          workspaceId={workspace.id}
          targetId={vm.id}
          targetType="virtual_machine"
          canManageTargets={canManageTargets}
          canCreateReadWriteRuns={canCreateReadWriteRuns}
        />

        <SettingsSection
          title={t('virtualMachines.settings.agentInstallTitle')}
          description={t('virtualMachines.settings.agentInstallBody')}
        >
          <SettingsRow
            icon={KeyRound}
            label={t('virtualMachines.settings.agentKey')}
            description={t('virtualMachines.settings.agentKeyBody')}
            action={(
              <Button onClick={onRotateKey} disabled={!onRotateKey || isRotatingKey} title={!onRotateKey ? t('virtualMachines.settings.agentKeyPermissionRequired') : undefined} variant="secondary" size="sm" className="w-full sm:w-auto">
                <KeyRound className="h-4 w-4" />
                {isRotatingKey ? t('virtualMachines.settings.rotatingKey') : t('virtualMachines.settings.rotateKey')}
              </Button>
            )}
          />
          {rotationError && <InlineAlert tone="danger" className="rounded-none border-x-0 border-b-0 p-4 type-body type-emphasis">{rotationError}</InlineAlert>}
          {installInstructions && (
            <div className="border-t border-ui-border bg-ui-bg/60 p-6">
              <p className="mb-2 type-row-title">{t('virtualMachines.settings.installInstructions')}</p>
              <pre className="max-h-80 overflow-auto rounded-md border border-ui-border bg-ui-surface p-4 type-caption leading-5 text-ui-text">
                {installInstructions}
              </pre>
            </div>
          )}
        </SettingsSection>

        {onDeleteVirtualMachine && (
          <TargetDeleteZone
            targetName={vm.name}
            title={t('virtualMachines.list.deleteVm')}
            subtitle={t('virtualMachines.list.deleteVmSubtitle')}
            description={t('virtualMachines.list.deleteVmBody', { name: vm.name })}
            agentWarning={t('virtualMachines.list.deleteVmAgentWarning')}
            confirmationI18nKey="virtualMachines.list.deleteVmConfirmationLabel"
            closeLabel={t('virtualMachines.list.closeDeleteVm')}
            cancelLabel={t('app.cancel')}
            deleteLabel={t('dashboard.delete')}
            deletingLabel={t('dashboard.deleting')}
            errorFallback={t('virtualMachines.list.deleteVmFailed')}
            errorArea="virtualMachines"
            idBase="vm-settings"
            onDelete={onDeleteVirtualMachine}
          />
        )}
      </div>
    </PageShell>
  );
};
