import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, expect, it } from 'vitest';
import { initializeI18n } from '@/i18n';
import { VirtualMachineAgentAccessSelector } from './VirtualMachineAgentAccessSelector';
import type { ControlPlaneVirtualMachine } from '@/services/controlPlaneApi';
import type { Workspace } from '@/types';
import { VirtualMachineSettingsView } from './VirtualMachineSettingsView';
import { AddVirtualMachineModal } from './AddVirtualMachineModal';
import { VirtualMachineResourcesView } from './VirtualMachineResourcesView';
import { VirtualMachineAgentInstallModal } from './VirtualMachineAgentInstallModal';
import { parseControlPlaneVirtualMachine } from '@/services/control-plane/virtualMachineTypes';

beforeAll(initializeI18n);

for (const osFamily of ['linux', 'windows'] as const) {
  for (const [status, state, connected] of [
    ['online', 'disconnected', false], ['online', 'unknown', false],
    ['offline', 'connected', false], ['degraded', 'connected', true],
    ['online', 'connected', true], ['degraded', undefined, true],
    ['unknown', undefined, false], ['offline', undefined, false],
  ] as const) it(`${osFamily} install dialog: ${status}/${state ?? 'legacy'}`, () => {
    const vm = parseControlPlaneVirtualMachine({ id: 'vm', workspaceId: 'ws', name: 'VM', status, osFamily,
      serviceManager: osFamily === 'windows' ? 'scm' : 'systemd', agentAccessMode: 'read_only', restartServices: [],
      permissionMode: 'ask_before_changes', permissionModeOverride: null, permissionModeSource: 'deployment_default',
      connection: state && { state, lastHeartbeatAt: '2026-01-01T00:00:00Z', observedAt: '2026-01-01T00:01:00Z',
        expiresAt: '2026-01-01T00:02:00Z', hasConnectionEvidence: true } });
    const html = renderToStaticMarkup(<VirtualMachineAgentInstallModal workspaceId="ws" workspaceName="Workspace"
      vm={vm} onVirtualMachineUpdated={() => {}} onClose={() => {}} />);
    expect(html.includes('Agent connected')).toBe(connected);
    expect(html.includes('Generate setup command')).toBe(status === 'unknown');
  });
}

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

const resourceProps = { vmName: 'Windows', inventory: [], logs: [], isLoading: false, error: null, isLogsLoading: false, logsError: null, onCategoryChange() {}, onRetry() {} };
for (const [status, label] of [['permission_denied', 'Permission denied'], ['unavailable', 'Collection unavailable'], ['timed_out', 'Collection timed out'], ['partial', 'Collection incomplete']] as const) {
  it(`shows successful Windows log ${status} evidence without claiming no events`, () => {
    const html = renderToStaticMarkup(<VirtualMachineResourcesView {...resourceProps} osFamily="windows" activeCategory="logs"
      logsCollection={{ health: { status }, truncated: true, returned_count: 0, original_count: 0, byte_count: 2 }} />);
    expect(html).toContain(label);
    expect(html).not.toContain('No logs returned for this VM.');
  });
}
it('retains partial Windows rows, truncation and category-specific snapshot evidence', () => {
  const collection = { targetId: 'vm', workspaceId: 'ws', snapshotTs: '2026-10-31T01:00:00.000Z', categories: {
    host: { status: 'ok' }, filesystems: { status: 'permission_denied', omittedCount: 0, findingCoverage: 'incomplete' },
    services: { status: 'ok', omittedCount: 0, findingCoverage: 'complete' },
    processes: { status: 'partial', omittedCount: 3 }, network: { status: 'unknown', omittedCount: 0 }
  } } as const;
  const html = renderToStaticMarkup(<VirtualMachineResourcesView {...resourceProps} osFamily="windows" activeCategory="processes"
    inventoryCollection={collection} inventory={[{ category: 'processes', name: 'kept-process' }]} />);
  expect(html).toContain('kept-process');
  expect(html).toContain('Collection incomplete');
  expect(html).toContain('3 records omitted');
  expect(html).toContain('2026-10-31T01:00:00.000Z');
  expect(html).not.toContain('Permission denied');
  const denied = renderToStaticMarkup(<VirtualMachineResourcesView {...resourceProps} osFamily="windows" activeCategory="all" inventoryCollection={collection} />);
  expect(denied).toContain('Permission denied');
  expect(denied).not.toContain('No inventory returned for this view.');
  const logs = renderToStaticMarkup(<VirtualMachineResourcesView {...resourceProps} osFamily="windows" activeCategory="logs"
    logs={[{ message: 'retained event' }]} logsCollection={{ health: { status: 'partial' }, truncated: true, returned_count: 1, original_count: 2, byte_count: 100 }} />);
  expect(logs).toContain('retained event');
  expect(logs).toContain('Results truncated');
});
it('treats missing Windows collection evidence as unknown and leaves Linux rendering exactly unchanged', () => {
  const windows = renderToStaticMarkup(<VirtualMachineResourcesView {...resourceProps} osFamily="windows" activeCategory="logs" />);
  expect(windows).toContain('Collection status unknown');
  expect(windows).not.toContain('No logs returned for this VM.');
  const props = { ...resourceProps, activeCategory: 'logs' as const };
  const linux = renderToStaticMarkup(<VirtualMachineResourcesView {...props} />);
  expect(linux).toContain('No logs returned for this VM.');
  expect(renderToStaticMarkup(<VirtualMachineResourcesView {...props} logsCollection={{ health: { status: 'permission_denied' }, truncated: true }} />)).toBe(linux);
});
