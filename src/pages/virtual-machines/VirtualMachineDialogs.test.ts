import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../../..');
const addVirtualMachineModal = readFileSync(resolve(root, 'src/pages/virtual-machines/AddVirtualMachineModal.tsx'), 'utf8');
const virtualMachinesListView = readFileSync(resolve(root, 'src/pages/virtual-machines/VirtualMachinesListView.tsx'), 'utf8');

describe('virtual machine onboarding dialog', () => {
  it('uses the shared dialog shell like the connect-cluster flow', () => {
    expect(addVirtualMachineModal).toContain("import { Dialog } from '@/components/common/Dialog'");
    expect(addVirtualMachineModal).toContain('titleId="add-vm-title"');
    expect(addVirtualMachineModal).toContain('initialFocusRef={vmNameInputRef}');
    expect(addVirtualMachineModal).toContain('htmlFor="add-vm-name-input"');
    expect(addVirtualMachineModal).toContain('id="add-vm-name-input"');
    expect(addVirtualMachineModal).toContain("aria-label={t('virtualMachines.list.closeAddDialog')}");
  });

  it('keeps VM connection focused on display name only', () => {
    expect(addVirtualMachineModal).toContain('vmName: string;');
    expect(addVirtualMachineModal).not.toContain('hostname: string;');
    expect(addVirtualMachineModal).not.toContain('logSources: string;');
    expect(addVirtualMachineModal).not.toContain('add-vm-hostname');
    expect(addVirtualMachineModal).not.toContain('add-vm-log-sources');
  });

  it('bounds install instructions inside a scrollable dialog body', () => {
    expect(addVirtualMachineModal).toContain("creationStep === 'instructions' ? 'max-w-2xl' : 'max-w-lg'");
    expect(addVirtualMachineModal).toContain('max-h-[calc(100dvh-4rem)]');
    expect(addVirtualMachineModal).toContain('min-h-0 flex-1 space-y-4 overflow-y-auto');
    expect(addVirtualMachineModal).toContain('max-h-72 overflow-auto');
    expect(addVirtualMachineModal).toContain('shrink-0 space-y-3 border-t');
  });

  it('uses the cluster-style list actions for VM onboarding and agent setup', () => {
    expect(virtualMachinesListView).not.toContain('data-vm-register-card');
    expect(virtualMachinesListView).not.toContain('registerVmCard');
    expect(virtualMachinesListView).toContain("import { actionCardButtonClassName, cardClassName } from '@/components/common/Card'");
    expect(virtualMachinesListView).toContain('data-vm-add-card="true"');
    expect(virtualMachinesListView).toContain("actionCardButtonClassName({ className: 'min-h-[17rem] flex-col' })");
    expect(virtualMachinesListView).toContain('interactive: !requiresAgentInstall');
    expect(virtualMachinesListView).toContain('data-vm-setup-action="install"');
    expect(virtualMachinesListView).toContain('data-vm-card-action="delete"');
    expect(virtualMachinesListView).not.toContain('data-vm-overflow-action="toggle"');
    expect(virtualMachinesListView).not.toContain('data-vm-overflow-action="delete"');
    expect(virtualMachinesListView).not.toContain('aria-haspopup="menu"');
    expect(virtualMachinesListView).not.toContain('data-vm-row-action="install"');
    expect(virtualMachinesListView).not.toContain('data-vm-row-action="delete"');
    expect(virtualMachinesListView).not.toContain('const hasVisibleRowActions = requiresAgentInstall || canDeleteVm;');
    expect(virtualMachinesListView).not.toContain('border-t border-ui-border bg-ui-bg/45');
    expect(virtualMachinesListView).toContain("t('dashboard.installAgent')");
    expect(virtualMachinesListView).toContain('variant="secondary"');
    expect(virtualMachinesListView).toContain("t('virtualMachines.list.connectVm')");
    expect(virtualMachinesListView).toContain('canManageTargets &&');
    expect(virtualMachinesListView).toContain('onOpenRegisterVm');
  });

  it('uses the shared dialog shell for delete-VM confirmation', () => {
    expect(virtualMachinesListView).toContain("import { Dialog } from '@/components/common/Dialog'");
    expect(virtualMachinesListView).not.toContain("import { Tooltip } from '@/components/common/Tooltip'");
    expect(virtualMachinesListView).toContain('titleId="delete-vm-title"');
    expect(virtualMachinesListView).toContain('closeDisabled={isDeletingVm}');
    expect(virtualMachinesListView).toContain('id="delete-vm-confirmation-input"');
    expect(virtualMachinesListView).toContain("t('virtualMachines.list.deleteVmConfirmationLabel', { name: deleteTargetVm.name })");
  });

  it('uses the same lifecycle filter labels as the cluster page', () => {
    expect(virtualMachinesListView).toContain("t('dashboard.allStates')");
    expect(virtualMachinesListView).toContain("t('dashboard.connected')");
    expect(virtualMachinesListView).toContain("t('dashboard.disconnected')");
    expect(virtualMachinesListView).toContain("t('dashboard.notInstalled')");
    expect(virtualMachinesListView).not.toContain("value: 'degraded'");
  });
});
