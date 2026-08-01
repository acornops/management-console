import { describe, expect, it } from 'vitest';
import type { TargetToolCatalog } from '@/features/targets/admin/targetMcpCatalogTypes';
import type {
  ControlPlaneTargetSkillsCatalog,
  ControlPlaneTargetToolsCatalog
} from '@/services/controlPlaneApi';
import {
  cacheCapabilityCatalog,
  type CapabilityCatalogsBySubject
} from '@/features/targets/admin/useCapabilityCatalogCache';

const mcpCatalog = {
  workspaceId: 'workspace-1',
  clusterId: 'target-1',
  targetId: 'target-1',
  permissions: { canEdit: true, editableRoles: [] },
  servers: []
} satisfies TargetToolCatalog;

const skillsCatalog = {
  workspaceId: 'workspace-1',
  targetId: 'target-1',
  targetType: 'kubernetes',
  permissions: { canEdit: true, editableRoles: [] },
  items: []
} satisfies ControlPlaneTargetSkillsCatalog;

const toolsCatalog = {
  workspaceId: 'workspace-1',
  targetId: 'target-2',
  targetType: 'virtual_machine',
  permissions: { canEdit: true },
  items: []
} satisfies ControlPlaneTargetToolsCatalog;

describe('capability catalog cache', () => {
  it('retains independently loaded catalog kinds for the same subject', () => {
    const withMcp = cacheCapabilityCatalog({}, 'workspace-1:target-1', 'mcpServers', mcpCatalog);
    const withSkills = cacheCapabilityCatalog(withMcp, 'workspace-1:target-1', 'skills', skillsCatalog);

    expect(withSkills['workspace-1:target-1']).toEqual({
      mcpServers: mcpCatalog,
      skills: skillsCatalog
    });
    expect(withMcp['workspace-1:target-1']).toEqual({ mcpServers: mcpCatalog });
  });

  it('isolates cached catalogs by workspace and subject key', () => {
    const current: CapabilityCatalogsBySubject = {
      'workspace-1:target-1': { mcpServers: mcpCatalog, skills: skillsCatalog }
    };
    const next = cacheCapabilityCatalog(current, 'workspace-1:target-2', 'tools', toolsCatalog);

    expect(next['workspace-1:target-1']).toBe(current['workspace-1:target-1']);
    expect(next['workspace-1:target-2']).toEqual({ tools: toolsCatalog });
  });

  it('does not cache against an unresolved subject', () => {
    const current: CapabilityCatalogsBySubject = {};

    expect(cacheCapabilityCatalog(current, '', 'mcpServers', mcpCatalog)).toBe(current);
  });
});
