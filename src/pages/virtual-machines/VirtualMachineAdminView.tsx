import React from 'react';
import { CapabilityAdminView } from '@/features/capabilities/CapabilityAdminView';
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

  return (
    <CapabilityAdminView
      cacheKey={`${workspace.id}:${virtualMachine.id}`}
      section={view}
      subject={target}
      mcp={{
        canManageMcp: Boolean(workspace.permissions?.manage_mcp),
        canManageTools: Boolean(workspace.permissions?.manage_tools || workspace.permissions?.manage_target_insights),
        canRequestWriteRuns: Boolean(workspace.permissions?.create_read_write_runs),
        initialCatalog: cachedCatalogs?.mcpServers,
        onCatalogChange: cacheMcpServersCatalog
      }}
      skills={{
        canManageSkills: Boolean(workspace.permissions?.manage_skills),
        initialCatalog: cachedCatalogs?.skills,
        onCatalogChange: cacheSkillsCatalog
      }}
      tools={{
        canManageTools: Boolean(workspace.permissions?.manage_tools || workspace.permissions?.manage_target_insights),
        initialCatalog: cachedCatalogs?.tools,
        onCatalogChange: cacheToolsCatalog
      }}
    />
  );
};
