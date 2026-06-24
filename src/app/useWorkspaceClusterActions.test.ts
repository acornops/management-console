import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { getPostWorkspaceDeleteNavigationPath } from '@/app/useWorkspaceClusterActions';
import { HealthStatus, KubernetesCluster, Workspace } from '@/types';

const actionsSource = readFileSync(resolve(__dirname, 'useWorkspaceClusterActions.ts'), 'utf8');

const workspace = (id: string): Workspace => ({
  id,
  name: id,
  description: '',
  clusterIds: [],
  members: [],
  permissions: { read_workspace_data: true } as Workspace['permissions']
});

const cluster = (id: string, workspaceId: string): KubernetesCluster => ({
  id,
  name: id,
  cluster: id,
  namespace: 'default',
  workspaceId,
  owners: [],
  gitlabPipelines: [],
  status: HealthStatus.GREEN,
  podStats: { running: 0, failed: 0, pending: 0 },
  metrics: { cpu: '0', memory: '0' },
  lastUpdate: '',
  mcpTools: [],
  chatSessions: [],
  workloads: [],
  nodes: [],
  namespaces: [],
  services: [],
  ingresses: [],
  pvcs: [],
  alerts: []
});

describe('getPostWorkspaceDeleteNavigationPath', () => {
  it('prepends newly registered clusters so the next setup action stays visible', () => {
    expect(actionsSource).toContain('setKubernetesClusters((prev) => [\n        result.cluster,\n        ...prev.filter((cluster) => cluster.id !== result.cluster.id)\n      ]);');
    expect(actionsSource).toContain(': [result.cluster.id, ...workspace.clusterIds],');
  });

  it('returns the workspace list route after deleting the last workspace on a workspace route', () => {
    expect(getPostWorkspaceDeleteNavigationPath({
      kubernetesClusters: [],
      deletedWorkspaceId: 'workspace-a',
      route: { kind: 'workspaceSettings', workspaceId: 'workspace-a' },
      workspaces: [workspace('workspace-a')]
    })).toBe('/workspaces');
  });

  it('returns the fallback workspace overview when another workspace remains', () => {
    expect(getPostWorkspaceDeleteNavigationPath({
      kubernetesClusters: [],
      deletedWorkspaceId: 'workspace-a',
      route: { kind: 'workspaceSettings', workspaceId: 'workspace-a' },
      workspaces: [workspace('workspace-a'), workspace('workspace-b')]
    })).toBe('/workspaces/workspace-b/overview');
  });

  it('moves away from stale cluster routes when their workspace was deleted', () => {
    expect(getPostWorkspaceDeleteNavigationPath({
      kubernetesClusters: [cluster('cluster-a', 'workspace-a')],
      deletedWorkspaceId: 'workspace-a',
      route: { kind: 'kubernetesClusterDiagnostics', clusterId: 'cluster-a' },
      workspaces: [workspace('workspace-a')]
    })).toBe('/workspaces');
  });

  it('does not redirect unrelated routes', () => {
    expect(getPostWorkspaceDeleteNavigationPath({
      kubernetesClusters: [],
      deletedWorkspaceId: 'workspace-a',
      route: { kind: 'settings' },
      workspaces: [workspace('workspace-a')]
    })).toBeNull();
  });
});
