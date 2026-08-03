import { describe, expect, it } from 'vitest';
import type { TFunction } from 'i18next';

import { createManagedSubjectNavigation } from '@/app/managedSubjectNavigation';
import type { KubernetesCluster } from '@/types';

const t = ((key: string) => key) as TFunction;

const commonInput = {
  backPath: '/workspaces/workspace-1',
  clusterAssistantNavStatus: 'idle' as const,
  selectedAgent: null,
  selectedCluster: null,
  selectedClusterIssueCount: 0,
  selectedVm: null,
  selectedVmIssueCount: 0,
  t
};

describe('createManagedSubjectNavigation', () => {
  it('builds the common agent operations, capabilities, and settings model', () => {
    const model = createManagedSubjectNavigation({
      ...commonInput,
      activeResourceNav: 'agentSkills',
      isAgentSidebar: true,
      isClusterSidebar: false,
      isVirtualMachineSidebar: false,
      route: { kind: 'workspaceAgentDetail', workspaceId: 'workspace-1', agentId: 'agent-1', tab: 'skills' },
      selectedAgent: { id: 'agent-1', workspaceId: 'workspace-1', name: 'Operator', avatarEmoji: '🌰' }
    });

    expect(model?.kind).toBe('agent');
    expect(model?.operations.map((item) => item.id)).toEqual(['chat']);
    expect(model?.capabilities.map((item) => item.id)).toEqual(['mcpServers', 'skills', 'tools']);
    expect(model?.capabilities.find((item) => item.id === 'skills')).toMatchObject({
      active: true,
      path: '/workspaces/workspace-1/agents/agent-1/skills'
    });
    expect(model?.settings.path).toBe('/workspaces/workspace-1/agents/agent-1/settings');
  });

  it('preserves cluster catalog return state on every generated destination', () => {
    const model = createManagedSubjectNavigation({
      ...commonInput,
      activeResourceNav: 'clusterChat',
      clusterAssistantNavStatus: 'working',
      isAgentSidebar: false,
      isClusterSidebar: true,
      isVirtualMachineSidebar: false,
      route: {
        kind: 'workspaceKubernetesClusterDiagnostics',
        workspaceId: 'workspace-1',
        clusterId: 'cluster-1',
        tab: 'chat',
        catalogState: { q: 'production', status: 'attention' }
      },
      selectedCluster: {
        id: 'cluster-1',
        workspaceId: 'workspace-1',
        name: 'Production'
      } as KubernetesCluster,
      selectedClusterIssueCount: 3
    });

    expect(model?.operations.find((item) => item.id === 'overview')).toMatchObject({ badge: 3 });
    expect(model?.operations.find((item) => item.id === 'chat')).toMatchObject({
      active: true,
      assistantStatus: 'working',
      assistantStatusLabel: 'app.aiAssistantStatus.working'
    });
    expect(model?.capabilities[0]?.path).toBe(
      '/workspaces/workspace-1/kubernetes-clusters/cluster-1/mcp-servers?catalogQ=production&catalogStatus=attention'
    );
  });

  it('groups VM resource subviews under one resources destination', () => {
    const model = createManagedSubjectNavigation({
      ...commonInput,
      activeResourceNav: 'vmResources',
      isAgentSidebar: false,
      isClusterSidebar: false,
      isVirtualMachineSidebar: true,
      route: { kind: 'workspaceVirtualMachineDetail', workspaceId: 'workspace-1', vmId: 'vm-1', tab: 'network' },
      selectedVm: { id: 'vm-1', workspaceId: 'workspace-1', name: 'Gateway' }
    });

    expect(model?.operations.find((item) => item.id === 'resources')).toMatchObject({
      active: true,
      path: '/workspaces/workspace-1/virtual-machines/vm-1/resources'
    });
  });
});
