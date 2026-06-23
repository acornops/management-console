import React, { Suspense } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { PageLoadingFallback } from '@/components/common/Loading';
import { ICONS } from '@/constants';
import type { TargetChatController } from '@/features/kubernetes-cluster-detail/hooks/useTargetChat';
import type { AppLanguageCode, AppLanguageOption } from '@/i18n/languageConfig';
import type { PendingVmRunbookPrompt, RunbookExecutionRequest } from '@/pages/runbooks/runbookModel';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import type { ControlPlaneVirtualMachine } from '@/services/controlPlaneApi';
import type { NavigateOptions } from '@/hooks/useAppRouter';
import { fadeTransition } from '@/lib/motion';
import { AppRoute, AppPaths, ClusterSubview, VmSubview } from '@/utils/routes';
import { KubernetesCluster, User, Workspace, WorkspaceInvitation } from '@/types';

const loadAgentRunbooksPage = () =>
  import('@/pages/AgentRunbooksPage').then((module) => ({ default: module.AgentRunbooksPage }));

const loadKubernetesClustersPage = () =>
  import('@/pages/KubernetesClustersPage').then((module) => ({ default: module.KubernetesClustersPage }));

const loadKubernetesClusterDetailPage = () =>
  import('@/pages/KubernetesClusterDetailPage').then((module) => ({ default: module.KubernetesClusterDetailPage }));

