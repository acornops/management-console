import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('VM install instructions', () => {
  it('does not retain the legacy VM instruction decoder', () => {
    const types = readFileSync(new URL('../../services/control-plane/virtualMachineTypes.ts', import.meta.url), 'utf8');
    expect(types).not.toContain('normalizeVirtualMachineInstallInstructions');
    expect(types).not.toContain('agentKey: string');
  });

  it('copies only the executable command and renders warnings separately', () => {
    const hook = readFileSync(new URL('./useAgentVInstallCommand.ts', import.meta.url), 'utf8');
    const modal = readFileSync(new URL('./AddVirtualMachineModal.tsx', import.meta.url), 'utf8');
    const settings = readFileSync(new URL('./VirtualMachineSettingsView.tsx', import.meta.url), 'utf8');
    expect(hook).toContain('navigator.clipboard.writeText(instructions.command)');
    expect(hook).toContain('setCopyFailed(true)');
    expect(modal).toContain('installInstructions.warnings.map');
    expect(modal).toContain("t('virtualMachines.list.copyFailed')");
    expect(hook).not.toContain('navigator.clipboard.writeText(instructions)');
    expect(settings).toContain('installInstructions.warnings.map');
    expect(settings).toContain('disabled={installCommand.enrollmentExpired}');
    expect(settings).toContain("t('virtualMachines.list.enrollmentExpiresIn'");
    expect(settings).toContain("t('virtualMachines.list.generateNewCommand')");
  });

  it('keeps interrupted initial enrollment recoverable from VM settings', () => {
    const setup = readFileSync(new URL('./useVirtualMachineAgentSetup.ts', import.meta.url), 'utf8');
    const settings = readFileSync(new URL('./VirtualMachineSettingsView.tsx', import.meta.url), 'utf8');
    expect(setup).toContain("createVirtualMachineAgentEnrollment(workspaceId, virtualMachine.id, 'initial')");
    expect(setup.indexOf("setVmCreationStep('instructions')")).toBeLessThan(setup.indexOf('void refreshWorkspaceSummary()'));
    expect(settings).toContain("t('virtualMachines.settings.initialEnrollment')");
    expect(settings).toContain('requiresInitialEnrollment');
    expect(settings).toContain('onGenerateInitialEnrollment || onReplaceCredential');
  });
});
