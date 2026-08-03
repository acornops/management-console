import React, { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@acornops/ui';
import { EmptyState } from '@acornops/ui';
import { PageLoadingFallback } from '@acornops/ui';
import { ICONS } from '@/constants';
import { mergeCreatedInvitation } from '@/pages/workspace-members/invitationList';
import { addWorkspaceMemberAndRefresh, formatMemberMutationError } from '@/pages/workspace-members/memberUtils';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import type { SettingsTab } from '@/pages/SettingsPage';
import type { AppPageContentProps } from '@/app/AppPageContent.types';
import { routeTargetsMissingWorkspace, workspaceLandingPath } from '@/app/appNavigationGuards';
import {
  hasAnotherWorkspaceOwner,
  isKnownOnlyWorkspaceOwner,
  shouldPreflightWorkspaceOwnerLeave,
  workspacesAfterLeave
} from '@/app/workspaceLeave';
import { AppRoute, AppPaths, ClusterCatalogReturnState, ClusterCatalogRouteState, getCurrentAppPath } from '@/utils/routes';
import { KubernetesCluster, Workspace, WorkspaceInvitation } from '@/types';

const loadKubernetesClustersPage = () => import('@/pages/KubernetesClustersPage').then((module) => ({ default: module.KubernetesClustersPage }));
const loadKubernetesClusterDetailPage = () => import('@/pages/KubernetesClusterDetailPage').then((module) => ({ default: module.KubernetesClusterDetailPage }));

const loadNotFoundPage = () => import('@/pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage }));

const loadSettingsPage = () => import('@/pages/SettingsPage').then((module) => ({ default: module.SettingsPage }));

const loadUserSettingsPage = () => import('@/pages/UserSettingsPage').then((module) => ({ default: module.UserSettingsPage }));

const loadHelpPage = () => import('@/pages/HelpPage').then((module) => ({ default: module.HelpPage }));
const loadVirtualMachinesPage = () => import('@/pages/VirtualMachinesPage').then((module) => ({ default: module.VirtualMachinesPage }));
const loadWorkspaceAgentsPage = () => import('@/pages/WorkspaceAgentsPage').then((module) => ({ default: module.WorkspaceAgentsPage }));
const loadWorkspaceCatalogPage = () =>
  import('@/pages/WorkspaceCatalogPage').then((module) => ({ default: module.WorkspaceCatalogPage }));
const loadWorkspaceWorkflowsPage = () =>
  import('@/pages/WorkspaceWorkflowsPage').then((module) => ({ default: module.WorkspaceWorkflowsPage }));

const loadWorkspaceActivityPage = () => import('@/pages/WorkspaceActivityPage').then((module) => ({ default: module.WorkspaceActivityPage }));
const loadWorkspaceSchedulesPage = () =>
  import('@/pages/WorkspaceSchedulesPage').then((module) => ({ default: module.WorkspaceSchedulesPage }));
const loadWorkspaceIncomingWebhooksPage = () =>
  import('@/pages/WorkspaceIncomingWebhooksPage').then((module) => ({ default: module.WorkspaceIncomingWebhooksPage }));

const loadWorkspaceWebhooksPage = () =>
  import('@/pages/WorkspaceWebhooksPage').then((module) => ({ default: module.WorkspaceWebhooksPage }));

const loadWorkspaceApprovalsPage = () =>
  import('@/pages/WorkspaceApprovalsPage').then((module) => ({ default: module.WorkspaceApprovalsPage }));

const loadWorkspaceInvitePage = () =>
  import('@/pages/WorkspaceInvitePage').then((module) => ({ default: module.WorkspaceInvitePage }));

const loadWorkspaceOverviewPage = () =>
  import('@/pages/WorkspaceOverviewPage').then((module) => ({ default: module.WorkspaceOverviewPage }));

const loadWorkspaceAuditLogPage = () =>
  import('@/pages/WorkspaceAuditLogPage').then((module) => ({ default: module.WorkspaceAuditLogPage }));

const KubernetesClustersPage = React.lazy(loadKubernetesClustersPage);
const KubernetesClusterDetailPage = React.lazy(loadKubernetesClusterDetailPage);
const NotFoundPage = React.lazy(loadNotFoundPage);
const SettingsPage = React.lazy(loadSettingsPage);
const UserSettingsPage = React.lazy(loadUserSettingsPage);
const HelpPage = React.lazy(loadHelpPage);
const VirtualMachinesPage = React.lazy(loadVirtualMachinesPage);
const WorkspaceAgentsPage = React.lazy(loadWorkspaceAgentsPage);
const WorkspaceCatalogPage = React.lazy(loadWorkspaceCatalogPage);
const WorkspaceWorkflowsPage = React.lazy(loadWorkspaceWorkflowsPage);
const WorkspaceActivityPage = React.lazy(loadWorkspaceActivityPage);
const WorkspaceSchedulesPage = React.lazy(loadWorkspaceSchedulesPage);
const WorkspaceIncomingWebhooksPage = React.lazy(loadWorkspaceIncomingWebhooksPage);
const WorkspaceWebhooksPage = React.lazy(loadWorkspaceWebhooksPage);
const WorkspaceApprovalsPage = React.lazy(loadWorkspaceApprovalsPage);
const WorkspaceInvitePage = React.lazy(loadWorkspaceInvitePage);
const WorkspaceOverviewPage = React.lazy(loadWorkspaceOverviewPage);
const WorkspaceAuditLogPage = React.lazy(loadWorkspaceAuditLogPage);

export function preloadAppRoutePage(route: AppRoute): void {
  switch (route.kind) {
    case 'kubernetesClusters':
    case 'workspaceKubernetesClusters':
      void loadKubernetesClustersPage();
      break;
    case 'kubernetesClusterDiagnostics':
    case 'workspaceKubernetesClusterDiagnostics':
      void loadKubernetesClusterDetailPage();
      break;
    case 'notFound':
      void loadNotFoundPage();
      break;
    case 'accountSettings':
      void loadUserSettingsPage();
      break;
    case 'help':
      void loadHelpPage();
      break;
    case 'workspaceVirtualMachines':
    case 'workspaceVirtualMachineDetail':
      void loadVirtualMachinesPage();
      break;
    case 'workspaceAgents':
    case 'workspaceAgentDetail':
      void loadWorkspaceAgentsPage();
      break;
    case 'workspaceCatalog':
      void loadWorkspaceCatalogPage();
      break;
    case 'workspaceWorkflows':
      if (route.section === 'all' && route.view === 'activity') void loadWorkspaceActivityPage();
      else if (route.section === 'schedules') void loadWorkspaceSchedulesPage();
      else if (route.section === 'incomingWebhooks') void loadWorkspaceIncomingWebhooksPage();
      else void loadWorkspaceWorkflowsPage();
      break;
    case 'workspaceActivity':
      void loadWorkspaceActivityPage();
      break;
    case 'workspaceRedirect':
      break;
    case 'workspaceApprovals':
      void loadWorkspaceApprovalsPage();
      break;
    case 'workspaceInvitation':
      void loadWorkspaceInvitePage();
      break;
    case 'workspaceMembers':
      void loadSettingsPage();
      break;
    case 'workspaceOverview':
      void loadWorkspaceOverviewPage();
      break;
    case 'workspaceSettings':
    case 'workspaceAiSettings':
      void loadSettingsPage();
      break;
    case 'workspaceWebhooks':
      void loadWorkspaceWebhooksPage(); break;
    case 'workspaceAuditLog':
      void loadWorkspaceAuditLogPage();
      break;
    case 'home':
    case 'workspaces':
      break;
  }
}

export const AppPageContent: React.FC<AppPageContentProps> = ({
  activeClusterSubview,
  activeVmSubview,
  kubernetesClusters,
  kubernetesClustersInWorkspaceContext,
  virtualMachinesInWorkspaceContext,
  hasLoadedWorkspaceVirtualMachines,
  clusterContextId,
  clusterChatController,
  isDark,
  language,
  languageOptions,
  route,
  selectedTargetIssueSummary,
  user,
  workspaceContext,
  workspaceContextId,
  workspaces,
  getCurrentUserRoleForWorkspace,
  getWorkspacePermission,
  loadWorkspaceInvitation,
  acceptWorkspaceInvitation,
  navigate,
  navigateToKubernetesCluster,
  onCreateWorkspaceClick,
  onInitiateAddCluster,
  onInstallAgent,
  onUpdateKubernetesCluster,
  onAppendWorkspaceKubernetesClusters,
  onReplaceWorkspaceVirtualMachines,
  onUpsertWorkspaceVirtualMachine,
  onRemoveWorkspaceVirtualMachine,
  onUpdateWorkspace,
  onOpenClusterChatPanel,
  onRunTargetPrompt,
  pendingVmTargetPrompt,
  onPendingVmTargetPromptConsumed,
  onRefreshWorkspaceInvitations,
  onRefreshWorkspaceMembers,
  onRefreshApprovalSummary,
  onDeleteCluster,
  onOpenDeleteWorkspace,
  onLeaveWorkspaceSuccess,
  onLogout,
  onSetLanguage,
  showToast,
  toWorkspaceInvitation
}) => {
  const { t } = useTranslation();
  const shouldShowCreateFirstWorkspace =
    ((route.kind === 'workspaces' || route.kind === 'home') && workspaces.length === 0) ||
    routeTargetsMissingWorkspace(route, workspaceContext, workspaces.length);
  const activeSettingsTab: SettingsTab = route.kind === 'workspaceMembers' ? 'members'
    : route.kind === 'workspaceAiSettings' ? 'ai'
      : 'workspace';
  const clusterCatalogState: ClusterCatalogRouteState | undefined =
    route.kind === 'workspaceKubernetesClusters' || route.kind === 'kubernetesClusters'
      ? {
          q: route.q,
          status: route.status
        }
      : undefined;
  const clusterCatalogReturnState: ClusterCatalogReturnState | undefined =
    route.kind === 'workspaceKubernetesClusters' || route.kind === 'kubernetesClusters'
      ? { q: route.q, status: route.status }
      : undefined;

  const navigateClusterCatalogState = (nextState: ClusterCatalogRouteState) => {
    if (route.kind === 'workspaceKubernetesClusters') {
      navigate(AppPaths.workspaceKubernetesClusters(route.workspaceId, nextState), { replace: true });
      return;
    }
    if (route.kind === 'kubernetesClusters') {
      navigate(AppPaths.kubernetesClusters(nextState), { replace: true });
    }
  };

  const selectKubernetesClusterFromCatalog = (cluster: KubernetesCluster) => {
    if (route.kind === 'workspaceKubernetesClusters' || route.kind === 'kubernetesClusters') {
      navigate(AppPaths.workspaceKubernetesClusterDiagnostics(
        cluster.workspaceId,
        cluster.id,
        undefined,
        clusterCatalogReturnState
      ));
      return;
    }
    navigateToKubernetesCluster(cluster);
  };

  const connectClusterFromOverview = () => {
    if (!workspaceContext) return;
    navigate(AppPaths.workspaceKubernetesClusters(workspaceContext.id));
    onInitiateAddCluster(workspaceContext.id);
  };
  const connectVirtualMachineFromOverview = () => {
    if (!workspaceContext) return;
    navigate(AppPaths.workspaceVirtualMachines(workspaceContext.id, { connect: true }));
  };
  const openClusterSettingsFromCatalog = (cluster: KubernetesCluster) => {
    navigate(AppPaths.workspaceKubernetesClusterDiagnostics(
      cluster.workspaceId,
      cluster.id,
      'settings',
      clusterCatalogReturnState
    ));
  };

  const navigateBackToClusterCatalog = () => {
    if (route.kind === 'workspaceKubernetesClusterDiagnostics') {
      navigate(AppPaths.workspaceKubernetesClusters(route.workspaceId, route.catalogState));
      return;
    }
    if (route.kind === 'kubernetesClusterDiagnostics') {
      navigate(AppPaths.kubernetesClusters(route.catalogState));
      return;
    }
    navigate(workspaceContextId ? AppPaths.workspaceKubernetesClusters(workspaceContextId) : AppPaths.kubernetesClusters());
  };

  const navigateWorkspaceSettingsTab = (tab: SettingsTab) => {
    if (!workspaceContext) return;
    if (tab === 'members') {
      navigate(AppPaths.workspaceMembers(workspaceContext.id));
      return;
    }
    if (tab === 'ai') {
      navigate(AppPaths.workspaceAiSettings(workspaceContext.id));
      return;
    }
    navigate(AppPaths.workspaceSettings(workspaceContext.id));
  };

  const createWorkspaceInvitation = async (input: { email: string; role: Workspace['members'][number]['role'] }) => {
    if (!workspaceContext) {
      throw new Error(t('settingsPage.noWorkspaceBody'));
    }
    const invitation = await controlPlaneApi.createWorkspaceInvitation(workspaceContext.id, input);
    if (!invitation.token) {
      throw new Error(t('app.invitationTokenMissing'));
    }
    const mappedInvitation = toWorkspaceInvitation(invitation);
    onUpdateWorkspace(workspaceContext.id, {
      invitations: mergeCreatedInvitation(workspaceContext.invitations || [], mappedInvitation)
    });
    return mappedInvitation;
  };
  const revokeWorkspaceInvitation = async (invitation: WorkspaceInvitation) => {
    if (!workspaceContext) return;
    await controlPlaneApi.revokeWorkspaceInvitation(workspaceContext.id, invitation.id);
    await onRefreshWorkspaceInvitations(workspaceContext.id);
  };

  const updateWorkspaceMemberRole = async (member: Workspace['members'][number], role: Workspace['members'][number]['role']) => {
    if (!workspaceContext) return;
    if (!member.userId) {
      throw new Error(t('app.memberUserIdMissing'));
    }
    await controlPlaneApi.updateWorkspaceMemberRole(workspaceContext.id, member.userId, role);
    await onRefreshWorkspaceMembers(workspaceContext.id);
  };

  const removeWorkspaceMember = async (member: Workspace['members'][number]) => {
    if (!workspaceContext) return;
    if (!member.userId) {
      throw new Error(t('app.memberUserIdMissing'));
    }
    await controlPlaneApi.deleteWorkspaceMember(workspaceContext.id, member.userId);
    await onRefreshWorkspaceMembers(workspaceContext.id);
  };

  const leaveWorkspace = async () => {
    if (!workspaceContext) return;
    const currentUserRole = getCurrentUserRoleForWorkspace(workspaceContext.id);
    try {
      if (isKnownOnlyWorkspaceOwner(currentUserRole, workspaceContext.memberCount)) {
        throw new Error(t('workspaceSettings.leaveOnlyOwnerError'));
      }
      if (shouldPreflightWorkspaceOwnerLeave(currentUserRole) && getWorkspacePermission(workspaceContext.id, 'read_members')) {
        const ownersPage = await controlPlaneApi.listWorkspaceMembers(workspaceContext.id, { limit: 2, role: 'owner' });
        if (!hasAnotherWorkspaceOwner(ownersPage.items)) {
          throw new Error(t('workspaceSettings.leaveOnlyOwnerError'));
        }
      }
      await controlPlaneApi.deleteWorkspaceMember(workspaceContext.id, user.id);
    } catch (error) {
      throw new Error(formatMemberMutationError(
        error,
        t('workspaceSettings.leaveFailed'),
        t('workspaceSettings.leaveOnlyOwnerError')
      ));
    }

    const remainingWorkspaces = workspacesAfterLeave(workspaces, workspaceContext.id);
    const nextWorkspace = remainingWorkspaces[0];
    onLeaveWorkspaceSuccess(workspaceContext.id);
    navigate(nextWorkspace ? workspaceLandingPath(nextWorkspace) : AppPaths.workspaces(), { replace: true });
    showToast(t('workspaceSettings.leaveSuccess', { workspace: workspaceContext.name }));
  };

  return (
    <main className="flex-1 min-w-0 w-full max-w-full min-h-0 flex flex-col h-full overflow-hidden relative">
      <div
        className="flex-1 min-w-0 w-full max-w-full min-h-0 h-full overflow-hidden flex flex-col"
      >
        {shouldShowCreateFirstWorkspace && (
          <div className="flex h-full min-h-0 flex-col items-center justify-start overflow-y-auto bg-ui-bg px-6 py-10 text-center custom-scrollbar sm:px-10 lg:justify-center lg:pb-24">
            <EmptyState
              className="w-full max-w-3xl"
              headingLevel={1}
              icon={<ICONS.LayoutGrid />}
              eyebrow={t('app.createFirstWorkspaceKicker')}
              title={t('app.createFirstWorkspace')}
              description={t('app.createFirstWorkspaceBody')}
              details={(
                <ol className="grid border-y border-ui-border text-left sm:grid-cols-3 sm:divide-x sm:divide-ui-border">
                  {([
                    ['workspace', ICONS.LayoutGrid, t('app.createFirstWorkspaceStepWorkspace'), t('app.createFirstWorkspaceStepWorkspaceBody')],
                    ['ai', ICONS.Settings, t('app.createFirstWorkspaceStepAi'), t('app.createFirstWorkspaceStepAiBody')],
                    ['start', ICONS.Zap, t('app.createFirstWorkspaceStepStart'), t('app.createFirstWorkspaceStepStartBody')]
                  ] as const).map(([id, Icon, title, body], index) => (
                    <li key={id} className="border-b border-ui-border px-4 py-4 last:border-b-0 sm:border-b-0 sm:px-5">
                      <div className="flex items-center gap-2.5">
                        <span className="type-label flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-ui-border bg-ui-bg text-ui-text-muted">
                          {index + 1}
                        </span>
                        <Icon className="h-4 w-4 shrink-0 text-accent-strong" aria-hidden="true" />
                      </div>
                      <p className="type-row-title mt-3 text-ui-text">{title}</p>
                      <p className="type-caption mt-1 text-ui-text-muted">{body}</p>
                    </li>
                  ))}
                </ol>
              )}
              actions={<Button onClick={onCreateWorkspaceClick} variant="primary" size="lg">
                <ICONS.Plus className="h-4 w-4" aria-hidden="true" />
                {t('app.createWorkspaceAction')}
              </Button>}
              footer={t('app.createFirstWorkspaceInviteHint')}
            />
          </div>
        )}

        <Suspense fallback={<PageLoadingFallback label={t('common.loading')} />}>
          {route.kind === 'workspaceOverview' && workspaceContext && (
            <WorkspaceOverviewPage
              currentUserId={user.id}
              workspace={workspaceContext}
              kubernetesClusters={kubernetesClustersInWorkspaceContext}
              virtualMachines={virtualMachinesInWorkspaceContext}
              hasLoadedWorkspaceVirtualMachines={hasLoadedWorkspaceVirtualMachines}
              onReplaceWorkspaceVirtualMachines={onReplaceWorkspaceVirtualMachines}
              onConnectCluster={getWorkspacePermission(workspaceContext.id, 'manage_targets') ? connectClusterFromOverview : undefined}
              onConnectVirtualMachine={getWorkspacePermission(workspaceContext.id, 'manage_targets') ? connectVirtualMachineFromOverview : undefined}
              onRunTriage={onRunTargetPrompt}
              navigate={navigate}
            />
          )}

          {route.kind === 'workspaceWorkflows' && route.section === 'all' && route.view !== 'activity' && workspaceContext && (
            <WorkspaceWorkflowsPage
              key={workspaceContext.id}
              workspace={workspaceContext}
              navigate={navigate}
            />
          )}

          {route.kind === 'workspaceWorkflows' && route.section === 'all' && route.view === 'activity' && workspaceContext && (
            <WorkspaceActivityPage
              key={`${workspaceContext.id}:activity`}
              workspace={workspaceContext}
              routeState={route}
              navigate={navigate}
            />
          )}

          {route.kind === 'workspaceWorkflows' && route.section === 'schedules' && workspaceContext && (
            <WorkspaceSchedulesPage
              key={`${workspaceContext.id}:schedules`}
              workspace={workspaceContext}
              create={route.create}
              createWorkflowId={route.createWorkflowId}
              navigate={navigate}
            />
          )}

          {route.kind === 'workspaceWorkflows' && route.section === 'incomingWebhooks' && workspaceContext && (
            <WorkspaceIncomingWebhooksPage
              key={`${workspaceContext.id}:incoming-webhooks`}
              workspace={workspaceContext}
              create={route.create}
              createWorkflowId={route.createWorkflowId}
            />
          )}

          {route.kind === 'workspaceActivity' && workspaceContext && (
            <WorkspaceActivityPage
              key={workspaceContext.id}
              workspace={workspaceContext}
              routeState={route}
              navigate={navigate}
            />
          )}

          {(route.kind === 'workspaceAgents' || route.kind === 'workspaceAgentDetail') && workspaceContext && (
            <WorkspaceAgentsPage
              key={workspaceContext.id}
              workspace={workspaceContext}
              currentUserId={user.id}
              isDark={isDark}
              routeState={route.kind === 'workspaceAgentDetail' ? route : undefined}
              navigate={navigate}
            />
          )}

          {route.kind === 'workspaceCatalog' && workspaceContext && (
            <WorkspaceCatalogPage
              key={workspaceContext.id}
              workspace={workspaceContext}
              routeState={route}
              navigate={navigate}
            />
          )}

          {route.kind === 'workspaceApprovals' && workspaceContext && (
            <WorkspaceApprovalsPage workspace={workspaceContext} runId={route.runId} approvalId={route.approvalId}
              navigate={navigate} onApprovalDecision={onRefreshApprovalSummary} />
          )}

          {(route.kind === 'kubernetesClusters' || route.kind === 'workspaceKubernetesClusters') && (
            <KubernetesClustersPage
              kubernetesClusters={route.kind === 'workspaceKubernetesClusters' ? kubernetesClustersInWorkspaceContext : kubernetesClusters}
              workspaceId={route.kind === 'workspaceKubernetesClusters' ? route.workspaceId : undefined}
              workspaceName={route.kind === 'workspaceKubernetesClusters' ? workspaceContext?.name : undefined}
              totalClusterCount={route.kind === 'workspaceKubernetesClusters' ? workspaceContext?.clusterCount : undefined}
              catalogState={clusterCatalogState}
              onCatalogStateChange={navigateClusterCatalogState}
              onSelectKubernetesCluster={selectKubernetesClusterFromCatalog}
              onInstallAgent={onInstallAgent}
              canInstallAgent={(cluster) => getWorkspacePermission(cluster.workspaceId, 'manage_agent_keys')}
              onOpenClusterSettings={openClusterSettingsFromCatalog}
              onAddCluster={
                route.kind === 'workspaceKubernetesClusters' && getWorkspacePermission(route.workspaceId, 'manage_targets')
                  ? () => onInitiateAddCluster(route.workspaceId)
                  : undefined
              }
              canDeleteKubernetesCluster={(cluster) => getWorkspacePermission(cluster.workspaceId, 'manage_targets')}
              onDeleteKubernetesCluster={onDeleteCluster}
              onAppendWorkspaceKubernetesClusters={onAppendWorkspaceKubernetesClusters}
            />
          )}

          {(route.kind === 'workspaceVirtualMachines' || route.kind === 'workspaceVirtualMachineDetail') && workspaceContext && (
            <VirtualMachinesPage
              workspace={workspaceContext}
              currentUserId={user.id}
              route={route}
              activeSubview={activeVmSubview}
              virtualMachines={virtualMachinesInWorkspaceContext}
              hasLoadedWorkspaceVirtualMachines={hasLoadedWorkspaceVirtualMachines}
              isDark={isDark}
              canManageTargets={getWorkspacePermission(workspaceContext.id, 'manage_targets')}
              canCreateReadWriteRuns={getWorkspacePermission(workspaceContext.id, 'create_read_write_runs')}
              canManageAgentKeys={getWorkspacePermission(workspaceContext.id, 'manage_agent_keys')}
              navigate={navigate}
              onUpdateWorkspace={onUpdateWorkspace}
              onReplaceWorkspaceVirtualMachines={onReplaceWorkspaceVirtualMachines}
              onUpsertWorkspaceVirtualMachine={onUpsertWorkspaceVirtualMachine}
              onRemoveWorkspaceVirtualMachine={onRemoveWorkspaceVirtualMachine}
              pendingTargetPrompt={pendingVmTargetPrompt}
              issueSummary={route.kind === 'workspaceVirtualMachineDetail' ? selectedTargetIssueSummary : null}
              onPendingTargetPromptConsumed={onPendingVmTargetPromptConsumed}
            />
          )}

          {route.kind === 'workspaceInvitation' && (
            <WorkspaceInvitePage
              token={route.token}
              currentUserEmail={user.email}
              onLoadInvitation={loadWorkspaceInvitation}
              onAcceptInvitation={acceptWorkspaceInvitation}
              onGoToWorkspaces={() => navigate(AppPaths.workspaces())}
            />
          )}
          {(route.kind === 'workspaceSettings' || route.kind === 'workspaceAiSettings' || route.kind === 'workspaceMembers') && (
            <SettingsPage
              workspace={workspaceContext}
              initialTab={activeSettingsTab}
              canReadWorkspaceData={workspaceContext ? getWorkspacePermission(workspaceContext.id, 'read_workspace_data') : false}
              canReadMembers={workspaceContext ? getWorkspacePermission(workspaceContext.id, 'read_members') : false}
              canDeleteWorkspace={workspaceContext ? getWorkspacePermission(workspaceContext.id, 'delete_workspace') : false}
              canManageMembers={workspaceContext ? getWorkspacePermission(workspaceContext.id, 'manage_members') : false}
              canManageAiSettings={workspaceContext ? getWorkspacePermission(workspaceContext.id, 'manage_ai_settings') : false}
              currentUserRole={workspaceContext ? getCurrentUserRoleForWorkspace(workspaceContext.id) : undefined}
              onDeleteWorkspace={onOpenDeleteWorkspace}
              onLeaveWorkspace={workspaceContext ? leaveWorkspace : undefined}
              onAddMember={workspaceContext ? (input) => addWorkspaceMemberAndRefresh(workspaceContext.id, input, onRefreshWorkspaceMembers) : undefined}
              onCreateInvitation={workspaceContext ? createWorkspaceInvitation : undefined}
              onRevokeInvitation={workspaceContext ? revokeWorkspaceInvitation : undefined}
              onUpdateMemberRole={workspaceContext ? updateWorkspaceMemberRole : undefined}
              onRemoveMember={workspaceContext ? removeWorkspaceMember : undefined}
              onSelectTab={navigateWorkspaceSettingsTab}
              returnTo={route.kind === 'workspaceAiSettings' ? route.returnTo : undefined} onReturnToAssistant={(returnTo) => navigate(returnTo)}
              showToast={showToast}
            />
          )}

          {route.kind === 'workspaceWebhooks' && workspaceContext && <WorkspaceWebhooksPage
            workspace={workspaceContext} canManageWebhooks={getWorkspacePermission(workspaceContext.id, 'manage_webhooks')} showToast={showToast} navigate={navigate}
          />}

          {route.kind === 'workspaceAuditLog' && workspaceContext && (
            <WorkspaceAuditLogPage workspace={workspaceContext} />
          )}

          {route.kind === 'accountSettings' && (
            <UserSettingsPage
              user={user}
              language={language}
              languageOptions={languageOptions}
              onGoToWorkspaces={() => navigate(AppPaths.workspaces())}
              onLogout={onLogout}
              onSetLanguage={onSetLanguage}
            />
          )}

          {route.kind === 'help' && (
            <HelpPage />
          )}

          {(route.kind === 'kubernetesClusterDiagnostics' || route.kind === 'workspaceKubernetesClusterDiagnostics') && (
            <KubernetesClusterDetailPage
              kubernetesClusters={route.kind === 'workspaceKubernetesClusterDiagnostics' ? kubernetesClustersInWorkspaceContext : kubernetesClusters}
              clusterId={clusterContextId}
              clusterChatController={clusterChatController}
              currentUserEmail={user.email}
              activeSubview={activeClusterSubview}
              issueSummary={selectedTargetIssueSummary}
              isDark={isDark}
              workspaces={workspaces}
              onOpenInstallModal={onInstallAgent}
              onSyncClusterTools={(clusterId, tools) => onUpdateKubernetesCluster(clusterId, { mcpTools: tools })}
              onUpdateClusterName={async (clusterId, name) => {
                const cluster = kubernetesClusters.find((item) => item.id === clusterId);
                if (!cluster) return;
                const updatedName = await controlPlaneApi.updateClusterName(cluster.workspaceId, cluster.id, name);
                onUpdateKubernetesCluster(clusterId, updatedName);
                showToast(t('clusterSettings.clusterNameUpdated'));
              }}
              onUpdateClusterNamespaceScope={async (clusterId, scope) => {
                const cluster = kubernetesClusters.find((item) => item.id === clusterId);
                if (!cluster) return;
                const updatedScope = await controlPlaneApi.updateClusterNamespaceScope(cluster.workspaceId, cluster.id, {
                  namespaceInclude: scope.include,
                  namespaceExclude: scope.exclude
                });
                onUpdateKubernetesCluster(clusterId, updatedScope);
                showToast(t('clusterSetup.namespaceScopeUpdated'));
              }}
              onUpdateClusterPermissionMode={async (clusterId, permissionMode) => {
                const cluster = kubernetesClusters.find((item) => item.id === clusterId);
                if (!cluster) return;
                const permissionPolicy = await controlPlaneApi.updateClusterPermissionMode(
                  cluster.workspaceId,
                  cluster.id,
                  permissionMode
                );
                onUpdateKubernetesCluster(clusterId, permissionPolicy);
                showToast(t('clusterSettings.permissionModeUpdated'));
              }}
              onDeleteCluster={onDeleteCluster}
              onOpenAiSettings={(workspaceId) => navigate(AppPaths.workspaceAiSettings(workspaceId, getCurrentAppPath()))}
              onNavigateBackToClusters={navigateBackToClusterCatalog}
              onOpenClusterChatPanel={onOpenClusterChatPanel}
            />
          )}

          {route.kind === 'notFound' && (
            <NotFoundPage isDark={isDark} onGoHome={() => navigate(AppPaths.workspaces(), { replace: true })} />
          )}
        </Suspense>
      </div>
    </main>
  );
};
