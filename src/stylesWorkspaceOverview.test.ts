import { describe, expect, it } from 'vitest';
import {
  appDialogs,
  clusterSettingsView,
  dashboardPage,
  desktopSidebar,
  mcpServersDialogs,
  mcpServersView,
  membersPage,
  mobileNavigation,
  overviewPage,
  workspaceSettingsPage,
  enLocale
} from './stylesTestSupport';

describe('workspace overview style contract', () => {
  it('keeps sidebar and destructive action polish aligned to the design system', () => {
    expect(desktopSidebar).not.toContain('absolute left-0 top-1/2 h-1/2 w-1');
    expect(desktopSidebar).not.toContain('text-white');
    expect(mobileNavigation).not.toContain('text-white');
    expect(appDialogs).not.toContain('text-white');
    expect(dashboardPage).not.toContain('text-white');
    expect(workspaceSettingsPage).not.toContain('text-white');
    expect(clusterSettingsView).not.toContain('text-white');
    expect(membersPage).not.toContain('group-hover:text-white');
    expect(mcpServersView).not.toContain('text-white');
    expect(mcpServersDialogs).not.toContain('text-white');
  });

  it('keeps the workspace overview focused on connected targets and urgent issues', () => {
    expect(overviewPage).toContain('data-overview-quick-actions="true"');
    expect(overviewPage).toContain('data-connected-targets="true"');
    expect(overviewPage).toContain('data-attention-board="true"');
    expect(overviewPage).toContain("t('overview.quickActionsTitle')");
    expect(overviewPage).toContain("t('overview.connectedClustersTitle')");
    expect(overviewPage).toContain("t('overview.connectedVirtualMachinesTitle')");
    expect(overviewPage).toContain("t('overview.needsAttentionTitle')");
    expect(overviewPage).toContain('ICONS.Layers');
    expect(overviewPage).toContain('ICONS.Server');
    expect(overviewPage).toContain('ICONS.AlertTriangle');
    expect(overviewPage).toContain("variant=\"secondary\"");
    expect(overviewPage.indexOf('data-attention-board="true"')).toBeLessThan(
      overviewPage.indexOf('data-connected-targets="true"')
    );
    expect(overviewPage).toContain("t('overview.runTriageIssue')");
    expect(overviewPage).toContain("t('overview.viewMoreIssue')");
    expect(overviewPage).toContain('onRunTriage({');
    expect(overviewPage).toContain("t('overview.connectedTargetCount'");
    expect(overviewPage).toContain('flex shrink-0 items-center gap-4 text-ui-text-muted');
    expect(overviewPage).toContain('w-full px-5 py-4 text-left');
    expect(overviewPage).toContain('data-target-group="true"');
    expect(overviewPage).toContain('divide-y divide-ui-border');
    expect(overviewPage).toContain('recentInvestigation && (');
    expect(overviewPage).not.toContain('bg-status-danger-soft/30');
    expect(overviewPage).not.toContain('bg-status-warning-soft/30');
    expect(overviewPage).not.toContain('overview.triageQueueTitle');
    expect(overviewPage).not.toContain('overview.inventoryTitle');
    expect(overviewPage).not.toContain('overview.targetEstate');
    expect(overviewPage).not.toContain('data-healthy-targets="true"');
    expect(overviewPage).not.toContain('{card.targetTypeLabel}');
    expect(overviewPage).not.toContain('data-primary-issue-card');
    expect(overviewPage).not.toContain('summaryStats');
    expect(enLocale).toContain("needsAttentionTitle: 'What needs attention now'");
  });
});
