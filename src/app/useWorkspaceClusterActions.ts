import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { TFunction } from 'i18next';
import { canReadWorkspaceAuditLog, canReadWorkspaceData } from '@/app/workspacePermissions';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import { AppRoute, AppPaths } from '@/utils/routes';
import { KubernetesCluster, User, Workspace } from '@/types';
import { parseNamespaceList } from '@/app/useAppSupport';

function workspaceLandingPath(workspace: Workspace): string {
  if (canReadWorkspaceData(workspace)) {
    return AppPaths.workspaceOverview(workspace.id);
  }
  if (canReadWorkspaceAuditLog(workspace)) {
    return AppPaths.workspaceAuditLog(workspace.id);
  }
  return AppPaths.workspaceMembers(workspace.id);
}

export function getPostWorkspaceDeleteNavigationPath({
  kubernetesClusters,
  deletedWorkspaceId,
  route,
  workspaces
}: {
  kubernetesClusters: KubernetesCluster[];
  deletedWorkspaceId: string;
  route: AppRoute;
  workspaces: Workspace[];
}): string | null {
  const fallbackWorkspace = workspaces.find((workspace) => workspace.id !== deletedWorkspaceId);

  if ('workspaceId' in route && route.workspaceId === deletedWorkspaceId) {
    return fallbackWorkspace ? workspaceLandingPath(fallbackWorkspace) : AppPaths.workspaces();
  }

  if (route.kind === 'kubernetesClusterDiagnostics') {
    const currentCluster = kubernetesClusters.find((cluster) => cluster.id === route.clusterId);
    if (currentCluster?.workspaceId === deletedWorkspaceId) {
      return fallbackWorkspace ? workspaceLandingPath(fallbackWorkspace) : AppPaths.workspaces();
    }
  }

  return null;
}

