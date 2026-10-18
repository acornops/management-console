import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, expect, it } from 'vitest';
import { initializeI18n } from '@/i18n';
import { VirtualMachineTelemetrySummary } from './VirtualMachineTelemetrySummary';

beforeAll(initializeI18n);

it('shows an old sample timestamp without claiming current health', () => {
  const html = renderToStaticMarkup(<VirtualMachineTelemetrySummary latestTelemetryPoint={{
    timestamp: Date.parse('2020-01-01T00:00:00Z'), loadAverage1m: 1, cpuUsagePercent: null,
    memoryUsedPercent: null, memoryUsedBytes: null, memoryTotalBytes: null,
    swapUsedPercent: null, rootDiskUsedPercent: null
  }} />);
  expect(html).toContain('dateTime="2020-01-01T00:00:00.000Z"');
  expect(html).toContain('Latest sample');
  expect(html).not.toContain('Healthy');
});

it('does not invent a timestamp for absent telemetry', () => {
  const html = renderToStaticMarkup(<VirtualMachineTelemetrySummary latestTelemetryPoint={null} />);
  expect(html).toContain('Latest sample: Unknown');
  expect(html).not.toContain('<time');
});
