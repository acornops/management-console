import React from 'react';
import { McpServersView } from '@/features/kubernetes-cluster-detail/components/detail/views/McpServersView';
import { TargetSkillsView } from '@/features/kubernetes-cluster-detail/components/detail/views/TargetSkillsView';
import type { ControlPlaneVirtualMachine } from '@/services/controlPlaneApi';
import type { Workspace } from '@/types';
import { toClusterShim } from '@/pages/virtual-machines/virtualMachineClusterShim';

interface VirtualMachineAdminViewProps {
  view: 'mcpServers' | 'skills';
  virtualMachine: ControlPlaneVirtualMachine;
  workspace: Workspace;
}

export const VirtualMachineAdminView: React.FC<VirtualMachineAdminViewProps> = ({
  view,
  virtualMachine,
  workspace
}) => {
  const cluster = toClusterShim(virtualMachine);
  const targetContext = {
    workspaceId: workspace.id,
    targetId: virtualMachine.id,
    targetType: 'virtual_machine' as const
  };

  if (view === 'skills') {
    return (
      <TargetSkillsView
        cluster={cluster}
        targetContext={targetContext}
        canManageSkills={Boolean(workspace.permissions?.manage_skills)}
      />
    );
  }

  return (
    <McpServersView
      cluster={cluster}
      targetContext={targetContext}
      canManageMcp={Boolean(workspace.permissions?.manage_mcp)}
      canManageTools={Boolean(workspace.permissions?.manage_tools)}
      canRequestWriteRuns={Boolean(workspace.permissions?.create_read_write_runs)}
    />
  );
};
