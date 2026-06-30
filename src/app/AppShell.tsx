import React from 'react';
import { AppClusterChatRuntime } from '@/app/AppClusterChatRuntime';
import { AppClusterCopilotPanel } from '@/app/AppClusterCopilotPanel';
import { AppDesktopSidebar } from '@/app/AppDesktopSidebar';
import { AppDialogs } from '@/app/AppDialogs';
import { AppMobileNavigation } from '@/app/AppMobileNavigation';
import { AppPageContent } from '@/app/AppPageContent';
import {
  isActiveAssistantStatus,
  isTerminalAssistantStatus,
  type AssistantNavStatus
} from '@/app/assistantNavStatus';
import { ActivePrimaryNav, ActiveResourceNav, getClusterBackToWorkspacePath, getVirtualMachineBackToWorkspacePath } from '@/app/appRouteState';
import { getWorkspaceInitials } from '@/app/appWorkspaceSummaries';
import { useCreateWorkspaceInviteSetup } from '@/app/useCreateWorkspaceInviteSetup';
import { useTargetIssueSummary } from '@/app/useTargetIssueSummary';
import type { NavigateOptions as RouterNavigateOptions } from '@/hooks/useAppRouter';
import type { AppLanguageCode, AppLanguageOption } from '@/i18n/languageConfig';
import type { PendingVmTargetPrompt, TargetPromptRequest } from '@/pages/target-prompts/targetPromptModel';
import type { controlPlaneApi as ControlPlaneApi } from '@/services/controlPlaneApi';
import type { ControlPlaneVirtualMachine } from '@/services/controlPlaneApi';
import type { AgentAccessMode } from '@/services/control-plane/types';
import { KubernetesCluster, User, Workspace, WorkspaceInvitation } from '@/types';
import { AppPaths, AppRoute, ClusterSubview, VmSubview } from '@/utils/routes';

interface TargetReturnContext {
  targetId: string;
  targetType: 'kubernetes' | 'virtual_machine';
  workspaceId: string;
  path: string;
}

function getTargetReturnContext(previousRoute: AppRoute | null, nextRoute: AppRoute): TargetReturnContext | null {
  if (nextRoute.kind === 'workspaceKubernetesClusterDiagnostics') {
    if (previousRoute?.kind === 'workspaceOverview' && previousRoute.workspaceId === nextRoute.workspaceId) {
      return {
        targetId: nextRoute.clusterId,
        targetType: 'kubernetes',
        workspaceId: nextRoute.workspaceId,
        path: AppPaths.workspaceOverview(nextRoute.workspaceId)
      };
    }
    if (previousRoute?.kind === 'workspaceKubernetesClusters' && previousRoute.workspaceId === nextRoute.workspaceId) {
      return {
        targetId: nextRoute.clusterId,
        targetType: 'kubernetes',
        workspaceId: nextRoute.workspaceId,
        path: AppPaths.workspaceKubernetesClusters(nextRoute.workspaceId)
      };
    }
  }

  if (nextRoute.kind === 'workspaceVirtualMachineDetail') {
    if (previousRoute?.kind === 'workspaceOverview' && previousRoute.workspaceId === nextRoute.workspaceId) {
      return {
        targetId: nextRoute.vmId,
        targetType: 'virtual_machine',
        workspaceId: nextRoute.workspaceId,
        path: AppPaths.workspaceOverview(nextRoute.workspaceId)
      };
    }
    if (previousRoute?.kind === 'workspaceVirtualMachines' && previousRoute.workspaceId === nextRoute.workspaceId) {
      return {
        targetId: nextRoute.vmId,
        targetType: 'virtual_machine',
        workspaceId: nextRoute.workspaceId,
        path: AppPaths.workspaceVirtualMachines(nextRoute.workspaceId)
      };
    }
  }

  return null;
}

