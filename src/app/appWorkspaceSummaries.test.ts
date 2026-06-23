import { describe, expect, it } from 'vitest';

import {
  buildKubernetesClustersByWorkspaceId,
  getWorkspaceClusterCounts,
  getWorkspaceInitials
} from '@/app/appWorkspaceSummaries';
import { KubernetesCluster, Workspace } from '@/types';

const cluster = (id: string, workspaceId: string): KubernetesCluster => ({
  id,
  workspaceId
}) as KubernetesCluster;

const workspace = (id: string, clusterCount?: number): Workspace => ({
  id,
  name: id,
  description: '',
  members: [],
  clusterIds: [],
  clusterCount
}) as Workspace;

const readableWorkspace = (id: string, clusterCount?: number): Workspace => ({
  ...workspace(id, clusterCount),
  permissions: { read_workspace_data: true } as Workspace['permissions']
});

describe('app workspace summaries', () => {
  it('groups kubernetesClusters by workspace and counts clusters', () => {
    const grouped = buildKubernetesClustersByWorkspaceId([
      cluster('cluster-1', 'workspace-a'),
      cluster('cluster-2', 'workspace-a'),
      cluster('cluster-3', 'workspace-b')
    ]);

    expect(grouped.get('workspace-a')?.map((cluster) => cluster.id)).toEqual(['cluster-1', 'cluster-2']);
    expect(getWorkspaceClusterCounts([readableWorkspace('workspace-a'), readableWorkspace('workspace-b')], grouped)).toEqual(new Map([
      ['workspace-a', 2],
      ['workspace-b', 1]
    ]));
  });

  it('prefers server-owned workspace cluster counts over loaded page length', () => {
    const grouped = buildKubernetesClustersByWorkspaceId([
      cluster('cluster-1', 'workspace-a')
    ]);

    expect(getWorkspaceClusterCounts([readableWorkspace('workspace-a', 250)], grouped)).toEqual(new Map([
      ['workspace-a', 250]
    ]));
  });

  it('keeps auditor workspace counts redacted even when stale clusters are loaded', () => {
    const grouped = buildKubernetesClustersByWorkspaceId([
      cluster('cluster-1', 'workspace-a')
    ]);

    expect(getWorkspaceClusterCounts([
      {
        ...workspace('workspace-a'),
        currentUserRole: 'auditor',
        permissions: { read_workspace_data: false } as Workspace['permissions']
      }
    ], grouped)).toEqual(new Map([
      ['workspace-a', 0]
    ]));
  });

  it('fails closed for count redaction when permission metadata is missing', () => {
    const grouped = buildKubernetesClustersByWorkspaceId([
      cluster('cluster-1', 'workspace-a')
    ]);

    expect(getWorkspaceClusterCounts([
      {
        ...workspace('workspace-a'),
        currentUserRole: 'owner'
      }
    ], grouped)).toEqual(new Map([
      ['workspace-a', 0]
    ]));
  });

  it('uses role-template capabilities when deciding stale workspace count redaction', () => {
    const grouped = buildKubernetesClustersByWorkspaceId([
      cluster('cluster-1', 'workspace-a')
    ]);

    expect(getWorkspaceClusterCounts([
      {
        ...workspace('workspace-a'),
        currentUserRole: 'inventory_auditor',
        currentUserRoleTemplate: {
          key: 'inventory_auditor',
          displayName: 'Inventory Auditor',
          description: '',
          kind: 'custom',
          capabilities: ['read_members'],
          protected: false,
          sortOrder: 250
        },
        clusterCount: 0
      }
    ], grouped)).toEqual(new Map([
      ['workspace-a', 0]
    ]));
  });

  it('derives compact workspace initials', () => {
    expect(getWorkspaceInitials('Platform Operations')).toBe('PO');
    expect(getWorkspaceInitials('')).toBe('W');
  });
});