export function useWorkspaceClusterActions(args: {
  kubernetesClusters: KubernetesCluster[];
  navigate: (path: string, options?: { replace?: boolean }) => void;
  route: AppRoute;
  showToast: (message: string) => void;
  t: TFunction;
  user: User | null;
  workspaces: Workspace[];
  setKubernetesClusters: Dispatch<SetStateAction<KubernetesCluster[]>>;
  setInstallAgentClusterId: Dispatch<SetStateAction<string | null>>;
  setIsMobileNavOpen: Dispatch<SetStateAction<boolean>>;
  setSelectedWorkspaceId: Dispatch<SetStateAction<string | null>>;
  setUser: Dispatch<SetStateAction<User | null>>;
  setWorkspaces: Dispatch<SetStateAction<Workspace[]>>;
}) {
  const {
    kubernetesClusters,
    navigate,
    route,
    showToast,
    t,
    user,
    workspaces,
    setKubernetesClusters,
    setInstallAgentClusterId,
    setIsMobileNavOpen,
    setSelectedWorkspaceId,
    setUser,
    setWorkspaces
  } = args;

  const [isAddingCluster, setIsAddingCluster] = useState(false);
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [targetWorkspaceIdForClusterAdd, setTargetWorkspaceIdForClusterAdd] = useState<string | null>(null);
  const [clusterCreationStep, setClusterCreationStep] = useState<'details' | 'instructions'>('details');
  const [newClusterName, setNewClusterName] = useState('');
  const [clusterInstallCommand, setClusterInstallCommand] = useState('');
  const [clusterInstallWarnings, setClusterInstallWarnings] = useState<string[]>([]);
  const [isCreatingCluster, setIsCreatingCluster] = useState(false);
  const [includeNamespaces, setIncludeNamespaces] = useState('');
  const [excludeNamespaces, setExcludeNamespaces] = useState('');
  const [createdClusterId, setCreatedClusterId] = useState<string | null>(null);

  const refreshWorkspaceSummary = async (workspaceId: string) => {
    if (!user) return;
    const refreshed = await controlPlaneApi.getWorkspace(workspaceId, user);
    const { clusterIds: _clusterIds, members: _members, ...summaryUpdates } = refreshed;
    setWorkspaces((prev) =>
      prev.map((workspace) =>
        workspace.id === workspaceId
          ? { ...workspace, ...summaryUpdates, clusterIds: workspace.clusterIds }
          : workspace
      )
    );
  };

  const handleCreateWorkspace = (workspace: Omit<Workspace, 'id' | 'clusterIds'>) => {
    void (async () => {
      try {
        if (!user) return;
        const createdWorkspace = await controlPlaneApi.createWorkspace(workspace.name, user);
        setWorkspaces((prev) =>
          prev.some((existing) => existing.id === createdWorkspace.id)
            ? prev
            : [...prev, createdWorkspace]
        );
        setUser(await controlPlaneApi.getCurrentUser());
        setSelectedWorkspaceId(createdWorkspace.id);
        navigate(AppPaths.workspaceOverview(createdWorkspace.id), { replace: true });
      } catch (err) {
        console.error('Failed creating workspace in control plane', err);
      showToast(err instanceof Error ? err.message.replace(/^Control plane request failed \(\d+\):\s*/, '') : t('app.failedCreateWorkspace'));
      }
    })();
  };

  const navigateToKubernetesCluster = (cluster: KubernetesCluster) => {
    navigate(AppPaths.workspaceKubernetesClusterDiagnostics(cluster.workspaceId, cluster.id));
  };

  const handleSelectWorkspaceContext = (workspaceId: string) => {
    setSelectedWorkspaceId(workspaceId);
    setIsMobileNavOpen(false);
    const workspace = workspaces.find((item) => item.id === workspaceId);
    navigate(workspace ? workspaceLandingPath(workspace) : AppPaths.workspaceOverview(workspaceId));
  };

  const handleInitiateAddCluster = (workspaceId: string) => {
    setTargetWorkspaceIdForClusterAdd(workspaceId);
    setClusterCreationStep('details');
    setIsAddingCluster(true);
    setClusterInstallCommand('');
    setClusterInstallWarnings([]);
    setCreatedClusterId(null);
  };

  const handleProceedToInstructions = async () => {
    if (!newClusterName.trim() || !targetWorkspaceIdForClusterAdd) return;

    setIsCreatingCluster(true);
    try {
      const result = await controlPlaneApi.registerCluster(
        targetWorkspaceIdForClusterAdd,
        {
          name: newClusterName.trim(),
          namespaceInclude: parseNamespaceList(includeNamespaces),
          namespaceExclude: parseNamespaceList(excludeNamespaces)
        }
      );

      setKubernetesClusters((prev) => [
        ...prev.filter((cluster) => cluster.id !== result.cluster.id),
        result.cluster
      ]);
      setWorkspaces((prev) =>
        prev.map((workspace) =>
          workspace.id === targetWorkspaceIdForClusterAdd
            ? {
                ...workspace,
                clusterIds: workspace.clusterIds.includes(result.cluster.id)
                  ? workspace.clusterIds
                  : [...workspace.clusterIds, result.cluster.id],
                clusterCount: workspace.clusterIds.includes(result.cluster.id)
                  ? workspace.clusterCount
                  : (workspace.clusterCount ?? workspace.clusterIds.length) + 1
              }
            : workspace
        )
      );
      await refreshWorkspaceSummary(targetWorkspaceIdForClusterAdd);
      setClusterInstallCommand(result.installCommand);
      setClusterInstallWarnings(result.installWarnings);
      setCreatedClusterId(result.cluster.id);
      setClusterCreationStep('instructions');
    } catch (err) {
      console.error('Failed registering cluster in control plane', err);
      showToast(err instanceof Error ? err.message.replace(/^Control plane request failed \(\d+\):\s*/, '') : t('app.failedRegisterCluster'));
    } finally {
      setIsCreatingCluster(false);
    }
  };

  const handleConfirmAddCluster = async () => {
    if (!newClusterName.trim() || !targetWorkspaceIdForClusterAdd) return;

    if (createdClusterId) {
      try {
        const namespaceInclude = parseNamespaceList(includeNamespaces);
        const namespaceExclude = parseNamespaceList(excludeNamespaces);
        const updatedScope = await controlPlaneApi.updateClusterNamespaceScope(
          targetWorkspaceIdForClusterAdd,
          createdClusterId,
          {
            namespaceInclude,
            namespaceExclude
          }
        );
        setKubernetesClusters((prev) =>
          prev.map((cluster) =>
            cluster.id === createdClusterId
              ? {
                  ...cluster,
                  namespace: updatedScope.namespace,
                  namespaceScope: updatedScope.namespaceScope
                }
              : cluster
          )
        );
      } catch (err) {
        console.error('Failed updating namespace scope for new cluster', err);
        showToast(err instanceof Error ? err.message.replace(/^Control plane request failed \(\d+\):\s*/, '') : t('clusterSetup.updateScopeFailed'));
        return;
      }
    }

    resetClusterCreationState();
  };

  const resetClusterCreationState = () => {
    setIsAddingCluster(false);
    setNewClusterName('');
    setClusterCreationStep('details');
    setClusterInstallCommand('');
    setClusterInstallWarnings([]);
    setTargetWorkspaceIdForClusterAdd(null);
    setIncludeNamespaces('');
    setExcludeNamespaces('');
    setCreatedClusterId(null);
  };

  const handleDeleteWorkspace = async (workspaceId: string) => {
    const workspaceToDelete = workspaces.find((workspace) => workspace.id === workspaceId);
    const workspaceName = workspaceToDelete?.name || workspaceId;

    await controlPlaneApi.deleteWorkspace(workspaceId);

    const clusterIdsToRemove = new Set(
      kubernetesClusters.filter((cluster) => cluster.workspaceId === workspaceId).map((cluster) => cluster.id)
    );

    setKubernetesClusters((prev) => prev.filter((cluster) => cluster.workspaceId !== workspaceId));
    setWorkspaces((prev) => prev.filter((workspace) => workspace.id !== workspaceId));
    setUser(await controlPlaneApi.getCurrentUser());
    setInstallAgentClusterId((current) => (current && clusterIdsToRemove.has(current) ? null : current));
    showToast(t('app.deletedWorkspace', { name: workspaceName }));

    const nextPath = getPostWorkspaceDeleteNavigationPath({
      kubernetesClusters,
      deletedWorkspaceId: workspaceId,
      route,
      workspaces
    });
    if (nextPath) {
      navigate(nextPath, { replace: true });
    }
  };

  const handleDeleteCluster = async (cluster: KubernetesCluster) => {
    const clusterName = cluster.name || cluster.id;

    await controlPlaneApi.deleteCluster(cluster.workspaceId, cluster.id);

    setKubernetesClusters((prev) => prev.filter((item) => item.id !== cluster.id));
    setWorkspaces((prev) =>
      prev.map((workspace) =>
        workspace.id === cluster.workspaceId
          ? {
              ...workspace,
              clusterIds: workspace.clusterIds.filter((clusterId) => clusterId !== cluster.id),
              clusterCount: Math.max(0, (workspace.clusterCount ?? workspace.clusterIds.length) - 1)
            }
          : workspace
      )
    );
    await refreshWorkspaceSummary(cluster.workspaceId);
    setInstallAgentClusterId((current) => (current === cluster.id ? null : current));
    showToast(t('app.deletedCluster', { name: clusterName }));

    if (route.kind === 'workspaceKubernetesClusterDiagnostics' && route.clusterId === cluster.id) {
      navigate(AppPaths.workspaceKubernetesClusters(cluster.workspaceId), { replace: true });
      return;
    }
    if (route.kind === 'kubernetesClusterDiagnostics' && route.clusterId === cluster.id) {
      navigate(AppPaths.kubernetesClusters(), { replace: true });
    }
  };

  return {
    clusterCreationStep,
    clusterInstallCommand,
    clusterInstallWarnings,
    excludeNamespaces,
    handleConfirmAddCluster,
    handleCreateWorkspace,
    handleDeleteCluster,
    handleDeleteWorkspace,
    handleInitiateAddCluster,
    handleProceedToInstructions,
    handleSelectWorkspaceContext,
    includeNamespaces,
    isAddingCluster,
    isCreatingCluster,
    isCreatingWorkspace,
    navigateToKubernetesCluster,
    newClusterName,
    newWorkspaceName,
    setClusterCreationStep,
    setExcludeNamespaces,
    setIncludeNamespaces,
    setIsAddingCluster,
    setIsCreatingWorkspace,
    setNewClusterName,
    setNewWorkspaceName
  };
}