interface AppShellProps {
  acceptWorkspaceInvitation: (token: string) => Promise<void>;
  activeClusterSubview: ClusterSubview;
  activeVmSubview: VmSubview;
  activePrimaryNav: ActivePrimaryNav;
  activeResourceNav: ActiveResourceNav;
  kubernetesClusters: KubernetesCluster[];
  kubernetesClustersInWorkspaceContext: KubernetesCluster[];
  virtualMachinesInWorkspaceContext: ControlPlaneVirtualMachine[];
  hasLoadedWorkspaceVirtualMachines: boolean;
  clusterContextId: string | undefined;
  clusterCopilotCluster: KubernetesCluster | null;
  clusterCopilotInitialPrompt: { id: number; text: string } | null;
  clusterCopilotWidth: number;
  clusterCopilotWorkspace: Workspace | undefined;
  clusterCreationStep: 'details' | 'instructions';
  clusterInstallCommand: string;
  clusterInstallWarnings: string[];
  deleteTargetWorkspace: Workspace | undefined;
  dismissToast: (id: string) => void;
  excludeNamespaces: string;
  getCurrentUserRoleForWorkspace: (workspaceId: string) => Workspace['members'][number]['role'];
  getWorkspacePermission: (workspaceId: string, permission: keyof NonNullable<Workspace['permissions']>) => boolean;
  handleCancelAddCluster: () => void;
  handleConfirmAddCluster: () => Promise<void>;
  handleCreateWorkspace: (name: string) => Promise<Workspace>;
  handleDeleteCluster: (cluster: KubernetesCluster) => Promise<void>;
  handleDeleteWorkspace: (workspaceId: string) => Promise<void>;
  handleInitiateAddCluster: (workspaceId: string) => void;
  handleLogout: () => Promise<void>;
  handleProceedToInstructions: (agentAccessMode?: AgentAccessMode) => Promise<void>;
  handleSelectWorkspaceContext: (workspaceId: string) => void;
  includeNamespaces: string;
  installAgentCluster: KubernetesCluster | null;
  installAgentWorkspace: Workspace | undefined;
  currentUserEmail: string;
  invitationTokenMissingMessage: string;
  isAddingCluster: boolean;
  isClusterCopilotOpen: boolean;
  isClusterSidebar: boolean;
  isVirtualMachineSidebar: boolean;
  isCreatingCluster: boolean;
  isCreatingWorkspace: boolean;
  isDark: boolean;
  isDeletingWorkspace: boolean;
  isMobileNavOpen: boolean;
  isAccountMenuOpen: boolean;
  isSidebarWorkspaceMenuOpen: boolean;
  language: AppLanguageCode;
  languageOptions: AppLanguageOption[];
  loadWorkspaceInvitation: (token: string) => ReturnType<typeof ControlPlaneApi.getWorkspaceInvitation>;
  navigate: (path: string, options?: RouterNavigateOptions) => void;
  navigateToKubernetesCluster: (cluster: KubernetesCluster) => void;
  newClusterName: string;
  openClusterCopilot: (cluster: KubernetesCluster, prompt?: string) => void;
  onConversationDeleted: (sessionName: string, targetName: string) => void;
  refreshWorkspaceInvitations: (workspaceId: string) => Promise<void>;
  refreshWorkspaceMembers: (workspaceId: string) => Promise<void>;
  route: AppRoute;
  selectedSidebarCluster: KubernetesCluster | null;
  selectedSidebarVm: Pick<ControlPlaneVirtualMachine, 'id' | 'workspaceId' | 'name'> | null;
  selectedWorkspace: Workspace | undefined;
  selectedWorkspaceId: string | null;
  setKubernetesClusters: React.Dispatch<React.SetStateAction<KubernetesCluster[]>>;
  onReplaceWorkspaceVirtualMachines: (workspaceId: string, nextVirtualMachines: ControlPlaneVirtualMachine[]) => void;
  onUpsertWorkspaceVirtualMachine: (workspaceId: string, virtualMachine: ControlPlaneVirtualMachine) => void;
  onRemoveWorkspaceVirtualMachine: (workspaceId: string, virtualMachineId: string) => void;
  setClusterCopilotInitialPrompt: React.Dispatch<React.SetStateAction<{ id: number; text: string } | null>>;
  setClusterCopilotWidth: React.Dispatch<React.SetStateAction<number>>;
  setClusterCreationStep: React.Dispatch<React.SetStateAction<'details' | 'instructions'>>;
  setDeleteWorkspaceId: React.Dispatch<React.SetStateAction<string | null>>;
  setExcludeNamespaces: React.Dispatch<React.SetStateAction<string>>;
  setIncludeNamespaces: React.Dispatch<React.SetStateAction<string>>;
  setInstallAgentClusterId: React.Dispatch<React.SetStateAction<string | null>>;
  setIsAccountMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsClusterCopilotOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsCreatingWorkspace: React.Dispatch<React.SetStateAction<boolean>>;
  setIsDeletingWorkspace: React.Dispatch<React.SetStateAction<boolean>>;
  setIsMobileNavOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsSidebarWorkspaceMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setLanguage: (language: AppLanguageCode) => void;
  setNewClusterName: React.Dispatch<React.SetStateAction<string>>;
  setWorkspaces: React.Dispatch<React.SetStateAction<Workspace[]>>;
  showToast: (message: string) => void;
  sidebarAccountMenuRef: React.RefObject<HTMLDivElement | null>;
  sidebarWorkspaceMenuRef: React.RefObject<HTMLDivElement | null>;
  theme: 'light' | 'dark';
  toasts: Array<{ id: string; message: string }>;
  toWorkspaceInvitation: (invitation: Awaited<ReturnType<typeof ControlPlaneApi.createWorkspaceInvitation>>) => WorkspaceInvitation;
  toggleTheme: () => void;
  updateKubernetesCluster: (clusterId: string, updates: Partial<KubernetesCluster>) => void;
  updateWorkspace: (workspaceId: string, updates: Partial<Workspace>) => void;
  user: User;
  workspaceClusterCounts: Map<string, number>;
  workspaceContext: Workspace | undefined;
  workspaceContextId: string | null;
  workspaces: Workspace[];
}

