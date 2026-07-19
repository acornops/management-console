import React from 'react';
import { McpServersView } from '@/features/targets/admin/McpServersView';
import { TargetSkillsView } from '@/features/targets/admin/TargetSkillsView';
import { TargetToolsView } from '@/features/targets/admin/TargetToolsView';
import { toVirtualMachineTargetDescriptor } from '@/features/targets/targetDescriptor';
import type { ControlPlaneVirtualMachine } from '@/services/controlPlaneApi';
import type { Workspace } from '@/types';

interface VirtualMachineAdminViewProps {
  view: 'mcpServers' | 'skills' | 'tools';
  virtualMachine: ControlPlaneVirtualMachine;
  workspace: Workspace;
}

export const VirtualMachineAdminView: React.FC<VirtualMachineAdminViewProps> = ({
  view,
  virtualMachine,
  workspace
}) => {
  const target = toVirtualMachineTargetDescriptor({
    ...virtualMachine,
    workspaceId: workspace.id
  });

  if (view === 'skills') {
    return (
      <TargetSkillsView
        target={target}
        canManageSkills={Boolean(workspace.permissions?.manage_skills)}
      />
    );
  }

  if (view === 'tools') {
    return (
      <TargetToolsView
        target={target}
        canManageTools={Boolean(workspace.permissions?.manage_tools || workspace.permissions?.manage_target_insights)}
      />
    );
  }

  return (
    <McpServersView
      target={target}
      canManageMcp={Boolean(workspace.permissions?.manage_mcp)}
      canManageTools={Boolean(workspace.permissions?.manage_tools || workspace.permissions?.manage_target_insights)}
      canRequestWriteRuns={Boolean(workspace.permissions?.create_read_write_runs)}
      canUsePersonalConnections={Boolean(
        workspace.permissions?.create_sessions
        || workspace.permissions?.create_read_only_runs
        || workspace.permissions?.create_read_write_runs
      )}
    />
  );
};
