import React from 'react';
import { Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@acornops/ui';
import { CloseButton, TextInput } from '@acornops/ui';
import { DialogFrame } from '@acornops/ui';
import { ModalStepIndicator } from '@acornops/ui';
import { AgentInstallInstructionsStep } from '@/components/common/AgentInstallInstructionsStep';

interface AddVirtualMachineModalProps {
  isOpen: boolean;
  creationStep: 'details' | 'instructions';
  vmName: string;
  installInstructions: string;
  isAgentConnected: boolean;
  isRegistering: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onVmNameChange: (value: string) => void;
  onProceedToInstructions: () => void | Promise<void>;
  onConfirmInstalled: () => void | Promise<void>;
}

export const AddVirtualMachineModal: React.FC<AddVirtualMachineModalProps> = ({
  isOpen,
  creationStep,
  vmName,
  installInstructions,
  isAgentConnected,
  isRegistering,
  errorMessage,
  onClose,
  onVmNameChange,
  onProceedToInstructions,
  onConfirmInstalled
}) => {
  const { t } = useTranslation();
  const vmNameInputRef = React.useRef<HTMLInputElement>(null);
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

            {errorMessage && (
              <div className="rounded-lg border border-status-danger/25 bg-status-danger-soft p-4 type-body type-emphasis text-status-danger-text">{errorMessage}</div>
            )}
          </div>
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-ui-border bg-ui-bg px-6 py-4">
            <Button onClick={onClose} disabled={isRegistering} variant="secondary" size="sm" className="rounded-lg">
              {t('app.cancel')}
            </Button>
            <Button onClick={() => void onProceedToInstructions()} disabled={!vmName.trim() || isRegistering} variant="primary" size="sm" className="rounded-lg">
              <Zap className="h-4 w-4" />
              {isRegistering ? t('virtualMachines.list.registering') : t('virtualMachines.list.continueToInstallAgent')}
            </Button>
          </div>
        </>
      ) : (
        <AgentInstallInstructionsStep
          introduction={t('virtualMachines.list.installBody')}
          command={installInstructions}
          commandLabel={t('virtualMachines.list.installInstructions')}
          copyLabel={t('virtualMachines.list.copy')}
          copiedLabel={t('virtualMachines.list.copied')}
          missingCommandMessage={t('virtualMachines.list.missingInstallInstructions')}
          isConnected={isAgentConnected}
          waitingLabel={t('virtualMachines.list.waitingForAgent')}
          connectedLabel={t('virtualMachines.list.agentConnected')}
          isSubmitting={isRegistering}
          submittingLabel={t('virtualMachines.list.checkingConnection')}
          connectedActionLabel={t('virtualMachines.list.done')}
          pendingActionLabel={t('virtualMachines.list.installedAgent')}
          onConfirmInstalled={onConfirmInstalled}
          summary={(
            <div className="rounded-lg border border-ui-border bg-ui-surface p-4">
              <p className="type-label text-ui-text-muted">{t('virtualMachines.list.vmName')}</p>
              <p className="type-row-title mt-1 truncate" title={vmName}>{vmName}</p>
            </div>
          )}
        />
      )}
    </DialogFrame>
  );
};
