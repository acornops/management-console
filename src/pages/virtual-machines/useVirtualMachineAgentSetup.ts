import React from 'react';
import type { TFunction } from 'i18next';
import { formatControlPlaneError } from '@/services/control-plane/errorFormatting';
import { controlPlaneApi, type ControlPlaneVirtualMachine } from '@/services/controlPlaneApi';

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
  const [installInstructions, setInstallInstructions] = React.useState<{ vmId: string; value: string } | null>(null);
  const [isAddingVm, setIsAddingVm] = React.useState(false);
  const [vmCreationStep, setVmCreationStep] = React.useState<'details' | 'instructions'>('details');
  const [isRegisteringVm, setIsRegisteringVm] = React.useState(false);
  const [isRotatingAgentKey, setIsRotatingAgentKey] = React.useState(false);
  const [agentKeyRotationError, setAgentKeyRotationError] = React.useState<string | null>(null);
  const [newVmInstallInstructions, setNewVmInstallInstructions] = React.useState('');
  const [vmCreationError, setVmCreationError] = React.useState<string | null>(null);
  const [newVmName, setNewVmName] = React.useState('');

  const resetVmCreationState = () => {
    setIsAddingVm(false);
    setVmCreationStep('details');
    setIsRegisteringVm(false);
    setInstallInstructions(null);
    setNewVmInstallInstructions('');
    setVmCreationError(null);
    setNewVmName('');
  };

  const openAddVmModal = () => {
    if (!canManageTargets) return;
    setIsAddingVm(true);
    setVmCreationStep('details');
    setNewVmInstallInstructions('');
    setVmCreationError(null);
  };

  const registerVm = async () => {
    if (!newVmName.trim() || !canManageTargets) return;
    setIsRegisteringVm(true);
    setVmCreationError(null);
    try {
      const result = await controlPlaneApi.registerVirtualMachine(workspaceId, { name: newVmName.trim() });
      setInstallInstructions({ vmId: result.virtualMachine.id, value: result.installInstructions });
      setNewVmInstallInstructions(result.installInstructions);
      onUpsertVirtualMachine(result.virtualMachine);
      await refreshWorkspaceSummary();
      setVmCreationStep('instructions');
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

  const rotateKey = async (virtualMachine: ControlPlaneVirtualMachine | null) => {
    if (!virtualMachine || !canManageAgentKeys || isRotatingAgentKey) return;
    setIsRotatingAgentKey(true);
    setAgentKeyRotationError(null);
    try {
      const result = await controlPlaneApi.rotateVirtualMachineAgentKey(workspaceId, virtualMachine.id);
      setInstallInstructions({ vmId: virtualMachine.id, value: result.installInstructions });
    } catch (error) {
      setAgentKeyRotationError(formatControlPlaneError(error, t('virtualMachines.settings.rotateKeyFailed'), { area: 'virtualMachines' }));
    } finally {
      setIsRotatingAgentKey(false);
    }
  };

  return {
    agentKeyRotationError,
    confirmVmInstalled,
    installInstructions,
    isAddingVm,
    isRegisteringVm,
    isRotatingAgentKey,
    newVmInstallInstructions,
    newVmName,
    openAddVmModal,
    registerVm,
    resetVmCreationState,
    rotateKey,
    setNewVmName,
    vmCreationError,
    vmCreationStep
  };
}
