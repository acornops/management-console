import React from 'react';
import type { ControlPlaneVirtualMachineInstallInstructions } from '@/services/controlPlaneApi';
import { Check, Copy, KeyRound, PlugZap, ShieldCheck, Wrench } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, InlineAlert, SettingsSection } from '@acornops/ui';
import { PageHeader, PageShell } from '@acornops/ui';
import { SettingsRow } from '@/components/common/SettingsRow';
import { ICONS } from '@/constants';
import { TargetDeleteZone } from '@/features/targets/TargetDeleteZone';
import { TargetAutoTriageSettingsSection } from '@/features/targets/auto-triage/TargetAutoTriageSettingsSection';
import { RunPermissionSettingsSection } from '@/features/run-permissions/RunPermissionSettingsSection';
import type { ControlPlaneVirtualMachine } from '@/services/controlPlaneApi';
import type { Workspace } from '@/types';
import { formatSnapshotTime, getVmStatusLabel } from '@/pages/virtual-machines/virtualMachineUi';
import { useAgentVInstallCommand } from './useAgentVInstallCommand';
import type { RunPermissionMode } from '@/services/control-plane/runPermissionTypes';
import type { AgentVAccessMode } from '@/services/control-plane/virtualMachineTypes';
import type { AgentVInstructionKind } from './useVirtualMachineAgentSetup';
import { VirtualMachineAgentAccessSelector } from './VirtualMachineAgentAccessSelector';

