import React from 'react';
import { Check, Copy, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { CloseButton, TextInput } from '@/components/common/ComponentVocabulary';
import { Dialog } from '@/components/common/Dialog';
import { ModalStepIndicator } from '@/components/common/ModalStepIndicator';
import { ICONS } from '@/constants';

interface AddVirtualMachineModalProps {
  isOpen: boolean;
  creationStep: 'details' | 'instructions';
  vmName: string;
  installInstructions: string;
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
  isRegistering,
  errorMessage,
  onClose,
  onVmNameChange,
  onProceedToInstructions,
  onConfirmInstalled
}) => {
  const { t } = useTranslation();
  const vmNameInputRef = React.useRef<HTMLInputElement>(null);
  const [hasCopiedInstructions, setHasCopiedInstructions] = React.useState(false);
  const connectSteps = [
    { id: 'details', label: t('virtualMachines.list.stepConfigure') },
    { id: 'instructions', label: t('virtualMachines.list.installAgent') }
  ];

  if (!isOpen) return null;

  const copyInstallInstructions = async () => {
    try {
      if (!installInstructions) return;
      await navigator.clipboard.writeText(installInstructions);
      setHasCopiedInstructions(true);
      window.setTimeout(() => setHasCopiedInstructions(false), 2200);
    } catch {
      setHasCopiedInstructions(false);
    }
  };

  return (
    <Dialog
      titleId="add-vm-title"
      initialFocusRef={vmNameInputRef}
      closeDisabled={isRegistering}
      className="relative flex max-h-[min(92vh,50rem)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-ui-border bg-ui-surface shadow-2xl"
      onClose={onClose}
    >
      <div className="flex shrink-0 items-start justify-between gap-4 border-b border-ui-border bg-ui-bg px-6 py-4">
        <div>
          <h3 id="add-vm-title" className="text-sm font-extrabold tracking-tight text-ui-text">
            {t('virtualMachines.list.connectVm')}
          </h3>
          <ModalStepIndicator steps={connectSteps} currentStepId={creationStep} className="mt-4" />
        </div>
        <CloseButton
          type="button"
          onClick={onClose}
          disabled={isRegistering}
          className="shrink-0"
          aria-label={t('virtualMachines.list.closeAddDialog')}
        />
      </div>

      {creationStep === 'details' ? (
        <>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 custom-scrollbar">
            <section className="space-y-3">
              <label htmlFor="add-vm-name-input" className="block px-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-ui-text-muted">
                {t('virtualMachines.list.vmName')}
              </label>
              <TextInput
                id="add-vm-name-input"
                ref={vmNameInputRef}
                type="text"
                value={vmName}
                onChange={(event) => onVmNameChange(event.target.value)}
                placeholder={t('virtualMachines.list.vmNamePlaceholder')}
                className="px-4 font-medium"
              />
            </section>

            {errorMessage && (
              <div className="rounded-lg border border-status-danger/25 bg-status-danger-soft p-4 text-sm font-semibold text-status-danger-text">
                {errorMessage}
              </div>
            )}

          </div>
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-ui-border bg-ui-bg px-6 py-4">
            <Button
              onClick={onClose}
              disabled={isRegistering}
              variant="secondary"
              size="sm"
              className="rounded-lg"
            >
              {t('app.cancel')}
            </Button>
            <Button
              onClick={() => void onProceedToInstructions()}
              disabled={!vmName.trim() || isRegistering}
              variant="primary"
              size="sm"
              className="rounded-lg"
            >
              <Zap className="h-4 w-4" />
              {isRegistering ? t('virtualMachines.list.registering') : t('virtualMachines.list.continueToInstallAgent')}
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 custom-scrollbar">
            <div className="rounded-lg border border-ui-border bg-ui-bg px-4 py-4 text-sm font-medium leading-6 text-ui-text-muted">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-accent-strong">
                  <ICONS.Terminal className="h-4 w-4" />
                </span>
                <p>{t('virtualMachines.list.installBody')}</p>
              </div>
            </div>

            {installInstructions ? (
              <div className="rounded-lg border border-ui-border bg-ui-bg shadow-sm">
                <div className="flex items-center justify-between gap-3 px-4 pt-4">
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-ui-text-muted">{t('virtualMachines.list.installInstructions')}</span>
                  <Button
                    type="button"
                    variant="icon"
                    size="icon"
                    onClick={() => void copyInstallInstructions()}
                    aria-label={hasCopiedInstructions ? t('virtualMachines.list.copied') : t('virtualMachines.list.copy')}
                  >
                    {hasCopiedInstructions ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="max-h-[18rem] overflow-auto px-4 pb-4 pt-3 font-mono text-xs leading-6 text-ui-text custom-scrollbar">
                  <pre className="whitespace-pre">{installInstructions}</pre>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-status-warning/25 bg-status-warning-soft p-4 text-sm font-semibold text-status-warning-text">
                {t('virtualMachines.list.missingInstallInstructions')}
              </div>
            )}
            <div className="rounded-lg border border-ui-border bg-ui-surface p-4">
              <div>
                <p className="type-label text-ui-text-muted">{t('virtualMachines.list.vmName')}</p>
                <p className="type-row-title mt-1 truncate" title={vmName}>{vmName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-status-success/25 bg-status-success-soft px-4 py-3 text-xs font-extrabold text-status-success-text">
              <div className="h-2 w-2 rounded-full bg-status-success"></div>
              {t('virtualMachines.list.waitingForAgent')}
            </div>
          </div>
          <div className="flex shrink-0 items-center justify-end border-t border-ui-border bg-ui-bg px-6 py-4">
            <Button
              onClick={() => void onConfirmInstalled()}
              disabled={isRegistering}
              variant="primary"
              size="sm"
              className="rounded-lg"
            >
              <Zap className="h-4 w-4" />
              {isRegistering ? t('virtualMachines.list.checkingConnection') : t('virtualMachines.list.installedAgent')}
            </Button>
          </div>
        </>
      )}
    </Dialog>
  );
};
