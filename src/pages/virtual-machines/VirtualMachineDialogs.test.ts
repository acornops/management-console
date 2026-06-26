import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../../..');
const addVirtualMachineModal = readFileSync(resolve(root, 'src/pages/virtual-machines/AddVirtualMachineModal.tsx'), 'utf8');
const pendingAgentSetup = readFileSync(resolve(root, 'src/components/common/PendingAgentSetup.tsx'), 'utf8');
const virtualMachinesPage = readFileSync(resolve(root, 'src/pages/VirtualMachinesPage.tsx'), 'utf8');
const virtualMachinesListView = readFileSync(resolve(root, 'src/pages/virtual-machines/VirtualMachinesListView.tsx'), 'utf8');
const pendingVirtualMachineSetup = readFileSync(resolve(root, 'src/pages/virtual-machines/PendingVirtualMachineSetup.tsx'), 'utf8');
const virtualMachineMetrics = readFileSync(resolve(root, 'src/pages/virtual-machines/VirtualMachineMetrics.tsx'), 'utf8');
const virtualMachineIssuesPanel = readFileSync(resolve(root, 'src/pages/virtual-machines/VirtualMachineIssuesPanel.tsx'), 'utf8');
const virtualMachineUi = readFileSync(resolve(root, 'src/pages/virtual-machines/virtualMachineUi.ts'), 'utf8');
const constants = readFileSync(resolve(root, 'src/constants.tsx'), 'utf8');

