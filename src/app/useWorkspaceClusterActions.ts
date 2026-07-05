import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { TFunction } from 'i18next';
import { workspaceLandingPath } from '@/app/appNavigationGuards';
import { formatControlPlaneError } from '@/services/control-plane/errorFormatting';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import { AppRoute, AppPaths } from '@/utils/routes';
import { KubernetesCluster, User, Workspace } from '@/types';
import { parseNamespaceList } from '@/app/useAppSupport';
import type { AgentAccessMode } from '@/services/control-plane/types';

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
  const [targetWorkspaceIdForClusterAdd, setTargetWorkspaceIdForClusterAdd] = useState<string | null>(null);
  const [clusterCreationStep, setClusterCreationStep] = useState<'details' | 'instructions'>('details');
  const [newClusterName, setNewClusterName] = useState('');
  const [clusterInstallCommand, setClusterInstallCommand] = useState('');
  const [clusterInstallWarnings, setClusterInstallWarnings] = useState<string[]>([]);
  const [isCreatingCluster, setIsCreatingCluster] = useState(false);
  const [includeNamespaces, setIncludeNamespaces] = useState('');
  const [excludeNamespaces, setExcludeNamespaces] = useState('');

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

  const handleCreateWorkspace = async (name: string): Promise<Workspace> => {
    if (!user) {
      throw new Error(t('app.failedCreateWorkspace'));
    }

    try {
      const createdWorkspace = await controlPlaneApi.createWorkspace(name, user);
      setWorkspaces((prev) =>
        prev.some((existing) => existing.id === createdWorkspace.id)
          ? prev
          : [...prev, createdWorkspace]
      );
      setUser(await controlPlaneApi.getCurrentUser());
      setSelectedWorkspaceId(createdWorkspace.id);
      navigate(AppPaths.workspaceOverview(createdWorkspace.id), { replace: true });
      return createdWorkspace;
    } catch (err) {
      console.error('Failed creating workspace in control plane', err);
      throw err instanceof Error ? err : new Error(t('app.failedCreateWorkspace'));
    }
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
    setNewClusterName('');
    setIncludeNamespaces('');
    setExcludeNamespaces('');
    setClusterInstallCommand('');
    setClusterInstallWarnings([]);
  };

  const handleProceedToInstructions = async (selectedAgentAccessMode: AgentAccessMode = 'read_only') => {
    if (!newClusterName.trim() || !targetWorkspaceIdForClusterAdd) return;

    setIsCreatingCluster(true);
    try {
      const result = await controlPlaneApi.registerCluster(
        targetWorkspaceIdForClusterAdd,
        {
          name: newClusterName.trim(),
          agentAccessMode: selectedAgentAccessMode,
          namespaceInclude: parseNamespaceList(includeNamespaces),
          namespaceExclude: parseNamespaceList(excludeNamespaces)
        }
      );

      setKubernetesClusters((prev) => [
        result.cluster,
        ...prev.filter((cluster) => cluster.id !== result.cluster.id)
      ]);
      setWorkspaces((prev) =>
        prev.map((workspace) =>
          workspace.id === targetWorkspaceIdForClusterAdd
            ? {
                ...workspace,
                clusterIds: workspace.clusterIds.includes(result.cluster.id)
                  ? workspace.clusterIds
                  : [result.cluster.id, ...workspace.clusterIds],
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
      setClusterCreationStep('instructions');
    } catch (err) {
      console.error('Failed registering cluster in control plane', err);
      showToast(formatControlPlaneError(err, t('app.failedRegisterCluster'), { area: 'cluster' }));
    } finally {
      setIsCreatingCluster(false);
    }
  };

  const handleConfirmAddCluster = async () => {
    resetClusterCreationState();
  };

  const handleCancelAddCluster = () => {
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
    try {
      await refreshWorkspaceSummary(cluster.workspaceId);
    } catch (err) {
      console.warn('Failed refreshing workspace summary after deleting cluster', err);
    }
    setInstallAgentClusterId((current) => (current === cluster.id ? null : current));
    showToast(t('app.deletedCluster', { name: clusterName }));

    if (route.kind === 'workspaceKubernetesClusterDiagnostics' && route.clusterId === cluster.id) {
      navigate(AppPaths.workspaceKubernetesClusters(cluster.workspaceId, route.catalogState), { replace: true });
      return;
    }
    if (route.kind === 'kubernetesClusterDiagnostics' && route.clusterId === cluster.id) {
      navigate(AppPaths.kubernetesClusters(route.catalogState), { replace: true });
    }
  };

  return {
    clusterCreationStep,
    clusterInstallCommand,
    clusterInstallWarnings,
    excludeNamespaces,
    handleCancelAddCluster,
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
    setClusterCreationStep,
    setExcludeNamespaces,
    setIncludeNamespaces,
    setIsCreatingWorkspace,
    setNewClusterName
  };
}
