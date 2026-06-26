import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const overviewView = readFileSync(resolve(__dirname, 'OverviewView.tsx'), 'utf8');

describe('OverviewView policy controls', () => {
  it('does not surface namespace scope or write confirmations on overview', () => {
    expect(overviewView).not.toContain('namespaceScopeLabel');
    expect(overviewView).not.toContain('writeConfirmationLabel');
    expect(overviewView).not.toContain('formatNamespaceScope');
    expect(overviewView).not.toContain('formatWriteConfirmationPolicy');
    expect(overviewView).not.toContain('ShieldCheck');
    expect(overviewView).not.toContain('SlidersHorizontal');
    expect(overviewView).not.toContain('onUpdateWriteConfirmationPolicy');
    expect(overviewView).not.toContain('onEditNamespaceScope');
  });
});

describe('cluster overview metric history loading', () => {
  it('loads selected-cluster metric history from the chart-owning view only for connected clusters', () => {
    expect(overviewView).toContain("import { formatLastUpdated, getAgentConnectionState, getTelemetryFreshness, getTelemetryFreshnessLabel } from '@/utils/telemetry'");
    expect(overviewView).toContain("if (getAgentConnectionState(cluster) !== 'connected')");
    expect(overviewView).toContain("controlPlaneApi.getClusterMetricsHistory(cluster.workspaceId, cluster.id, { window: '6h', limit: 48 })");
    expect(overviewView).toContain("setMetricHistoryStatus('loading')");
    expect(overviewView).toContain("isLoading={metricHistoryStatus === 'loading'}");
  });
});

describe('cluster overview findings command signal copy', () => {
  it('keeps the findings header scoped while the body tells operators what to do next', () => {
    expect(overviewView).toContain("t('clusterOverview.activeIssuesScope'");
    expect(overviewView).toContain("t('clusterOverview.activeIssuesBody', { issues: issueCount, critical: criticalIssues, warning: warningIssues })");
    expect(overviewView).not.toContain("t('clusterOverview.activeIssuesBody', { pods: podCount, resources: scopedResourceCount })");
  });

  it('keeps loaded durable issues as the primary overview source instead of falling back to raw findings', () => {
    expect(overviewView).toContain('const useIssueCounts = hasIssueRows;');
    expect(overviewView).toContain(') : hasIssueRows ? (');
  });

  it('labels durable issue rows separately from raw snapshot finding rows', () => {
    expect(overviewView).toContain("t('clusterOverview.issue')");
    expect(overviewView).toContain("t('clusterOverview.finding')");
    expect(overviewView).toContain("t('issues.originFinding')");
  });
});
