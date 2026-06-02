import { describe, expect, it } from 'vitest';
import {
  appDialogs,
  chatView,
  clusterSettingsView,
  dashboardPage,
  desktopSidebar,
  enLocale,
  mcpServersDialogs,
  mcpServersView,
  membersPage,
  mobileNavigation,
  overviewPage,
  workspaceSettingsPage
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
    expect(chatView).not.toContain('text-white');
  });

  it('keeps the workspace overview focused on the triage queue before inventory', () => {
    expect(overviewPage).toContain('buildInvestigationQueue(kubernetesClusters)');
    expect(overviewPage).toContain('overview.triageQueueTitle');
    expect(overviewPage).toContain('overview.triageQueueBody');
    expect(overviewPage).toContain('overview.priorityQueue');
    expect(overviewPage).toContain('overview.nextActionTitle');
    expect(overviewPage).toContain('overview.openNextAction');
    expect(overviewPage).toContain('overview.operatingSignals');
    expect(overviewPage).toContain('overview.reviewFindings');
    expect(overviewPage).toContain('overview.inventoryTitle');
    expect(overviewPage).toContain('overview.targetEstate');
    expect(overviewPage).toContain('overview.virtualMachineEstate');
    expect(overviewPage).toContain('data-primary-triage-action="true"');
    expect(overviewPage.indexOf('overview.triageQueueTitle')).toBeLessThan(
      overviewPage.lastIndexOf('overview.targetEstate')
    );
    expect(overviewPage.indexOf('overview.priorityQueue')).toBeLessThan(
      overviewPage.indexOf('overview.inventoryTitle')
    );
    expect(enLocale).toContain("triageQueueTitle: 'Triage queue'");
    expect(enLocale).toContain("operatingSignals: 'Signals'");
    expect(enLocale).not.toContain("incidentCommandTitle: 'Incident command'");
    expect(enLocale).not.toContain("commandSignals: 'Command signals'");
    expect(overviewPage).not.toContain('overview.operationsTitle');
    expect(overviewPage).not.toContain('overview.openClusterEstate');
    expect(overviewPage).not.toContain('overview.riskSummary');
    expect(overviewPage).not.toContain('variants={containerVariants}');
  });
});
