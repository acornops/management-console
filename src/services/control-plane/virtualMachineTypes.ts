import type { VirtualMachine } from '@/types';
import { isRunPermissionMode, type RunPermissionMode } from './runPermissionTypes';

export type AgentVAccessMode = 'read_only' | 'read_write';

interface AgentVAccessPolicy {
  accessMode: AgentVAccessMode;
  restartServices: string[];
}

const SYSTEMD_SERVICE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.@:-]{0,254}\.service$/;
const MAX_RESTART_SERVICES = 32;

export function isValidAgentVRestartService(value: string): boolean {
  return SYSTEMD_SERVICE_PATTERN.test(value)
    && value !== 'acornops-agentv.service'
    && !value.startsWith('acornops-agentv-');
}

export interface ControlPlaneVirtualMachine {
  id: string;
  workspaceId: string;
  name: string;
  status: 'online' | 'offline' | 'degraded' | 'unknown';
  hostname?: string;
  osFamily: 'linux';
  serviceManager: 'systemd';
  agentAccessMode: AgentVAccessMode;
  restartServices: string[];
  pendingAgentAccessPolicy: AgentVAccessPolicy | null;
  permissionMode: RunPermissionMode;
  permissionModeOverride: RunPermissionMode | null;
  permissionModeSource: 'virtual_machine_override' | 'deployment_default';
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

function parseAgentVAccessPolicy(value: unknown): AgentVAccessPolicy {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Control plane returned an invalid AgentV access policy');
  }
  const input = value as Record<string, unknown>;
  const restartServices = input.restartServices;
  if ((input.accessMode !== 'read_only' && input.accessMode !== 'read_write')
    || !Array.isArray(restartServices)
    || restartServices.length > MAX_RESTART_SERVICES
    || !restartServices.every((service) => typeof service === 'string' && isValidAgentVRestartService(service))
    || new Set(restartServices).size !== restartServices.length
    || (input.accessMode === 'read_only' && restartServices.length !== 0)
    || (input.accessMode === 'read_write' && restartServices.length === 0)) {
    throw new Error('Control plane returned an invalid AgentV access policy');
  }
  return { accessMode: input.accessMode, restartServices: [...restartServices] };
}

export function parseControlPlaneVirtualMachine(value: unknown): ControlPlaneVirtualMachine {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Control plane returned an invalid virtual machine');
  }
  const input = value as Record<string, unknown>;
  const accessPolicy = parseAgentVAccessPolicy({
    accessMode: input.agentAccessMode,
    restartServices: input.restartServices
  });
  const pendingAgentAccessPolicyInput = input.pendingAgentAccessPolicy ?? null;
  const pendingAgentAccessPolicy = pendingAgentAccessPolicyInput === null
    ? null
    : parseAgentVAccessPolicy(pendingAgentAccessPolicyInput);
  if (!isRunPermissionMode(input.permissionMode)
    || (input.permissionModeOverride !== null && !isRunPermissionMode(input.permissionModeOverride))
    || (input.permissionModeSource !== 'virtual_machine_override' && input.permissionModeSource !== 'deployment_default')
    || (input.permissionModeSource === 'virtual_machine_override' && input.permissionModeOverride === null)
    || (input.permissionModeSource === 'deployment_default' && input.permissionModeOverride !== null)
    || (input.permissionModeOverride !== null && input.permissionMode !== input.permissionModeOverride)) {
    throw new Error('Control plane returned an invalid VM run permission policy');
  }
  return {
    ...input,
    agentAccessMode: accessPolicy.accessMode,
    restartServices: accessPolicy.restartServices,
    pendingAgentAccessPolicy
  } as unknown as ControlPlaneVirtualMachine;
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

export function parseVirtualMachineAccessPolicyUpdateResponse(value: unknown): {
  virtualMachine: ControlPlaneVirtualMachine;
  installInstructions: ControlPlaneVirtualMachineInstallInstructions;
} {
  if (!value || typeof value !== 'object' || Array.isArray(value) || 'agentKey' in value) {
    throw new Error('Control plane returned an invalid AgentV host policy update response');
  }
  const input = value as Record<string, unknown>;
  return {
    virtualMachine: parseControlPlaneVirtualMachine(input.virtualMachine),
    installInstructions: parseVirtualMachineInstallInstructions(input.installInstructions)
  };
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