export const VirtualMachineSettingsView: React.FC<{
  vm: ControlPlaneVirtualMachine;
  workspace: Workspace;
  installInstructions: ControlPlaneVirtualMachineInstallInstructions | null;
  installInstructionKind?: AgentVInstructionKind | null;
  requiresInitialEnrollment?: boolean;
  onGenerateInitialEnrollment?: () => void | Promise<void>;
  onReplaceCredential?: () => void | Promise<void>;
  onGenerateRepairInstructions?: () => void | Promise<void>;
  isGeneratingRepairInstructions?: boolean;
  isGeneratingInitialEnrollment?: boolean;
  isReplacingCredential?: boolean;
  credentialError?: string | null;
  agentAccessPolicyError?: string | null;
  onDeleteVirtualMachine?: () => void | Promise<void>;
  onUpdatePermissionMode?: (permissionMode: RunPermissionMode) => void | Promise<void>;
  onUpdateAgentAccessPolicy?: (accessMode: AgentVAccessMode, restartServices: string[]) => void | Promise<void>;
  onRegenerateInstallInstructions?: () => void | Promise<void>;
  isUpdatingAgentAccessPolicy?: boolean;
  canManageTargets?: boolean;
  canCreateReadWriteRuns?: boolean;
}> = ({
  vm,
  workspace,
  installInstructions,
  installInstructionKind = null,
  requiresInitialEnrollment = false,
  onGenerateInitialEnrollment,
  onReplaceCredential,
  onGenerateRepairInstructions,
  isGeneratingRepairInstructions = false,
  isGeneratingInitialEnrollment = false,
  isReplacingCredential = false,
  credentialError,
  agentAccessPolicyError,
  onDeleteVirtualMachine,
  onUpdatePermissionMode,
  onUpdateAgentAccessPolicy,
  onRegenerateInstallInstructions,
  isUpdatingAgentAccessPolicy = false,
  canManageTargets = false,
  canCreateReadWriteRuns = false
}) => {
  const { t } = useTranslation();
  const allowedLogs = vm.allowedLogSources?.join(', ') || t('virtualMachines.settings.defaultAllowedLogs');
  const appliedAgentAccess = vm.agentAccessMode === 'read_write'
    ? t('virtualMachines.settings.agentAccessReadWrite', { services: vm.restartServices.join(', ') })
    : t('virtualMachines.settings.agentAccessReadOnly');
  const pendingAgentAccess = vm.pendingAgentAccessPolicy?.accessMode === 'read_write'
    ? t('virtualMachines.settings.agentAccessReadWrite', { services: vm.pendingAgentAccessPolicy.restartServices.join(', ') })
    : t('virtualMachines.settings.agentAccessReadOnly');
  const installCommand = useAgentVInstallCommand(installInstructions);
  const configuredAccessMode = vm.pendingAgentAccessPolicy?.accessMode || vm.agentAccessMode;
  const configuredRestartServices = vm.pendingAgentAccessPolicy?.restartServices || vm.restartServices;
  const configuredRestartServicesKey = configuredRestartServices.join('\u0000');
  const [draftAccessMode, setDraftAccessMode] = React.useState<AgentVAccessMode>(configuredAccessMode);
  const [draftRestartServices, setDraftRestartServices] = React.useState<string[]>(configuredRestartServices);

  React.useEffect(() => {
    setDraftAccessMode(configuredAccessMode);
    setDraftRestartServices(configuredRestartServices);
  }, [configuredAccessMode, configuredRestartServicesKey, vm.id]);

  const policyChanged = draftAccessMode !== configuredAccessMode
    || [...draftRestartServices].sort().join('\u0000') !== [...configuredRestartServices].sort().join('\u0000');
  const policyValid = draftAccessMode === 'read_only' || draftRestartServices.length > 0;
  const policyBusy = isUpdatingAgentAccessPolicy || isGeneratingInitialEnrollment
    || isGeneratingRepairInstructions || isReplacingCredential;
  const policyCommandVisible = installInstructionKind === 'policy_update' && Boolean(installInstructions?.command);

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

        <RunPermissionSettingsSection
          title={t('virtualMachines.settings.permissionModeTitle')}
          description={t('virtualMachines.settings.permissionModeBody')}
          permissionMode={vm.permissionMode}
          disabled={!canManageTargets || !onUpdatePermissionMode}
          note={t('virtualMachines.settings.restartLocalPolicyApplies')}
          onChange={onUpdatePermissionMode}
        />

        <SettingsSection
          title={t('virtualMachines.settings.hostPolicyTitle')}
          description={t('virtualMachines.settings.hostPolicyBody')}
        >
          <SettingsRow
            icon={ShieldCheck}
            label={t('virtualMachines.settings.appliedHostPolicy')}
            description={appliedAgentAccess}
          />
          {vm.pendingAgentAccessPolicy && (
            <SettingsRow
              icon={ICONS.Clock}
              label={t('virtualMachines.settings.pendingHostPolicy')}
              description={pendingAgentAccess}
            />
          )}
          {vm.pendingAgentAccessPolicy && (
            <InlineAlert tone="warning" className="rounded-none border-x-0 border-b-0 p-4 type-caption">
              {t('virtualMachines.settings.pendingHostPolicyBody')}
            </InlineAlert>
          )}
          {!requiresInitialEnrollment && (
            <div className="space-y-4 border-t border-ui-border p-4 sm:p-6">
              <VirtualMachineAgentAccessSelector
                value={draftAccessMode}
                restartServices={draftRestartServices}
                disabled={!canManageTargets || !onUpdateAgentAccessPolicy || policyBusy}
                idPrefix="vm-settings-agent-access"
                onChange={(accessMode, restartServices) => {
                  setDraftAccessMode(accessMode);
                  setDraftRestartServices(restartServices);
                }}
              />
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={!canManageTargets || !onUpdateAgentAccessPolicy || !policyValid || policyBusy
                    || (!policyChanged && !vm.pendingAgentAccessPolicy)}
                  onClick={() => void onUpdateAgentAccessPolicy?.(draftAccessMode, draftRestartServices)}
                  className="w-full sm:w-auto"
                >
                  <ShieldCheck className="h-4 w-4" />
                  {isUpdatingAgentAccessPolicy
                    ? t('virtualMachines.settings.generatingInstructions')
                    : vm.pendingAgentAccessPolicy && !policyChanged
                      ? t('virtualMachines.settings.generateNewPolicyCommand')
                      : t('virtualMachines.settings.applyHostPolicy')}
                </Button>
              </div>
            </div>
          )}
          {agentAccessPolicyError && (
            <InlineAlert tone="danger" className="rounded-none border-x-0 border-b-0 p-4 type-body type-emphasis">
              {agentAccessPolicyError}
            </InlineAlert>
          )}
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
          {installInstructions?.command && (!policyCommandVisible || vm.pendingAgentAccessPolicy) && (
            <div className="border-t border-ui-border bg-ui-bg/60 p-6">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <p className="type-row-title">
                    {t(installInstructionKind === 'policy_update'
                      ? 'virtualMachines.settings.hostPolicyCommand'
                      : 'virtualMachines.settings.installInstructions')}
                  </p>
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
                  {installCommand.enrollmentExpired && onRegenerateInstallInstructions && (
                    <Button size="sm" variant="secondary" disabled={policyBusy} onClick={onRegenerateInstallInstructions}>
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
