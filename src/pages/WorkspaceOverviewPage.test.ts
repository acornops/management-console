import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const workspaceOverviewPage = readFileSync(resolve(__dirname, 'WorkspaceOverviewPage.tsx'), 'utf8');
const en = readFileSync(resolve(__dirname, '../i18n/locales/en.js'), 'utf8');
const zh = readFileSync(resolve(__dirname, '../i18n/locales/zh.js'), 'utf8');

describe('WorkspaceOverviewPage homepage board', () => {
  it('loads cluster investigations and VM findings into one mixed target board', () => {
    expect(workspaceOverviewPage).toContain('loadAllWorkspaceInvestigations');
    expect(workspaceOverviewPage).toContain('loadAllWorkspaceVirtualMachines');
    expect(workspaceOverviewPage).toContain('loadAllVirtualMachineFindings');
    expect(workspaceOverviewPage).toContain('buildWorkspaceOverviewCards');
    expect(workspaceOverviewPage).toContain('vmFindingsLoadErrorCount');
    expect(workspaceOverviewPage).toContain('Promise.allSettled');
  });

  it('keeps the banner, connected-target headings, and issue queue copy localized in English and Chinese', () => {
    for (const locale of [en, zh]) {
      expect(locale).toContain('quickActionsTitle');
      expect(locale).toContain('quickActionsBody');
      expect(locale).toContain('resumeRecentInvestigation');
      expect(locale).toContain('connectedClustersTitle');
      expect(locale).toContain('connectedVirtualMachinesTitle');
      expect(locale).toContain('needsAttentionTitle');
      expect(locale).toContain('needsAttentionBody');
      expect(locale).toContain('issueRank');
    }
  });

  it('renders header-only connected-target icons and a flatter issue queue', () => {
    expect(workspaceOverviewPage).toContain('data-connected-targets="true"');
    expect(workspaceOverviewPage).toContain("t('overview.connectedClustersTitle')");
    expect(workspaceOverviewPage).toContain("t('overview.connectedVirtualMachinesTitle')");
    expect(workspaceOverviewPage).toContain('ICONS.Layers');
    expect(workspaceOverviewPage).toContain('ICONS.Server');
    expect(workspaceOverviewPage).toContain('data-attention-board="true"');
    expect(workspaceOverviewPage).toContain('ICONS.AlertTriangle');
    expect(workspaceOverviewPage).toContain("t('overview.issueRank'");
    expect(workspaceOverviewPage).toContain('data-primary-issue-card="true"');
    expect(workspaceOverviewPage).toContain('variant="secondary"');
    expect(workspaceOverviewPage).not.toContain('{card.targetTypeLabel}');
    expect(workspaceOverviewPage).not.toContain('{issue.summary &&');
    expect(workspaceOverviewPage).not.toContain('data-ranked-issues-list="true"');
    expect(workspaceOverviewPage).not.toContain('data-healthy-targets="true"');
  });
});
