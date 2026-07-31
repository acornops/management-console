import React from 'react';
import { AppVirtualMachineCopilotPanel } from '@/app/AppVirtualMachineCopilotPanel';
import type { NavigateOptions } from '@/hooks/useAppRouter';
import type { PendingVmTargetPrompt, TargetPromptRequest } from '@/pages/target-prompts/targetPromptModel';
import type { ControlPlaneVirtualMachine } from '@/services/controlPlaneApi';
import type { KubernetesCluster, Workspace } from '@/types';
import { AppPaths, type AppRoute } from '@/utils/routes';

interface UseTargetPromptLauncherOptions {
  isDark: boolean;
  kubernetesClusters: KubernetesCluster[];
  navigate: (path: string, options?: NavigateOptions) => void;
  openClusterCopilot: (cluster: KubernetesCluster, prompt?: string) => void;
  route: AppRoute;
  setClusterCopilotInitialPrompt: React.Dispatch<React.SetStateAction<{ id: number; text: string } | null>>;
  setIsClusterCopilotOpen: React.Dispatch<React.SetStateAction<boolean>>;
  userId: string;
  virtualMachines: ControlPlaneVirtualMachine[];
  workspaceContext?: Workspace;
  workspaces: Workspace[];
}

export function useTargetPromptLauncher({
  isDark,
  kubernetesClusters,
  navigate,
  openClusterCopilot,
  route,
  setClusterCopilotInitialPrompt,
  setIsClusterCopilotOpen,
  userId,
  virtualMachines,
  workspaceContext,
  workspaces
}: UseTargetPromptLauncherOptions) {
  const [pendingVmTargetPrompt, setPendingVmTargetPrompt] = React.useState<PendingVmTargetPrompt | null>(null);
  const [vmCopilotRequest, setVmCopilotRequest] = React.useState<{
    initialPrompt: string;
    vm: ControlPlaneVirtualMachine;
  } | null>(null);
  const [vmCopilotWidth, setVmCopilotWidth] = React.useState(420);

  const runTargetPrompt = React.useCallback((request: TargetPromptRequest) => {
    if (request.targetType === 'kubernetes') {
      const cluster = kubernetesClusters.find(
        (item) => item.id === request.targetId && item.workspaceId === request.workspaceId
      );
      if (!cluster) return;
      setVmCopilotRequest(null);
      openClusterCopilot(cluster, request.prompt);
      return;
    }

    const vm = virtualMachines.find(
      (item) => item.id === request.targetId && item.workspaceId === request.workspaceId
    );
    if (vm) {
      setIsClusterCopilotOpen(false);
      setClusterCopilotInitialPrompt(null);
      setVmCopilotRequest({ initialPrompt: request.prompt, vm });
      return;
    }

    setPendingVmTargetPrompt({
      workspaceId: request.workspaceId,
      targetId: request.targetId,
      prompt: request.prompt,
      id: Date.now()
    });
    navigate(AppPaths.workspaceVirtualMachineDetail(
      request.workspaceId,
      request.targetId,
      'chat',
      route.kind === 'workspaceVirtualMachineDetail' ? route.catalogState : undefined
    ));
  }, [
    kubernetesClusters,
    navigate,
    openClusterCopilot,
    route,
    setClusterCopilotInitialPrompt,
    setIsClusterCopilotOpen,
    virtualMachines
  ]);

  const vmWorkspace = vmCopilotRequest
    ? workspaces.find((item) => item.id === vmCopilotRequest.vm.workspaceId) || workspaceContext
    : undefined;
  const vmCopilotPanel = vmCopilotRequest && vmWorkspace ? (
    <AppVirtualMachineCopilotPanel
      currentUserId={userId}
      initialPrompt={vmCopilotRequest.initialPrompt}
      isDark={isDark}
      vm={vmCopilotRequest.vm}
      width={vmCopilotWidth}
      workspace={vmWorkspace}
      navigate={navigate}
      onClose={() => setVmCopilotRequest(null)}
      onInitialPromptHandled={() => {
        setVmCopilotRequest((current) => current ? { ...current, initialPrompt: '' } : null);
      }}
      onResizeWidth={setVmCopilotWidth}
    />
  ) : null;

  return {
    consumePendingVmTargetPrompt: () => setPendingVmTargetPrompt(null),
    pendingVmTargetPrompt,
    runTargetPrompt,
    vmCopilotPanel
  };
}
