import React, { Suspense } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { PageLoadingFallback } from '@/components/common/Loading';
import { ICONS } from '@/constants';
import type { TargetChatController } from '@/features/kubernetes-cluster-detail/hooks/useTargetChat';
import type { AppLanguageCode, AppLanguageOption } from '@/i18n/languageConfig';
import type { PendingVmTargetPrompt, TargetPromptRequest } from '@/pages/target-prompts/targetPromptModel';
import { mergeCreatedInvitation } from '@/pages/workspace-members/invitationList';
import { formatMemberMutationError } from '@/pages/workspace-members/memberUtils';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import type { ControlPlaneTargetIssueSummary, ControlPlaneVirtualMachine } from '@/services/controlPlaneApi';
import type { NavigateOptions } from '@/hooks/useAppRouter';
import { fadeTransition } from '@/lib/motion';
import type { SettingsTab } from '@/pages/SettingsPage';
import { workspaceLandingPath } from '@/app/appNavigationGuards';
import {
  hasAnotherWorkspaceOwner,
  isKnownOnlyWorkspaceOwner,
  shouldPreflightWorkspaceOwnerLeave,
  workspacesAfterLeave
} from '@/app/workspaceLeave';
import { AppRoute, AppPaths, ClusterSubview, VmSubview } from '@/utils/routes';
import { KubernetesCluster, User, Workspace, WorkspaceInvitation } from '@/types';

const loadKubernetesClustersPage = () =>
  import('@/pages/KubernetesClustersPage').then((module) => ({ default: module.KubernetesClustersPage }));

const loadKubernetesClusterDetailPage = () =>
  import('@/pages/KubernetesClusterDetailPage').then((module) => ({ default: module.KubernetesClusterDetailPage }));

const loadNotFoundPage = () =>
  import('@/pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage }));

const loadSettingsPage = () =>
  import('@/pages/SettingsPage').then((module) => ({ default: module.SettingsPage }));

const loadUserSettingsPage = () =>
  import('@/pages/UserSettingsPage').then((module) => ({ default: module.UserSettingsPage }));

const loadHelpPage = () =>
  import('@/pages/HelpPage').then((module) => ({ default: module.HelpPage }));

const loadVirtualMachinesPage = () =>
  import('@/pages/VirtualMachinesPage').then((module) => ({ default: module.VirtualMachinesPage }));

const loadWorkspaceAgentsPage = () =>
  import('@/pages/WorkspaceAgentsPage').then((module) => ({ default: module.WorkspaceAgentsPage }));

const loadWorkspaceWorkflowsPage = () =>
  import('@/pages/WorkspaceWorkflowsPage').then((module) => ({ default: module.WorkspaceWorkflowsPage }));

const loadWorkspaceSchedulesPage = () =>
  import('@/pages/WorkspaceSchedulesPage').then((module) => ({ default: module.WorkspaceSchedulesPage }));

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
const WorkspaceWorkflowsPage = React.lazy(loadWorkspaceWorkflowsPage);
const WorkspaceSchedulesPage = React.lazy(loadWorkspaceSchedulesPage);
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
      void loadWorkspaceAgentsPage();
      break;
    case 'workspaceWorkflows':
      void loadWorkspaceWorkflowsPage();
      break;
    case 'workspaceSchedules':
      void loadWorkspaceSchedulesPage();
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
    case 'workspaceAuditLog':
      void loadWorkspaceAuditLogPage();
      break;
    case 'home':
    case 'workspaces':
      break;
  }
}

function routeTargetsMissingWorkspace(route: AppRoute, workspaceContext: Workspace | undefined, workspaceCount: number): boolean {
  return (
    workspaceCount === 0 &&
    !workspaceContext &&
    (
      route.kind === 'workspaceOverview' ||
      route.kind === 'workspaceAgents' ||
      route.kind === 'workspaceWorkflows' ||
      route.kind === 'workspaceSchedules' ||
      route.kind === 'workspaceApprovals' ||
      route.kind === 'workspaceMembers' ||
      route.kind === 'workspaceAiSettings' ||
      route.kind === 'workspaceSettings' ||
      route.kind === 'workspaceAuditLog' ||
      route.kind === 'workspaceKubernetesClusters' ||
      route.kind === 'workspaceVirtualMachines' ||
      route.kind === 'workspaceVirtualMachineDetail' ||
      route.kind === 'workspaceKubernetesClusterDiagnostics'
    )
  );
}

