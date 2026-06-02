import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const investigationsPage = readFileSync(resolve(__dirname, 'WorkspaceInvestigationsPage.tsx'), 'utf8');
const en = readFileSync(resolve(__dirname, '../i18n/locales/en.js'), 'utf8');
const zh = readFileSync(resolve(__dirname, '../i18n/locales/zh.js'), 'utf8');

function expectBefore(source: string, first: string, second: string) {
  const firstIndex = source.indexOf(first);
  const secondIndex = source.indexOf(second);
  expect(firstIndex).toBeGreaterThanOrEqual(0);
  expect(secondIndex).toBeGreaterThanOrEqual(0);
  expect(firstIndex).toBeLessThan(secondIndex);
}

describe('WorkspaceInvestigationsPage signal compression', () => {
  it('moves qualitative queue context into the queue header instead of a separate metrics strip', () => {
    const metricsStrip = investigationsPage.slice(
      investigationsPage.indexOf('const investigationMetrics = ['),
      investigationsPage.indexOf('</div>', investigationsPage.indexOf('data-investigation-queue-toolbar="true"'))
    );

    expect(metricsStrip).toContain("t('investigations.queuePosture')");
    expect(metricsStrip).toContain("t('investigations.filterScope')");
    expect(metricsStrip).toContain("t('investigations.nextStep')");
    expect(metricsStrip).toContain('metric.value');
    expect(investigationsPage).toContain('data-investigation-queue-toolbar="true"');
    expect(investigationsPage).not.toContain('data-investigation-metrics="true" className="mb-5 grid');
    expect(metricsStrip).not.toContain('{investigations.length}');
    expect(metricsStrip).not.toContain('{investigationClusters}');
    expect(metricsStrip).not.toContain("investigations.filter((item) => item.severity === 'critical').length");
  });

  it('keeps compressed investigation metrics localized in English and Chinese', () => {
    [
      "queuePosture: 'Posture'",
      "queuePostureBody: 'Severity, newest first.'",
      "filterScope: 'Scope'",
      "filterScopeBody: 'Filters set the queue.'",
      "nextStep: 'Action'",
      "nextStepBody: 'Start at the top item.'",
      "queueHint: 'Guarded runs open in the side panel.'",
      "activeTriageBody: 'Run triage opens the side panel; view cluster opens evidence.'"
    ].forEach((needle) => expect(en).toContain(needle));

    [
      "queuePosture: '态势'",
      "queuePostureBody: '严重度优先，最新在前。'",
      "filterScope: '范围'",
      "filterScopeBody: '筛选决定队列。'",
      "nextStep: '操作'",
      "nextStepBody: '从首项开始。'",
      "queueHint: '带保护的运行会在侧边面板打开。'",
      "activeTriageBody: '运行分诊打开侧边面板；查看集群打开证据。'"
    ].forEach((needle) => expect(zh).toContain(needle));
  });

  it('uses the same queue action order and keeps later triage actions bordered', () => {
    const mobileActions = investigationsPage.slice(
      investigationsPage.indexOf('data-mobile-triage-actions="true"'),
      investigationsPage.indexOf('mobileTriageBody')
    );
    const topDesktopActions = investigationsPage.slice(
      investigationsPage.indexOf('runTriage(topInvestigation)'),
      investigationsPage.indexOf('activeTriageBody')
    );
    const remainingActions = investigationsPage.slice(
      investigationsPage.indexOf('remainingInvestigations.map'),
      investigationsPage.indexOf('</article>', investigationsPage.indexOf('remainingInvestigations.map'))
    );

    expectBefore(mobileActions, 'runTriage(topInvestigation)', 'viewCluster(topInvestigation)');
    expectBefore(topDesktopActions, 'runTriage(topInvestigation)', 'viewCluster(topInvestigation)');
    expectBefore(remainingActions, 'runTriage(item)', 'viewCluster(item)');
    expect(remainingActions).toContain('variant="secondary"');
    expect(remainingActions).toContain('border-accent/35 text-accent-strong');
    expect(remainingActions).not.toContain('variant="tertiary"');
  });

  it('keeps investigation queue typography within row and panel conventions', () => {
    expect(investigationsPage).toContain('<h2 className="type-panel-title mt-3 break-words">{topInvestigation.title}</h2>');
    expect(investigationsPage).toContain('<h3 className="type-row-title mt-3 break-words">{item.title}</h3>');
    expect(investigationsPage).toContain('<p className="type-caption mt-1 line-clamp-2 break-words">{item.summary}</p>');
    expect(investigationsPage).toContain('<span aria-hidden="true" className="text-ui-text-muted/70">·</span>');
    expect(investigationsPage).toContain('<span aria-hidden="true" className="type-caption text-ui-text-muted/70">·</span>');
    expect(investigationsPage).not.toContain('<h2 className="type-section-title mt-3 break-words">{topInvestigation.title}</h2>');
    expect(investigationsPage).not.toContain('<p className="type-body mt-1 line-clamp-2 break-words">{item.summary}</p>');
  });
});
