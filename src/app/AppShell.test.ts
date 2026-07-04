import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const appShell = readFileSync(resolve(root, 'src/app/AppShell.tsx'), 'utf8');

describe('AppShell cluster page callbacks', () => {
  it('keeps workspace cluster merge callbacks stable across parent renders', () => {
    expect(appShell).toContain('const appendWorkspaceKubernetesClusters = React.useCallback');
    expect(appShell).toContain('const byId = new Map(workspaceKubernetesClusters.map((cluster) => [cluster.id, cluster]));');
    expect(appShell).toContain('for (const cluster of nextClusters) byId.set(cluster.id, cluster);');
    expect(appShell).toContain('}, [setKubernetesClusters, setWorkspaces]);');
    expect(appShell).not.toContain('const replaceWorkspaceKubernetesClusters = React.useCallback');
    expect(appShell).not.toContain('onReplaceWorkspaceKubernetesClusters={');
  });

  it('keeps assistant completion indicators unseen-aware instead of always showing old terminal traces', () => {
    expect(appShell).toContain("const [clusterAssistantNavStatus, setClusterAssistantNavStatus] = React.useState<AssistantNavStatus>('idle');");
    expect(appShell).toContain("const isClusterChatVisible = activeClusterSubview === 'chat' || Boolean(isClusterCopilotOpen && clusterCopilotCluster);");
    expect(appShell).toContain('previousAssistantRuntimeStatusRef.current = status;');
    expect(appShell).toContain('isClusterChatVisibleRef.current = isClusterChatVisible;');
    expect(appShell).toContain('isActiveAssistantStatus(previousStatus) && !isClusterChatVisibleRef.current');
    expect(appShell).toContain('clusterAssistantNavStatus={clusterAssistantNavStatus}');
    expect(appShell).toContain('onAssistantRuntimeStatusChange={handleAssistantRuntimeStatusChange}');
  });

  it('keeps target back navigation aligned with the page that opened the target', () => {
    expect(appShell).toContain('interface TargetReturnContext');
    expect(appShell).toContain('function getTargetReturnContext(previousRoute: AppRoute | null, nextRoute: AppRoute): TargetReturnContext | null');
    expect(appShell).toContain("previousRoute?.kind === 'workspaceOverview'");
    expect(appShell).toContain('path: AppPaths.workspaceOverview(nextRoute.workspaceId)');
    expect(appShell).toContain("previousRoute?.kind === 'workspaceKubernetesClusters'");
    expect(appShell).toContain('path: AppPaths.workspaceKubernetesClusters(nextRoute.workspaceId, {');
    expect(appShell).toContain('q: previousRoute.q,');
    expect(appShell).toContain('status: previousRoute.status,');
    expect(appShell).toContain('selectedClusterId: nextRoute.clusterId');
    expect(appShell).toContain("previousRoute?.kind === 'workspaceVirtualMachines'");
    expect(appShell).toContain('path: AppPaths.workspaceVirtualMachines(nextRoute.workspaceId)');
    expect(appShell).toContain('const getBackToWorkspacePath = React.useCallback');
    expect(appShell).toContain("if (route.kind === 'workspaceKubernetesClusterDiagnostics')");
    expect(appShell).toContain('...route.catalogState,');
    expect(appShell).toContain('selectedClusterId: route.clusterId');
    expect(appShell).toContain('onBackToWorkspaceSidebar={() => navigate(getBackToWorkspacePath())}');
    expect(appShell).toContain("AppPaths.workspaceKubernetesClusterDiagnostics(selectedSidebarCluster.workspaceId, selectedSidebarCluster.id, tab, route.kind === 'workspaceKubernetesClusterDiagnostics' ? route.catalogState : undefined)");
  });
});