const loadNotFoundPage = () =>
  import('@/pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage }));

const loadUserSettingsPage = () =>
  import('@/pages/UserSettingsPage').then((module) => ({ default: module.UserSettingsPage }));

const loadVirtualMachinesPage = () =>
  import('@/pages/VirtualMachinesPage').then((module) => ({ default: module.VirtualMachinesPage }));

const loadWorkspaceInvitePage = () =>
  import('@/pages/WorkspaceInvitePage').then((module) => ({ default: module.WorkspaceInvitePage }));

const loadWorkspaceMembersPage = () =>
  import('@/pages/WorkspaceMembersPage').then((module) => ({ default: module.WorkspaceMembersPage }));

const loadWorkspaceOverviewPage = () =>
  import('@/pages/WorkspaceOverviewPage').then((module) => ({ default: module.WorkspaceOverviewPage }));

const loadWorkspaceSettingsPage = () =>
  import('@/pages/WorkspaceSettingsPage').then((module) => ({ default: module.WorkspaceSettingsPage }));

const loadWorkspaceAiSettingsPage = () =>
  import('@/pages/WorkspaceAiSettingsPage').then((module) => ({ default: module.WorkspaceAiSettingsPage }));

const loadWorkspaceAuditLogPage = () =>
  import('@/pages/WorkspaceAuditLogPage').then((module) => ({ default: module.WorkspaceAuditLogPage }));

const AgentRunbooksPage = React.lazy(loadAgentRunbooksPage);
const KubernetesClustersPage = React.lazy(loadKubernetesClustersPage);
const KubernetesClusterDetailPage = React.lazy(loadKubernetesClusterDetailPage);
const NotFoundPage = React.lazy(loadNotFoundPage);
const UserSettingsPage = React.lazy(loadUserSettingsPage);
const VirtualMachinesPage = React.lazy(loadVirtualMachinesPage);
const WorkspaceInvitePage = React.lazy(loadWorkspaceInvitePage);
const WorkspaceMembersPage = React.lazy(loadWorkspaceMembersPage);
const WorkspaceOverviewPage = React.lazy(loadWorkspaceOverviewPage);
const WorkspaceSettingsPage = React.lazy(loadWorkspaceSettingsPage);
const WorkspaceAiSettingsPage = React.lazy(loadWorkspaceAiSettingsPage);
const WorkspaceAuditLogPage = React.lazy(loadWorkspaceAuditLogPage);

export function preloadAppRoutePage(route: AppRoute): void {
  switch (route.kind) {
    case 'workspaceRunbooks':
      void loadAgentRunbooksPage();
      break;
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
    case 'settings':
      void loadUserSettingsPage();
      break;
    case 'workspaceVirtualMachines':
    case 'workspaceVirtualMachineDetail':
      void loadVirtualMachinesPage();
      break;
    case 'workspaceInvitation':
      void loadWorkspaceInvitePage();
      break;
    case 'workspaceMembers':
      void loadWorkspaceMembersPage();
      break;
    case 'workspaceOverview':
      void loadWorkspaceOverviewPage();
      break;
    case 'workspaceSettings':
      void loadWorkspaceSettingsPage();
      break;
    case 'workspaceAiSettings':
      void loadWorkspaceAiSettingsPage();
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
      route.kind === 'workspaceRunbooks' ||
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
  onRunRunbook: (request: RunbookExecutionRequest) => void;
  pendingVmRunbookPrompt: PendingVmRunbookPrompt | null;
  onPendingVmRunbookPromptConsumed: () => void;
  onRefreshWorkspaceInvitations: (workspaceId: string) => Promise<void>;
  onRefreshWorkspaceMembers: (workspaceId: string) => Promise<void>;
  onDeleteCluster: (cluster: KubernetesCluster) => Promise<void>;
  onOpenDeleteWorkspace: (workspaceId: string) => void;
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
  onRunRunbook,
  pendingVmRunbookPrompt,
  onPendingVmRunbookPromptConsumed,
  onRefreshWorkspaceInvitations,
  onRefreshWorkspaceMembers,
  onDeleteCluster,
  onOpenDeleteWorkspace,
  onLogout,
  onSetLanguage,
  showToast,
  toWorkspaceInvitation
}) => {
  const { t } = useTranslation();
  const shouldShowCreateFirstWorkspace =
    ((route.kind === 'workspaces' || route.kind === 'home') && workspaces.length === 0) ||
    routeTargetsMissingWorkspace(route, workspaceContext, workspaces.length);

  return (
    <main className="flex-1 min-w-0 w-full max-w-full min-h-0 flex flex-col h-full overflow-hidden relative">
      <motion.div
        {...fadeTransition}
        className="flex-1 min-w-0 w-full max-w-full min-h-0 h-full overflow-hidden flex flex-col"
      >
        {shouldShowCreateFirstWorkspace && (
          <div className="flex h-full min-h-0 flex-col items-center justify-center overflow-y-auto bg-ui-bg p-12 text-center custom-scrollbar">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl border border-ui-border bg-ui-surface shadow-sm">
              <ICONS.LayoutGrid className="h-7 w-7 text-accent-strong" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-ui-text">{t('app.createFirstWorkspace')}</h1>
            <p className="mt-3 max-w-md text-sm font-medium leading-6 text-ui-text-muted">
              {t('app.createFirstWorkspaceBody')}
            </p>
            <Button onClick={onCreateWorkspaceClick} variant="primary" size="lg" className="mt-8">
              <ICONS.Plus className="h-4 w-4" />
              {t('app.newWorkspace')}
            </Button>
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
              onSelectCluster={(clusterId) =>
                navigate(AppPaths.workspaceKubernetesClusterDiagnostics(workspaceContext.id, clusterId))
              }
              onSelectVirtualMachine={(vmId) =>
                navigate(AppPaths.workspaceVirtualMachineDetail(workspaceContext.id, vmId))
              }
              onResumeRecentInvestigation={(path) => navigate(path)}
            />
          )}

          {route.kind === 'workspaceRunbooks' && workspaceContext && (
            <AgentRunbooksPage
              workspace={workspaceContext}
              kubernetesClusters={kubernetesClustersInWorkspaceContext}
              onRunRunbook={onRunRunbook}
            />
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
              pendingRunbookPrompt={pendingVmRunbookPrompt}
              onPendingRunbookPromptConsumed={onPendingVmRunbookPromptConsumed}
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

          {route.kind === 'workspaceMembers' && workspaceContext && (
            <WorkspaceMembersPage
              workspace={workspaceContext}
              currentUserRole={getCurrentUserRoleForWorkspace(workspaceContext.id)}
              canManageMembers={getWorkspacePermission(workspaceContext.id, 'manage_members')}
              onCreateInvitation={async (input) => {
                const invitation = await controlPlaneApi.createWorkspaceInvitation(workspaceContext.id, input);
                if (!invitation.token) {
                  throw new Error(t('app.invitationTokenMissing'));
                }
                const mappedInvitation = toWorkspaceInvitation(invitation);
                onUpdateWorkspace(workspaceContext.id, {
                  invitations: [
                    mappedInvitation,
                    ...(workspaceContext.invitations || []).filter((item) => item.id !== mappedInvitation.id)
                  ]
                });
                return mappedInvitation;
              }}
              onRevokeInvitation={async (invitation) => {
                await controlPlaneApi.revokeWorkspaceInvitation(workspaceContext.id, invitation.id);
                await onRefreshWorkspaceInvitations(workspaceContext.id);
              }}
              onUpdateMemberRole={async (member, role) => {
                if (!member.userId) {
                  throw new Error(t('app.memberUserIdMissing'));
                }
                await controlPlaneApi.updateWorkspaceMemberRole(workspaceContext.id, member.userId, role);
                await onRefreshWorkspaceMembers(workspaceContext.id);
              }}
              onRemoveMember={async (member) => {
                if (!member.userId) {
                  throw new Error(t('app.memberUserIdMissing'));
                }
                await controlPlaneApi.deleteWorkspaceMember(workspaceContext.id, member.userId);
                await onRefreshWorkspaceMembers(workspaceContext.id);
              }}
            />
          )}

          {route.kind === 'workspaceSettings' && workspaceContext && (
            <WorkspaceSettingsPage
              workspace={workspaceContext}
              canDeleteWorkspace={getWorkspacePermission(workspaceContext.id, 'delete_workspace')}
              onDeleteWorkspace={onOpenDeleteWorkspace}
            />
          )}

          {route.kind === 'workspaceAiSettings' && workspaceContext && (
            <WorkspaceAiSettingsPage
              workspace={workspaceContext}
              canManageAiSettings={getWorkspacePermission(workspaceContext.id, 'manage_ai_settings')}
              showToast={showToast}
            />
          )}

          {route.kind === 'workspaceAuditLog' && workspaceContext && (
            <WorkspaceAuditLogPage workspace={workspaceContext} />
          )}

          {route.kind === 'settings' && (
            <UserSettingsPage
              user={user}
              language={language}
              languageOptions={languageOptions}
              onLogout={onLogout}
              onSetLanguage={onSetLanguage}
            />
          )}

          {(route.kind === 'kubernetesClusterDiagnostics' || route.kind === 'workspaceKubernetesClusterDiagnostics') && (
            <KubernetesClusterDetailPage
              kubernetesClusters={route.kind === 'workspaceKubernetesClusterDiagnostics' ? kubernetesClustersInWorkspaceContext : kubernetesClusters}
              clusterId={clusterContextId}
              clusterChatController={clusterChatController}
              currentUserEmail={user.email}
              activeSubview={activeClusterSubview}
              isDark={isDark}
              workspaces={workspaces}
              onOpenInstallModal={onInstallAgent}
              onToggleClusterTool={async (clusterId, tool, enabled) => {
                const cluster = kubernetesClusters.find((item) => item.id === clusterId);
                if (!cluster) return;

                try {
                  await controlPlaneApi.updateTargetTool(cluster.workspaceId, cluster.id, tool.name, enabled, {
                    capability: tool.capability
                  });
                } catch (err) {
                  console.error('Failed updating cluster tool settings', err);
                  return;
                }

                onUpdateKubernetesCluster(clusterId, {
                  mcpTools: (cluster.mcpTools || []).map((existingTool) =>
                    existingTool.toolId === tool.name ? { ...existingTool, enabled } : existingTool
                  )
                });
              }}
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
