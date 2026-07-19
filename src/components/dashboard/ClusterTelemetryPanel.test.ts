import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../../..');
const panel = readFileSync(resolve(root, 'src/components/dashboard/ClusterTelemetryPanel.tsx'), 'utf8');
const catalog = readFileSync(resolve(root, 'src/components/dashboard/ClusterCatalog.tsx'), 'utf8');
const dashboard = readFileSync(resolve(root, 'src/components/dashboard/Dashboard.tsx'), 'utf8');
const page = readFileSync(resolve(root, 'src/pages/KubernetesClustersPage.tsx'), 'utf8');
const telemetryTrendSummary = readFileSync(resolve(root, 'src/features/targets/catalog/TelemetryTrendSummary.tsx'), 'utf8');

describe('cluster telemetry recovery states', () => {
  it('offers an accessible retry without turning the whole cluster card into the action', () => {
    expect(panel).toContain("aria-label={t('dashboard.retryTelemetry', { name: cluster.name })}");
    expect(panel).toContain('event.stopPropagation();');
    expect(panel).toContain('onRetry();');
    expect(catalog).toContain('onRetry={props.onRetryTelemetry}');
  });

  it('announces loading and error states while preserving prior trend data', () => {
    expect(panel).toContain("role={loadState === 'error' ? 'alert' : 'status'}");
    expect(panel).toContain('aria-live="polite"');
    expect(panel).toContain("loadState === 'loading'");
    expect(panel).toContain("loadState === 'error' && hasTrend");
  });

  it('exposes telemetry trend endpoints as a semantic table and hides the decorative SVG', () => {
    expect(panel).toContain('<TelemetryTrendSummary');
    expect(panel).toContain('aria-hidden="true"');
    expect(panel).not.toContain('role="img"');
    expect(telemetryTrendSummary).toContain('<table className="sr-only">');
    expect(telemetryTrendSummary).toContain('<th scope="row">{item.label}</th>');
  });

  it('wires retry back to a fresh metric-history request', () => {
    expect(dashboard).toContain('onRetryTelemetry={onRetryTelemetry}');
    expect(page).toContain('metricHistoryRetryNonce');
    expect(page).toContain('setMetricHistoryRetryNonce((current) => current + 1)');
    expect(page).toContain('[metricHistoryFetchKey, metricHistoryRetryNonce]');
  });
});