export const AppShell: React.FC<AppShellProps> = ({
  acceptWorkspaceInvitation,
  activeClusterSubview,
  activeVmSubview,
  activePrimaryNav,
  activeResourceNav,
  kubernetesClusters,
  kubernetesClustersInWorkspaceContext,
  virtualMachinesInWorkspaceContext,
  hasLoadedWorkspaceVirtualMachines,
  clusterContextId,
  clusterCopilotCluster,
  clusterCopilotInitialPrompt,
  clusterCopilotWidth,
  clusterCopilotWorkspace,
  clusterCreationStep,
  clusterInstallCommand,
  clusterInstallWarnings,
  deleteTargetWorkspace,
  dismissToast,
  excludeNamespaces,
  getCurrentUserRoleForWorkspace,
  getWorkspacePermission,
  handleCancelAddCluster,
  handleConfirmAddCluster,
  handleCreateWorkspace,
  handleDeleteCluster,
  handleDeleteWorkspace,
  handleInitiateAddCluster,
  handleLogout,
  handleProceedToInstructions,
  handleSelectWorkspaceContext,
  includeNamespaces,
  installAgentCluster,
  installAgentWorkspace,
  currentUserEmail,
  invitationTokenMissingMessage,
  isAddingCluster,
  isClusterCopilotOpen,
  isClusterSidebar,
  isVirtualMachineSidebar,
  isCreatingCluster,
  isCreatingWorkspace,
  isDark,
  isDeletingWorkspace,
  isMobileNavOpen,
  isAccountMenuOpen,
  isSidebarWorkspaceMenuOpen,
  language,
  languageOptions,
  loadWorkspaceInvitation,
  navigate,
  navigateToKubernetesCluster,
  newClusterName,
  openClusterCopilot,
  onConversationDeleted,
  refreshWorkspaceInvitations,
  refreshWorkspaceMembers,
  route,
  selectedSidebarCluster,
  selectedSidebarVm,
  selectedWorkspace,
  selectedWorkspaceId,
  setKubernetesClusters,
  onReplaceWorkspaceVirtualMachines,
  onUpsertWorkspaceVirtualMachine,
  onRemoveWorkspaceVirtualMachine,
  setClusterCopilotInitialPrompt,
  setClusterCopilotWidth,
  setClusterCreationStep,
  setDeleteWorkspaceId,
  setExcludeNamespaces,
  setIncludeNamespaces,
  setInstallAgentClusterId,
  setIsAccountMenuOpen,
  setIsClusterCopilotOpen,
  setIsCreatingWorkspace,
  setIsDeletingWorkspace,
  setIsMobileNavOpen,
  setIsSidebarWorkspaceMenuOpen,
  setLanguage,
  setNewClusterName,
  setWorkspaces,
  showToast,
  sidebarAccountMenuRef,
  sidebarWorkspaceMenuRef,
  theme,
  toasts,
  toWorkspaceInvitation,
  toggleTheme,
  updateKubernetesCluster,
  updateWorkspace,
  user,
  workspaceClusterCounts,
  workspaceContext,
  workspaceContextId,
  workspaces
}) => {
  const { loadWorkspaceRoles, createWorkspaceInvitation } = useCreateWorkspaceInviteSetup({
    invitationTokenMissingMessage,
    setWorkspaces,
    toWorkspaceInvitation
  });
  const handleLeaveWorkspaceSuccess = React.useCallback((workspaceId: string) => {
    setWorkspaces((current) => current.filter((workspace) => workspace.id !== workspaceId));
  }, [setWorkspaces]);

  const backToWorkspaceId = selectedSidebarCluster?.workspaceId || workspaceContextId || selectedWorkspaceId;
  const vmBackToWorkspaceId = selectedSidebarVm?.workspaceId || workspaceContextId || selectedWorkspaceId;
  const [targetReturnContext, setTargetReturnContext] = React.useState<TargetReturnContext | null>(null);
  const previousRouteRef = React.useRef<AppRoute | null>(null);
  const selectedWorkspaceInitials = getWorkspaceInitials(selectedWorkspace?.name);
  const selectedIssueSummaryTarget = React.useMemo(() => {
    if (isClusterSidebar && selectedSidebarCluster) {
      return { workspaceId: selectedSidebarCluster.workspaceId, targetId: selectedSidebarCluster.id };
    }
    if (isVirtualMachineSidebar && selectedSidebarVm) {
      return { workspaceId: selectedSidebarVm.workspaceId, targetId: selectedSidebarVm.id };
    }
    return null;
  }, [isClusterSidebar, isVirtualMachineSidebar, selectedSidebarCluster, selectedSidebarVm]);
  const selectedTargetIssueSummary = useTargetIssueSummary(
    selectedIssueSummaryTarget,
    isClusterSidebar || isVirtualMachineSidebar
  );
  const selectedClusterIssueCount = isClusterSidebar ? selectedTargetIssueSummary?.total ?? 0 : 0;
  const selectedVmIssueCount = isVirtualMachineSidebar ? selectedTargetIssueSummary?.total ?? 0 : 0;
  const routeChatCluster = clusterContextId ? kubernetesClusters.find((app) => app.id === clusterContextId) || null : null;
  const chatRuntimeCluster = isClusterCopilotOpen && clusterCopilotCluster ? clusterCopilotCluster : routeChatCluster;
  const chatRuntimeWorkspace = chatRuntimeCluster ? workspaces.find((workspace) => workspace.id === chatRuntimeCluster.workspaceId) : undefined;
  const chatRuntimeInitialSessionId = routeChatCluster ? new URLSearchParams(window.location.search).get('session') : null;
  const [pendingVmTargetPrompt, setPendingVmTargetPrompt] = React.useState<PendingVmTargetPrompt | null>(null);
  const isClusterChatVisible = activeClusterSubview === 'chat' || Boolean(isClusterCopilotOpen && clusterCopilotCluster);
  const [clusterAssistantNavStatus, setClusterAssistantNavStatus] = React.useState<AssistantNavStatus>('idle');
  const previousAssistantRuntimeStatusRef = React.useRef<AssistantNavStatus>('idle');
  const isClusterChatVisibleRef = React.useRef(isClusterChatVisible);

  React.useEffect(() => {
    const previousRoute = previousRouteRef.current;
    const nextReturnContext = getTargetReturnContext(previousRoute, route);
    if (nextReturnContext) {
      setTargetReturnContext(nextReturnContext);
    }
    previousRouteRef.current = route;
  }, [route]);

  const getBackToWorkspacePath = React.useCallback(() => {
    if (
      isVirtualMachineSidebar &&
      selectedSidebarVm &&
      targetReturnContext?.targetType === 'virtual_machine' &&
      targetReturnContext.workspaceId === selectedSidebarVm.workspaceId &&
      targetReturnContext.targetId === selectedSidebarVm.id
    ) {
      return targetReturnContext.path;
    }

    if (
      isClusterSidebar &&
      selectedSidebarCluster &&
      targetReturnContext?.targetType === 'kubernetes' &&
      targetReturnContext.workspaceId === selectedSidebarCluster.workspaceId &&
      targetReturnContext.targetId === selectedSidebarCluster.id
    ) {
      return targetReturnContext.path;
    }

    return isVirtualMachineSidebar
      ? getVirtualMachineBackToWorkspacePath(vmBackToWorkspaceId)
      : getClusterBackToWorkspacePath(backToWorkspaceId);
  }, [
    backToWorkspaceId,
    isClusterSidebar,
    isVirtualMachineSidebar,
    selectedSidebarCluster,
    selectedSidebarVm,
    targetReturnContext,
    vmBackToWorkspaceId
  ]);

  React.useEffect(() => {
    isClusterChatVisibleRef.current = isClusterChatVisible;
    if (isClusterChatVisible) {
      setClusterAssistantNavStatus((current) => isTerminalAssistantStatus(current) ? 'idle' : current);
    }
  }, [isClusterChatVisible]);

  React.useEffect(() => {
    previousAssistantRuntimeStatusRef.current = 'idle';
    setClusterAssistantNavStatus('idle');
  }, [chatRuntimeCluster?.id]);

  const handleAssistantRuntimeStatusChange = React.useCallback((status: AssistantNavStatus) => {
    const previousStatus = previousAssistantRuntimeStatusRef.current;
    previousAssistantRuntimeStatusRef.current = status;

    setClusterAssistantNavStatus((current) => {
      if (isActiveAssistantStatus(status)) return status;
      if (isTerminalAssistantStatus(status)) {
        return isActiveAssistantStatus(previousStatus) && !isClusterChatVisibleRef.current
          ? status
          : 'idle';
      }
      return isTerminalAssistantStatus(current) ? current : 'idle';
    });
  }, []);

  const replaceWorkspaceKubernetesClusters = React.useCallback((workspaceId: string, nextClusters: KubernetesCluster[]) => {
    setKubernetesClusters((current) => [
      ...current.filter((cluster) => cluster.workspaceId !== workspaceId),
      ...nextClusters
    ]);
    setWorkspaces((current) =>
      current.map((workspace) =>
        workspace.id === workspaceId
          ? {
              ...workspace,
              clusterIds: nextClusters.map((cluster) => cluster.id),
              clusterCount: workspace.clusterCount ?? nextClusters.length
            }
          : workspace
      )
    );
  }, [setKubernetesClusters, setWorkspaces]);

  const appendWorkspaceKubernetesClusters = React.useCallback((workspaceId: string, nextClusters: KubernetesCluster[]) => {
    setKubernetesClusters((current) => {
      const existing = current.filter((cluster) => cluster.workspaceId !== workspaceId);
      const workspaceKubernetesClusters = current.filter((cluster) => cluster.workspaceId === workspaceId);
      const byId = new Map(workspaceKubernetesClusters.map((cluster) => [cluster.id, cluster]));
      for (const cluster of nextClusters) byId.set(cluster.id, cluster);
      return [...existing, ...byId.values()];
    });
    setWorkspaces((current) =>
      current.map((workspace) => {
        if (workspace.id !== workspaceId) return workspace;
        const ids = new Set([...(workspace.clusterIds || []), ...nextClusters.map((cluster) => cluster.id)]);
        return {
          ...workspace,
          clusterIds: [...ids],
          clusterCount: Math.max(workspace.clusterCount ?? 0, ids.size)
        };
      })
    );
  }, [setKubernetesClusters, setWorkspaces]);

  const runTargetPrompt = React.useCallback((request: TargetPromptRequest) => {
    if (request.targetType === 'kubernetes') {
      const cluster = kubernetesClusters.find((item) => item.id === request.targetId && item.workspaceId === request.workspaceId);
      if (!cluster) return;
      openClusterCopilot(cluster, request.prompt);
      return;
    }

    setPendingVmTargetPrompt({
      workspaceId: request.workspaceId,
      targetId: request.targetId,
      prompt: request.prompt,
      id: Date.now()
    });
    navigate(AppPaths.workspaceVirtualMachineDetail(request.workspaceId, request.targetId, 'chat'));
  }, [kubernetesClusters, navigate, openClusterCopilot]);

  const consumePendingVmTargetPrompt = React.useCallback(() => {
    setPendingVmTargetPrompt(null);
  }, []);

  return (
    <div className="flex h-[100dvh] min-h-0 w-full flex-col overflow-hidden bg-ui-bg text-ui-text font-sans transition-colors duration-300 lg:flex-row">
      <AppMobileNavigation
        activeClusterSubview={activeClusterSubview}
        activeVmSubview={activeVmSubview}
        activePrimaryNav={activePrimaryNav}
        activeResourceNav={activeResourceNav}
        isClusterSidebar={isClusterSidebar}
        isVirtualMachineSidebar={isVirtualMachineSidebar}
        isDark={isDark}
        isMobileNavOpen={isMobileNavOpen}
        selectedClusterIssueCount={selectedClusterIssueCount}
        clusterAssistantNavStatus={clusterAssistantNavStatus}
        selectedVmIssueCount={selectedVmIssueCount}
        selectedSidebarCluster={selectedSidebarCluster}
        selectedSidebarVm={selectedSidebarVm}
        selectedWorkspace={selectedWorkspace}
        selectedWorkspaceId={selectedWorkspaceId}
        user={user}
        workspaceClusterCounts={workspaceClusterCounts}
        workspaces={workspaces}
        navigate={navigate}
        onBackToWorkspaceSidebar={() => navigate(getBackToWorkspacePath())}
        onLogout={() => void handleLogout()}
        onNavigateClusterSubview={(tab) => {
          if (!selectedSidebarCluster) return;
          navigate(AppPaths.workspaceKubernetesClusterDiagnostics(selectedSidebarCluster.workspaceId, selectedSidebarCluster.id, tab));
        }}
        onNavigateVmSubview={(tab) => {
          if (!selectedSidebarVm) return;
          navigate(AppPaths.workspaceVirtualMachineDetail(selectedSidebarVm.workspaceId, selectedSidebarVm.id, tab));
        }}
        onSelectWorkspaceContext={handleSelectWorkspaceContext}
        onSetAccountMenuOpen={setIsAccountMenuOpen}
        onSetMobileNavOpen={setIsMobileNavOpen}
        onToggleTheme={toggleTheme}
      />

      <AppDesktopSidebar
        workspaces={workspaces}
        selectedWorkspace={selectedWorkspace}
        selectedWorkspaceId={selectedWorkspaceId}
        selectedWorkspaceInitials={selectedWorkspaceInitials}
        selectedSidebarCluster={selectedSidebarCluster}
        selectedSidebarVm={selectedSidebarVm}
        isClusterSidebar={isClusterSidebar}
        isVirtualMachineSidebar={isVirtualMachineSidebar}
        activeResourceNav={activeResourceNav}
        selectedClusterIssueCount={selectedClusterIssueCount}
        clusterAssistantNavStatus={clusterAssistantNavStatus}
        selectedVmIssueCount={selectedVmIssueCount}
        theme={theme}
        isDark={isDark}
        isAccountMenuOpen={isAccountMenuOpen}
        isSidebarWorkspaceMenuOpen={isSidebarWorkspaceMenuOpen}
        sidebarAccountMenuRef={sidebarAccountMenuRef}
        sidebarWorkspaceMenuRef={sidebarWorkspaceMenuRef}
        navigate={navigate}
        onBackToWorkspaceSidebar={() => navigate(getBackToWorkspacePath())}
        onNavigateClusterSubview={(tab) => {
          if (!selectedSidebarCluster) return;
          navigate(AppPaths.workspaceKubernetesClusterDiagnostics(selectedSidebarCluster.workspaceId, selectedSidebarCluster.id, tab));
        }}
        onNavigateVmSubview={(tab) => {
          if (!selectedSidebarVm) return;
          navigate(AppPaths.workspaceVirtualMachineDetail(selectedSidebarVm.workspaceId, selectedSidebarVm.id, tab));
        }}
        onOpenCreateWorkspace={() => setIsCreatingWorkspace(true)}
        onSelectWorkspaceContext={handleSelectWorkspaceContext}
        onSetAccountMenuOpen={setIsAccountMenuOpen}
        onSetSidebarWorkspaceMenuOpen={setIsSidebarWorkspaceMenuOpen}
        onToggleTheme={toggleTheme}
        onLogout={() => void handleLogout()}
        user={user}
      />

      <AppClusterChatRuntime
        cluster={chatRuntimeCluster}
        currentUserId={user.id}
        currentUserRole={chatRuntimeWorkspace ? getCurrentUserRoleForWorkspace(chatRuntimeWorkspace.id) : 'viewer'}
        currentWorkspacePermissions={chatRuntimeWorkspace?.permissions}
        initialActiveSessionId={chatRuntimeInitialSessionId}
        isChatActive={isClusterChatVisible}
        onAssistantRuntimeStatusChange={handleAssistantRuntimeStatusChange}
        onConversationDeleted={onConversationDeleted}
        onUpdateSessions={(clusterId, sessions) => updateKubernetesCluster(clusterId, { chatSessions: sessions })}
      >
        {(clusterChatController) => (
          <>
            <AppPageContent
              activeClusterSubview={activeClusterSubview}
              activeVmSubview={activeVmSubview}
              kubernetesClusters={kubernetesClusters}
              kubernetesClustersInWorkspaceContext={kubernetesClustersInWorkspaceContext}
              virtualMachinesInWorkspaceContext={virtualMachinesInWorkspaceContext}
              hasLoadedWorkspaceVirtualMachines={hasLoadedWorkspaceVirtualMachines}
              clusterContextId={clusterContextId}
              clusterChatController={clusterChatController}
              isDark={isDark}
              language={language}
              languageOptions={languageOptions}
              route={route}
              selectedTargetIssueSummary={selectedTargetIssueSummary}
              user={user}
              workspaceContext={workspaceContext}
              workspaceContextId={workspaceContextId}
              workspaces={workspaces}
              getCurrentUserRoleForWorkspace={getCurrentUserRoleForWorkspace}
              getWorkspacePermission={getWorkspacePermission}
              loadWorkspaceInvitation={loadWorkspaceInvitation}
              acceptWorkspaceInvitation={acceptWorkspaceInvitation}
              navigate={navigate}
              navigateToKubernetesCluster={navigateToKubernetesCluster}
              onCreateWorkspaceClick={() => setIsCreatingWorkspace(true)}
              onInitiateAddCluster={handleInitiateAddCluster}
              onInstallAgent={setInstallAgentClusterId}
              onUpdateKubernetesCluster={updateKubernetesCluster}
              onReplaceWorkspaceKubernetesClusters={replaceWorkspaceKubernetesClusters}
              onAppendWorkspaceKubernetesClusters={appendWorkspaceKubernetesClusters}
              onReplaceWorkspaceVirtualMachines={onReplaceWorkspaceVirtualMachines}
              onUpsertWorkspaceVirtualMachine={onUpsertWorkspaceVirtualMachine}
              onRemoveWorkspaceVirtualMachine={onRemoveWorkspaceVirtualMachine}
              onUpdateWorkspace={updateWorkspace}
              onOpenClusterChatPanel={openClusterCopilot}
              onRunTargetPrompt={runTargetPrompt}
              pendingVmTargetPrompt={pendingVmTargetPrompt}
              onPendingVmTargetPromptConsumed={consumePendingVmTargetPrompt}
              onRefreshWorkspaceInvitations={refreshWorkspaceInvitations}
              onRefreshWorkspaceMembers={refreshWorkspaceMembers}
              onDeleteCluster={handleDeleteCluster}
              onOpenDeleteWorkspace={setDeleteWorkspaceId}
              onLeaveWorkspaceSuccess={handleLeaveWorkspaceSuccess}
              onLogout={() => void handleLogout()}
              onSetLanguage={setLanguage}
              showToast={showToast}
              toWorkspaceInvitation={toWorkspaceInvitation}
            />

            <AppClusterCopilotPanel
              cluster={clusterCopilotCluster}
              chatController={clusterChatController}
              currentUserRole={clusterCopilotWorkspace ? getCurrentUserRoleForWorkspace(clusterCopilotWorkspace.id) : 'viewer'}
              currentWorkspacePermissions={clusterCopilotWorkspace?.permissions}
              initialPrompt={clusterCopilotInitialPrompt}
              isDark={isDark}
              isOpen={isClusterCopilotOpen}
              width={clusterCopilotWidth}
              navigate={navigate}
              onClose={() => {
                setIsClusterCopilotOpen(false);
                setClusterCopilotInitialPrompt(null);
              }}
              onInitialPromptHandled={() => setClusterCopilotInitialPrompt(null)}
              onResizeWidth={setClusterCopilotWidth}
            />
          </>
        )}
      </AppClusterChatRuntime>

      <AppDialogs
        clusterCreationStep={clusterCreationStep}
        clusterInstallCommand={clusterInstallCommand}
        clusterInstallWarnings={clusterInstallWarnings}
        deleteTargetWorkspace={deleteTargetWorkspace}
        excludeNamespaces={excludeNamespaces}
        includeNamespaces={includeNamespaces}
        installAgentCluster={installAgentCluster}
        installAgentWorkspace={installAgentWorkspace}
        currentUserEmail={currentUserEmail}
        isAddingCluster={isAddingCluster}
        isCreatingCluster={isCreatingCluster}
        isCreatingWorkspace={isCreatingWorkspace}
        isDark={isDark}
        isDeletingWorkspace={isDeletingWorkspace}
        newClusterName={newClusterName}
        toasts={toasts}
        onClusterNameChange={setNewClusterName}
        onCloseAddCluster={handleCancelAddCluster}
        onCloseInstallAgent={() => setInstallAgentClusterId(null)}
        onCloseWorkspaceCreate={() => setIsCreatingWorkspace(false)}
        onCloseWorkspaceDelete={() => setDeleteWorkspaceId(null)}
        onConfirmClusterInstalled={() => void handleConfirmAddCluster()}
        onConfirmDeleteWorkspace={(workspace) => handleDeleteWorkspace(workspace.id)}
        onCreateWorkspace={handleCreateWorkspace}
        onCreateWorkspaceInvitation={createWorkspaceInvitation}
        onDismissToast={dismissToast}
        onExcludeNamespacesChange={setExcludeNamespaces}
        onIncludeNamespacesChange={setIncludeNamespaces}
        onLoadWorkspaceRoles={loadWorkspaceRoles}
        onProceedToClusterInstructions={(agentAccessMode) => void handleProceedToInstructions(agentAccessMode)}
        onSetDeletingWorkspace={setIsDeletingWorkspace}
        showToast={showToast}
      />
    </div>
  );
};
