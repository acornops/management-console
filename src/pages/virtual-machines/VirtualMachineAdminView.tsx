import React from 'react';
import { McpServersView } from '@/features/targets/admin/McpServersView';
import { TargetSkillsView } from '@/features/targets/admin/TargetSkillsView';
import { TargetToolsView } from '@/features/targets/admin/TargetToolsView';
import type { CapabilityCatalogCache } from '@/features/targets/admin/useCapabilityCatalogCache';
import type { TargetToolCatalog } from '@/features/targets/admin/targetMcpCatalogTypes';
import { toVirtualMachineTargetDescriptor } from '@/features/targets/targetDescriptor';
import type {
  ControlPlaneTargetSkillsCatalog,
  ControlPlaneTargetToolsCatalog,
  ControlPlaneVirtualMachine
} from '@/services/controlPlaneApi';
import type { Workspace } from '@/types';

interface VirtualMachineAdminViewProps {
  view: 'mcpServers' | 'skills' | 'tools';
  virtualMachine: ControlPlaneVirtualMachine;
  workspace: Workspace;
  cachedCatalogs?: CapabilityCatalogCache;
  cacheMcpServersCatalog: (catalog: TargetToolCatalog) => void;
  cacheSkillsCatalog: (catalog: ControlPlaneTargetSkillsCatalog) => void;
  cacheToolsCatalog: (catalog: ControlPlaneTargetToolsCatalog) => void;
}

export const VirtualMachineAdminView: React.FC<VirtualMachineAdminViewProps> = ({
  view,
  virtualMachine,
  workspace,
  cachedCatalogs,
  cacheMcpServersCatalog,
  cacheSkillsCatalog,
  cacheToolsCatalog
}) => {
  const target = toVirtualMachineTargetDescriptor({
    ...virtualMachine,
    workspaceId: workspace.id
  });

  if (view === 'skills') {
    return (
      <TargetSkillsView
        key={`${workspace.id}:${virtualMachine.id}`}
        subject={target}
        canManageSkills={Boolean(workspace.permissions?.manage_skills)}
        initialCatalog={cachedCatalogs?.skills}
        onCatalogChange={cacheSkillsCatalog}
      />
    );
  }

  if (view === 'tools') {
    return (
      <TargetToolsView
        key={`${workspace.id}:${virtualMachine.id}`}
        subject={target}
        canManageTools={Boolean(workspace.permissions?.manage_tools || workspace.permissions?.manage_target_insights)}
        initialCatalog={cachedCatalogs?.tools}
        onCatalogChange={cacheToolsCatalog}
      />
    );
  }

  return (
    <McpServersView
      key={`${workspace.id}:${virtualMachine.id}`}
      subject={target}
      canManageMcp={Boolean(workspace.permissions?.manage_mcp)}
      canManageTools={Boolean(workspace.permissions?.manage_tools || workspace.permissions?.manage_target_insights)}
      canRequestWriteRuns={Boolean(workspace.permissions?.create_read_write_runs)}
      initialCatalog={cachedCatalogs?.mcpServers}
      onCatalogChange={cacheMcpServersCatalog}
    />
  );
};
