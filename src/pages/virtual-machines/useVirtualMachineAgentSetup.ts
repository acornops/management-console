import React from 'react';
import type { TFunction } from 'i18next';
import { formatControlPlaneError } from '@/services/control-plane/errorFormatting';
import {
  controlPlaneApi,
  type ControlPlaneVirtualMachine,
  type ControlPlaneVirtualMachineInstallInstructions
} from '@/services/controlPlaneApi';

export function useVirtualMachineAgentSetup({
  workspaceId,
  canManageTargets,
  canManageAgentKeys,
  refreshWorkspaceSummary,
  onUpsertVirtualMachine,
  t
}: {
  workspaceId: string;
  canManageTargets: boolean;
  canManageAgentKeys: boolean;
  refreshWorkspaceSummary: () => Promise<void>;
  onUpsertVirtualMachine: (virtualMachine: ControlPlaneVirtualMachine) => void;
  t: TFunction;
}) {
  const [installInstructions, setInstallInstructions] = React.useState<{ vmId: string; value: ControlPlaneVirtualMachineInstallInstructions } | null>(null);
  const [isAddingVm, setIsAddingVm] = React.useState(false);
  const [vmCreationStep, setVmCreationStep] = React.useState<'details' | 'instructions'>('details');
  const [isRegisteringVm, setIsRegisteringVm] = React.useState(false);
  const [isReplacingCredential, setIsReplacingCredential] = React.useState(false);
  const [isGeneratingRepairInstructions, setIsGeneratingRepairInstructions] = React.useState(false);
  const [credentialReplacementError, setCredentialReplacementError] = React.useState<string | null>(null);
  const [vmCreationError, setVmCreationError] = React.useState<string | null>(null);
  const [newVmName, setNewVmName] = React.useState('');

  const resetVmCreationState = () => {
    setIsAddingVm(false);
    setVmCreationStep('details');
    setIsRegisteringVm(false);
    setInstallInstructions(null);
    setVmCreationError(null);
    setNewVmName('');
  };

  const openAddVmModal = () => {
    if (!canManageTargets) return;
    setIsAddingVm(true);
    setVmCreationStep('details');
    setInstallInstructions(null);
    setVmCreationError(null);
  };

  const registerVm = async () => {
    if (!newVmName.trim() || !canManageTargets) return;
    setIsRegisteringVm(true);
    setVmCreationError(null);
    try {
      const result = await controlPlaneApi.registerVirtualMachine(workspaceId, { name: newVmName.trim() });
      setInstallInstructions({ vmId: result.virtualMachine.id, value: result.installInstructions });
      onUpsertVirtualMachine(result.virtualMachine);
      setVmCreationStep('instructions');
      // Registration and enrollment have succeeded. A nonessential summary
      // refresh must not hide the command or encourage a duplicate VM.
      void refreshWorkspaceSummary().catch(() => undefined);
    } catch (error) {
      console.error('Failed registering virtual machine in control plane', error);
      setVmCreationError(formatControlPlaneError(error, t('virtualMachines.list.registerFailed'), { area: 'virtualMachines' }));
    } finally {
      setIsRegisteringVm(false);
    }
  };

  const confirmVmInstalled = async () => {
    if (!installInstructions?.vmId || isRegisteringVm) return;
    setIsRegisteringVm(true);
    setVmCreationError(null);
    try {
      const refreshed = await controlPlaneApi.getVirtualMachine(workspaceId, installInstructions.vmId);
      onUpsertVirtualMachine(refreshed);
      if (refreshed.status === 'unknown') {
        setVmCreationError(t('virtualMachines.list.agentNotConnected'));
        return;
      }
      resetVmCreationState();
    } catch (error) {
      setVmCreationError(formatControlPlaneError(error, t('virtualMachines.list.connectionCheckFailed'), { area: 'virtualMachines' }));
    } finally {
      setIsRegisteringVm(false);
    }
  };

  const regenerateEnrollment = async () => {
    if (!installInstructions?.vmId || isRegisteringVm) return;
    setIsRegisteringVm(true);
    setVmCreationError(null);
    try {
      const result = await controlPlaneApi.createVirtualMachineAgentEnrollment(workspaceId, installInstructions.vmId, 'initial');
      setInstallInstructions({ vmId: installInstructions.vmId, value: result.installInstructions });
    } catch (error) {
      setVmCreationError(formatControlPlaneError(error, t('virtualMachines.list.registerFailed'), { area: 'virtualMachines' }));
    } finally {
      setIsRegisteringVm(false);
    }
  };

  const generateInitialEnrollment = async (virtualMachine: ControlPlaneVirtualMachine | null) => {
    if (!virtualMachine || !canManageTargets || isRegisteringVm || isReplacingCredential || isGeneratingRepairInstructions) return;
    setIsRegisteringVm(true);
    setCredentialReplacementError(null);
    try {
      const result = await controlPlaneApi.createVirtualMachineAgentEnrollment(workspaceId, virtualMachine.id, 'initial');
      setInstallInstructions({ vmId: virtualMachine.id, value: result.installInstructions });
    } catch (error) {
      setCredentialReplacementError(formatControlPlaneError(error, t('virtualMachines.settings.initialEnrollmentFailed'), { area: 'virtualMachines' }));
    } finally {
      setIsRegisteringVm(false);
    }
  };

  const replaceCredential = async (virtualMachine: ControlPlaneVirtualMachine | null) => {
    if (!virtualMachine || !canManageAgentKeys || isReplacingCredential || isGeneratingRepairInstructions) return;
    setIsReplacingCredential(true);
    setCredentialReplacementError(null);
    try {
      const result = await controlPlaneApi.createVirtualMachineAgentEnrollment(workspaceId, virtualMachine.id, 'replace');
      setInstallInstructions({ vmId: virtualMachine.id, value: result.installInstructions });
    } catch (error) {
      setCredentialReplacementError(formatControlPlaneError(error, t('virtualMachines.settings.replaceCredentialFailed'), { area: 'virtualMachines' }));
    } finally {
      setIsReplacingCredential(false);
    }
  };

  const generateRepairInstructions = async (virtualMachine: ControlPlaneVirtualMachine | null) => {
    if (!virtualMachine || !canManageTargets || isGeneratingRepairInstructions || isReplacingCredential) return;
    setIsGeneratingRepairInstructions(true);
    setCredentialReplacementError(null);
    try {
      const result = await controlPlaneApi.getVirtualMachineInstallInstructions(workspaceId, virtualMachine.id);
      setInstallInstructions({ vmId: virtualMachine.id, value: result.installInstructions });
    } catch (error) {
      setCredentialReplacementError(formatControlPlaneError(error, t('virtualMachines.settings.repairInstructionsFailed'), { area: 'virtualMachines' }));
    } finally {
      setIsGeneratingRepairInstructions(false);
    }
  };

  return {
    credentialReplacementError,
    confirmVmInstalled,
    installInstructions,
    isAddingVm,
    isRegisteringVm,
    isReplacingCredential,
    isGeneratingRepairInstructions,
    newVmName,
    openAddVmModal,
    registerVm,
    regenerateEnrollment,
    generateInitialEnrollment,
    resetVmCreationState,
    replaceCredential,
    generateRepairInstructions,
    setNewVmName,
    vmCreationError,
    vmCreationStep
  };
}
