import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppRouter } from '@/hooks/useAppRouter';
import { AppSessionRestoringScreen } from '@/app/AppSessionRestoringScreen';
import { AppShell } from '@/app/AppShell';
import { ExternalIntegrationLinkRouteScreen } from '@/app/ExternalIntegrationLinkRouteScreen';
import { getActivePrimaryNav, getActiveResourceNav, getClusterRouteId, getWorkspaceRouteId } from '@/app/appRouteState';
import { useAppBootstrap } from '@/app/useAppBootstrap';
import { useAppPreferences } from '@/app/useAppPreferences';
import { useAuthConfig } from '@/app/useAuthConfig';
import { useAppSupport } from '@/app/useAppSupport';
import { useClusterCopilotState } from '@/app/useClusterCopilotState';
import { useSidebarRouteTargets } from '@/app/useSidebarRouteTargets';
import { useWorkspaceClusterActions } from '@/app/useWorkspaceClusterActions';
import { useWorkspaceVirtualMachineCache } from '@/app/useWorkspaceVirtualMachineCache';
import { useRecentInvestigationSync } from '@/app/useRecentInvestigationSync';
import { useThemeTransition } from '@/hooks/useThemeTransition';
import { buildKubernetesClustersByWorkspaceId, getWorkspaceClusterCounts } from '@/app/appWorkspaceSummaries';
import { isWorkspaceDataRoute, legacySettingsRedirectPath, workspaceLandingPath } from '@/app/appNavigationGuards';
import { getCurrentUserRoleForWorkspaceValue, getWorkspacePermissionValue } from '@/app/appWorkspacePermissions';
import { LoginPage } from '@/pages/LoginPage';
import { readLanguagePreference, readThemePreference } from '@/app/preferences';
import { getSystemTheme, resolveThemePreference, type ResolvedTheme, type ThemePreference } from '@/app/theme';
import { getSupportedLanguages } from '@/i18n/languageConfig';
import { canReadWorkspaceData } from '@/app/workspacePermissions';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import { KubernetesCluster, User, Workspace } from '@/types';
import { AppPaths } from '@/utils/routes';
const App: React.FC = () => {
  const { t, i18n } = useTranslation();
  const logoSrc = `${import.meta.env.BASE_URL}logo.svg`;
  const { route, navigate } = useAppRouter();
  const [user, setUser] = useState<User | null>(null);
  const [kubernetesClusters, setKubernetesClusters] = useState<KubernetesCluster[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isSessionRestoring, setIsSessionRestoring] = useState(true);
  const authConfig = useAuthConfig();
  const [installAgentClusterId, setInstallAgentClusterId] = useState<string | null>(null);
  const [deleteWorkspaceId, setDeleteWorkspaceId] = useState<string | null>(null);
  const [isDeletingWorkspace, setIsDeletingWorkspace] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isSidebarWorkspaceMenuOpen, setIsSidebarWorkspaceMenuOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [loadedProfilePreferenceKey, setLoadedProfilePreferenceKey] = useState<string | null>(null);
  const sidebarAccountMenuRef = useRef<HTMLDivElement | null>(null);
  const sidebarWorkspaceMenuRef = useRef<HTMLDivElement | null>(null);
  const skipAnonymousPreferencePersistCountRef = useRef(0);
  const [themePreference, setThemePreference] = useState<ThemePreference>(readThemePreference);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveThemePreference(readThemePreference(), getSystemTheme() === 'dark')
  );
  const [language, setLanguage] = useState<string>(readLanguagePreference);
  const isDark = resolvedTheme === 'dark';
  const routeWorkspaceId = getWorkspaceRouteId(route);
  const workspaceContextId = routeWorkspaceId || selectedWorkspaceId;
  const clusterContextId = getClusterRouteId(route);
  const workspaceById = useMemo(() => new Map(workspaces.map((workspace) => [workspace.id, workspace])), [workspaces]);
  const kubernetesClusterById = useMemo(() => new Map(kubernetesClusters.map((app) => [app.id, app])), [kubernetesClusters]);
  const kubernetesClustersByWorkspaceId = useMemo(() => buildKubernetesClustersByWorkspaceId(kubernetesClusters), [kubernetesClusters]);
  const workspaceClusterCounts = useMemo(() => getWorkspaceClusterCounts(workspaces, kubernetesClustersByWorkspaceId), [kubernetesClustersByWorkspaceId, workspaces]);
  const workspaceContext = workspaceContextId ? workspaceById.get(workspaceContextId) : undefined;
  const selectedWorkspace = selectedWorkspaceId ? workspaceById.get(selectedWorkspaceId) : undefined;
  const deleteTargetWorkspace = deleteWorkspaceId ? workspaceById.get(deleteWorkspaceId) : undefined;
  const kubernetesClustersInWorkspaceContext = useMemo(
    () => {
      if (!workspaceContextId) return kubernetesClusters;
      const workspace = workspaceById.get(workspaceContextId);
      if (workspace && !canReadWorkspaceData(workspace)) return [];
      return kubernetesClustersByWorkspaceId.get(workspaceContextId) || [];
    },
    [kubernetesClusters, kubernetesClustersByWorkspaceId, workspaceById, workspaceContextId]
  );
  const virtualMachineCache = useWorkspaceVirtualMachineCache(workspaceContextId, workspaceById);
  const {
    clusterCopilotCluster,
    clusterCopilotInitialPrompt,
    clusterCopilotWidth,
    clusterCopilotWorkspace,
    isClusterCopilotOpen,
    openClusterCopilot,
    setClusterCopilotInitialPrompt,
    setClusterCopilotWidth,
    setIsClusterCopilotOpen
  } = useClusterCopilotState(user?.id ?? null, kubernetesClusterById, workspaceById);
  const activePrimaryNav = useMemo(() => getActivePrimaryNav(route), [route]);
  const activeResourceNav = useMemo(() => getActiveResourceNav(route), [route]);
  const { bootstrapSession } = useAppBootstrap({
    route,
    selectedWorkspaceId,
    user,
    workspaces,
    setKubernetesClusters,
    setIsSessionRestoring,
    setSelectedWorkspaceId,
    setUser,
    setWorkspaces
  });
  const {
    dismissToast,
    handleLogin,
    handlePasswordLogin,
    handlePasswordSignup,
    handleVerifyEmail,
    handleResendVerification,
    handleRequestPasswordReset,
    handleResetPassword,
    loadWorkspaceInvitation,
    acceptWorkspaceInvitation,
    refreshWorkspaceInvitations,
    refreshWorkspaceMembers,
    showToast,
    toWorkspaceInvitation,
    toasts,
    updateKubernetesCluster,
    updateWorkspace
  } = useAppSupport({
    bootstrapSession,
    isAccountMenuOpen,
    isMobileNavOpen,
    isSidebarWorkspaceMenuOpen,
    navigate,
    route,
    sidebarAccountMenuRef,
    sidebarWorkspaceMenuRef,
    t,
    workspaces,
    setKubernetesClusters,
    setIsAccountMenuOpen,
    setIsAuthLoading,
    setIsMobileNavOpen,
    setIsSidebarWorkspaceMenuOpen,
    setSelectedWorkspaceId,
    setUser,
    setWorkspaces
  });
  const handleSelectTheme = useThemeTransition(setThemePreference, resolvedTheme);
  const {
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
  } = useWorkspaceClusterActions({
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
  });
  useAppPreferences({
    i18n,
    language,
    loadedProfilePreferenceKey,
    selectedWorkspaceId,
    setLanguage,
    setLoadedProfilePreferenceKey,
    setSelectedWorkspaceId,
    setResolvedTheme,
    setThemePreference,
    skipAnonymousPreferencePersistCountRef,
    themePreference,
    user
  });
  useRecentInvestigationSync({
    currentUserId: user?.id ?? null,
    route,
    kubernetesClusterById,
    virtualMachinesInWorkspaceContext: virtualMachineCache.virtualMachinesInWorkspaceContext
  });
  useEffect(() => {
    if (!user || (route.kind !== 'home' && route.kind !== 'workspaces')) {
      return;
    }
    const targetWorkspaceId =
      (selectedWorkspaceId && workspaceById.has(selectedWorkspaceId))
        ? selectedWorkspaceId
        : workspaces[0]?.id;
    if (targetWorkspaceId) {
      const targetWorkspace = workspaceById.get(targetWorkspaceId);
      navigate(targetWorkspace ? workspaceLandingPath(targetWorkspace) : AppPaths.workspaceOverview(targetWorkspaceId), { replace: true });
    }
  }, [user, route.kind, selectedWorkspaceId, workspaceById, workspaces, navigate]);

  useEffect(() => {
    if (!routeWorkspaceId || !isWorkspaceDataRoute(route)) {
      return;
    }
    const routeWorkspace = workspaceById.get(routeWorkspaceId);
    if (!routeWorkspace || canReadWorkspaceData(routeWorkspace)) {
      return;
    }
    navigate(workspaceLandingPath(routeWorkspace), { replace: true });
  }, [route, routeWorkspaceId, workspaceById, navigate]);

  useEffect(() => {
    setSelectedWorkspaceId((current) => {
      if (workspaces.length === 0) return current ? null : current;
      if (current && workspaceById.has(current)) return current;
      return workspaces[0]?.id || null;
    });
  }, [workspaces, workspaceById]);

  useEffect(() => {
    if (!routeWorkspaceId) return;
    setSelectedWorkspaceId((current) => (current === routeWorkspaceId ? current : routeWorkspaceId));
  }, [routeWorkspaceId]);

  useEffect(() => {
    if (!user || !workspaceContextId || workspaceById.has(workspaceContextId)) {
      return;
    }
    let cancelled = false;
    void controlPlaneApi.getWorkspace(workspaceContextId, user)
      .then((workspace) => {
        if (cancelled) return;
        setWorkspaces((current) =>
          current.some((item) => item.id === workspace.id)
            ? current
            : [workspace, ...current]
        );
      })
      .catch((error) => {
        console.error('Failed hydrating workspace route target', error);
      });
    return () => {
      cancelled = true;
    };
  }, [user, workspaceContextId, workspaceById, setWorkspaces]);

  useEffect(() => {
    if (!user || route.kind !== 'workspaceKubernetesClusterDiagnostics' || kubernetesClusterById.has(route.clusterId)) {
      return;
    }
    const routeWorkspace = workspaceById.get(route.workspaceId);
    if (!routeWorkspace || !canReadWorkspaceData(routeWorkspace)) {
      return;
    }
    let cancelled = false;
    void controlPlaneApi.getCluster(route.workspaceId, route.clusterId)
      .then((app) => {
        if (cancelled) return;
        setKubernetesClusters((current) => current.some((item) => item.id === app.id)
          ? current.map((item) => (item.id === app.id ? app : item))
          : [...current, app]);
        setWorkspaces((current) =>
          current.map((workspace) => {
            if (workspace.id !== app.workspaceId) return workspace;
            const clusterIds = workspace.clusterIds.includes(app.id)
              ? workspace.clusterIds
              : [...workspace.clusterIds, app.id];
            return {
              ...workspace,
              clusterIds,
              clusterCount: Math.max(workspace.clusterCount ?? 0, clusterIds.length)
            };
          })
        );
      })
      .catch((error) => {
        console.error('Failed hydrating cluster route target', error);
      });
    return () => {
      cancelled = true;
    };
  }, [
    user,
    route.kind,
    route.kind === 'workspaceKubernetesClusterDiagnostics' ? route.workspaceId : undefined,
    route.kind === 'workspaceKubernetesClusterDiagnostics' ? route.clusterId : undefined,
    kubernetesClusterById,
    workspaceById,
    setKubernetesClusters,
    setWorkspaces
  ]);

  useEffect(() => {
    if (route.kind !== 'kubernetesClusters') {
      return;
    }

    const targetWorkspaceId =
      (selectedWorkspaceId && workspaceById.has(selectedWorkspaceId))
        ? selectedWorkspaceId
        : workspaces[0]?.id;
    if (targetWorkspaceId) {
      navigate(AppPaths.workspaceKubernetesClusters(targetWorkspaceId, { q: route.q, status: route.status }), { replace: true });
      return;
    }
    return;
  }, [route.kind, route.kind === 'kubernetesClusters' ? route.q : undefined, route.kind === 'kubernetesClusters' ? route.status : undefined, selectedWorkspaceId, workspaceById, workspaces, navigate]);

  useEffect(() => {
    if (!user || route.kind !== 'settings') {
      return;
    }

    navigate(legacySettingsRedirectPath({ selectedWorkspaceId, workspaceById, workspaces }), { replace: true });
  }, [user, route.kind, selectedWorkspaceId, workspaceById, workspaces, navigate]);

  useEffect(() => {
    if (route.kind !== 'kubernetesClusterDiagnostics') {
      return;
    }
    let cancelled = false;

    const cluster = kubernetesClusterById.get(route.clusterId);
    if (cluster) {
      if (cluster.workspaceId !== selectedWorkspaceId) {
        setSelectedWorkspaceId(cluster.workspaceId);
      }
      navigate(AppPaths.workspaceKubernetesClusterDiagnostics(cluster.workspaceId, cluster.id, route.tab, route.catalogState), { replace: true });
      return;
    }

    const selectedWorkspaceForClusterRoute = selectedWorkspaceId ? workspaceById.get(selectedWorkspaceId) : undefined;
    if (selectedWorkspaceForClusterRoute && !canReadWorkspaceData(selectedWorkspaceForClusterRoute)) {
      navigate(workspaceLandingPath(selectedWorkspaceForClusterRoute), { replace: true });
      return;
    }

    if (selectedWorkspaceId && selectedWorkspaceForClusterRoute) {
      void controlPlaneApi.getCluster(selectedWorkspaceId, route.clusterId)
        .then((app) => {
          if (cancelled) return;
          setKubernetesClusters((current) => current.some((item) => item.id === app.id)
            ? current.map((item) => (item.id === app.id ? app : item))
            : [...current, app]);
          setWorkspaces((current) =>
            current.map((workspace) => {
              if (workspace.id !== app.workspaceId) return workspace;
              const clusterIds = workspace.clusterIds.includes(app.id)
                ? workspace.clusterIds
                : [...workspace.clusterIds, app.id];
              return {
                ...workspace,
                clusterIds,
                clusterCount: Math.max(workspace.clusterCount ?? 0, clusterIds.length)
              };
            })
          );
          navigate(AppPaths.workspaceKubernetesClusterDiagnostics(app.workspaceId, app.id, route.tab, route.catalogState), { replace: true });
        })
        .catch(() => {
          if (cancelled) return;
          const fallbackWorkspaceId =
            (selectedWorkspaceId && workspaceById.has(selectedWorkspaceId))
              ? selectedWorkspaceId
              : workspaces[0]?.id;
          if (fallbackWorkspaceId) {
            navigate(AppPaths.workspaceKubernetesClusters(fallbackWorkspaceId), { replace: true });
          }
        });
      return () => {
        cancelled = true;
      };
    }

    const fallbackWorkspaceId =
      (selectedWorkspaceId && workspaceById.has(selectedWorkspaceId))
        ? selectedWorkspaceId
        : workspaces[0]?.id;
    if (fallbackWorkspaceId) {
      navigate(AppPaths.workspaceKubernetesClusters(fallbackWorkspaceId), { replace: true });
      return;
    }
    return;
  }, [route.kind, route.kind === 'kubernetesClusterDiagnostics' ? route.clusterId : undefined, route.kind === 'kubernetesClusterDiagnostics' ? route.tab : undefined, route.kind === 'kubernetesClusterDiagnostics' ? route.catalogState?.q : undefined, route.kind === 'kubernetesClusterDiagnostics' ? route.catalogState?.status : undefined, kubernetesClusterById, selectedWorkspaceId, workspaceById, workspaces, navigate]);

  useEffect(() => {
    setIsMobileNavOpen(false);
    setIsSidebarWorkspaceMenuOpen(false);
    setIsAccountMenuOpen(false);
  }, [
    route.kind,
    'workspaceId' in route ? route.workspaceId : undefined,
    'clusterId' in route ? route.clusterId : undefined,
    'tab' in route ? route.tab : undefined
  ]);

  const {
    activeClusterSubview,
    activeVmSubview,
    isClusterSidebar,
    isVirtualMachineSidebar,
    selectedSidebarCluster,
    selectedSidebarVm
  } = useSidebarRouteTargets({
    route,
    user,
    workspaceContext,
    selectedWorkspace,
    kubernetesClusterById,
    kubernetesClustersInWorkspaceContext,
    virtualMachinesInWorkspaceContext: virtualMachineCache.virtualMachinesInWorkspaceContext,
    workspaceById
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k') {
        return;
      }
      if (!selectedSidebarCluster) {
        return;
      }
      event.preventDefault();
      openClusterCopilot(selectedSidebarCluster);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openClusterCopilot, selectedSidebarCluster]);
  const getCurrentUserRoleForWorkspace = useCallback((workspaceId: string): Workspace['members'][number]['role'] => getCurrentUserRoleForWorkspaceValue(workspaceById, user?.email, workspaceId), [user?.email, workspaceById]);
  const getWorkspacePermission = useCallback((workspaceId: string, permission: keyof NonNullable<Workspace['permissions']>): boolean => {
    return getWorkspacePermissionValue(workspaceById, user?.email, workspaceId, permission);
  }, [user?.email, workspaceById]);
  const handleLogout = async () => {
    try {
      await controlPlaneApi.logout();
    } catch (err) {
      console.error('Logout failed', err);
    }
    setIsAccountMenuOpen(false);
    skipAnonymousPreferencePersistCountRef.current = 2;
    setUser(null);
    setKubernetesClusters([]);
    virtualMachineCache.resetVirtualMachineCache();
    setWorkspaces([]);
    setSelectedWorkspaceId(null);
    navigate(AppPaths.workspaces(), { replace: true });
  };
  if (!user && isSessionRestoring) {
    return <AppSessionRestoringScreen logoSrc={logoSrc} label={t('common.loading')} />;
  }
  if (route.kind === 'externalIntegrationLink' && (user || route.status || !route.token)) {
    return <ExternalIntegrationLinkRouteScreen logoSrc={logoSrc} onLinkStatus={(status) => navigate(AppPaths.externalIntegrationLinkStatus(status), { replace: true })} route={route} />;
  }
  if (!user) {
    return (
      <LoginPage
        isDark={isDark}
        preference={themePreference}
        resolvedTheme={resolvedTheme}
        isAuthLoading={isAuthLoading}
        logoSrc={logoSrc}
        oidcEnabled={authConfig.oidcEnabled}
        passwordAuthEnabled={authConfig.passwordAuthEnabled}
        passwordSignupEnabled={authConfig.passwordSignupEnabled}
        passwordResetEnabled={authConfig.passwordResetEnabled}
        onLogin={handleLogin}
        onPasswordLogin={handlePasswordLogin}
        onPasswordSignup={handlePasswordSignup}
        onVerifyEmail={handleVerifyEmail}
        onResendVerification={handleResendVerification}
        onRequestPasswordReset={handleRequestPasswordReset}
        onResetPassword={handleResetPassword}
        onSelectTheme={handleSelectTheme}
      />
    );
  }
  const installAgentCluster = installAgentClusterId ? kubernetesClusterById.get(installAgentClusterId) || null : null;
  const installAgentWorkspace = installAgentCluster ? workspaceById.get(installAgentCluster.workspaceId) : undefined;
  return (
    <AppShell
      acceptWorkspaceInvitation={acceptWorkspaceInvitation}
      activeClusterSubview={activeClusterSubview}
      activeVmSubview={activeVmSubview}
      activePrimaryNav={activePrimaryNav}
      activeResourceNav={activeResourceNav}
      kubernetesClusters={kubernetesClusters}
      kubernetesClustersInWorkspaceContext={kubernetesClustersInWorkspaceContext}
      virtualMachinesInWorkspaceContext={virtualMachineCache.virtualMachinesInWorkspaceContext}
      hasLoadedWorkspaceVirtualMachines={virtualMachineCache.hasLoadedWorkspaceVirtualMachines}
      clusterContextId={clusterContextId}
      clusterCopilotCluster={clusterCopilotCluster}
      clusterCopilotInitialPrompt={clusterCopilotInitialPrompt}
      clusterCopilotWidth={clusterCopilotWidth}
      clusterCopilotWorkspace={clusterCopilotWorkspace}
      clusterCreationStep={clusterCreationStep}
      clusterInstallCommand={clusterInstallCommand}
      clusterInstallWarnings={clusterInstallWarnings}
      deleteTargetWorkspace={deleteTargetWorkspace}
      dismissToast={dismissToast}
      excludeNamespaces={excludeNamespaces}
      getCurrentUserRoleForWorkspace={getCurrentUserRoleForWorkspace}
      getWorkspacePermission={getWorkspacePermission}
      handleCancelAddCluster={handleCancelAddCluster}
      handleConfirmAddCluster={handleConfirmAddCluster}
      handleCreateWorkspace={handleCreateWorkspace}
      handleDeleteCluster={handleDeleteCluster}
      handleDeleteWorkspace={handleDeleteWorkspace}
      handleInitiateAddCluster={handleInitiateAddCluster}
      handleLogout={handleLogout}
      handleProceedToInstructions={handleProceedToInstructions}
      handleSelectWorkspaceContext={handleSelectWorkspaceContext}
      includeNamespaces={includeNamespaces}
      installAgentCluster={installAgentCluster}
      installAgentWorkspace={installAgentWorkspace}
      currentUserEmail={user.email}
      invitationTokenMissingMessage={t('app.invitationTokenMissing')}
      isAddingCluster={isAddingCluster}
      isClusterCopilotOpen={isClusterCopilotOpen}
      isClusterSidebar={isClusterSidebar}
      isVirtualMachineSidebar={isVirtualMachineSidebar}
      isCreatingCluster={isCreatingCluster}
      isCreatingWorkspace={isCreatingWorkspace}
      isDark={isDark}
      isDeletingWorkspace={isDeletingWorkspace}
      isMobileNavOpen={isMobileNavOpen}
      isAccountMenuOpen={isAccountMenuOpen}
      isSidebarWorkspaceMenuOpen={isSidebarWorkspaceMenuOpen}
      language={language}
      languageOptions={getSupportedLanguages()}
      loadWorkspaceInvitation={loadWorkspaceInvitation}
      navigate={navigate}
      navigateToKubernetesCluster={navigateToKubernetesCluster}
      newClusterName={newClusterName}
      openClusterCopilot={openClusterCopilot}
      onConversationDeleted={(sessionName, targetName) => {
        showToast(t('app.deletedConversation', { sessionName, targetName }));
      }}
      refreshWorkspaceInvitations={refreshWorkspaceInvitations}
      refreshWorkspaceMembers={refreshWorkspaceMembers}
      route={route}
      selectedSidebarCluster={selectedSidebarCluster}
      selectedSidebarVm={selectedSidebarVm}
      selectedWorkspace={selectedWorkspace}
      selectedWorkspaceId={selectedWorkspaceId}
      setKubernetesClusters={setKubernetesClusters}
      onReplaceWorkspaceVirtualMachines={virtualMachineCache.replaceWorkspaceVirtualMachines}
      onUpsertWorkspaceVirtualMachine={virtualMachineCache.upsertWorkspaceVirtualMachine}
      onRemoveWorkspaceVirtualMachine={virtualMachineCache.removeWorkspaceVirtualMachine}
      setClusterCopilotInitialPrompt={setClusterCopilotInitialPrompt}
      setClusterCopilotWidth={setClusterCopilotWidth}
      setClusterCreationStep={setClusterCreationStep}
      setDeleteWorkspaceId={setDeleteWorkspaceId}
      setExcludeNamespaces={setExcludeNamespaces}
      setIncludeNamespaces={setIncludeNamespaces}
      setInstallAgentClusterId={setInstallAgentClusterId}
      setIsAccountMenuOpen={setIsAccountMenuOpen}
      setIsClusterCopilotOpen={setIsClusterCopilotOpen}
      setIsCreatingWorkspace={setIsCreatingWorkspace}
      setIsDeletingWorkspace={setIsDeletingWorkspace}
      setIsMobileNavOpen={setIsMobileNavOpen}
      setIsSidebarWorkspaceMenuOpen={setIsSidebarWorkspaceMenuOpen}
      setLanguage={setLanguage}
      setNewClusterName={setNewClusterName}
      setWorkspaces={setWorkspaces}
      showToast={showToast}
      sidebarAccountMenuRef={sidebarAccountMenuRef}
      sidebarWorkspaceMenuRef={sidebarWorkspaceMenuRef}
      themePreference={themePreference}
      resolvedTheme={resolvedTheme}
      toasts={toasts}
      toWorkspaceInvitation={toWorkspaceInvitation}
      selectTheme={handleSelectTheme}
      updateKubernetesCluster={updateKubernetesCluster}
      updateWorkspace={updateWorkspace}
      user={user}
      workspaceClusterCounts={workspaceClusterCounts}
      workspaceContext={workspaceContext}
      workspaceContextId={workspaceContextId}
      workspaces={workspaces}
    />
  );
};
export default App;
