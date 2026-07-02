import { toArray } from './formatters';
import type {
  ControlPlaneVirtualMachineMetricHistoryPoint,
  ControlPlaneVirtualMachineMetricsHistoryResponse
} from './virtualMachineTypes';

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function nullableFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function nullableNonNegativeNumber(value: unknown): number | null {
  const number = nullableFiniteNumber(value);
  return number !== null && number >= 0 ? number : null;
}

function nullablePercentNumber(value: unknown): number | null {
  const number = nullableFiniteNumber(value);
  return number !== null && number >= 0 && number <= 100 ? number : null;
}

function nullableUsedBytes(usedValue: unknown, totalValue: unknown): number | null {
  const usedBytes = nullableNonNegativeNumber(usedValue);
  const totalBytes = nullableNonNegativeNumber(totalValue);
  return usedBytes !== null && totalBytes !== null && usedBytes > totalBytes ? null : usedBytes;
}

function nullableFreeBytes(freeValue: unknown, totalValue: unknown): number | null {
  const freeBytes = nullableNonNegativeNumber(freeValue);
  const totalBytes = nullableNonNegativeNumber(totalValue);
  return freeBytes !== null && totalBytes !== null && freeBytes > totalBytes ? null : freeBytes;
}

function nullableUsagePercent(percentValue: unknown, usedValue: unknown, totalValue: unknown): number | null {
  if (typeof usedValue === 'number' && (!Number.isFinite(usedValue) || usedValue < 0)) return null;
  if (typeof totalValue === 'number' && (!Number.isFinite(totalValue) || totalValue < 0)) return null;
  const usedBytes = nullableNonNegativeNumber(usedValue);
  const totalBytes = nullableNonNegativeNumber(totalValue);
  if (totalBytes !== null && totalBytes <= 0) return null;
  if (usedBytes !== null && totalBytes !== null && usedBytes > totalBytes) return null;
  return nullablePercentNumber(percentValue);
}

export function mapVirtualMachineMetricHistoryPoint(
  rawPoint: unknown
): ControlPlaneVirtualMachineMetricHistoryPoint {
  const point = record(rawPoint) as Partial<ControlPlaneVirtualMachineMetricHistoryPoint>;
  return {
    timestamp: typeof point.timestamp === 'string' ? point.timestamp : '',
    loadAverage1m: nullableNonNegativeNumber(point.loadAverage1m),
    loadAverage5m: nullableNonNegativeNumber(point.loadAverage5m),
    loadAverage15m: nullableNonNegativeNumber(point.loadAverage15m),
    cpuUsagePercent: nullablePercentNumber(point.cpuUsagePercent),
    memoryUsedBytes: nullableUsedBytes(point.memoryUsedBytes, point.memoryTotalBytes),
    memoryTotalBytes: nullableNonNegativeNumber(point.memoryTotalBytes),
    memoryFreeBytes: nullableFreeBytes(point.memoryFreeBytes, point.memoryTotalBytes),
    memoryUsedPercent: nullableUsagePercent(point.memoryUsedPercent, point.memoryUsedBytes, point.memoryTotalBytes),
    swapUsedBytes: nullableUsedBytes(point.swapUsedBytes, point.swapTotalBytes),
    swapTotalBytes: nullableNonNegativeNumber(point.swapTotalBytes),
    swapUsedPercent: nullableUsagePercent(point.swapUsedPercent, point.swapUsedBytes, point.swapTotalBytes),
    rootDiskUsedBytes: nullableUsedBytes(point.rootDiskUsedBytes, point.rootDiskTotalBytes),
    rootDiskTotalBytes: nullableNonNegativeNumber(point.rootDiskTotalBytes),
    rootDiskUsedPercent: nullableUsagePercent(point.rootDiskUsedPercent, point.rootDiskUsedBytes, point.rootDiskTotalBytes)
  };
}

export function mapVirtualMachineMetricsHistoryResponse(
  rawResponse: unknown
): ControlPlaneVirtualMachineMetricsHistoryResponse {
  const response = record(rawResponse) as Partial<ControlPlaneVirtualMachineMetricsHistoryResponse>;
  return {
    workspaceId: typeof response.workspaceId === 'string' ? response.workspaceId : '',
    targetId: typeof response.targetId === 'string' ? response.targetId : '',
    windowMs: typeof response.windowMs === 'number' && Number.isFinite(response.windowMs) && response.windowMs >= 0 ? response.windowMs : 0,
    points: toArray(response.points).map(mapVirtualMachineMetricHistoryPoint)
  };
}
