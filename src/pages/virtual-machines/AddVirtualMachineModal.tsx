import React from 'react';
import { Check, Copy, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, IconTile, InlineAlert } from '@acornops/ui';
import { AgentConnectionStatus } from '@/components/common/AgentConnectionStatus';
import { CloseButton, TextInput } from '@acornops/ui';
import { DialogFrame } from '@acornops/ui';
import { ModalStepIndicator } from '@acornops/ui';
import { ICONS } from '@/constants';
import type { ControlPlaneVirtualMachineInstallInstructions } from '@/services/controlPlaneApi';
import type { AgentVAccessMode } from '@/services/control-plane/virtualMachineTypes';
import { useAgentVInstallCommand } from './useAgentVInstallCommand';
import { VirtualMachineAgentAccessSelector } from './VirtualMachineAgentAccessSelector';

interface AddVirtualMachineModalProps {
  isOpen: boolean;
  creationStep: 'details' | 'instructions';
  vmName: string;
  agentAccessMode: AgentVAccessMode;
  restartServices: string[];
  installInstructions: ControlPlaneVirtualMachineInstallInstructions | null;
  isAgentConnected: boolean;
  isRegistering: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onVmNameChange: (value: string) => void;
  onAgentAccessChange: (value: AgentVAccessMode, restartServices: string[]) => void;
  onProceedToInstructions: () => void | Promise<void>;
  onConfirmInstalled: () => void | Promise<void>;
  onRegenerateEnrollment: () => void | Promise<void>;
}

