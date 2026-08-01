import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearRecentInvestigationForWorkspace,
  writeRecentInvestigation
} from '@/pages/workspace-overview/recentInvestigation';
import type { ControlPlaneVirtualMachine } from '@/services/controlPlaneApi';
import type { KubernetesCluster } from '@/types';

import { syncRecentInvestigation } from './useRecentInvestigationSync';

vi.mock('@/pages/workspace-overview/recentInvestigation', () => ({
  clearRecentInvestigationForWorkspace: vi.fn(),
  writeRecentInvestigation: vi.fn()
}));

const cluster = {
  id: 'cluster-1',
  workspaceId: 'workspace-a',
  name: 'Development Cluster'
} as KubernetesCluster;

const virtualMachine = {
  id: 'vm-1',
  workspaceId: 'workspace-a',
  name: 'Development VM'
} as ControlPlaneVirtualMachine;

describe('recent investigation route sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    {
      label: 'cluster overview',
      route: {
        kind: 'workspaceKubernetesClusterDiagnostics' as const,
        workspaceId: 'workspace-a',
        clusterId: 'cluster-1',
        tab: 'overview' as const
      }
    },
    {
      label: 'virtual machine status',
      route: {
        kind: 'workspaceVirtualMachineDetail' as const,
        workspaceId: 'workspace-a',
        vmId: 'vm-1'
      }
    }
  ])('clears a stale chat resume item after opening a $label', ({ route }) => {
    syncRecentInvestigation({
      currentUserId: 'user-a',
      route,
      kubernetesClusterById: new Map([[cluster.id, cluster]]),
      virtualMachinesInWorkspaceContext: [virtualMachine]
    });

    expect(clearRecentInvestigationForWorkspace).toHaveBeenCalledWith('user-a', 'workspace-a');
    expect(writeRecentInvestigation).not.toHaveBeenCalled();
  });

  it.each([
    {
      label: 'cluster chat',
      route: {
        kind: 'workspaceKubernetesClusterDiagnostics' as const,
        workspaceId: 'workspace-a',
        clusterId: 'cluster-1',
        tab: 'chat' as const
      },
      expected: {
        userId: 'user-a',
        workspaceId: 'workspace-a',
        path: '/workspaces/workspace-a/kubernetes-clusters/cluster-1/chat',
        targetName: 'Development Cluster',
        targetType: 'kubernetes'
      }
    },
    {
      label: 'virtual machine chat',
      route: {
        kind: 'workspaceVirtualMachineDetail' as const,
        workspaceId: 'workspace-a',
        vmId: 'vm-1',
        tab: 'chat' as const
      },
      expected: {
        userId: 'user-a',
        workspaceId: 'workspace-a',
        path: '/workspaces/workspace-a/virtual-machines/vm-1/chat',
        targetName: 'Development VM',
        targetType: 'virtual_machine'
      }
    }
  ])('records a $label as resumable', ({ route, expected }) => {
    syncRecentInvestigation({
      currentUserId: 'user-a',
      route,
      kubernetesClusterById: new Map([[cluster.id, cluster]]),
      virtualMachinesInWorkspaceContext: [virtualMachine]
    });

    expect(writeRecentInvestigation).toHaveBeenCalledWith(expected);
    expect(clearRecentInvestigationForWorkspace).not.toHaveBeenCalled();
  });
});
