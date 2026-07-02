import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../../..');
const metricChart = readFileSync(resolve(root, 'src/components/common/MetricChart.tsx'), 'utf8');

describe('MetricChart layout', () => {
  it('reserves a y-axis label gutter so labels do not overlap the plotted series', () => {
    expect(metricChart).toContain('const plotLeft = 54;');
    expect(metricChart).toContain('const plotRight = width - 14;');
    expect(metricChart).toContain('const yAxisLabelGap = 6;');
    expect(metricChart).toContain('x1={plotLeft}');
    expect(metricChart).toContain('x2={plotRight}');
    expect(metricChart).toContain('x={plotLeft - yAxisLabelGap}');
    expect(metricChart).toContain('textAnchor="end"');
    expect(metricChart).toContain('const maxObservedValue = Math.max(...points.map((point) => point.value), 0);');
    expect(metricChart).toContain('const maxValue = Math.max(maxObservedValue * 1.12, 1);');
    expect(metricChart).not.toContain('x={4}');
  });

  it('uses loading copy only for the active loading state', () => {
    expect(metricChart).toContain('{isLoading ? loadingTitle : emptyTitle}');
    expect(metricChart).not.toContain('points.length === 0 && !isLoading ? emptyTitle : loadingTitle');
  });
});
