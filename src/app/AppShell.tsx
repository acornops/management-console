import React from 'react';
import { AppDesktopSidebar } from '@/app/AppDesktopSidebar';
import { AppMobileNavigation } from '@/app/AppMobileNavigation';
import { AppPageContent } from '@/app/AppPageContent';
import type { AppShellProps } from '@/app/AppShell.types';
import { isActiveAssistantStatus, isTerminalAssistantStatus, type AssistantNavStatus } from '@/app/assistantNavStatus';
import { getClusterBackToWorkspacePath, getVirtualMachineBackToWorkspacePath } from '@/app/appRouteState';
import { getWorkspaceInitials } from '@/app/appWorkspaceSummaries';
import { useCreateWorkspaceInviteSetup } from '@/app/useCreateWorkspaceInviteSetup';
import { useTargetIssueSummary } from '@/app/useTargetIssueSummary';
import {
  createTargetChatControllerStore,
  TargetChatControllerSubscriber
} from '@/app/targetChatControllerStore';
import {
  appDockRootId,
  collapsedDesktopSidebarWidth,
  DesktopSidebarWidthProvider,
  expandedDesktopSidebarWidth
} from '@/app/dockedPanelLayout';
import { canReadWorkspaceData } from '@/app/workspacePermissions';
import { useWorkspaceApprovalSummary } from '@/hooks/useWorkspaceApprovalSummary';
import {
  WorkspaceWorkflowActivityProvider,
  useWorkspaceWorkflowActivityStore
} from '@/features/workflow-activity/WorkspaceWorkflowActivityContext';
import { ToastViewport } from '@acornops/ui';
import type { TargetChatController } from '@/features/targets/chat/hooks/useTargetChat';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import { KubernetesCluster } from '@/types';
import { AppPaths, assistantSessionFromLocation, type AppRoute } from '@/utils/routes';
import { useTargetPromptLauncher } from '@/app/useTargetPromptLauncher';
import { getTargetReturnContext, type TargetReturnContext } from '@/app/targetReturnContext';

const AppClusterChatRuntime = React.lazy(() =>
  import('@/app/AppClusterChatRuntime').then((module) => ({ default: module.AppClusterChatRuntime }))
);
const AppClusterCopilotPanel = React.lazy(() =>
  import('@/app/AppClusterCopilotPanel').then((module) => ({ default: module.AppClusterCopilotPanel }))
);
const AppDialogs = React.lazy(() =>
  import('@/app/AppDialogs').then((module) => ({ default: module.AppDialogs }))
);