export const AddVirtualMachineModal: React.FC<AddVirtualMachineModalProps> = ({
  isOpen,
  creationStep,
  vmName,
  agentAccessMode,
  restartServices,
  installInstructions,
  isAgentConnected,
  isRegistering,
  errorMessage,
  onClose,
  onVmNameChange,
  onAgentAccessChange,
  onProceedToInstructions,
  onConfirmInstalled,
  onRegenerateEnrollment
}) => {
  const { t } = useTranslation();
  const vmNameInputRef = React.useRef<HTMLInputElement>(null);
  const installCommand = useAgentVInstallCommand(
    installInstructions,
    isOpen && creationStep === 'instructions'
  );
  const connectSteps = [
    { id: 'details', label: t('virtualMachines.list.stepConfigure') },
    { id: 'instructions', label: t('virtualMachines.list.installAgent') }
  ];

  if (!isOpen) return null;

  return (
    <DialogFrame unframed
      titleId="add-vm-title"
      initialFocusRef={vmNameInputRef}
      closeDisabled={isRegistering}
      className="relative flex max-h-[min(92vh,50rem)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-ui-border bg-ui-surface shadow-2xl"
      onClose={onClose}
    >
      <div className="flex shrink-0 items-start justify-between gap-4 border-b border-ui-border bg-ui-bg px-6 py-4">
        <div>
          <h3 id="add-vm-title" className="type-panel-title">
            {t('virtualMachines.list.connectVm')}
          </h3>
          <ModalStepIndicator steps={connectSteps} currentStepId={creationStep} className="mt-4" />
        </div>
        <CloseButton type="button" onClick={onClose} disabled={isRegistering} className="shrink-0" aria-label={t('virtualMachines.list.closeAddDialog')} />
      </div>

      {creationStep === 'details' ? (
        <>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 custom-scrollbar">
            <section className="space-y-3">
              <label htmlFor="add-vm-name-input" className="block px-1 type-micro-label">
                {t('virtualMachines.list.vmName')}
              </label>
              <TextInput
                id="add-vm-name-input"
                ref={vmNameInputRef}
                type="text"
                value={vmName}
                onChange={(event) => onVmNameChange(event.target.value)}
                placeholder={t('virtualMachines.list.vmNamePlaceholder')}
                className="px-4 type-ui"
              />
            </section>

            <VirtualMachineAgentAccessSelector
              value={agentAccessMode}
              restartServices={restartServices}
              onChange={onAgentAccessChange}
              disabled={isRegistering}
              idPrefix="add-vm-agent-access"
            />

            {errorMessage && (
              <div className="rounded-lg border border-status-danger/25 bg-status-danger-soft p-4 type-body type-emphasis text-status-danger-text">{errorMessage}</div>
            )}
          </div>
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-ui-border bg-ui-bg px-6 py-4">
            <Button onClick={onClose} disabled={isRegistering} variant="secondary" size="sm" className="rounded-lg">
              {t('app.cancel')}
            </Button>
            <Button onClick={() => void onProceedToInstructions()} disabled={!vmName.trim() || isRegistering || (agentAccessMode === 'read_write' && restartServices.length === 0)} variant="primary" size="sm" className="rounded-lg">
              <Zap className="h-4 w-4" />
              {isRegistering ? t('virtualMachines.list.registering') : t('virtualMachines.list.continueToInstallAgent')}
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 custom-scrollbar">
            <div className="rounded-lg border border-ui-border bg-ui-bg px-4 py-4 type-ui leading-6 text-ui-text-muted">
              <div className="flex items-start gap-3">
                <IconTile size="xs" tone="accent" className="mt-0.5">
                  <ICONS.Terminal className="h-4 w-4" />
                </IconTile>
                <p>{t('virtualMachines.list.installBody')}</p>
              </div>
            </div>

            {installInstructions?.command ? (
              <div className="rounded-lg border border-ui-border bg-ui-bg shadow-sm">
                <div className="flex items-center justify-between gap-3 px-4 pt-4">
                  <div className="flex items-center gap-2">
                    <span className="type-micro-label">{t('virtualMachines.list.installInstructions')}</span>
                    {!isAgentConnected && <span className="rounded-full bg-status-warning-soft px-2 py-0.5 type-micro-label text-status-warning-text">{t('virtualMachines.list.sensitiveUntilUsed')}</span>}
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
                <div className="max-h-[18rem] overflow-auto px-4 pb-4 pt-3 font-mono type-caption leading-6 text-ui-text custom-scrollbar">
                  <pre className="whitespace-pre-wrap break-words">{installInstructions.command}</pre>
                </div>
                {installCommand.copyFailed && (
                  <InlineAlert tone="danger" className="rounded-none border-x-0 border-b-0 p-3 type-caption">
                    {t('virtualMachines.list.copyFailed')}
                  </InlineAlert>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-status-warning/25 bg-status-warning-soft p-4 type-body type-emphasis text-status-warning-text">
                {t('virtualMachines.list.missingInstallInstructions')}
              </div>
            )}
            {installInstructions && installInstructions.warnings.length > 0 && (
              <div className="space-y-1 rounded-lg border border-status-warning/25 bg-status-warning-soft p-3 type-caption text-status-warning-text">
                {installInstructions.warnings.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
              </div>
            )}
            {!isAgentConnected && installCommand.enrollmentExpiry !== null && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-ui-border bg-ui-surface p-3 type-caption text-ui-text-muted">
                <span>{installCommand.enrollmentExpired ? t('virtualMachines.list.enrollmentExpired') : t('virtualMachines.list.enrollmentExpiresIn', { time: installCommand.timeRemaining })}</span>
                {installCommand.enrollmentExpired && <Button size="sm" variant="secondary" disabled={isRegistering} onClick={() => void onRegenerateEnrollment()}>{t('virtualMachines.list.generateNewCommand')}</Button>}
              </div>
            )}
            <div className="rounded-lg border border-ui-border bg-ui-surface p-4">
              <div>
                <p className="type-label text-ui-text-muted">{t('virtualMachines.list.vmName')}</p>
                <p className="type-row-title mt-1 truncate" title={vmName}>
                  {vmName}
                </p>
              </div>
            </div>
            <AgentConnectionStatus
              isConnected={isAgentConnected}
              waitingLabel={t('virtualMachines.list.waitingForAgent')}
              connectedLabel={t('virtualMachines.list.agentConnected')}
            />
          </div>
          <div className="flex shrink-0 items-center justify-end border-t border-ui-border bg-ui-bg px-6 py-4">
            <Button onClick={() => void onConfirmInstalled()} disabled={isRegistering} variant="primary" size="sm" className="rounded-lg">
              <Zap className="h-4 w-4" />
              {isRegistering ? t('virtualMachines.list.checkingConnection') : isAgentConnected ? t('virtualMachines.list.done') : t('virtualMachines.list.installedAgent')}
            </Button>
          </div>
        </>
      )}
    </DialogFrame>
  );
};
