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
  installInstructions: ControlPlaneVirtualMachineInstallInstructions;
}

export interface ControlPlaneVirtualMachineInstallInstructions {
  command: string;
  releaseVersion: string;
  bootstrapUrl: string;
  enrollmentExpiresAt?: string;
  warnings: string[];
}

export function parseVirtualMachineInstallInstructions(value: unknown): ControlPlaneVirtualMachineInstallInstructions {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Control plane returned invalid AgentV install instructions');
  }
  const input = value as Record<string, unknown>;
  const warnings = input.warnings;
  const enrollmentExpiresAt = input.enrollmentExpiresAt;
  if ('agentKey' in input
    || typeof input.command !== 'string' || input.command.length === 0 || input.command.includes('\n') || input.command.includes('\r')
    || typeof input.releaseVersion !== 'string'
    || typeof input.bootstrapUrl !== 'string'
    || !Array.isArray(warnings) || !warnings.every((warning) => typeof warning === 'string')
    || (enrollmentExpiresAt !== undefined
      && (typeof enrollmentExpiresAt !== 'string' || !Number.isFinite(Date.parse(enrollmentExpiresAt))))) {
    throw new Error('Control plane returned invalid AgentV install instructions');
  }
  return {
    command: input.command,
    releaseVersion: input.releaseVersion,
    bootstrapUrl: input.bootstrapUrl,
    warnings: [...warnings],
    ...(typeof enrollmentExpiresAt === 'string' ? { enrollmentExpiresAt } : {})
  };
}

export function parseVirtualMachineInstructionResponse(value: unknown): {
  targetId: string;
  installInstructions: ControlPlaneVirtualMachineInstallInstructions;
} {
  if (!value || typeof value !== 'object' || Array.isArray(value) || 'agentKey' in value) {
    throw new Error('Control plane returned an invalid AgentV instruction response');
  }
  const input = value as Record<string, unknown>;
  if (typeof input.targetId !== 'string') {
    throw new Error('Control plane returned an invalid AgentV instruction response');
  }
  return { targetId: input.targetId, installInstructions: parseVirtualMachineInstallInstructions(input.installInstructions) };
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