interface AppPageContentProps {
  activeClusterSubview: ClusterSubview;
  activeVmSubview: VmSubview;
  kubernetesClusters: KubernetesCluster[];
  kubernetesClustersInWorkspaceContext: KubernetesCluster[];
  virtualMachinesInWorkspaceContext: ControlPlaneVirtualMachine[];
  hasLoadedWorkspaceVirtualMachines: boolean;
  clusterContextId?: string;
  clusterChatController: TargetChatController | null;
  isDark: boolean;
  language: AppLanguageCode;
  languageOptions: AppLanguageOption[];
  route: AppRoute;
  selectedTargetIssueSummary: ControlPlaneTargetIssueSummary | null;
  user: User;
  workspaceContext: Workspace | undefined;
  workspaceContextId: string | null;
  workspaces: Workspace[];
  getCurrentUserRoleForWorkspace: (workspaceId: string) => Workspace['members'][number]['role'];
  getWorkspacePermission: (workspaceId: string, permission: keyof NonNullable<Workspace['permissions']>) => boolean;
  loadWorkspaceInvitation: (token: string) => ReturnType<typeof controlPlaneApi.getWorkspaceInvitation>;
  acceptWorkspaceInvitation: (token: string) => Promise<void>;
  navigate: (path: string, options?: NavigateOptions) => void;
  navigateToKubernetesCluster: (cluster: KubernetesCluster) => void;
  onCreateWorkspaceClick: () => void;
  onInitiateAddCluster: (workspaceId: string) => void;
  onInstallAgent: (clusterId: string) => void;
  onUpdateKubernetesCluster: (clusterId: string, updates: Partial<KubernetesCluster>) => void;
  onReplaceWorkspaceKubernetesClusters: (workspaceId: string, nextClusters: KubernetesCluster[]) => void;
  onAppendWorkspaceKubernetesClusters: (workspaceId: string, nextClusters: KubernetesCluster[]) => void;
  onReplaceWorkspaceVirtualMachines: (workspaceId: string, nextVirtualMachines: ControlPlaneVirtualMachine[]) => void;
  onUpsertWorkspaceVirtualMachine: (workspaceId: string, virtualMachine: ControlPlaneVirtualMachine) => void;
  onRemoveWorkspaceVirtualMachine: (workspaceId: string, virtualMachineId: string) => void;
  onUpdateWorkspace: (workspaceId: string, updates: Partial<Workspace>) => void;
  onOpenClusterChatPanel: (cluster: KubernetesCluster, prompt?: string) => void;
  onRunTargetPrompt: (request: TargetPromptRequest) => void;
  pendingVmTargetPrompt: PendingVmTargetPrompt | null;
  onPendingVmTargetPromptConsumed: () => void;
  onRefreshWorkspaceInvitations: (workspaceId: string) => Promise<void>;
  onRefreshWorkspaceMembers: (workspaceId: string) => Promise<void>;
  onDeleteCluster: (cluster: KubernetesCluster) => Promise<void>;
  onOpenDeleteWorkspace: (workspaceId: string) => void;
  onLeaveWorkspaceSuccess: (workspaceId: string) => void;
  onLogout: () => void;
  onSetLanguage: (language: AppLanguageCode) => void;
  showToast: (message: string) => void;
  toWorkspaceInvitation: (invitation: Awaited<ReturnType<typeof controlPlaneApi.createWorkspaceInvitation>>) => WorkspaceInvitation;
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
  onReplaceWorkspaceKubernetesClusters,
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
    ((route.kind === 'workspaces' || route.kind === 'home' || route.kind === 'settings') && workspaces.length === 0) ||
    routeTargetsMissingWorkspace(route, workspaceContext, workspaces.length);
  const activeSettingsTab: SettingsTab = route.kind === 'workspaceMembers'
    ? 'members'
    : route.kind === 'workspaceAiSettings'
      ? 'ai'
      : 'workspace';

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
      <motion.div
        {...fadeTransition}
        className="flex-1 min-w-0 w-full max-w-full min-h-0 h-full overflow-hidden flex flex-col"
      >
        {shouldShowCreateFirstWorkspace && (
          <div className="flex h-full min-h-0 flex-col items-center justify-center overflow-y-auto bg-ui-bg px-6 py-10 text-center custom-scrollbar sm:px-10 lg:pb-24">
            <section aria-labelledby="create-first-workspace-title" className="w-full max-w-3xl">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl border border-ui-border bg-ui-surface shadow-sm">
                <ICONS.LayoutGrid className="h-6 w-6 text-accent-strong" aria-hidden="true" />
              </div>
              <p className="type-label mb-3 text-accent-strong">{t('app.createFirstWorkspaceKicker')}</p>
              <h1 id="create-first-workspace-title" className="type-route-title text-ui-text">{t('app.createFirstWorkspace')}</h1>
              <p className="type-body mx-auto mt-3 max-w-xl text-ui-text-muted">
                {t('app.createFirstWorkspaceBody')}
              </p>

              <ol className="mx-auto mt-7 grid max-w-2xl overflow-hidden rounded-lg border border-ui-border bg-ui-surface text-left shadow-sm sm:grid-cols-3">
                {([
                  ['workspace', ICONS.LayoutGrid, t('app.createFirstWorkspaceStepWorkspace'), t('app.createFirstWorkspaceStepWorkspaceBody')],
                  ['members', ICONS.Users, t('app.createFirstWorkspaceStepMembers'), t('app.createFirstWorkspaceStepMembersBody')],
                  ['chat', ICONS.BotMessageSquare, t('app.createFirstWorkspaceStepChat'), t('app.createFirstWorkspaceStepChatBody')]
                ] as const).map(([id, Icon, title, body], index) => (
                  <li key={id} className="border-b border-ui-border p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
                    <div className="flex items-center gap-2">
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

              <Button onClick={onCreateWorkspaceClick} variant="primary" size="lg" className="mt-8">
                <ICONS.Plus className="h-4 w-4" aria-hidden="true" />
                {t('app.createWorkspaceAction')}
              </Button>
              <p className="type-caption mx-auto mt-4 max-w-lg text-ui-text-muted">
                {t('app.createFirstWorkspaceInviteHint')}
              </p>
            </section>
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
              onRunTriage={onRunTargetPrompt}
              onSelectCluster={(clusterId) =>
                navigate(AppPaths.workspaceKubernetesClusterDiagnostics(workspaceContext.id, clusterId))
              }
              onSelectVirtualMachine={(vmId) =>
                navigate(AppPaths.workspaceVirtualMachineDetail(workspaceContext.id, vmId))
              }
              onResumeRecentInvestigation={(path) => navigate(path)}
            />
          )}

          {route.kind === 'workspaceWorkflows' && workspaceContext && (
            <WorkspaceWorkflowsPage
              workspace={workspaceContext}
            />
          )}

          {route.kind === 'workspaceAgents' && workspaceContext && (
            <WorkspaceAgentsPage
              workspace={workspaceContext}
            />
          )}

          {route.kind === 'workspaceSchedules' && workspaceContext && (
            <WorkspaceSchedulesPage workspace={workspaceContext} createWorkflowId={route.createWorkflowId} />
          )}

          {route.kind === 'workspaceApprovals' && workspaceContext && (
            <WorkspaceApprovalsPage workspace={workspaceContext} />
          )}

          {(route.kind === 'kubernetesClusters' || route.kind === 'workspaceKubernetesClusters') && (
            <KubernetesClustersPage
              kubernetesClusters={route.kind === 'workspaceKubernetesClusters' ? kubernetesClustersInWorkspaceContext : kubernetesClusters}
              workspaceId={route.kind === 'workspaceKubernetesClusters' ? route.workspaceId : undefined}
              workspaceName={route.kind === 'workspaceKubernetesClusters' ? workspaceContext?.name : undefined}
              totalClusterCount={route.kind === 'workspaceKubernetesClusters' ? workspaceContext?.clusterCount : undefined}
              onSelectKubernetesCluster={navigateToKubernetesCluster}
              onInstallAgent={onInstallAgent}
              onOpenClusterSettings={(cluster) =>
                navigate(AppPaths.workspaceKubernetesClusterDiagnostics(cluster.workspaceId, cluster.id, 'settings'))
              }
              onAddCluster={
                route.kind === 'workspaceKubernetesClusters' && getWorkspacePermission(route.workspaceId, 'manage_targets')
                  ? () => onInitiateAddCluster(route.workspaceId)
                  : undefined
              }
              canDeleteKubernetesCluster={(cluster) => getWorkspacePermission(cluster.workspaceId, 'manage_targets')}
              onDeleteKubernetesCluster={onDeleteCluster}
              onReplaceWorkspaceKubernetesClusters={onReplaceWorkspaceKubernetesClusters}
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
              onCreateInvitation={workspaceContext ? createWorkspaceInvitation : undefined}
              onRevokeInvitation={workspaceContext ? revokeWorkspaceInvitation : undefined}
              onUpdateMemberRole={workspaceContext ? updateWorkspaceMemberRole : undefined}
              onRemoveMember={workspaceContext ? removeWorkspaceMember : undefined}
              onSelectTab={navigateWorkspaceSettingsTab}
              showToast={showToast}
            />
          )}

          {route.kind === 'workspaceAuditLog' && workspaceContext && (
            <WorkspaceAuditLogPage workspace={workspaceContext} />
          )}

          {route.kind === 'accountSettings' && (
            <UserSettingsPage
              user={user}
              language={language}
              languageOptions={languageOptions}
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
              onUpdateClusterWriteConfirmationPolicy={async (clusterId, overrideRequired) => {
                const cluster = kubernetesClusters.find((item) => item.id === clusterId);
                if (!cluster) return;
                const writeConfirmationPolicy = await controlPlaneApi.updateClusterWriteConfirmationPolicy(
                  cluster.workspaceId,
                  cluster.id,
                  overrideRequired
                );
                onUpdateKubernetesCluster(clusterId, { writeConfirmationPolicy });
                showToast(t('clusterSetup.writeConfirmationsUpdated'));
              }}
              onOpenAiSettings={(workspaceId) => navigate(AppPaths.workspaceAiSettings(workspaceId))}
              onNavigateBackToClusters={() =>
                navigate(workspaceContextId ? AppPaths.workspaceKubernetesClusters(workspaceContextId) : AppPaths.kubernetesClusters())
              }
              onOpenClusterChatPanel={onOpenClusterChatPanel}
            />
          )}

          {route.kind === 'notFound' && (
            <NotFoundPage isDark={isDark} onGoHome={() => navigate(AppPaths.workspaces(), { replace: true })} />
          )}
        </Suspense>
      </motion.div>
    </main>
  );
};
