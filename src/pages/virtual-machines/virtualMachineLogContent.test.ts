import { expect, it } from 'vitest';
import { formatVmLoadedLogs } from './virtualMachineLogContent';

it('keeps source, original timestamp and multiline output in a VM loaded-only export', () => {
  expect(formatVmLoadedLogs([{ timestamp: '2026-07-15T08:30:00Z', source: 'journald', unit: 'worker.service', message: 'first\nsecond' }], 'Timestamp unknown', 'Source unknown'))
    .toBe('2026-07-15T08:30:00Z\tjournald / worker.service\tfirst\nsecond');
});

it('does not invent a VM time or source for missing or malformed metadata', () => {
  expect(formatVmLoadedLogs([{ timestamp: 'invalid', message: 'output' }, { message: 'next' }], 'Timestamp unknown', 'Source unknown'))
    .toBe('Timestamp unknown\tSource unknown\toutput\nTimestamp unknown\tSource unknown\tnext');
  expect(formatVmLoadedLogs([], 'Timestamp unknown', 'Source unknown')).toBe('');
});
