import type React from 'react';
import type { TFunction } from 'i18next';

import type { ActiveResourceNav } from '@/app/appRouteState';
import type { AssistantNavStatus } from '@/app/assistantNavStatus';
import { ICONS } from '@/constants';
import type { ControlPlaneVirtualMachine } from '@/services/controlPlaneApi';
import type { AgentDefinitionApi } from '@/services/control-plane/agentApi';
import type { KubernetesCluster } from '@/types';
import { AppPaths, type AppRoute } from '@/utils/routes';

export type ManagedSubjectKind = 'agent' | 'kubernetes' | 'virtual_machine';

export interface ManagedSubjectNavigationItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
  active: boolean;
  badge?: number;
  assistantStatus?: AssistantNavStatus;
  assistantStatusLabel?: string;
}

export interface ManagedSubjectNavigationModel {
  kind: ManagedSubjectKind;
  destinationLabel: string;
  backLabel: string;
  backPath: string;
  identity: {
    label: string;
    name: string;
    emoji?: string;
    testId: string;
  };
  operationsLabel: string;
  capabilitiesLabel: string;
  operations: ManagedSubjectNavigationItem[];
  capabilities: ManagedSubjectNavigationItem[];
  settings: ManagedSubjectNavigationItem;
}

interface ManagedSubjectNavigationInput {
  activeResourceNav: ActiveResourceNav;
  backPath: string;
  clusterAssistantNavStatus: AssistantNavStatus;
  isAgentSidebar: boolean;
  isClusterSidebar: boolean;
  isVirtualMachineSidebar: boolean;
  route: AppRoute;
  selectedAgent: (Pick<AgentDefinitionApi, 'id' | 'workspaceId' | 'name'> & Partial<Pick<AgentDefinitionApi, 'avatarEmoji'>>) | null;
  selectedCluster: KubernetesCluster | null;
  selectedClusterIssueCount: number;
  selectedVm: Pick<ControlPlaneVirtualMachine, 'id' | 'workspaceId' | 'name'> | null;
  selectedVmIssueCount: number;
  t: TFunction;
}

function capabilityItems(
  pathFor: (tab: 'mcpServers' | 'skills' | 'tools') => string,
  activeResourceNav: ActiveResourceNav,
  navPrefix: 'agent' | 'cluster' | 'vm',
  t: TFunction
): ManagedSubjectNavigationItem[] {
  return [
    ['mcpServers', 'McpServers', t('app.mcpServers'), ICONS.Server],
    ['skills', 'Skills', t('app.skills'), ICONS.BookOpen],
    ['tools', 'Tools', t('app.tools'), ICONS.Wrench]
  ].map(([id, navSuffix, label, icon]) => ({
    id: id as string,
    label: label as string,
    icon: icon as React.ElementType,
    path: pathFor(id as 'mcpServers' | 'skills' | 'tools'),
    active: activeResourceNav === `${navPrefix}${navSuffix}` as ActiveResourceNav
  }));
}

