import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const workspaceOverviewPage = readFileSync(resolve(__dirname, 'WorkspaceOverviewPage.tsx'), 'utf8');
const en = readFileSync(resolve(__dirname, '../i18n/locales/en.js'), 'utf8');
const zh = readFileSync(resolve(__dirname, '../i18n/locales/zh.js'), 'utf8');

describe('WorkspaceOverviewPage command center signals', () => {
  it('keeps operating signals action-oriented instead of repeating nearby numeric counts', () => {
    const operatingSignalsSource = workspaceOverviewPage.slice(
      workspaceOverviewPage.indexOf('const operatingSignals = ['),
      workspaceOverviewPage.indexOf('const hasSummaryFindingsWithoutQueueItem')
    );

    expect(workspaceOverviewPage).toContain('const operatingSignals = [');
    expect(workspaceOverviewPage).toContain("intent: t('overview.reviewFindingsIntent'");
    expect(workspaceOverviewPage).toContain("reason: t('overview.reviewFindingsReason'");
    expect(workspaceOverviewPage).toContain("context: t('overview.queueContext')");
    expect(workspaceOverviewPage).not.toContain('<p className={`type-data ${item.tone}`}>{item.value}</p>');
    expect(workspaceOverviewPage).not.toContain('{item.action}');
    expect(operatingSignalsSource).not.toContain('value:');
    expect(operatingSignalsSource).not.toContain('action:');
  });

  it('demotes operating signal context labels so the queue button remains the only primary action', () => {
    const operatingSignalsPanel = workspaceOverviewPage.slice(
      workspaceOverviewPage.indexOf('data-operating-signals-panel="true"'),
      workspaceOverviewPage.indexOf('</aside>', workspaceOverviewPage.indexOf('data-operating-signals-panel="true"'))
    );

    expect(operatingSignalsPanel).toContain('{item.context}');
    expect(operatingSignalsPanel).toContain('className="type-caption shrink-0 text-ui-text-muted"');
    expect(operatingSignalsPanel).not.toContain('rounded-full');
    expect(operatingSignalsPanel).not.toContain('border border-ui-border');
    expect(workspaceOverviewPage).toContain('data-queue-primary-action="true"');
    expect(workspaceOverviewPage).toContain('data-primary-triage-action="true"');
  });

  it('keeps supporting queue cluster names in reported casing', () => {
    expect(workspaceOverviewPage).toContain('<span className="type-caption min-w-0 max-w-full break-words normal-case [overflow-wrap:anywhere]">{item.clusterName}</span>');
    expect(workspaceOverviewPage).not.toContain('<span className="type-micro-label">{item.clusterName}</span>');
  });

  it('lets long cluster estate names wrap compactly while preserving exact names', () => {
    expect(workspaceOverviewPage).toContain('title={app.name}');
    expect(workspaceOverviewPage).toContain('type-panel-title line-clamp-2 break-words');
    expect(workspaceOverviewPage).not.toContain('<h3 className="type-panel-title truncate">{app.name}</h3>');
  });

  it('keeps the signal copy localized in English and Chinese', () => {
    for (const locale of [en, zh]) {
      expect(locale).toContain('operatingSignals');
      expect(locale).toContain('operatingSignalsBody');
      expect(locale).toContain('reviewFindingsIntent');
      expect(locale).toContain('reviewFindingsReason');
      expect(locale).toContain('queueContext');
      expect(locale).toContain('inspectTargetsIntent');
      expect(locale).toContain('inspectTargetsReason');
      expect(locale).toContain('estateContext');
      expect(locale).toContain('connectCoverageIntent');
      expect(locale).toContain('connectCoverageReason');
      expect(locale).toContain('coverageContext');
    }
  });

  it('uses a calmer command header treatment while preserving semantic severity tones', () => {
    expect(workspaceOverviewPage).toContain('function commandHeaderTone');
    expect(workspaceOverviewPage).toContain("return 'border-status-danger/20 bg-ui-surface text-ui-text'");
    expect(workspaceOverviewPage).toContain("return 'border-status-warning/20 bg-ui-surface text-ui-text'");
    expect(workspaceOverviewPage).not.toContain("border-status-danger/25 bg-status-danger-soft text-status-danger-text");
    expect(workspaceOverviewPage).not.toContain("border-status-warning/25 bg-status-warning-soft text-status-warning-text");
    expect(workspaceOverviewPage).toContain("tone: criticalFindings > 0 ? 'text-status-danger-text' : 'text-ui-text-muted'");
    expect(workspaceOverviewPage).toContain("tone: warningFindings > 0 ? 'text-status-warning-text' : 'text-ui-text-muted'");
  });

  it('surfaces registered virtual machines in the workspace target estate', () => {
    expect(workspaceOverviewPage).toContain('const virtualMachineCount = workspace.quota?.virtualMachines.used ?? 0;');
    expect(workspaceOverviewPage).toContain('const targetCount = clusterCount + virtualMachineCount;');
    expect(workspaceOverviewPage).toContain("label: t('overview.targetInventory')");
    expect(workspaceOverviewPage).toContain("detail: t('overview.targetBreakdown', { clusters: clusterCount, vms: virtualMachineCount })");
    expect(workspaceOverviewPage).toContain("t('overview.virtualMachineEstate')");
    expect(workspaceOverviewPage).toContain("t('overview.virtualMachineCounts', { count: virtualMachineCount })");
    expect(workspaceOverviewPage).toContain('onClick={onOpenVirtualMachines}');
    expect(en).toContain("targetEstate: 'Target Estate'");
    expect(en).toContain("virtualMachineEstate: 'Virtual Machines'");
    expect(zh).toContain("targetEstate: '目标概况'");
    expect(zh).toContain("virtualMachineEstate: '虚拟机'");
  });
});
