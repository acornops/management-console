import { describe, expect, it } from 'vitest';

import {
  auditLogPage,
  chatSubmit,
  clusterOverviewView,
  compactControls,
  dataTable,
  dashboardPage,
  enLocale,
  fieldValidationMessage,
  loginAuthPanel,
  loginAuthPanelParts,
  loginPasswordAuthForm,
  markdownComponents,
  mcpServersInventory,
  membersPage,
  resourceCategoryTabs,
  resourceExplorerLayout,
  resourcesView,
  targetSkillsInventory,
  targetToolsView,
  virtualMachineIssuesPanel,
  virtualMachineResourcesView,
  virtualMachinesListView,
  webhookList,
  workflowActivityUi,
  workspaceApprovalsPage,
  workspaceActivityPage,
  workspaceIncomingWebhooksPage,
  workspaceSchedulesPage,
  workspaceInviteModal
} from './stylesTestSupport';

describe('surface behavior contracts', () => {
  it('labels paged member and issue counts as loaded counts', () => {
    expect(membersPage).toContain('members.loadedTotalCount');
    expect(membersPage).toContain('members.loadedMatchingCount');
    expect(enLocale).toContain("inviteLinksCount: '{{count}} loaded links'");
    expect(enLocale).toContain("active: 'Active'");
  });

  it('resets resource pages through the shared collection filter lifecycle', () => {
    expect(resourcesView).toContain('const resourceCollection = useCursorCollection({');
    expect(resourcesView).toContain('filters: resourceQuery');
    expect(resourcesView).toContain("strategy: 'sentinel'");
    expect(resourcesView).not.toContain('setResourceItems([]);');
    expect(resourcesView).not.toContain('window.setTimeout');
  });

  it('does not require the full MCP tool list before requesting write-capable chat runs', () => {
    expect(chatSubmit).toContain("canRequestWriteRuns ? 'read_write' : 'read_only'");
    expect(chatSubmit).not.toContain('app.mcpTools || []');
  });

  it('keeps table rows visibly highlighted on hover', () => {
    expect(membersPage).toContain('transition-colors hover:bg-accent-soft/45');
    expect(clusterOverviewView).toContain('transition-colors last:border-b-0 hover:bg-ui-bg/70');
    expect(markdownComponents).toContain("import remarkGfm from 'remark-gfm';");
    expect(markdownComponents).toContain('export const markdownRemarkPlugins = [remarkGfm];');
    expect(markdownComponents).toContain("const tableRowHoverClass = isUserTone ? 'hover:bg-ui-bg/10' : 'hover:bg-ui-bg/70'");
    expect(markdownComponents).toContain('<tr className={`transition-colors ${tableRowHoverClass}`}>{children}</tr>');
  });

  it('keeps cluster inventory summary cards limited to labels and values', () => {
    expect(clusterOverviewView).not.toContain("t('clusterOverview.nodesReadyDetail'");
    expect(clusterOverviewView).not.toContain("t('clusterOverview.podStateDetail'");
    expect(clusterOverviewView).not.toContain("t('clusterOverview.inventoryObservedDetail'");
    expect(clusterOverviewView).not.toContain('type-caption mt-3 truncate text-ui-text-muted');
  });

  it('keeps the populated workflow ledger compact and leaves field labels to compact layouts', () => {
    expect(workspaceActivityPage).toContain('<PageShell');
    expect(workspaceActivityPage).not.toContain('<PageShell width=');
    expect(workspaceActivityPage).toContain('bg-ui-surface shadow-sm');
    expect(workspaceActivityPage).not.toContain('min-h-[24rem]');
    expect(workflowActivityUi).toContain('sm:grid-cols-2 sm:gap-x-6');
    expect(workflowActivityUi).toContain('sm:col-span-2 xl:col-span-1');
    expect(workspaceActivityPage).toContain('workflowExecutionLedgerGridClass');
    expect(workspaceActivityPage).toContain('density="dense"');
    expect(workspaceActivityPage).toContain('className="mb-4 shrink-0"');
    expect(workflowActivityUi).not.toContain('xl:px-8 xl:py-6');
    expect(workflowActivityUi.match(/xl:grid-cols-\[minmax\(18rem,1fr\)/g)).toHaveLength(1);
    expect(workflowActivityUi.match(/text-ui-text-muted xl:hidden/g)).toHaveLength(3);
    expect(workflowActivityUi.match(/xl:mt-0/g)).toHaveLength(3);
  });

  it('keeps workflow empty states compact and aligned with their section icons', () => {
    expect(workspaceSchedulesPage).toContain('icon={<ICONS.CalendarClock />}');
    expect(workspaceSchedulesPage).toContain("visibleSchedules.length === 0 && schedulePhase !== 'loading'");
    expect(workspaceActivityPage).toContain('icon={<ICONS.Activity />}');
    expect(workspaceActivityPage).not.toContain('icon={<Filter />}');
  });

  it('offers the permission-gated connect action in both infrastructure inventory empty states', () => {
    expect(dashboardPage.match(/t\('dashboard\.addCluster'\)/g)).toHaveLength(2);
    expect(virtualMachinesListView.match(/t\('virtualMachines\.list\.connectVm'\)/g)).toHaveLength(2);
    expect(virtualMachinesListView).toContain('!isLoading && !hasLoadError && !hasActiveFilter && canManageTargets');
  });

  it('keeps collection tables on the shared header anatomy', () => {
    expect(dataTable).toContain('export const DataTableHeader');
    expect(dataTable).toContain('export const DataTableGridHeader');
    [
      mcpServersInventory,
      targetSkillsInventory,
      targetToolsView,
      workspaceSchedulesPage,
      workspaceApprovalsPage,
      auditLogPage,
      membersPage,
      clusterOverviewView,
      virtualMachineIssuesPanel,
      virtualMachineResourcesView
    ].forEach((surface) => expect(surface).toContain('<DataTableHeader'));
    [
      workspaceActivityPage,
      workspaceIncomingWebhooksPage,
      webhookList,
      resourceExplorerLayout,
      virtualMachineResourcesView
    ].forEach((surface) => expect(surface).toContain('<DataTableGridHeader'));
    [
      mcpServersInventory,
      targetSkillsInventory,
      targetToolsView,
      workspaceSchedulesPage,
      auditLogPage,
      membersPage,
      workspaceActivityPage,
      workspaceIncomingWebhooksPage,
      webhookList
    ].forEach((surface) => expect(surface).toContain('collectionState={{'));
    expect(workspaceSchedulesPage).toContain('density="dense"');
    expect(workspaceApprovalsPage).toContain('density="dense"');
    expect(clusterOverviewView).toContain('density="compact"');
    expect(virtualMachineIssuesPanel).toContain('density="compact"');
    expect(virtualMachineResourcesView).not.toContain('<th');
  });

  it('reveals the active resource category when compact tab strips overflow', () => {
    expect(resourceCategoryTabs).toContain('<SegmentedTabs');
    expect(compactControls).toContain('activeTab?.scrollIntoView');
    expect(compactControls).toContain("inline: 'nearest'");
    expect(compactControls).toContain('ref={tablistRef}');
  });

  it('keeps workspace members and audit log tables inside the viewport', () => {
    expect(membersPage).not.toContain('overflow-x-auto');
    expect(membersPage).not.toContain('min-w-[760px]');
    expect(membersPage).toContain('xl:table-cell');
    expect(auditLogPage).not.toContain('overflow-x-auto');
    expect(auditLogPage).not.toContain('min-w-[920px]');
    expect(auditLogPage).toContain('xl:table-cell');
    expect(auditLogPage).toContain('xl:hidden');
    expect(workspaceSchedulesPage).toContain('className="xl:hidden"');
    expect(workspaceSchedulesPage).toContain('className="hidden overflow-x-auto xl:block"');
  });

  it('keeps workspace member actions in the table rhythm on wide screens', () => {
    expect(membersPage).not.toContain('minmax(1rem,1fr)_5.5rem');
    expect(membersPage).not.toContain('<th className="hidden px-4 py-4 md:block" aria-hidden="true" />');
    expect(membersPage).not.toContain('<td className="hidden md:block" aria-hidden="true" />');
    expect(membersPage).toContain('table-fixed');
    expect(membersPage).toContain('xl:table-cell');
    expect(membersPage).toContain('mt-2 flex items-center gap-2 xl:hidden');
    expect(membersPage).not.toContain('lg:grid-cols-[minmax(18rem,24rem)_9rem_8rem_9rem_4rem]');
    expect(membersPage).toContain('<span className="sr-only">{t(\'members.manage\')}</span>');
  });

  it('keeps workspace member and audit log pages on the shared route margins', () => {
    expect(membersPage).toContain('<PageShell embedded={embedded}>');
    expect(auditLogPage).toContain('<PageShell>');
    expect(auditLogPage).not.toContain('mx-auto max-w-7xl px-5 py-8 lg:px-8');
    expect(auditLogPage).not.toContain('overflow-hidden border-y border-ui-border bg-ui-surface');
  });

  it('uses app-styled validation instead of native browser validation bubbles', () => {
    const validationSurfaces = [
      workspaceInviteModal,
      loginAuthPanel,
      loginPasswordAuthForm,
      loginAuthPanelParts
    ].join('\n');
    expect(validationSurfaces).toContain('noValidate');
    expect(validationSurfaces).toContain('aria-invalid={Boolean(');
    expect(validationSurfaces).toContain('FieldValidationMessage');
    expect(validationSurfaces).not.toMatch(/\srequired(?:\s|>|$)/);
    expect(fieldValidationMessage).toContain('role="alert"');
    expect(fieldValidationMessage).toContain('border-status-danger/25 bg-status-danger-soft');
  });

  it('keeps audit log time presets available for log-style filtering', () => {
    expect(auditLogPage).toContain("const timePresetOptions: AuditTimePreset[] = ['today', 'last24h', 'past7d', 'past30d'];");
    expect(auditLogPage).toContain('<FilterToggleGroup');
    expect(auditLogPage).toContain('activeValue={activeTimePreset');
    expect(auditLogPage).toContain('<DateTimePicker');
    expect(auditLogPage).not.toContain('type="datetime-local"');
    expect(auditLogPage).toContain('applyNormalizedFilters(nextFilters);');
  });

  it('auto-applies audit log filter selections without relying on an apply button', () => {
    expect(auditLogPage).toContain('data-audit-filter-toolbar="true"');
    expect(auditLogPage).toContain('aria-controls="audit-custom-range-controls"');
    expect(auditLogPage).toContain('const timer = window.setTimeout(() => {');
    expect(auditLogPage).toContain('applyNormalizedFilters(draftFilters);');
    expect(auditLogPage).not.toContain("t('auditLog.applyFilters')");
  });
});
