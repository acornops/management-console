import React from 'react';
import { Check, Copy, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
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
  onConfirmInstalled: () => void;
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
      className="relative flex max-h-[min(92vh,56rem)] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-ui-border bg-ui-surface shadow-2xl"
      onClose={onClose}
    >
      <div className="flex shrink-0 items-start justify-between gap-4 border-b border-ui-border bg-ui-bg px-6 py-4">
        <div>
          <h3 id="add-vm-title" className="text-sm font-extrabold tracking-tight text-ui-text">
            {t('virtualMachines.list.connectVm')}
          </h3>
          <ModalStepIndicator steps={connectSteps} currentStepId={creationStep} className="mt-4" />
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={isRegistering}
          className="rounded-lg p-1.5 text-ui-text-muted transition-colors hover:bg-ui-bg hover:text-ui-text disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={t('virtualMachines.list.closeAddDialog')}
        >
          <ICONS.X className="h-4 w-4" />
        </button>
      </div>

      {creationStep === 'details' ? (
        <>
          <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto p-6 custom-scrollbar lg:grid-cols-[minmax(0,1fr)_19rem]">
            <div className="space-y-5 rounded-lg border border-ui-border bg-ui-bg p-5">
              <section className="space-y-3">
                <label htmlFor="add-vm-name-input" className="block px-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-ui-text-muted">
                  {t('virtualMachines.list.vmName')}
                </label>
                <input
                  id="add-vm-name-input"
                  ref={vmNameInputRef}
                  type="text"
                  value={vmName}
                  onChange={(event) => onVmNameChange(event.target.value)}
                  placeholder={t('virtualMachines.list.vmNamePlaceholder')}
                  className="w-full rounded-lg border border-ui-border bg-ui-surface px-4 py-3 text-sm font-medium text-ui-text outline-none transition-all placeholder:text-ui-text-muted focus:border-accent/30 focus:ring-2 focus:ring-accent/10"
                />
              </section>

              {errorMessage && (
                <div className="rounded-lg border border-status-danger/25 bg-status-danger-soft p-4 text-sm font-semibold text-status-danger-text">
                  {errorMessage}
                </div>
              )}
            </div>
            <aside className="rounded-lg border border-ui-border bg-ui-surface p-5">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent-strong">
                  <ICONS.Terminal className="h-4 w-4" />
                </span>
                <div>
                  <h4 className="type-row-title">{t('virtualMachines.list.installAgent')}</h4>
                  <p className="type-caption mt-2 text-ui-text-muted">{t('virtualMachines.list.connectBody')}</p>
                </div>
              </div>
            </aside>
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
              variant="accent"
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
          <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto p-6 custom-scrollbar lg:grid-cols-[minmax(0,1fr)_19rem]">
            <div className="space-y-4">
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
                    <button
                      type="button"
                      onClick={() => void copyInstallInstructions()}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-ui-border bg-ui-surface text-ui-text-muted shadow-sm transition-all hover:bg-ui-bg hover:text-ui-text"
                      aria-label={hasCopiedInstructions ? t('virtualMachines.list.copied') : t('virtualMachines.list.copy')}
                    >
                      {hasCopiedInstructions ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
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
            </div>
            <aside className="space-y-4 rounded-lg border border-ui-border bg-ui-surface p-5">
              <div>
                <p className="type-label text-ui-text-muted">{t('virtualMachines.list.vmName')}</p>
                <p className="type-row-title mt-1 truncate" title={vmName}>{vmName}</p>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-status-success/25 bg-status-success-soft px-4 py-3 text-xs font-extrabold text-status-success-text">
                <div className="h-2 w-2 rounded-full bg-emerald-400"></div>
                {t('virtualMachines.list.waitingForAgent')}
              </div>
              <p className="type-caption text-ui-text-muted">
                {t('virtualMachines.list.reopenHelp')}
              </p>
            </aside>
          </div>
          <div className="flex shrink-0 items-center justify-end border-t border-ui-border bg-ui-bg px-6 py-4">
            <Button
              onClick={onConfirmInstalled}
              variant="accent"
              size="sm"
              className="rounded-lg"
            >
              <Zap className="h-4 w-4" />
              {t('virtualMachines.list.installedAgent')}
            </Button>
          </div>
        </>
      )}
    </Dialog>
  );
};
