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
import type { NavigateOptions as RouterNavigateOptions } from '@/hooks/useAppRouter';
import type { AppLanguageCode, AppLanguageOption } from '@/i18n/languageConfig';
import type { PendingVmRunbookPrompt, RunbookExecutionRequest } from '@/pages/runbooks/runbookModel';
import type { controlPlaneApi as ControlPlaneApi } from '@/services/controlPlaneApi';
import type { ControlPlaneVirtualMachine } from '@/services/controlPlaneApi';
import { KubernetesCluster, User, Workspace, WorkspaceInvitation } from '@/types';
import { AppPaths, AppRoute, ClusterSubview, VmSubview } from '@/utils/routes';

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
  handleCreateWorkspace: (workspace: Omit<Workspace, 'id' | 'clusterIds'>) => void;
  handleDeleteCluster: (cluster: KubernetesCluster) => Promise<void>;
  handleDeleteWorkspace: (workspaceId: string) => Promise<void>;
  handleInitiateAddCluster: (workspaceId: string) => void;
  handleLogout: () => Promise<void>;
  handleProceedToInstructions: () => Promise<void>;
  handleSelectWorkspaceContext: (workspaceId: string) => void;
  includeNamespaces: string;
  installAgentCluster: KubernetesCluster | null;
  installAgentWorkspace: Workspace | undefined;
  isAddingCluster: boolean;
  isClusterCopilotOpen: boolean;
  isClusterSidebar: boolean;
  isVirtualMachineSidebar: boolean;
  isCreatingCluster: boolean;
  isCreatingWorkspace: boolean;
  isDark: boolean;
  isDeletingWorkspace: boolean;
  isMobileNavOpen: boolean;
  isSidebarWorkspaceMenuOpen: boolean;
  language: AppLanguageCode;
  languageOptions: AppLanguageOption[];
  loadWorkspaceInvitation: (token: string) => ReturnType<typeof ControlPlaneApi.getWorkspaceInvitation>;
  navigate: (path: string, options?: RouterNavigateOptions) => void;
  navigateToKubernetesCluster: (cluster: KubernetesCluster) => void;
  newClusterName: string;
  newWorkspaceName: string;
  openClusterCopilot: (cluster: KubernetesCluster, prompt?: string) => void;
  onConversationDeleted: (sessionName: string, targetName: string) => void;
  refreshWorkspaceInvitations: (workspaceId: string) => Promise<void>;
  refreshWorkspaceMembers: (workspaceId: string) => Promise<void>;
  route: AppRoute;
  selectedSidebarCluster: KubernetesCluster | null;
  selectedSidebarVm: Pick<ControlPlaneVirtualMachine, 'id' | 'workspaceId' | 'name'> | null;
  selectedSidebarVmFindingCount: number;
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
  setNewWorkspaceName: React.Dispatch<React.SetStateAction<string>>;
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
  workspaceInvestigationCount: number;
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
  isAddingCluster,
  isClusterCopilotOpen,
  isClusterSidebar,
  isVirtualMachineSidebar,
  isCreatingCluster,
  isCreatingWorkspace,
  isDark,
  isDeletingWorkspace,
  isMobileNavOpen,
  isSidebarWorkspaceMenuOpen,
  language,
  languageOptions,
  loadWorkspaceInvitation,
  navigate,
  navigateToKubernetesCluster,
  newClusterName,
  newWorkspaceName,
  openClusterCopilot,
  onConversationDeleted,
  refreshWorkspaceInvitations,
  refreshWorkspaceMembers,
  route,
  selectedSidebarCluster,
  selectedSidebarVm,
  selectedSidebarVmFindingCount,
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
  setNewWorkspaceName,
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
  workspaceInvestigationCount,
  workspaces
}) => {
  const backToWorkspaceId = selectedSidebarCluster?.workspaceId || workspaceContextId || selectedWorkspaceId;
  const vmBackToWorkspaceId = selectedSidebarVm?.workspaceId || workspaceContextId || selectedWorkspaceId;
  const selectedWorkspaceInitials = getWorkspaceInitials(selectedWorkspace?.name);
  const selectedClusterFindingCount =
    selectedSidebarCluster?.resourceSummary?.findingCount ?? selectedSidebarCluster?.alerts.length ?? 0;
  const routeChatCluster = clusterContextId ? kubernetesClusters.find((app) => app.id === clusterContextId) || null : null;
  const chatRuntimeCluster = isClusterCopilotOpen && clusterCopilotCluster ? clusterCopilotCluster : routeChatCluster;
  const chatRuntimeWorkspace = chatRuntimeCluster ? workspaces.find((workspace) => workspace.id === chatRuntimeCluster.workspaceId) : undefined;
  const chatRuntimeInitialSessionId = routeChatCluster ? new URLSearchParams(window.location.search).get('session') : null;
  const [pendingVmRunbookPrompt, setPendingVmRunbookPrompt] = React.useState<PendingVmRunbookPrompt | null>(null);
  const isClusterChatVisible = activeClusterSubview === 'chat' || Boolean(isClusterCopilotOpen && clusterCopilotCluster);
  const [clusterAssistantNavStatus, setClusterAssistantNavStatus] = React.useState<AssistantNavStatus>('idle');
  const previousAssistantRuntimeStatusRef = React.useRef<AssistantNavStatus>('idle');
  const isClusterChatVisibleRef = React.useRef(isClusterChatVisible);

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

  const runRunbook = React.useCallback((request: RunbookExecutionRequest) => {
    if (request.targetType === 'kubernetes') {
      const cluster = kubernetesClusters.find((item) => item.id === request.targetId && item.workspaceId === request.workspaceId);
      if (!cluster) return;
      openClusterCopilot(cluster, request.prompt);
      return;
    }

    setPendingVmRunbookPrompt({
      workspaceId: request.workspaceId,
      targetId: request.targetId,
      prompt: request.prompt,
      id: Date.now()
    });
    navigate(AppPaths.workspaceVirtualMachineDetail(request.workspaceId, request.targetId, 'chat'));
  }, [kubernetesClusters, navigate, openClusterCopilot]);

  const consumePendingVmRunbookPrompt = React.useCallback(() => {
    setPendingVmRunbookPrompt(null);
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
        selectedClusterFindingCount={selectedClusterFindingCount}
        clusterAssistantNavStatus={clusterAssistantNavStatus}
        selectedVmFindingCount={selectedSidebarVmFindingCount}
        workspaceInvestigationCount={workspaceInvestigationCount}
        selectedSidebarCluster={selectedSidebarCluster}
        selectedSidebarVm={selectedSidebarVm}
        selectedWorkspace={selectedWorkspace}
        selectedWorkspaceId={selectedWorkspaceId}
        user={user}
        workspaceClusterCounts={workspaceClusterCounts}
        workspaces={workspaces}
        navigate={navigate}
        onBackToWorkspaceSidebar={() => navigate(isVirtualMachineSidebar ? getVirtualMachineBackToWorkspacePath(vmBackToWorkspaceId) : getClusterBackToWorkspacePath(backToWorkspaceId))}
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
        selectedClusterFindingCount={selectedClusterFindingCount}
        clusterAssistantNavStatus={clusterAssistantNavStatus}
        selectedVmFindingCount={selectedSidebarVmFindingCount}
        workspaceInvestigationCount={workspaceInvestigationCount}
        theme={theme}
        isDark={isDark}
        isSidebarWorkspaceMenuOpen={isSidebarWorkspaceMenuOpen}
        sidebarAccountMenuRef={sidebarAccountMenuRef}
        sidebarWorkspaceMenuRef={sidebarWorkspaceMenuRef}
        navigate={navigate}
        onBackToWorkspaceSidebar={() => navigate(isVirtualMachineSidebar ? getVirtualMachineBackToWorkspacePath(vmBackToWorkspaceId) : getClusterBackToWorkspacePath(backToWorkspaceId))}
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
        onSetMobileNavOpen={setIsMobileNavOpen}
        onSetSidebarWorkspaceMenuOpen={setIsSidebarWorkspaceMenuOpen}
        onToggleTheme={toggleTheme}
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
              onRunRunbook={runRunbook}
              pendingVmRunbookPrompt={pendingVmRunbookPrompt}
              onPendingVmRunbookPromptConsumed={consumePendingVmRunbookPrompt}
              onRefreshWorkspaceInvitations={refreshWorkspaceInvitations}
              onRefreshWorkspaceMembers={refreshWorkspaceMembers}
              onDeleteCluster={handleDeleteCluster}
              onOpenDeleteWorkspace={setDeleteWorkspaceId}
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
        isAddingCluster={isAddingCluster}
        isCreatingCluster={isCreatingCluster}
        isCreatingWorkspace={isCreatingWorkspace}
        isDark={isDark}
        isDeletingWorkspace={isDeletingWorkspace}
        newClusterName={newClusterName}
        newWorkspaceName={newWorkspaceName}
        toasts={toasts}
        user={user}
        onClusterNameChange={setNewClusterName}
        onCloseAddCluster={handleCancelAddCluster}
        onCloseInstallAgent={() => setInstallAgentClusterId(null)}
        onCloseWorkspaceCreate={() => setIsCreatingWorkspace(false)}
        onCloseWorkspaceDelete={() => setDeleteWorkspaceId(null)}
        onConfirmClusterInstalled={() => void handleConfirmAddCluster()}
        onConfirmDeleteWorkspace={(workspace) => handleDeleteWorkspace(workspace.id)}
        onCreateWorkspace={handleCreateWorkspace}
        onDismissToast={dismissToast}
        onExcludeNamespacesChange={setExcludeNamespaces}
        onIncludeNamespacesChange={setIncludeNamespaces}
        onProceedToClusterInstructions={() => void handleProceedToInstructions()}
        onSetDeletingWorkspace={setIsDeletingWorkspace}
        onWorkspaceNameChange={setNewWorkspaceName}
        showToast={showToast}
      />
    </div>
  );
};
