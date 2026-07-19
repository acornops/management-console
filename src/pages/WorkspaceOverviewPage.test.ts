import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const workspaceOverviewPage = readFileSync(resolve(__dirname, 'WorkspaceOverviewPage.tsx'), 'utf8');
const en = readFileSync(resolve(__dirname, '../i18n/locales/en.js'), 'utf8');
const zh = readFileSync(resolve(__dirname, '../i18n/locales/zh.js'), 'utf8');

describe('WorkspaceOverviewPage homepage board', () => {
  it('loads durable workspace issues into one mixed target board', () => {
    expect(workspaceOverviewPage).toContain('const issueCollection = useCursorCollection({');
    expect(workspaceOverviewPage).toContain('const virtualMachineCollection = useCursorCollection({');
    expect(workspaceOverviewPage.match(/strategy: 'manual'/g)).toHaveLength(2);
    expect(workspaceOverviewPage).toContain('pageSize: 24');
    expect(workspaceOverviewPage).toContain('pageSize: 50');
    expect(workspaceOverviewPage).not.toContain("strategy: 'drain'");
    expect(workspaceOverviewPage).toContain('buildWorkspaceOverviewCards');
    expect(workspaceOverviewPage).toContain('listWorkspaceIssues');
    expect(workspaceOverviewPage).toContain('isLoadingIssues');
    expect(workspaceOverviewPage).not.toContain('loadAllWorkspaceInvestigations');
    expect(workspaceOverviewPage).not.toContain('loadAllVirtualMachineFindings');
  });

  it('keeps resume, connected-target, and issue queue copy localized in English and Chinese', () => {
    for (const locale of [en, zh]) {
      expect(locale).toContain('quickActionsTitle');
      expect(locale).toContain('quickActionsResumeBody');
      expect(locale).toContain('resumeRecentInvestigation');
      expect(locale).toContain('connectedClustersTitle');
      expect(locale).toContain('connectedVirtualMachinesTitle');
      expect(locale).toContain('connectedTargetCount');
      expect(locale).toContain('needsAttentionTitle');
      expect(locale).toContain('needsAttentionBody');
      expect(locale).toContain('lastSeenLabel');
      expect(locale).toContain('firstSeenLabel');
      expect(locale).toContain('runTriageIssue');
      expect(locale).toContain('viewMoreIssue');
      expect(locale).toContain('criticalIssuesShown');
      expect(locale).toContain('warningIssuesShown');
      expect(locale).toContain('virtualMachinesUnavailable');
      expect(locale).not.toContain('openTarget');
    }
  });

  it('renders one distilled issue queue before one consolidated target inventory', () => {
    expect(workspaceOverviewPage).toContain('data-connected-targets="true"');
    expect(workspaceOverviewPage).toContain("t('overview.connectedClustersTitle')");
    expect(workspaceOverviewPage).toContain("t('overview.connectedVirtualMachinesTitle')");
    expect(workspaceOverviewPage).toContain('ICONS.Layers');
    expect(workspaceOverviewPage).toContain('ICONS.Server');
    expect(workspaceOverviewPage).toContain('data-attention-board="true"');
    expect(workspaceOverviewPage).toContain('ICONS.AlertTriangle');
    expect(workspaceOverviewPage).toContain("t('overview.runTriageIssue')");
    expect(workspaceOverviewPage).toContain("t('overview.viewMoreIssue')");
    expect(workspaceOverviewPage).not.toContain("t('overview.openTarget')");
    expect(workspaceOverviewPage).toContain('data-target-group="true"');
    expect(workspaceOverviewPage.match(/data-target-group="true"/g)).toHaveLength(1);
    expect(workspaceOverviewPage).toContain('group flex w-full items-center justify-between gap-4 px-4 py-3');
    expect(workspaceOverviewPage).toContain('onRunTriage({');
    expect(workspaceOverviewPage).toContain("buttonClassName({ variant: 'tertiary'");
    expect(workspaceOverviewPage).toContain('href={appHref(path)}');
    expect(workspaceOverviewPage).toContain('handleAppLinkClick(event, path, navigate)');
    expect(workspaceOverviewPage).not.toContain('onClick={() => openCard');
    expect(workspaceOverviewPage).toContain('recentInvestigation && (');
    expect(workspaceOverviewPage.indexOf('data-attention-board="true"')).toBeLessThan(
      workspaceOverviewPage.indexOf('data-connected-targets="true"')
    );
    expect(workspaceOverviewPage).not.toContain('{card.targetTypeLabel}');
    expect(workspaceOverviewPage).not.toContain('{issue.summary &&');
    expect(workspaceOverviewPage).not.toContain('data-ranked-issues-list="true"');
    expect(workspaceOverviewPage).not.toContain('data-healthy-targets="true"');
    expect(workspaceOverviewPage).not.toContain("t('overview.issueRank'");
    expect(workspaceOverviewPage).not.toContain("t('overview.firstSeenLabel')");
    expect(workspaceOverviewPage).not.toContain('data-primary-issue-card');
    expect(workspaceOverviewPage).not.toContain('summaryStats');
  });

  it('keeps issue and virtual-machine failures distinct, announced, and retryable', () => {
    expect(workspaceOverviewPage).toContain('const virtualMachineLoadError = virtualMachineCollection.error || null;');
    expect(workspaceOverviewPage).toContain("role={tone === 'danger' ? 'alert' : 'status'}");
    expect(workspaceOverviewPage).toContain('renderCollectionRecovery(issueLoadError, issueCollection.retry)');
    expect(workspaceOverviewPage).toContain('error: virtualMachineLoadError && !hasPriorVirtualMachineData');
    expect(workspaceOverviewPage).toContain('retainedError: virtualMachineLoadError && hasPriorVirtualMachineData');
    expect(workspaceOverviewPage).toContain('retry: virtualMachineCollection.retry');
    expect(workspaceOverviewPage).not.toContain('boardWarnings');
  });
});