export function createManagedSubjectNavigation(
  input: ManagedSubjectNavigationInput
): ManagedSubjectNavigationModel | null {
  const {
    activeResourceNav,
    backPath,
    clusterAssistantNavStatus,
    route,
    selectedAgent,
    selectedCluster,
    selectedClusterIssueCount,
    selectedVm,
    selectedVmIssueCount,
    t
  } = input;

  if (input.isAgentSidebar && selectedAgent) {
    const pathFor = (tab: 'chat' | 'mcpServers' | 'skills' | 'tools' | 'settings') =>
      AppPaths.workspaceAgentDetail(selectedAgent.workspaceId, selectedAgent.id, tab);
    return {
      kind: 'agent',
      destinationLabel: t('app.agentDestinations'),
      backLabel: t('agentChat.backToAgents'),
      backPath,
      identity: {
        label: t('app.activeAgent'),
        name: selectedAgent.name,
        emoji: selectedAgent.avatarEmoji,
        testId: 'agent'
      },
      operationsLabel: t('app.operations'),
      capabilitiesLabel: t('app.capabilities'),
      operations: [{
        id: 'chat',
        label: t('app.agentAssistant'),
        icon: ICONS.BotMessageSquare,
        path: pathFor('chat'),
        active: activeResourceNav === 'agentChat'
      }],
      capabilities: capabilityItems(pathFor, activeResourceNav, 'agent', t),
      settings: {
        id: 'settings',
        label: t('app.agentSettings'),
        icon: ICONS.Settings,
        path: pathFor('settings'),
        active: activeResourceNav === 'agentSettings'
      }
    };
  }

  if (input.isClusterSidebar && selectedCluster) {
    const pathFor = (tab: 'overview' | 'resources' | 'mcpServers' | 'skills' | 'tools' | 'chat' | 'settings') =>
      AppPaths.workspaceKubernetesClusterDiagnostics(
        selectedCluster.workspaceId,
        selectedCluster.id,
        tab,
        route.kind === 'workspaceKubernetesClusterDiagnostics' ? route.catalogState : undefined
      );
    return {
      kind: 'kubernetes',
      destinationLabel: t('app.clusterDestinations'),
      backLabel: t('app.backToWorkspace'),
      backPath,
      identity: {
        label: t('app.activeCluster'),
        name: selectedCluster.name,
        testId: 'cluster'
      },
      operationsLabel: t('app.operations'),
      capabilitiesLabel: t('app.capabilities'),
      operations: [
        {
          id: 'overview', label: t('app.overview'), icon: ICONS.LayoutGrid,
          path: pathFor('overview'), active: activeResourceNav === 'clusterOverview', badge: selectedClusterIssueCount
        },
        {
          id: 'chat', label: t('app.clusterAssistant'), icon: ICONS.BotMessageSquare,
          path: pathFor('chat'), active: activeResourceNav === 'clusterChat', assistantStatus: clusterAssistantNavStatus,
          assistantStatusLabel: clusterAssistantNavStatus === 'idle' ? undefined : t(`app.aiAssistantStatus.${clusterAssistantNavStatus}`)
        },
        {
          id: 'resources', label: t('app.resources'), icon: ICONS.Activity,
          path: pathFor('resources'), active: activeResourceNav === 'clusterResources'
        }
      ],
      capabilities: capabilityItems(pathFor, activeResourceNav, 'cluster', t),
      settings: {
        id: 'settings', label: t('app.clusterSettings'), icon: ICONS.Settings,
        path: pathFor('settings'), active: activeResourceNav === 'clusterSettings'
      }
    };
  }

  if (input.isVirtualMachineSidebar && selectedVm) {
    const pathFor = (tab: 'overview' | 'resources' | 'mcpServers' | 'skills' | 'tools' | 'chat' | 'settings') =>
      AppPaths.workspaceVirtualMachineDetail(
        selectedVm.workspaceId,
        selectedVm.id,
        tab,
        route.kind === 'workspaceVirtualMachineDetail' ? route.catalogState : undefined
      );
    return {
      kind: 'virtual_machine',
      destinationLabel: t('app.virtualMachineDestinations'),
      backLabel: t('app.backToWorkspace'),
      backPath,
      identity: {
        label: t('app.activeVirtualMachine'),
        name: selectedVm.name,
        testId: 'virtual-machine'
      },
      operationsLabel: t('app.operations'),
      capabilitiesLabel: t('app.capabilities'),
      operations: [
        {
          id: 'overview', label: t('app.overview'), icon: ICONS.LayoutGrid,
          path: pathFor('overview'), active: activeResourceNav === 'vmOverview', badge: selectedVmIssueCount
        },
        {
          id: 'chat', label: t('app.vmAssistant'), icon: ICONS.BotMessageSquare,
          path: pathFor('chat'), active: activeResourceNav === 'vmChat'
        },
        {
          id: 'resources', label: t('app.resources'), icon: ICONS.Activity,
          path: pathFor('resources'), active: activeResourceNav === 'vmResources'
        }
      ],
      capabilities: capabilityItems(pathFor, activeResourceNav, 'vm', t),
      settings: {
        id: 'settings', label: t('app.vmSettings'), icon: ICONS.Settings,
        path: pathFor('settings'), active: activeResourceNav === 'vmSettings'
      }
    };
  }

  return null;
}
