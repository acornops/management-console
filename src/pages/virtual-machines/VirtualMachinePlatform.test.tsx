import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, expect, it } from 'vitest';
import { initializeI18n } from '@/i18n';
import { VirtualMachineAgentAccessSelector } from './VirtualMachineAgentAccessSelector';
import type { ControlPlaneVirtualMachine } from '@/services/controlPlaneApi';
import type { Workspace } from '@/types';
import { VirtualMachineSettingsView } from './VirtualMachineSettingsView';
import { AddVirtualMachineModal } from './AddVirtualMachineModal';
import { VirtualMachineResourcesView } from './VirtualMachineResourcesView';

beforeAll(initializeI18n);

it('keeps Linux read-write and exact service entry while Windows exposes only read-only', () => {
  const linux = renderToStaticMarkup(<VirtualMachineAgentAccessSelector value="read_write" restartServices={['ssh.service']} onChange={() => {}} />);
  expect(linux).toContain('Restartable systemd services');
  expect(linux).toContain('ssh.service');
  const windows = renderToStaticMarkup(<VirtualMachineAgentAccessSelector osFamily="windows" value="read_only" restartServices={[]} onChange={() => {}} />);
  expect(windows).toContain('Read-only');
  expect(windows).toContain('Windows supports read-only access');
  expect(windows).not.toContain('Read-write');
  expect(windows).not.toContain('systemd');
});

it('offers Windows event channel filters without a Linux-only source control', () => {
  const html = renderToStaticMarkup(<VirtualMachineResourcesView osFamily="windows" vmName="Windows" activeCategory="logs" inventory={[]} logs={[]} isLoading={false} error={null} isLogsLoading={false} logsError={null} onCategoryChange={() => {}} onRetry={() => {}} />);
  expect(html).toContain('Event channel');
  expect(html).toContain('Application');
  expect(html).not.toContain('journald');
});

it('keeps Windows OS immutable and host policy read-only while retaining shared run policy', () => {
  const vm = {
    id: 'vm-1', workspaceId: 'ws-1', name: 'Windows', osFamily: 'windows', serviceManager: 'scm',
    status: 'online', agentAccessMode: 'read_only', restartServices: [], pendingAgentAccessPolicy: null,
    permissionMode: 'ask_before_changes', permissionModeOverride: null, permissionModeSource: 'deployment_default',
    createdAt: '', updatedAt: ''
  } satisfies ControlPlaneVirtualMachine;
  const html = renderToStaticMarkup(<VirtualMachineSettingsView vm={vm} workspace={{ id: 'ws-1', name: 'Workspace' } as Workspace} installInstructions={null} onVirtualMachineUpdated={() => {}} onUpdateAgentAccessPolicy={() => {}} onUpdatePermissionMode={() => {}} canManageTargets />);
  expect(html).toContain('windows');
  expect(html).toContain('scm');
  expect(html).not.toContain('aria-label="Operating system"');
  expect(html).toContain('Application, System');
  expect(html).toContain('Windows supports read-only access');
  expect(html).toContain('data-run-permission-settings');
  expect(html).toContain('Ask before changes');
  expect(html).not.toContain('vm-settings-agent-access');
  expect(html).not.toContain('Generate apply command');
  expect(html).not.toContain('Restartable systemd services');
  expect(html).not.toContain('Choose the exact systemd services');
});

it('renders PowerShell instructions verbatim and keeps Linux installation copy', () => {
  const instructions = { command: "powershell.exe -NoProfile -File 'install-agentv.ps1'", releaseVersion: '1.0.0', bootstrapUrl: 'https://example.invalid/install-agentv.ps1', warnings: [] };
  const props = { isOpen: true, creationStep: 'instructions' as const, vmName: 'Windows', agentAccessMode: 'read_only' as const, restartServices: [], installInstructions: instructions, isAgentConnected: false, isRegistering: false, onClose: () => {}, onVmNameChange: () => {}, onAgentAccessChange: () => {}, onProceedToInstructions: () => {}, onConfirmInstalled: () => {}, onRegenerateEnrollment: () => {} };
  const windows = renderToStaticMarkup(<AddVirtualMachineModal {...props} osFamily="windows" />);
  expect(windows).toContain('PowerShell as Administrator');
  expect(windows).toContain('powershell.exe -NoProfile -File');
  const linux = renderToStaticMarkup(<AddVirtualMachineModal {...props} />);
  expect(linux).toContain('Run this command on the VM to install the AcornOps host agent.');
});