export const AppShell: React.FC<AppShellProps> = ({
  acceptWorkspaceInvitation,
  activeAgentSubview,
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
  availableRbacAdditions,
  selectedRbacAdditionKeys,
  isLoadingRbacAdditions,
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
  isAgentSidebar,
  isClusterSidebar,
  isVirtualMachineSidebar,
  isCreatingCluster,
  isCreatingWorkspace,
  isRegisteredClusterAgentConnected,
  isDark,
  isDeletingWorkspace,
  isMobileNavOpen,
  sidebarMode,
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
  selectedSidebarAgent,
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
  setDeleteWorkspaceId,
  setExcludeNamespaces,
  setIncludeNamespaces,
  setInstallAgentClusterId,
  setIsAccountMenuOpen,
  setIsClusterCopilotOpen,
  setIsCreatingWorkspace,
  setIsDeletingWorkspace,
  setIsMobileNavOpen,
  setSidebarMode,
  setIsSidebarWorkspaceMenuOpen,
  setLanguage,
  setNewClusterName,
  setSelectedRbacAdditionKeys,
  setWorkspaces,
  showToast,
  sidebarAccountMenuRef,
  sidebarWorkspaceMenuRef,
  themePreference,
  resolvedTheme,
  toasts,
  toWorkspaceInvitation,
  selectTheme,
  updateKubernetesCluster,
  updateWorkspace,
  user,
  workspaceClusterCounts,
  workspaceContext,
  workspaceContextId,
  workspaces
}) => {
  const { loadWorkspaceRoles, addOrInviteWorkspaceMember } = useCreateWorkspaceInviteSetup({
    invitationTokenMissingMessage,
    setWorkspaces,
    toWorkspaceInvitation
  });
  const handleLeaveWorkspaceSuccess = React.useCallback((workspaceId: string) => {
    setWorkspaces((current) => current.filter((workspace) => workspace.id !== workspaceId));
  }, [setWorkspaces]);

  const backToWorkspaceId = selectedSidebarCluster?.workspaceId || workspaceContextId || selectedWorkspaceId;
  const agentBackToWorkspaceId = selectedSidebarAgent?.workspaceId || workspaceContextId || selectedWorkspaceId;
  const vmBackToWorkspaceId = selectedSidebarVm?.workspaceId || workspaceContextId || selectedWorkspaceId;
  const [targetReturnContext, setTargetReturnContext] = React.useState<TargetReturnContext | null>(null);
  const previousRouteRef = React.useRef<AppRoute | null>(null);
  const selectedWorkspaceInitials = getWorkspaceInitials(selectedWorkspace?.name);
  const approvalSummary = useWorkspaceApprovalSummary(
    selectedWorkspaceId,
    canReadWorkspaceData(selectedWorkspace)
  );
  const workflowActivity = useWorkspaceWorkflowActivityStore(
    selectedWorkspaceId,
    canReadWorkspaceData(selectedWorkspace)
  );
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
  const chatRuntimeInitialSessionId = routeChatCluster ? assistantSessionFromLocation(window.location) : null;
  const isClusterChatVisible = activeClusterSubview === 'chat' || Boolean(isClusterCopilotOpen && clusterCopilotCluster);
  const hasOpenDialog = Boolean(
    deleteTargetWorkspace
      || installAgentCluster
      || isAddingCluster
      || isCreatingCluster
      || isCreatingWorkspace
      || isDeletingWorkspace
  );
  const [clusterAssistantNavStatus, setClusterAssistantNavStatus] = React.useState<AssistantNavStatus>('idle');
  const [targetChatControllerStore] = React.useState(createTargetChatControllerStore);
  const previousAssistantRuntimeStatusRef = React.useRef<AssistantNavStatus>('idle');
  const isClusterChatVisibleRef = React.useRef(isClusterChatVisible);
  const desktopSidebarWidth = sidebarMode === 'collapsed'
    ? collapsedDesktopSidebarWidth
    : expandedDesktopSidebarWidth;

  React.useEffect(() => {
    const desktopQuery = window.matchMedia('(min-width: 1200px)');
    const closeDrawerAtDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setIsMobileNavOpen(false);
    };
    const closeDrawerAfterResize = () => {
      if (window.innerWidth >= 1200) setIsMobileNavOpen(false);
    };
    const viewportObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(closeDrawerAfterResize);
    closeDrawerAfterResize();
    desktopQuery.addEventListener('change', closeDrawerAtDesktop);
    window.addEventListener('resize', closeDrawerAfterResize);
    viewportObserver?.observe(document.documentElement);
    return () => {
      desktopQuery.removeEventListener('change', closeDrawerAtDesktop);
      window.removeEventListener('resize', closeDrawerAfterResize);
      viewportObserver?.disconnect();
    };
  }, [setIsMobileNavOpen]);

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

    if (route.kind === 'workspaceKubernetesClusterDiagnostics') {
      return AppPaths.workspaceKubernetesClusters(route.workspaceId, route.catalogState);
    }

    if (route.kind === 'workspaceVirtualMachineDetail') {
      return AppPaths.workspaceVirtualMachines(route.workspaceId, route.catalogState);
    }

    if (route.kind === 'workspaceAgentDetail') {
      return AppPaths.workspaceAgents(route.workspaceId);
    }

    return isAgentSidebar && agentBackToWorkspaceId
      ? AppPaths.workspaceAgents(agentBackToWorkspaceId)
      : isVirtualMachineSidebar
      ? getVirtualMachineBackToWorkspacePath(vmBackToWorkspaceId)
      : getClusterBackToWorkspacePath(backToWorkspaceId);
  }, [
    agentBackToWorkspaceId,
    backToWorkspaceId,
    isAgentSidebar,
    isClusterSidebar,
    isVirtualMachineSidebar,
    route,
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

  const {
    consumePendingVmTargetPrompt,
    pendingVmTargetPrompt,
    runTargetPrompt,
    vmCopilotPanel
  } = useTargetPromptLauncher({
    isDark,
    kubernetesClusters,
    navigate,
    openClusterCopilot,
    route,
    setClusterCopilotInitialPrompt,
    setIsClusterCopilotOpen,
    userId: user.id,
    virtualMachines: virtualMachinesInWorkspaceContext,
    workspaceContext,
    workspaces
  });

  const renderAppContent = (clusterChatController: TargetChatController | null) => (
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
        onRefreshApprovalSummary={approvalSummary.refresh}
        onDeleteCluster={handleDeleteCluster}
        onOpenDeleteWorkspace={setDeleteWorkspaceId}
        onLeaveWorkspaceSuccess={handleLeaveWorkspaceSuccess}
        onLogout={() => void handleLogout()}
        onSetLanguage={setLanguage}
        showToast={showToast}
        toWorkspaceInvitation={toWorkspaceInvitation}
      />

      {isClusterCopilotOpen && clusterCopilotCluster && (
        <React.Suspense fallback={null}>
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
        </React.Suspense>
      )}
      {vmCopilotPanel}
    </>
  );

  return (
    <WorkspaceWorkflowActivityProvider value={workflowActivity}>
    <DesktopSidebarWidthProvider value={desktopSidebarWidth}>
    <div data-app-shell="true" className="flex h-[100dvh] min-h-0 w-full flex-col overflow-hidden bg-ui-bg text-ui-text font-sans transition-colors duration-300 min-[1200px]:flex-row">
      <AppMobileNavigation
        activeAgentSubview={activeAgentSubview}
        activeClusterSubview={activeClusterSubview}
        activeVmSubview={activeVmSubview}
        activePrimaryNav={activePrimaryNav}
        activeResourceNav={activeResourceNav}
        pendingApprovalCount={approvalSummary.pendingCount}
        isAgentSidebar={isAgentSidebar}
        isClusterSidebar={isClusterSidebar}
        isVirtualMachineSidebar={isVirtualMachineSidebar}
        themePreference={themePreference}
        resolvedTheme={resolvedTheme}
        isMobileNavOpen={isMobileNavOpen}
        selectedClusterIssueCount={selectedClusterIssueCount}
        clusterAssistantNavStatus={clusterAssistantNavStatus}
        selectedVmIssueCount={selectedVmIssueCount}
        selectedSidebarAgent={selectedSidebarAgent}
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
          navigate(AppPaths.workspaceKubernetesClusterDiagnostics(selectedSidebarCluster.workspaceId, selectedSidebarCluster.id, tab, route.kind === 'workspaceKubernetesClusterDiagnostics' ? route.catalogState : undefined));
        }}
        onNavigateAgentSubview={(tab) => {
          if (!selectedSidebarAgent) return;
          navigate(AppPaths.workspaceAgentDetail(
            selectedSidebarAgent.workspaceId,
            selectedSidebarAgent.id,
            tab
          ));
        }}
        onNavigateVmSubview={(tab) => {
          if (!selectedSidebarVm) return;
          navigate(AppPaths.workspaceVirtualMachineDetail(selectedSidebarVm.workspaceId, selectedSidebarVm.id, tab, route.kind === 'workspaceVirtualMachineDetail' ? route.catalogState : undefined));
        }}
        onSelectWorkspaceContext={handleSelectWorkspaceContext}
        onSetAccountMenuOpen={setIsAccountMenuOpen}
        onSetMobileNavOpen={setIsMobileNavOpen}
        onSelectTheme={selectTheme}
      />

      <AppDesktopSidebar
        mode={sidebarMode}
        workspaces={workspaces}
        selectedWorkspace={selectedWorkspace}
        selectedWorkspaceId={selectedWorkspaceId}
        selectedWorkspaceInitials={selectedWorkspaceInitials}
        selectedSidebarAgent={selectedSidebarAgent}
        selectedSidebarCluster={selectedSidebarCluster}
        selectedSidebarVm={selectedSidebarVm}
        isAgentSidebar={isAgentSidebar}
        isClusterSidebar={isClusterSidebar}
        isVirtualMachineSidebar={isVirtualMachineSidebar}
        activeResourceNav={activeResourceNav}
        pendingApprovalCount={approvalSummary.pendingCount}
        selectedClusterIssueCount={selectedClusterIssueCount}
        clusterAssistantNavStatus={clusterAssistantNavStatus}
        selectedVmIssueCount={selectedVmIssueCount}
        themePreference={themePreference}
        resolvedTheme={resolvedTheme}
        isAccountMenuOpen={isAccountMenuOpen}
        isSidebarWorkspaceMenuOpen={isSidebarWorkspaceMenuOpen}
        sidebarAccountMenuRef={sidebarAccountMenuRef}
        sidebarWorkspaceMenuRef={sidebarWorkspaceMenuRef}
        navigate={navigate}
        onBackToWorkspaceSidebar={() => navigate(getBackToWorkspacePath())}
        onNavigateClusterSubview={(tab) => {
          if (!selectedSidebarCluster) return;
          navigate(AppPaths.workspaceKubernetesClusterDiagnostics(selectedSidebarCluster.workspaceId, selectedSidebarCluster.id, tab, route.kind === 'workspaceKubernetesClusterDiagnostics' ? route.catalogState : undefined));
        }}
        onNavigateAgentSubview={(tab) => {
          if (!selectedSidebarAgent) return;
          navigate(AppPaths.workspaceAgentDetail(
            selectedSidebarAgent.workspaceId,
            selectedSidebarAgent.id,
            tab
          ));
        }}
        onNavigateVmSubview={(tab) => {
          if (!selectedSidebarVm) return;
          navigate(AppPaths.workspaceVirtualMachineDetail(selectedSidebarVm.workspaceId, selectedSidebarVm.id, tab, route.kind === 'workspaceVirtualMachineDetail' ? route.catalogState : undefined));
        }}
        onOpenCreateWorkspace={() => setIsCreatingWorkspace(true)}
        onSelectWorkspaceContext={handleSelectWorkspaceContext}
        onSetAccountMenuOpen={setIsAccountMenuOpen}
        onSetSidebarWorkspaceMenuOpen={setIsSidebarWorkspaceMenuOpen}
        onSelectTheme={selectTheme}
        onLogout={() => void handleLogout()}
        onSetMode={setSidebarMode}
        user={user}
      />

      <TargetChatControllerSubscriber store={targetChatControllerStore}>
        {renderAppContent}
      </TargetChatControllerSubscriber>

      <div id={appDockRootId} className="contents" />

      {chatRuntimeCluster && (
        <React.Suspense fallback={null}>
          <AppClusterChatRuntime
            cluster={chatRuntimeCluster}
            currentUserId={user.id}
            currentUserRole={chatRuntimeWorkspace ? getCurrentUserRoleForWorkspace(chatRuntimeWorkspace.id) : 'viewer'}
            currentWorkspacePermissions={chatRuntimeWorkspace?.permissions}
            initialActiveSessionId={chatRuntimeInitialSessionId}
            isChatActive={isClusterChatVisible}
            onAssistantRuntimeStatusChange={handleAssistantRuntimeStatusChange}
            onControllerChange={targetChatControllerStore.set}
            onConversationDeleted={onConversationDeleted}
            onUpdateSessions={(clusterId, sessions) => updateKubernetesCluster(clusterId, { chatSessions: sessions })}
          >
            {() => null}
          </AppClusterChatRuntime>
        </React.Suspense>
      )}

      {hasOpenDialog && (
        <React.Suspense fallback={null}>
          <AppDialogs
            clusterCreationStep={clusterCreationStep}
            clusterInstallCommand={clusterInstallCommand}
            clusterInstallWarnings={clusterInstallWarnings}
            availableRbacAdditions={availableRbacAdditions}
            selectedRbacAdditionKeys={selectedRbacAdditionKeys}
            isLoadingRbacAdditions={isLoadingRbacAdditions}
            deleteTargetWorkspace={deleteTargetWorkspace}
            excludeNamespaces={excludeNamespaces}
            includeNamespaces={includeNamespaces}
            installAgentCluster={installAgentCluster}
            installAgentWorkspace={installAgentWorkspace}
            currentUserEmail={currentUserEmail}
            isAddingCluster={isAddingCluster}
            isCreatingCluster={isCreatingCluster}
            isCreatingWorkspace={isCreatingWorkspace}
            isRegisteredClusterAgentConnected={isRegisteredClusterAgentConnected}
            isDeletingWorkspace={isDeletingWorkspace}
            newClusterName={newClusterName}
            onClusterNameChange={setNewClusterName}
            onCloseAddCluster={handleCancelAddCluster}
            onCloseInstallAgent={() => setInstallAgentClusterId(null)}
            onCloseWorkspaceCreate={() => setIsCreatingWorkspace(false)}
            onCloseWorkspaceDelete={() => setDeleteWorkspaceId(null)}
            onConfirmClusterInstalled={() => void handleConfirmAddCluster()}
            onConfirmDeleteWorkspace={(workspace) => handleDeleteWorkspace(workspace.id)}
            onCreateWorkspace={handleCreateWorkspace}
            onLoadWorkspaceAiSettings={(workspaceId) => controlPlaneApi.getWorkspaceAiSettings(workspaceId)}
            onOpenWorkspaceAiSettings={(workspaceId) => {
              setIsCreatingWorkspace(false);
              navigate(AppPaths.workspaceAiSettings(workspaceId));
            }}
            onAddOrInviteWorkspaceMember={addOrInviteWorkspaceMember}
            onExcludeNamespacesChange={setExcludeNamespaces}
            onIncludeNamespacesChange={setIncludeNamespaces}
            onLoadWorkspaceRoles={loadWorkspaceRoles}
            onProceedToClusterInstructions={(agentAccessMode) => void handleProceedToInstructions(agentAccessMode)}
            onSelectedRbacAdditionKeysChange={setSelectedRbacAdditionKeys}
            onSetDeletingWorkspace={setIsDeletingWorkspace}
            showToast={showToast}
          />
        </React.Suspense>
      )}

      <ToastViewport toasts={toasts} isDark={isDark} onDismiss={dismissToast} />
    </div>
    </DesktopSidebarWidthProvider>
    </WorkspaceWorkflowActivityProvider>
  );
};
