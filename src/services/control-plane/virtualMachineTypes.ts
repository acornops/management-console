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
