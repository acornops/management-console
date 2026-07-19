import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../../..');
const addVirtualMachineModal = readFileSync(resolve(root, 'src/pages/virtual-machines/AddVirtualMachineModal.tsx'), 'utf8');
const pendingAgentSetup = readFileSync(resolve(root, 'src/components/common/PendingAgentSetup.tsx'), 'utf8');
const virtualMachinesPage = readFileSync(resolve(root, 'src/pages/VirtualMachinesPage.tsx'), 'utf8');
const virtualMachineAgentSetup = readFileSync(resolve(root, 'src/pages/virtual-machines/useVirtualMachineAgentSetup.ts'), 'utf8');
const virtualMachinesListView = readFileSync(resolve(root, 'src/pages/virtual-machines/VirtualMachinesListView.tsx'), 'utf8');
const virtualMachineSettingsView = readFileSync(resolve(root, 'src/pages/virtual-machines/VirtualMachineSettingsView.tsx'), 'utf8');
const virtualMachineListRefresh = readFileSync(resolve(root, 'src/pages/virtual-machines/useVirtualMachineListRefresh.ts'), 'utf8');
const virtualMachineIssueSummaries = readFileSync(resolve(root, 'src/pages/virtual-machines/useVirtualMachineIssueSummaries.ts'), 'utf8');
const pendingVirtualMachineSetup = readFileSync(resolve(root, 'src/pages/virtual-machines/PendingVirtualMachineSetup.tsx'), 'utf8');
const virtualMachineMetrics = readFileSync(resolve(root, 'src/pages/virtual-machines/VirtualMachineMetrics.tsx'), 'utf8');
const virtualMachineIssuesPanel = readFileSync(resolve(root, 'src/pages/virtual-machines/VirtualMachineIssuesPanel.tsx'), 'utf8');
const virtualMachineUi = readFileSync(resolve(root, 'src/pages/virtual-machines/virtualMachineUi.ts'), 'utf8');
const constants = readFileSync(resolve(root, 'src/constants.tsx'), 'utf8');
const emptyState = readFileSync(resolve(root, 'src/components/common/EmptyState.tsx'), 'utf8');
const targetCatalogPrimitives = readFileSync(resolve(root, 'src/features/targets/catalog/TargetCatalogPrimitives.tsx'), 'utf8');
const telemetryTrendSummary = readFileSync(resolve(root, 'src/features/targets/catalog/TelemetryTrendSummary.tsx'), 'utf8');
const targetIssueSummaries = readFileSync(resolve(root, 'src/features/targets/catalog/useTargetIssueSummaries.ts'), 'utf8');