describe('virtual machine onboarding dialog', () => {
  it('uses the shared dialog shell like the connect-cluster flow', () => {
    expect(addVirtualMachineModal).toContain("import { Dialog } from '@/components/common/Dialog'");
    expect(addVirtualMachineModal).toContain("import { ModalStepIndicator } from '@/components/common/ModalStepIndicator'");
    expect(addVirtualMachineModal).toContain('titleId="add-vm-title"');
    expect(addVirtualMachineModal).toContain('initialFocusRef={vmNameInputRef}');
    expect(addVirtualMachineModal).toContain('htmlFor="add-vm-name-input"');
    expect(addVirtualMachineModal).toContain('id="add-vm-name-input"');
    expect(addVirtualMachineModal).toContain("aria-label={t('virtualMachines.list.closeAddDialog')}");
    expect(addVirtualMachineModal).toContain('w-full max-w-5xl flex-col overflow-hidden');
    expect(addVirtualMachineModal).toContain('rounded-xl border border-ui-border bg-ui-surface');
    expect(addVirtualMachineModal).toContain('border-b border-ui-border bg-ui-bg px-6 py-4');
    expect(addVirtualMachineModal).toContain('<ModalStepIndicator steps={connectSteps} currentStepId={creationStep} className="mt-4" />');
    expect(addVirtualMachineModal).toContain('lg:grid-cols-[minmax(0,1fr)_19rem]');
    expect(addVirtualMachineModal).not.toContain("1. {t('virtualMachines.list.vmName')}");
    expect(addVirtualMachineModal).not.toContain("2. {t('virtualMachines.list.installInstructions')}");
    expect(addVirtualMachineModal).not.toContain('rounded-2xl');
  });

  it('keeps VM connection focused on display name only', () => {
    expect(addVirtualMachineModal).toContain('vmName: string;');
    expect(addVirtualMachineModal).not.toContain('hostname: string;');
    expect(addVirtualMachineModal).not.toContain('logSources: string;');
    expect(addVirtualMachineModal).not.toContain('add-vm-hostname');
    expect(addVirtualMachineModal).not.toContain('add-vm-log-sources');
  });

  it('bounds install instructions inside a scrollable dialog body', () => {
    expect(addVirtualMachineModal).not.toContain("creationStep === 'instructions' ? 'max-w-2xl' : 'max-w-lg'");
    expect(addVirtualMachineModal).toContain('max-h-[min(92vh,56rem)]');
    expect(addVirtualMachineModal).toContain('grid min-h-0 flex-1 gap-6 overflow-y-auto');
    expect(addVirtualMachineModal).toContain('max-h-[18rem] overflow-auto');
    expect(addVirtualMachineModal).toContain('justify-end gap-3 border-t');
    expect(addVirtualMachineModal).toContain("t('virtualMachines.list.continueToInstallAgent')");
    expect(addVirtualMachineModal).not.toContain("t('virtualMachines.list.registerAndGenerate')");
    expect(addVirtualMachineModal).not.toContain('onBackToDetails');
    expect(addVirtualMachineModal).not.toContain("t('virtualMachines.list.back')");
    expect(virtualMachinesPage).toContain('const confirmVmInstalled = () => {');
    expect(virtualMachinesPage).toContain('resetVmCreationState();');
    expect(virtualMachinesPage).toContain('React.useState<{ vmId: string; value: string } | null>(null)');
    expect(virtualMachinesPage).toContain('setInstallInstructions(null);');
    expect(virtualMachinesPage).toContain('setInstallInstructions({ vmId: result.virtualMachine.id, value: result.installInstructions });');
    expect(virtualMachinesPage).toContain('installInstructions?.vmId === selected.id ? installInstructions.value : null');
    expect(virtualMachinesPage).not.toContain('createdVmId');
    expect(virtualMachinesPage).not.toContain("navigate(AppPaths.workspaceVirtualMachineDetail(workspace.id, targetVmId, 'settings'))");
  });

  it('uses the cluster-style list actions for VM onboarding and agent setup', () => {
    expect(virtualMachinesListView).not.toContain('data-vm-register-card');
    expect(virtualMachinesListView).not.toContain('registerVmCard');
    expect(virtualMachinesListView).toContain("import { actionCardButtonClassName, cardClassName } from '@/components/common/Card'");
    expect(virtualMachinesListView).toContain('data-vm-add-card="true"');
    expect(virtualMachinesListView).toContain("actionCardButtonClassName({ className: 'h-[20rem] flex-col' })");
    expect(virtualMachinesListView).toContain('interactive: !requiresAgentInstall');
    expect(virtualMachinesListView).toContain('h-[20rem] min-w-0 flex-col overflow-hidden');
    expect(virtualMachinesListView).toContain('data-vm-overflow-action="toggle"');
    expect(virtualMachinesListView).toContain('data-vm-overflow-action="settings"');
    expect(virtualMachinesListView).toContain('data-vm-overflow-action="delete"');
    expect(virtualMachinesListView).toContain('aria-haspopup="menu"');
    expect(virtualMachinesListView).toContain("aria-label={t('virtualMachines.list.vmActionsFor', { name: vm.name })}");
    expect(virtualMachinesListView).toContain('type-panel-title min-w-0 flex-1 truncate');
    expect(virtualMachinesListView).toContain('px-1.5 py-px text-[0.625rem] leading-3');
    expect(virtualMachinesListView).toContain('<PendingVirtualMachineSetup');
    expect(pendingVirtualMachineSetup).toContain('actionDataAttribute="data-vm-setup-action"');
    expect(pendingVirtualMachineSetup).toContain('<PendingAgentSetup');
    expect(pendingAgentSetup).toContain('<ol className="relative mx-auto grid min-h-0 w-full max-w-[22rem] -translate-y-2 grid-cols-2 items-start gap-4 self-center px-2 py-3 before:absolute before:left-[calc(25%+0.875rem)] before:right-[calc(25%+0.875rem)] before:top-[1.625rem] before:h-px before:bg-gradient-to-r before:from-status-success/50 before:via-ui-border before:to-ui-border">');
    expect(pendingAgentSetup).toContain("import { Check, Clock, Wrench } from 'lucide-react'");
    expect(pendingAgentSetup).toContain('<Check className="h-3.5 w-3.5" />');
    expect(pendingAgentSetup).toContain('<Clock className="h-3.5 w-3.5" />');
    expect(pendingAgentSetup).toContain('pending-agent-step-pulse');
    expect(pendingAgentSetup).toContain('ring-[3px] ring-status-success-soft/55');
    expect(pendingAgentSetup).toContain('before:from-status-success/50 before:via-ui-border before:to-ui-border');
    expect(pendingAgentSetup).toContain('<div className="grid min-h-0 min-w-0 flex-1 grid-rows-[minmax(0,1fr)_4.25rem]">');
    expect(pendingAgentSetup).toContain('className="pointer-events-auto h-[4.25rem] border-t border-ui-border pt-5"');
    expect(pendingVirtualMachineSetup).toContain("t('virtualMachines.list.vmRegistered')");
    expect(pendingVirtualMachineSetup).toContain("t('virtualMachines.list.installAgentMessage')");
    expect(pendingAgentSetup).toContain('max-w-md text-sm font-semibold leading-5 text-ui-text-muted');
    expect(pendingAgentSetup).toContain('variant="primary"');
    expect(virtualMachinesListView).not.toContain('data-vm-card-action="delete"');
    expect(virtualMachinesListView).not.toContain('data-vm-row-action="install"');
    expect(virtualMachinesListView).not.toContain('data-vm-row-action="delete"');
    expect(virtualMachinesListView).not.toContain('const hasVisibleRowActions = requiresAgentInstall || canDeleteVm;');
    expect(virtualMachinesListView).not.toContain('border-t border-ui-border bg-ui-bg/45');
    expect(pendingVirtualMachineSetup).toContain("t('dashboard.installAgent')");
    expect(virtualMachinesListView).toContain("t('virtualMachines.list.connectVm')");
    expect(virtualMachinesListView).toContain('canManageTargets &&');
    expect(virtualMachinesListView).toContain('onOpenRegisterVm');
  });

  it('keeps VM telemetry cards aligned with the cluster card treatment', () => {
    expect(virtualMachineMetrics).toContain('className="grid h-full min-h-0 flex-1 grid-rows-[minmax(0,1fr)_4.25rem]"');
    expect(virtualMachineMetrics).toContain("const chartBodyClassName = 'grid min-h-0 grid-rows-[auto_minmax(0,1fr)] pb-3';");
    expect(virtualMachineMetrics).toContain('grid h-[4.25rem] grid-cols-3 divide-x divide-ui-border border-t border-ui-border pt-5');
    expect(virtualMachineMetrics).toContain('className="min-w-0 px-4 sm:px-5"');
    expect(virtualMachineMetrics).not.toContain('first:pl-0 last:pr-0');
    expect(virtualMachineMetrics).toContain("label: t('virtualMachines.list.logSources')");
    expect(virtualMachineMetrics).toContain("label: t('virtualMachines.list.processes')");
    expect(virtualMachineMetrics).toContain("label: t('dashboard.findings')");
    expect(virtualMachineMetrics).toContain("value: vm.summary ? vm.summary.processCount : '-'");
    expect(virtualMachineMetrics).toContain("value: vm.summary ? vm.summary.findingCount : '-'");
    expect(virtualMachineMetrics).not.toContain("label: t('virtualMachines.list.memory')");
    expect(virtualMachineMetrics).not.toContain("label: t('virtualMachines.list.cpu')");
    expect(virtualMachineMetrics).toContain('const usableMetricPointCount = safePoints.filter');
    expect(virtualMachineMetrics).toContain('if (usableMetricPointCount < 2)');
    expect(virtualMachineMetrics).toContain('const paddingX = 2;');
    expect(virtualMachineMetrics).toContain('const labelY = 102;');
    expect(virtualMachineMetrics).toContain('className="h-full min-h-0 w-full overflow-visible"');
    expect(virtualMachineMetrics).toContain('strokeWidth={2.5}');
    expect(virtualMachineMetrics).toContain('opacity="0.55"');
    expect(virtualMachineMetrics).not.toContain('h-[118px] border-y border-ui-border bg-ui-bg/60');
    expect(virtualMachineMetrics).not.toContain("t('virtualMachines.list.history')");
    expect(virtualMachineMetrics).not.toContain("t('virtualMachines.list.ram')");
  });

  it('uses the shared dialog shell for delete-VM confirmation', () => {
    expect(virtualMachinesListView).toContain("import { Dialog } from '@/components/common/Dialog'");
    expect(virtualMachinesListView).not.toContain("import { Tooltip } from '@/components/common/Tooltip'");
    expect(virtualMachinesListView).toContain('titleId="delete-vm-title"');
    expect(virtualMachinesListView).toContain('closeDisabled={isDeletingVm}');
    expect(virtualMachinesListView).toContain('id="delete-vm-confirmation-input"');
    expect(virtualMachinesListView).toContain('i18nKey="virtualMachines.list.deleteVmConfirmationLabel"');
    expect(virtualMachinesListView).toContain('font-extrabold text-status-danger-text');
  });

  it('uses the same lifecycle filter labels as the cluster page', () => {
    expect(virtualMachinesListView).toContain("t('dashboard.allStates')");
    expect(virtualMachinesListView).toContain("t('dashboard.connected')");
    expect(virtualMachinesListView).toContain("t('dashboard.disconnected')");
    expect(virtualMachinesListView).toContain("t('dashboard.notInstalled')");
    expect(virtualMachinesListView).toContain("t('virtualMachines.list.setupRequiredSummary'");
    expect(virtualMachinesListView).not.toContain("t('virtualMachines.list.awaitingTelemetry'");
    expect(virtualMachinesListView).not.toContain("value: 'degraded'");
    expect(virtualMachineUi).toContain("t('dashboard.healthy')");
    expect(virtualMachineUi).toContain("t('dashboard.setupRequired')");
    expect(virtualMachineUi).not.toContain("return 'Healthy'");
    expect(virtualMachineUi).not.toContain("t('virtualMachines.list.awaitingAgent')");
  });

  it('guards VM overview issue and finding loads against stale target switches', () => {
    expect(virtualMachinesPage).toContain('const issueRequest = controlPlaneApi.listTargetIssues(workspace.id, selected.id, { limit: 50 })');
    expect(virtualMachinesPage).toContain('const findingRequest = controlPlaneApi.listVirtualMachineFindings(workspace.id, selected.id)');
    expect(virtualMachinesPage).toContain('setIsLoadingIssueEvidence(true);');
    expect(virtualMachinesPage).toContain('Promise.allSettled([issueRequest, findingRequest])');
    expect(virtualMachinesPage).toContain('setIsLoadingIssueEvidence(false);');
    expect(virtualMachinesPage).toContain('if (!isCurrent) return;');
    expect(virtualMachinesPage).toContain('setFindings([]);');
    expect(virtualMachinesPage).toContain("console.error('Failed loading virtual machine findings', error);");
    expect(virtualMachinesPage).toContain('isLoading={isLoadingIssueEvidence}');
    expect(virtualMachineIssuesPanel).toContain("t('virtualMachines.overview.loadingIssuesTitle')");
    expect(virtualMachineIssuesPanel).toContain("t('virtualMachines.overview.loadingIssuesBody')");
    expect(virtualMachineIssuesPanel).toContain('<ICONS.RefreshCw className="h-5 w-5 animate-spin" />');
    expect(constants).toContain('RefreshCw');
  });

  it('labels durable VM issues separately from raw VM snapshot findings', () => {
    expect(virtualMachineIssuesPanel).toContain("t('clusterOverview.issue')");
    expect(virtualMachineIssuesPanel).toContain("t('clusterOverview.finding')");
    expect(virtualMachineIssuesPanel).toContain("t('virtualMachines.overview.snapshotFinding')");
  });

  it('keeps loaded durable VM issues as the primary source instead of falling back to raw findings', () => {
    expect(virtualMachineIssuesPanel).toContain('const useIssueCounts = hasIssueRows;');
    expect(virtualMachineIssuesPanel).toContain(') : hasIssueRows || findings.length === 0 ? (');
  });
});
