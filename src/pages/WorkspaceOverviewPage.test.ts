import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const workspaceOverviewPage = readFileSync(resolve(__dirname, 'WorkspaceOverviewPage.tsx'), 'utf8');
const en = readFileSync(resolve(__dirname, '../i18n/locales/en.js'), 'utf8');
const zh = readFileSync(resolve(__dirname, '../i18n/locales/zh.js'), 'utf8');

describe('WorkspaceOverviewPage homepage board', () => {
  it('loads durable workspace issues into one mixed target board', () => {
    expect(workspaceOverviewPage).toContain('loadAllWorkspaceIssues');
    expect(workspaceOverviewPage).toContain('loadAllWorkspaceVirtualMachines');
    expect(workspaceOverviewPage).toContain('buildWorkspaceOverviewCards');
    expect(workspaceOverviewPage).toContain('listWorkspaceIssues');
    expect(workspaceOverviewPage).toContain('isLoadingIssues');
    expect(workspaceOverviewPage).not.toContain('loadAllWorkspaceInvestigations');
    expect(workspaceOverviewPage).not.toContain('loadAllVirtualMachineFindings');
  });

  it('keeps the banner, connected-target headings, and issue queue copy localized in English and Chinese', () => {
    for (const locale of [en, zh]) {
      expect(locale).toContain('quickActionsTitle');
      expect(locale).toContain('quickActionsBody');
      expect(locale).toContain('quickActionsResumeBody');
      expect(locale).toContain('quickActionsEmptyBody');
      expect(locale).toContain('resumeRecentInvestigation');
      expect(locale).toContain('connectedClustersTitle');
      expect(locale).toContain('connectedVirtualMachinesTitle');
      expect(locale).toContain('connectedTargetCount');
      expect(locale).toContain('needsAttentionTitle');
      expect(locale).toContain('needsAttentionBody');
      expect(locale).toContain('targetLabel');
      expect(locale).toContain('scopeLabel');
      expect(locale).toContain('lastSeenLabel');
      expect(locale).toContain('firstSeenLabel');
      expect(locale).toContain('evidenceLabel');
      expect(locale).toContain('runTriageIssue');
      expect(locale).toContain('viewMoreIssue');
      expect(locale).not.toContain('openTarget');
      expect(locale).toContain('issueRank');
    }
  });

  it('renders the issue queue before flatter connected-target lists', () => {
    expect(workspaceOverviewPage).toContain('data-connected-targets="true"');
    expect(workspaceOverviewPage).toContain("t('overview.connectedClustersTitle')");
    expect(workspaceOverviewPage).toContain("t('overview.connectedVirtualMachinesTitle')");
    expect(workspaceOverviewPage).toContain('ICONS.Layers');
    expect(workspaceOverviewPage).toContain('ICONS.Server');
    expect(workspaceOverviewPage).toContain('data-attention-board="true"');
    expect(workspaceOverviewPage).toContain('ICONS.AlertTriangle');
    expect(workspaceOverviewPage).toContain("t('overview.issueRank', { count: index + 1 })");
    expect(workspaceOverviewPage).toContain("t('overview.evidenceLabel')");
    expect(workspaceOverviewPage).toContain("t('overview.runTriageIssue')");
    expect(workspaceOverviewPage).toContain("t('overview.viewMoreIssue')");
    expect(workspaceOverviewPage).not.toContain("t('overview.openTarget')");
    expect(workspaceOverviewPage).toContain('group flex w-full items-center gap-4 px-4 py-3');
    expect(workspaceOverviewPage).toContain('onRunTriage({');
    expect(workspaceOverviewPage).toContain("data-primary-issue-card={isPrimary ? 'true' : undefined}");
    expect(workspaceOverviewPage).toContain('variant="secondary"');
    expect(workspaceOverviewPage.indexOf('data-attention-board="true"')).toBeLessThan(
      workspaceOverviewPage.indexOf('data-connected-targets="true"')
    );
    expect(workspaceOverviewPage).not.toContain('{card.targetTypeLabel}');
    expect(workspaceOverviewPage).not.toContain('{issue.summary &&');
    expect(workspaceOverviewPage).not.toContain('data-ranked-issues-list="true"');
    expect(workspaceOverviewPage).not.toContain('data-healthy-targets="true"');
  });
});