describe('virtual machine onboarding dialog', () => {
  it('uses the shared dialog shell for VM connection', () => {
    expect(addVirtualMachineModal).toContain("import { Dialog } from '@/components/common/Dialog'");
    expect(addVirtualMachineModal).toContain("import { CloseButton, TextInput } from '@/components/common/ComponentVocabulary'");
    expect(addVirtualMachineModal).toContain("import { ModalStepIndicator } from '@/components/common/ModalStepIndicator'");
    expect(addVirtualMachineModal).toContain('titleId="add-vm-title"');
    expect(addVirtualMachineModal).toContain('initialFocusRef={vmNameInputRef}');
    expect(addVirtualMachineModal).toContain('htmlFor="add-vm-name-input"');
    expect(addVirtualMachineModal).toContain('id="add-vm-name-input"');
    expect(addVirtualMachineModal).toContain("aria-label={t('virtualMachines.list.closeAddDialog')}");
    expect(addVirtualMachineModal).toContain('w-full max-w-3xl flex-col overflow-hidden');
    expect(addVirtualMachineModal).toContain('rounded-xl border border-ui-border bg-ui-surface');
    expect(addVirtualMachineModal).toContain('border-b border-ui-border bg-ui-bg px-6 py-4');
    expect(addVirtualMachineModal).toContain('<ModalStepIndicator steps={connectSteps} currentStepId={creationStep} className="mt-4" />');
    expect(addVirtualMachineModal).toContain('flex-1 space-y-4 overflow-y-auto');
    expect(addVirtualMachineModal).not.toContain('lg:grid-cols-[minmax(0,1fr)_19rem]');
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
    expect(addVirtualMachineModal).toContain('max-h-[min(92vh,50rem)]');
    expect(addVirtualMachineModal).toContain('min-h-0 flex-1 space-y-4 overflow-y-auto');
    expect(addVirtualMachineModal).toContain('max-h-[18rem] overflow-auto');
    expect(addVirtualMachineModal).toContain('justify-end gap-3 border-t');
    expect(addVirtualMachineModal).toContain("t('virtualMachines.list.continueToInstallAgent')");
    expect(addVirtualMachineModal).not.toContain('onBackToDetails');
    expect(addVirtualMachineModal).not.toContain("t('virtualMachines.list.back')");
    expect(virtualMachineAgentSetup).toContain('const confirmVmInstalled = async () => {');
    expect(virtualMachineAgentSetup).toContain('await controlPlaneApi.getVirtualMachine(workspaceId, installInstructions.vmId)');
    expect(virtualMachineAgentSetup).toContain("if (refreshed.status === 'unknown')");
    expect(virtualMachineAgentSetup).toContain('resetVmCreationState();');
    expect(virtualMachineAgentSetup).toContain('React.useState<{ vmId: string; value: string } | null>(null)');
    expect(virtualMachineAgentSetup).toContain('setInstallInstructions(null);');
    expect(virtualMachineAgentSetup).toContain('setInstallInstructions({ vmId: result.virtualMachine.id, value: result.installInstructions });');
    expect(virtualMachinesPage).toContain('installInstructions?.vmId === selected.id ? installInstructions.value : null');
    expect(virtualMachineAgentSetup).not.toContain('createdVmId');
    expect(virtualMachinesPage).not.toContain("navigate(AppPaths.workspaceVirtualMachineDetail(workspace.id, targetVmId, 'settings'))");
  });

  it('gates VM agent-key controls with the dedicated permission', () => {
    expect(virtualMachinesPage).toContain('canManageAgentKeys: boolean;');
    expect(virtualMachineAgentSetup).toContain('if (!virtualMachine || !canManageAgentKeys || isRotatingAgentKey) return;');
    expect(virtualMachinesPage).toContain('onRotateKey={canManageAgentKeys ? () => rotateKey(selected) : undefined}');
    expect(virtualMachinesListView).toContain('onInstallAgent={canManageAgentKeys ?');
    expect(virtualMachineSettingsView).toContain('disabled={!onRotateKey || isRotatingKey}');
  });

  it('uses card list actions for VM onboarding and agent setup', () => {
    expect(virtualMachinesListView).not.toContain('data-vm-register-card');
    expect(virtualMachinesListView).not.toContain('registerVmCard');
    expect(virtualMachinesListView).not.toContain('data-vm-add-card="true"');
    expect(virtualMachinesListView).not.toContain('h-[20rem]');
    expect(virtualMachinesListView).toContain('md:grid-cols-2 xl:grid-cols-3');
    expect(virtualMachinesListView).toContain('<DiscoveryFilterBar');
    expect(virtualMachinesListView).toContain('createDiscoveryFilterGroup<VmConnectionFilter>');
    expect(virtualMachinesListView).not.toContain('<ResourceCategoryTabs<VmConnectionFilter>');
    expect(virtualMachinesListView).not.toContain('fleetStatus');
    expect(virtualMachinesListView).not.toContain('data-vm-inventory-summary');
    expect(virtualMachinesListView).toContain('data-vm-catalog-controls="true"');
    expect(virtualMachinesListView).toContain('(items.length > 0 || hasActiveFilter) && (');
    expect(virtualMachinesListView).toContain('onClearAll={onClearFilters}');
    expect(virtualMachinesListView).toContain('id="vm-catalog-panel" aria-labelledby="vm-catalog-heading"');
    expect(virtualMachinesListView).not.toContain('role="tabpanel"');
    expect(virtualMachinesListView).toContain('grid min-w-0 shrink-0 content-start gap-4');
    expect(virtualMachinesListView).toContain('<EmptyState');
    expect(emptyState).toContain('type-panel-title text-ui-text');
    expect(emptyState).toContain('type-body mx-auto mt-1.5');
    expect(virtualMachinesListView).toContain('data-vm-card-grid="true" className="grid min-w-0 items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3"');
    expect(targetCatalogPrimitives).toContain("'data-vm-overflow-action': 'toggle'");
    expect(virtualMachinesListView).toContain('data-vm-overflow-action="settings"');
    expect(virtualMachinesListView).toContain('data-vm-overflow-action="delete"');
    expect(targetCatalogPrimitives).toContain('aria-haspopup="menu"');
    expect(virtualMachinesListView).toContain("label={t('virtualMachines.list.vmActionsFor', { name: vm.name })}");
    expect(virtualMachinesListView).toContain('type-panel-title truncate text-ui-text');
    expect(virtualMachinesListView).not.toContain('{vm.hostname &&');
    expect(virtualMachinesListView).toContain('flex min-h-[4.5rem] min-w-0 items-start gap-3 px-4 py-4');
    expect(targetCatalogPrimitives).toContain('rounded-full border px-2 py-0.5');
    expect(virtualMachinesListView).toContain('<PendingVirtualMachineSetup');
    expect(pendingVirtualMachineSetup).toContain('data-vm-setup-action="install"');
    expect(pendingVirtualMachineSetup).not.toContain('<PendingAgentSetup');
    expect(pendingVirtualMachineSetup).toContain('grid min-w-0 grid-cols-2 gap-4 border-t border-ui-border/60 py-3');
    expect(pendingVirtualMachineSetup).toContain('relative h-[104px] overflow-hidden');
    expect(pendingAgentSetup).toContain('<ol className="relative mx-auto grid min-h-0 w-full max-w-[22rem] -translate-y-2 grid-cols-2 items-start gap-4 self-center px-2 py-3 before:absolute before:left-[calc(25%+0.875rem)] before:right-[calc(25%+0.875rem)] before:top-[1.625rem] before:h-px before:bg-gradient-to-r before:from-status-success/50 before:via-ui-border before:to-ui-border">');
    expect(pendingAgentSetup).toContain("import { Check, Clock, Wrench } from 'lucide-react'");
    expect(pendingAgentSetup).toContain('<Check className="h-3.5 w-3.5" />');
    expect(pendingAgentSetup).toContain('<Clock className="h-3.5 w-3.5" />');
    expect(pendingAgentSetup).toContain('pending-agent-step-pulse');
    expect(pendingAgentSetup).toContain('ring-[3px] ring-status-success-soft/55');
    expect(pendingAgentSetup).toContain('before:from-status-success/50 before:via-ui-border before:to-ui-border');
    expect(pendingAgentSetup).toContain("showFooter = true");
    expect(pendingAgentSetup).toContain("grid-rows-[minmax(0,1fr)_minmax(4.25rem,auto)]");
    expect(pendingAgentSetup).toContain("footerVariant = 'default'");
    expect(pendingAgentSetup).toContain("compactFooter ? 'flex items-center justify-center py-4' : 'py-5'");
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

  it('keeps VM telemetry cards aligned with the shared card treatment', () => {
    expect(virtualMachineMetrics).toContain('className="shrink-0 px-4 pb-3"');
    expect(virtualMachineMetrics).toContain('grid min-w-0 grid-cols-2 gap-4 border-t border-ui-border/60 py-3');
    expect(virtualMachineMetrics).toContain('relative h-[104px] min-w-0 overflow-hidden');
    expect(virtualMachineMetrics).toContain('grid-cols-[auto_minmax(0,1fr)_auto]');
    expect(virtualMachineMetrics).toContain('mx-4 grid grid-cols-3 gap-3 border-t border-ui-border/60 pb-4 pt-3');
    expect(virtualMachineMetrics).not.toContain('divide-x');
    expect(virtualMachinesListView).toContain('<VmOperationalDetails vm={vm} issueCount={vmIssueSummary?.total} />');
    expect(virtualMachineMetrics).toContain("label: t('virtualMachines.list.logSources')");
    expect(virtualMachineMetrics).toContain("label: t('virtualMachines.list.processes')");
    expect(virtualMachineMetrics).toContain("label: t('virtualMachines.list.issues')");
    expect(virtualMachineMetrics).toContain("value: vm.summary ? vm.summary.processCount : '-'");
    expect(virtualMachineMetrics).toContain("value: issueCount ?? '-'");
    expect(virtualMachineMetrics).not.toContain('vm.summary.findingCount');
    expect(virtualMachineMetrics).toContain("label: t('virtualMachines.list.memory')");
    expect(virtualMachineMetrics).not.toContain("label: t('virtualMachines.list.cpu')");
    expect(virtualMachineMetrics).toContain('const loadPointCount = safePoints.filter');
    expect(virtualMachineMetrics).toContain('const memoryPointCount = safePoints.filter');
    expect(virtualMachineMetrics).toContain('const usableMetricPointCount = Math.max(loadPointCount, memoryPointCount);');
    expect(virtualMachineMetrics).toContain('const hasTrend = usableMetricPointCount >= 2;');
    expect(virtualMachineMetrics).toContain('grid min-w-0 grid-cols-2 gap-4');
    expect(virtualMachineMetrics).toContain("aria-label={t('virtualMachines.list.telemetryFor', { name: vm.name })}");
    expect(virtualMachineMetrics).toContain('point.loadAverage1m');
    expect(virtualMachineMetrics).toContain('point.memoryUsedPercent');
    expect(virtualMachineMetrics).toContain("t('virtualMachines.list.load1m')");
    expect(virtualMachineMetrics).toContain("'virtualMachines.list.waitingForAnotherVmSample'");
    expect(virtualMachineMetrics).toContain('const paddingX = 0;');
    expect(virtualMachineMetrics).toContain('preserveAspectRatio="none"');
    expect(virtualMachineMetrics).toContain('className="h-full w-full"');
    expect(virtualMachineMetrics).toContain('<TelemetryTrendSummary');
    expect(virtualMachineMetrics).toContain('aria-hidden="true"');
    expect(virtualMachineMetrics).not.toContain('role="img"');
    expect(telemetryTrendSummary).toContain('<table className="sr-only">');
    expect(virtualMachineMetrics).toContain('strokeWidth={2.4}');
    expect(virtualMachineMetrics).toContain('className="stroke-ui-border/55"');
    expect(virtualMachineMetrics).not.toContain('h-[118px] border-y border-ui-border bg-ui-bg/60');
    expect(virtualMachineMetrics).not.toContain("t('virtualMachines.list.history')");
    expect(virtualMachineMetrics).not.toContain("t('virtualMachines.list.ram')");
  });

  it('uses the shared dialog shell for delete-VM confirmation', () => {
    expect(virtualMachinesListView).toContain("import { Dialog } from '@/components/common/Dialog'");
    expect(virtualMachinesListView).toContain("import { Button } from '@/components/common/Button'");
    expect(virtualMachinesListView).toContain("import { CloseButton, TextInput } from '@/components/common/ComponentVocabulary'");
    expect(virtualMachinesListView).not.toContain("import { Tooltip } from '@/components/common/Tooltip'");
    expect(virtualMachinesListView).toContain('titleId="delete-vm-title"');
    expect(virtualMachinesListView).toContain('closeDisabled={isDeletingVm}');
    expect(virtualMachinesListView).toContain('id="delete-vm-confirmation-input"');
    expect(virtualMachinesListView).toContain('i18nKey="virtualMachines.list.deleteVmConfirmationLabel"');
    expect(virtualMachinesListView).toContain('font-extrabold text-status-danger-text');
    expect(virtualMachinesListView).toContain('<CloseButton\n                type="button"');
    expect(virtualMachinesListView).toContain('<TextInput\n                  id="delete-vm-confirmation-input"');
    expect(virtualMachinesListView).toContain('<Button\n                type="button"\n                variant="secondary"\n                size="sm"');
    expect(virtualMachinesListView).toContain('<Button\n                type="button"\n                variant="danger"\n                size="sm"');
    expect(virtualMachinesListView).not.toContain('rounded-lg p-1.5 text-ui-text-muted transition-colors hover:bg-ui-surface');
    expect(virtualMachinesListView).not.toContain('rounded-lg border border-ui-border bg-ui-surface px-4 py-2 type-row-title');
    expect(virtualMachinesListView).not.toContain('rounded-lg bg-status-danger px-4 py-2 type-row-title');
  });

  it('exposes permission-gated VM deletion from target settings', () => {
    expect(virtualMachinesPage).toContain('onDeleteVirtualMachine={canManageTargets ? () => deleteVirtualMachine(selected) : undefined}');
    expect(virtualMachineSettingsView).toContain('<TargetDeleteZone');
    expect(virtualMachineSettingsView).toContain('confirmationI18nKey="virtualMachines.list.deleteVmConfirmationLabel"');
    expect(virtualMachineSettingsView).toContain('onDelete={onDeleteVirtualMachine}');
  });

  it('uses the shared lifecycle filter labels', () => {
    expect(virtualMachinesListView).toContain("t('virtualMachines.list.allVms')");
    expect(virtualMachinesListView).toContain("t('dashboard.needsAttention')");
    expect(virtualMachinesListView).toContain("t('dashboard.healthy')");
    expect(virtualMachinesListView).toContain("t('dashboard.notInstalled')");
    expect(virtualMachinesListView).toContain("['all', 'attention', 'healthy', 'not_installed']");
    expect(virtualMachinesListView).not.toContain("t('virtualMachines.list.awaitingTelemetry'");
    expect(virtualMachinesListView).not.toContain("value: 'degraded'");
    expect(virtualMachineUi).toContain("t('dashboard.healthy')");
    expect(virtualMachineUi).toContain("t('dashboard.setupRequired')");
    expect(virtualMachineUi).not.toContain("return 'Healthy'");
    expect(virtualMachineUi).not.toContain("t('virtualMachines.list.awaitingAgent')");
  });

  it('loads the complete VM catalog and metric histories for every card that can show telemetry', () => {
    expect(virtualMachineListRefresh).toContain('const collection = useCursorCollection({');
    expect(virtualMachineListRefresh).toContain('pageSize: 50');
    expect(virtualMachineListRefresh).toContain("strategy: 'drain'");
    expect(virtualMachineListRefresh).toContain('{ limit, cursor, signal }');
    expect(virtualMachinesPage).toContain("virtualMachines.filter((vm) => vm.status !== 'unknown')");
    expect(virtualMachinesPage).not.toContain('.slice(0, 6)');
    expect(virtualMachineListRefresh).toContain('VIRTUAL_MACHINE_CATALOG_REFRESH_MS = 30000');
    expect(virtualMachineListRefresh).toContain("document.visibilityState === 'hidden'");
    expect(virtualMachineListRefresh).toContain("window.addEventListener('focus', refreshWhenVisible)");
    expect(virtualMachinesPage).toContain('metricLoadStateByVmId={metricLoadStateByVmId}');
    expect(virtualMachineIssueSummaries).toContain('useTargetIssueSummaries(virtualMachines)');
    expect(targetIssueSummaries).toContain('controlPlaneApi.getTargetIssueSummary(target.workspaceId, target.id)');
    expect(targetIssueSummaries).toContain('TARGET_ISSUE_SUMMARY_CONCURRENCY = 4');
    expect(targetIssueSummaries).toContain('TARGET_ISSUE_SUMMARY_REFRESH_MS = 60_000');
    expect(virtualMachinesPage).toContain('issueSummaryByVmId={issueSummaryByVmId}');
    expect(virtualMachinesListView).toContain('vmNeedsAttention(vm, issueSummaryByVmId[vm.id])');
    expect(virtualMachinesListView).not.toContain('vm.summary?.findingCount');
    expect(virtualMachineMetrics).toContain("t('virtualMachines.list.loadingTelemetry')");
    expect(virtualMachineMetrics).toContain("t('virtualMachines.list.telemetryLoadFailed')");
  });

  it('guards VM overview issue loads against stale target switches', () => {
    expect(virtualMachinesPage).toContain('controlPlaneApi.listTargetIssues(workspace.id, selected.id, { limit: 50 })');
    expect(virtualMachinesPage).not.toContain('listVirtualMachineFindings');
    expect(virtualMachinesPage).toContain('setIsLoadingIssueEvidence(true);');
    expect(virtualMachinesPage).toContain('setIsLoadingIssueEvidence(false);');
    expect(virtualMachinesPage).toContain('if (!selected) {\n      setIssues(null);');
    expect(virtualMachinesPage).toContain('if (!isCurrent) return;');
    expect(virtualMachinesPage).toContain('setIssueLoadFailed(true);');
    expect(virtualMachinesPage).not.toContain("console.error('Failed loading virtual machine findings', error);");
    expect(virtualMachinesPage).toContain('isLoading={isLoadingIssueEvidence}');
    expect(virtualMachinesPage).toContain('issueLoadFailed={issueLoadFailed}');
    expect(virtualMachineIssuesPanel).toContain("t('virtualMachines.overview.loadingIssuesTitle')");
    expect(virtualMachineIssuesPanel).toContain("t('virtualMachines.overview.loadingIssuesBody')");
    expect(virtualMachineIssuesPanel).toContain("t('virtualMachines.overview.issueLoadFailedTitle')");
    expect(virtualMachineIssuesPanel).toContain("t('virtualMachines.overview.issueLoadFailedBody')");
    expect(virtualMachineIssuesPanel).toContain('<ICONS.RefreshCw className="h-5 w-5 animate-spin" />');
    expect(constants).toContain('RefreshCw');
  });

  it('renders durable VM issues without raw snapshot finding fallback rows', () => {
    expect(virtualMachineIssuesPanel).toContain("t('virtualMachines.overview.issue')");
    expect(virtualMachineIssuesPanel).toContain("t('virtualMachines.overview.runTriage')");
    expect(virtualMachineIssuesPanel).not.toContain("t('clusterOverview.");
    expect(virtualMachineIssuesPanel).not.toContain("t('virtualMachines.overview.snapshotFinding')");
  });

  it('keeps durable VM issue summaries and rows as the only overview issue sources', () => {
    expect(virtualMachineIssuesPanel).toContain('const issueCount = issueSummary?.total ?? (hasIssueRows ? reportedIssues.length : 0);');
    expect(virtualMachineIssuesPanel).toContain('? issueSummary.critical');
    expect(virtualMachineIssuesPanel).toContain('? issueSummary.warning');
    expect(virtualMachineIssuesPanel).not.toContain('findings.length');
  });
});
