import type { VirtualMachine } from '@/types';

export interface ControlPlaneVirtualMachine {
  id: string;
  workspaceId: string;
  name: string;
  status: 'online' | 'offline' | 'degraded' | 'unknown';
  hostname?: string;
  osFamily: 'linux';
  serviceManager: 'systemd';
  allowedLogSources?: string[];
  summary?: {
    inventoryCount: number;
    findingCount: number;
    criticalFindingCount: number;
    serviceCount: number;
    processCount: number;
    listenerCount: number;
    logCount: number;
  };
  createdAt: string;
  updatedAt: string;
  latestSnapshot?: VirtualMachine['latestSnapshot'];
}

export interface RegisterVirtualMachineResponse {
  virtualMachine: ControlPlaneVirtualMachine;
  agentKey: string;
  keyVersion: number;
  installInstructions: string;
}

export interface ControlPlaneVirtualMachineMetricHistoryPoint {
  timestamp: string;
  loadAverage1m: number | null;
  loadAverage5m: number | null;
  loadAverage15m: number | null;
  cpuUsagePercent: number | null;
  memoryUsedBytes: number | null;
  memoryTotalBytes: number | null;
  memoryFreeBytes: number | null;
  memoryUsedPercent: number | null;
  swapUsedBytes: number | null;
  swapTotalBytes: number | null;
  swapUsedPercent: number | null;
  rootDiskUsedBytes: number | null;
  rootDiskTotalBytes: number | null;
  rootDiskUsedPercent: number | null;
}

export interface ControlPlaneVirtualMachineMetricsHistoryResponse {
  workspaceId: string;
  targetId: string;
  windowMs: number;
  points: ControlPlaneVirtualMachineMetricHistoryPoint[];
}
