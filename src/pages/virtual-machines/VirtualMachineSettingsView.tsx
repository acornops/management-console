import React from 'react';
import type { ControlPlaneVirtualMachineInstallInstructions } from '@/services/controlPlaneApi';
import { Check, Copy, KeyRound, PlugZap, Wrench } from 'lucide-react';
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
import { useAgentVInstallCommand } from './useAgentVInstallCommand';

export const VirtualMachineSettingsView: React.FC<{
  vm: ControlPlaneVirtualMachine;
  workspace: Workspace;
  installInstructions: ControlPlaneVirtualMachineInstallInstructions | null;
  requiresInitialEnrollment?: boolean;
  onGenerateInitialEnrollment?: () => void | Promise<void>;
  onReplaceCredential?: () => void | Promise<void>;
  onGenerateRepairInstructions?: () => void | Promise<void>;
  isGeneratingRepairInstructions?: boolean;
  isGeneratingInitialEnrollment?: boolean;
  isReplacingCredential?: boolean;
  credentialError?: string | null;
  onDeleteVirtualMachine?: () => void | Promise<void>;
  canManageTargets?: boolean;
  canCreateReadWriteRuns?: boolean;
}> = ({
  vm,
  workspace,
  installInstructions,
  requiresInitialEnrollment = false,
  onGenerateInitialEnrollment,
  onReplaceCredential,
  onGenerateRepairInstructions,
  isGeneratingRepairInstructions = false,
  isGeneratingInitialEnrollment = false,
  isReplacingCredential = false,
  credentialError,
  onDeleteVirtualMachine,
  canManageTargets = false,
  canCreateReadWriteRuns = false
}) => {
  const { t } = useTranslation();
  const allowedLogs = vm.allowedLogSources?.join(', ') || t('virtualMachines.settings.defaultAllowedLogs');
  const installCommand = useAgentVInstallCommand(installInstructions);

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
          {requiresInitialEnrollment && (
            <SettingsRow
              icon={PlugZap}
              label={t('virtualMachines.settings.initialEnrollment')}
              description={t('virtualMachines.settings.initialEnrollmentBody')}
              action={(
                <Button onClick={onGenerateInitialEnrollment} disabled={!onGenerateInitialEnrollment || isGeneratingInitialEnrollment || isGeneratingRepairInstructions || isReplacingCredential} title={!onGenerateInitialEnrollment ? t('virtualMachines.settings.initialEnrollmentPermissionRequired') : undefined} variant="secondary" size="sm" className="w-full sm:w-auto">
                  <PlugZap className="h-4 w-4" />
                  {isGeneratingInitialEnrollment ? t('virtualMachines.settings.generatingInstructions') : t('virtualMachines.settings.generateInitialCommand')}
                </Button>
              )}
            />
          )}
          {!requiresInitialEnrollment && <SettingsRow
            icon={Wrench}
            label={t('virtualMachines.settings.repairAgent')}
            description={t('virtualMachines.settings.repairAgentBody')}
            action={(
              <Button onClick={onGenerateRepairInstructions} disabled={!onGenerateRepairInstructions || isGeneratingInitialEnrollment || isGeneratingRepairInstructions || isReplacingCredential} variant="secondary" size="sm" className="w-full sm:w-auto">
                <Wrench className="h-4 w-4" />
                {isGeneratingRepairInstructions ? t('virtualMachines.settings.generatingInstructions') : t('virtualMachines.settings.generateRepairCommand')}
              </Button>
            )}
          />}
          {!requiresInitialEnrollment && <SettingsRow
            icon={KeyRound}
            label={t('virtualMachines.settings.replaceCredential')}
            description={t('virtualMachines.settings.replaceCredentialBody')}
            action={(
              <Button onClick={onReplaceCredential} disabled={!onReplaceCredential || isGeneratingInitialEnrollment || isReplacingCredential || isGeneratingRepairInstructions} title={!onReplaceCredential ? t('virtualMachines.settings.credentialPermissionRequired') : undefined} variant="secondary" size="sm" className="w-full sm:w-auto">
                <KeyRound className="h-4 w-4" />
                {isReplacingCredential ? t('virtualMachines.settings.generatingInstructions') : t('virtualMachines.settings.replaceCredential')}
              </Button>
            )}
          />}
          {credentialError && <InlineAlert tone="danger" className="rounded-none border-x-0 border-b-0 p-4 type-body type-emphasis">{credentialError}</InlineAlert>}
          {installInstructions?.command && (
            <div className="border-t border-ui-border bg-ui-bg/60 p-6">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <p className="type-row-title">{t('virtualMachines.settings.installInstructions')}</p>
                  {installCommand.enrollmentExpiry !== null && (
                    <span className="rounded-full bg-status-warning-soft px-2 py-0.5 type-micro-label text-status-warning-text">
                      {t('virtualMachines.list.sensitiveUntilUsed')}
                    </span>
                  )}
                </div>
                <Button
                  type="button"
                  variant="icon"
                  size="icon"
                  onClick={() => void installCommand.copy()}
                  disabled={installCommand.enrollmentExpired}
                  aria-label={installCommand.hasCopied ? t('virtualMachines.list.copied') : t('virtualMachines.list.copy')}
                >
                  {installCommand.hasCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-md border border-ui-border bg-ui-surface p-4 type-caption leading-5 text-ui-text">
                {installInstructions.command}
              </pre>
              {installCommand.copyFailed && (
                <InlineAlert tone="danger" className="mt-3 p-3 type-caption">
                  {t('virtualMachines.list.copyFailed')}
                </InlineAlert>
              )}
              {installInstructions.warnings.length > 0 && (
                <div className="mt-3 space-y-1 rounded-lg border border-status-warning/25 bg-status-warning-soft p-3 type-caption text-status-warning-text">
                  {installInstructions.warnings.map((warning) => <p key={warning}>{warning}</p>)}
                </div>
              )}
              {installCommand.enrollmentExpiry !== null && (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-ui-border bg-ui-surface p-3 type-caption text-ui-text-muted">
                  <span>
                    {installCommand.enrollmentExpired
                      ? t('virtualMachines.list.enrollmentExpired')
                      : t('virtualMachines.list.enrollmentExpiresIn', { time: installCommand.timeRemaining })}
                  </span>
                  {installCommand.enrollmentExpired && (onGenerateInitialEnrollment || onReplaceCredential) && (
                    <Button size="sm" variant="secondary" disabled={isGeneratingInitialEnrollment || isReplacingCredential || isGeneratingRepairInstructions} onClick={onGenerateInitialEnrollment || onReplaceCredential}>
                      {t('virtualMachines.list.generateNewCommand')}
                    </Button>
                  )}
                </div>
              )}
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
