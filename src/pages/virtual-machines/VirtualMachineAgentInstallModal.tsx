import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, CloseButton, DialogFrame, InlineAlert } from '@acornops/ui';
import { AgentConnectionStatus } from '@/components/common/AgentConnectionStatus';
import { controlPlaneApi, type ControlPlaneVirtualMachine, type ControlPlaneVirtualMachineInstallInstructions } from '@/services/controlPlaneApi';
import { formatControlPlaneError } from '@/services/control-plane/errorFormatting';
import { AgentVInstallCommandPanel } from './AgentVInstallCommandPanel';

export const VirtualMachineAgentInstallModal: React.FC<{
  workspaceId: string;
  workspaceName: string;
  vm: ControlPlaneVirtualMachine;
  onVirtualMachineUpdated: (vm: ControlPlaneVirtualMachine) => void;
  onClose: () => void;
}> = ({ workspaceId, workspaceName, vm, onVirtualMachineUpdated, onClose }) => {
  const { t } = useTranslation();
  const [instructions, setInstructions] = React.useState<ControlPlaneVirtualMachineInstallInstructions | null>(null);
  const [busy, setBusy] = React.useState<'generate' | 'check' | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const mountedRef = React.useRef(false);
  const inFlightRef = React.useRef(false);
  const closeButtonRef = React.useRef<HTMLButtonElement>(null);
  const generateButtonRef = React.useRef<HTMLButtonElement>(null);
  const isAgentConnected = vm.status !== 'unknown';

  React.useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  React.useEffect(() => {
    if (isAgentConnected) closeButtonRef.current?.focus();
  }, [isAgentConnected]);

  const generateCommand = async () => {
    if (isAgentConnected || inFlightRef.current) return;
    inFlightRef.current = true;
    setBusy('generate');
    setError(null);
    setInstructions(null);
    try {
      const result = await controlPlaneApi.createVirtualMachineAgentEnrollment(workspaceId, vm.id, 'initial');
      if (mountedRef.current) setInstructions(result.installInstructions);
    } catch (cause) {
      if (mountedRef.current) setError(formatControlPlaneError(cause, t('virtualMachines.settings.initialEnrollmentFailed'), { area: 'virtualMachines' }));
    } finally {
      inFlightRef.current = false;
      if (mountedRef.current) setBusy(null);
    }
  };

  const checkConnection = async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setBusy('check');
    setError(null);
    try {
      const updated = await controlPlaneApi.getVirtualMachine(workspaceId, vm.id);
      if (!mountedRef.current) return;
      if (updated.status === 'unknown') setError(t('virtualMachines.list.agentNotConnected'));
      onVirtualMachineUpdated(updated);
    } catch (cause) {
      if (mountedRef.current) setError(formatControlPlaneError(cause, t('virtualMachines.list.connectionCheckFailed'), { area: 'virtualMachines' }));
    } finally {
      inFlightRef.current = false;
      if (mountedRef.current) setBusy(null);
    }
  };

  return (
    <DialogFrame unframed
      titleId="vm-install-agent-title"
      initialFocusRef={generateButtonRef}
      className="relative flex max-h-[min(92vh,50rem)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-ui-border bg-ui-surface shadow-2xl"
      onClose={onClose}
    >
      <div className="flex shrink-0 items-start justify-between gap-4 border-b border-ui-border bg-ui-bg px-6 py-4">
        <div className="min-w-0">
          <h3 id="vm-install-agent-title" className="type-panel-title">{t('dashboard.installAgent')}</h3>
          <p className="mt-1 break-words type-caption text-ui-text-muted">{workspaceName} / {vm.name}</p>
        </div>
        <CloseButton onClick={onClose} className="shrink-0" aria-label={t('virtualMachines.list.closeInstallDialog')} />
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 custom-scrollbar">
        <p className="type-body text-ui-text-muted">{t('virtualMachines.settings.initialEnrollmentBody')}</p>
        <div className="rounded-lg border border-ui-border bg-ui-bg p-4">
          <p className="type-label text-ui-text-muted">{t('virtualMachines.settings.agentAccess')}</p>
          <p className="mt-1 break-words type-body text-ui-text">
            {vm.agentAccessMode === 'read_write'
              ? t('virtualMachines.settings.agentAccessReadWrite', { services: vm.restartServices.join(', ') })
              : t('virtualMachines.settings.agentAccessReadOnly')}
          </p>
        </div>
        {instructions && !isAgentConnected && (
          <>
            <p className="type-body text-ui-text-muted">{t('virtualMachines.list.installBody')}</p>
            <AgentVInstallCommandPanel instructions={instructions} isAgentConnected={false} />
          </>
        )}
        {error && !isAgentConnected && <InlineAlert tone="danger">{error}</InlineAlert>}
        <AgentConnectionStatus
          isConnected={isAgentConnected}
          waitingLabel={t('virtualMachines.list.waitingForAgent')}
          connectedLabel={t('virtualMachines.list.agentConnected')}
        />
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-ui-border bg-ui-bg px-6 py-4">
        <Button ref={closeButtonRef} onClick={onClose} variant={isAgentConnected ? 'primary' : 'secondary'} size="sm">
          {isAgentConnected ? t('virtualMachines.list.done') : t('common.close')}
        </Button>
        {/* Keep focus inside the dialog while requests run; handlers reject repeated activation. */}
        {!isAgentConnected && instructions && (
          <Button onClick={() => void checkConnection()} aria-disabled={busy !== null} className="aria-disabled:cursor-not-allowed aria-disabled:opacity-50" variant="secondary" size="sm">
            {busy === 'check' ? t('virtualMachines.list.checkingConnection') : t('virtualMachines.list.installedAgent')}
          </Button>
        )}
        {!isAgentConnected && (
          <Button ref={generateButtonRef} onClick={() => void generateCommand()} aria-disabled={busy !== null} className="aria-disabled:cursor-not-allowed aria-disabled:opacity-50" variant="primary" size="sm">
            {busy === 'generate' ? t('virtualMachines.settings.generatingInstructions') : instructions ? t('virtualMachines.list.generateNewCommand') : t('virtualMachines.settings.generateInitialCommand')}
          </Button>
        )}
      </div>
    </DialogFrame>
  );
};
