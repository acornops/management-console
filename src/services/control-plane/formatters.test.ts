import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  formatCpuCores,
  formatMemoryBytes,
  formatNamespaceScope,
  formatResourceAge,
  normalizeNamespaceList,
  normalizeServiceType,
  parseCpuToCores,
  parseMemoryToBytes,
  toArray
} from './formatters';

describe('control-plane formatters', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-05-25T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('normalizes array-like values and namespaces', () => {
    expect(toArray(undefined)).toEqual([]);
    expect(toArray([1, 2])).toEqual([1, 2]);
    expect(normalizeNamespaceList([' default ', '', 'kube-system'])).toEqual(['default', 'kube-system']);
    expect(normalizeNamespaceList(undefined)).toEqual([]);
  });

  it('parses and formats cpu values across supported units', () => {
    expect(parseCpuToCores('1500m')).toBe(1.5);
    expect(parseCpuToCores('750u')).toBe(0.00075);
    expect(parseCpuToCores('2000000000n')).toBe(2);
    expect(parseCpuToCores('abc')).toBeNull();

    expect(formatCpuCores(12)).toBe('12.0 Core');
    expect(formatCpuCores(1.5)).toBe('1.50 Core');
    expect(formatCpuCores(0.25)).toBe('0.250 Core');
    expect(formatCpuCores(null)).toBe('Unavailable');
  });

  it('parses and formats memory values across supported units', () => {
    expect(parseMemoryToBytes('1.5Gi')).toBe(1.5 * 1024 ** 3);
    expect(parseMemoryToBytes('500M')).toBe(500_000_000);
    expect(parseMemoryToBytes('42')).toBe(42);
    expect(parseMemoryToBytes('5XB')).toBeNull();

    expect(formatMemoryBytes(2 * 1024 ** 3)).toBe('2.00 GiB');
    expect(formatMemoryBytes(3 * 1024 ** 2)).toBe('3.0 MiB');
    expect(formatMemoryBytes(512 * 1024)).toBe('512 KiB');
    expect(formatMemoryBytes(Number.NaN)).toBe('Unavailable');
  });

  it('formats service and namespace scope labels', () => {
    expect(normalizeServiceType('NodePort')).toBe('NodePort');
    expect(normalizeServiceType('ExternalName')).toBe('ClusterIP');
    expect(formatNamespaceScope(['payments', 'search'], [])).toBe('payments, search');
    expect(formatNamespaceScope([], ['kube-system'])).toBe('all except kube-system');
    expect(formatNamespaceScope([], [])).toBe('all');
  });

  it('formats resource age across recent and long-lived timestamps', () => {
    expect(formatResourceAge(undefined)).toBe('-');
    expect(formatResourceAge('not-a-date')).toBe('-');
    expect(formatResourceAge('2026-05-24T23:59:45.000Z')).toBe('just now');
    expect(formatResourceAge('2026-05-24T23:15:00.000Z')).toBe('45m');
    expect(formatResourceAge('2026-05-24T00:00:00.000Z')).toBe('24h');
    expect(formatResourceAge('2026-05-20T00:00:00.000Z')).toBe('5d');
    expect(formatResourceAge('2026-02-24T00:00:00.000Z')).toBe('3mo');
    expect(formatResourceAge('2024-05-25T00:00:00.000Z')).toBe('2y');
  });
});
