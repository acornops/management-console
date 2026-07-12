import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { ICONS, THEME_CLASSES } from '@/constants';
import KubernetesClusterDetail from '@/features/kubernetes-cluster-detail/KubernetesClusterDetail';
import type { TargetChatController } from '@/features/targets/chat/hooks/useTargetChat';
import type { ControlPlaneTargetIssueSummary } from '@/services/controlPlaneApi';
import { KubernetesCluster, Workspace } from '@/types';
import { ClusterSubview } from '@/utils/routes';

interface KubernetesClusterDetailPageProps {
  kubernetesClusters: KubernetesCluster[];
  clusterId?: string;
  currentUserEmail?: string;
  activeSubview?: ClusterSubview;
  clusterChatController: TargetChatController | null;
  issueSummary: ControlPlaneTargetIssueSummary | null;
  isDark: boolean;
  workspaces: Workspace[];
  onOpenInstallModal: (clusterId: string) => void;
  onSyncClusterTools: (clusterId: string, tools: KubernetesCluster['mcpTools']) => void;
  onUpdateClusterName: (clusterId: string, name: string) => void | Promise<void>;
  onUpdateClusterNamespaceScope: (clusterId: string, scope: { include: string[]; exclude: string[] }) => void | Promise<void>;
  onUpdateClusterWriteConfirmationPolicy: (clusterId: string, overrideRequired: boolean | null) => void | Promise<void>;
  onOpenAiSettings: (workspaceId: string) => void;
  onNavigateBackToClusters: () => void;
  onOpenClusterChatPanel?: (cluster: KubernetesCluster, prompt?: string) => void;
}

/**
 * Kubernetes cluster detail page with diagnostics and cluster operations.
 */
export const KubernetesClusterDetailPage: React.FC<KubernetesClusterDetailPageProps> = ({
  kubernetesClusters,
  clusterId,
  currentUserEmail,
  activeSubview,
  clusterChatController,
  issueSummary,
  isDark,
  workspaces,
  onOpenInstallModal,
  onSyncClusterTools,
  onUpdateClusterName,
  onUpdateClusterNamespaceScope,
  onUpdateClusterWriteConfirmationPolicy,
  onOpenAiSettings,
  onNavigateBackToClusters,
  onOpenClusterChatPanel
}) => {
  const { t } = useTranslation();
  const selectedCluster = kubernetesClusters.find((cluster) => cluster.id === clusterId) || null;
  const selectedWorkspace = selectedCluster
    ? workspaces.find((workspace) => workspace.id === selectedCluster.workspaceId)
    : undefined;
  const selectedClusterAgentState = selectedCluster?.agentConnectionState ||
    ((selectedCluster && (
      selectedCluster.workloads.length > 0 ||
      selectedCluster.nodes.length > 0 ||
      selectedCluster.services.length > 0 ||
      Number(selectedCluster.resourceSummary?.resourceCount || 0) > 0
    ))
      ? 'connected'
      : 'not_installed');
  const requiresClusterAgentInstall = selectedCluster && selectedClusterAgentState === 'not_installed';
  const requestedClusterView = activeSubview === 'health' ? 'overview' : activeSubview;

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {selectedCluster && clusterChatController && (!requiresClusterAgentInstall || requestedClusterView === 'settings') ? (
            <KubernetesClusterDetail
              cluster={selectedCluster}
              chatController={clusterChatController}
              issueSummary={issueSummary}
              requestedView={requestedClusterView}
              currentUserRole={
                selectedWorkspace
                  ?.members.find((member) => member.email === currentUserEmail)?.role || 'viewer'
              }
              currentWorkspacePermissions={selectedWorkspace?.permissions}
              workspaceName={selectedWorkspace?.name}
              isDark={isDark}
              onSyncTools={(tools) => onSyncClusterTools(selectedCluster.id, tools)}
              onUpdateName={(name) => onUpdateClusterName(selectedCluster.id, name)}
              onUpdateNamespaceScope={(scope) => onUpdateClusterNamespaceScope(selectedCluster.id, scope)}
              onUpdateWriteConfirmationPolicy={(overrideRequired) =>
                onUpdateClusterWriteConfirmationPolicy(selectedCluster.id, overrideRequired)
              }
              onOpenAiSettings={() => onOpenAiSettings(selectedCluster.workspaceId)}
              onOpenCopilot={(prompt) => onOpenClusterChatPanel?.(selectedCluster, prompt)}
            />
          ) : selectedCluster && !requiresClusterAgentInstall ? (
            <div className="flex-1 bg-ui-bg" />
          ) : selectedCluster && requiresClusterAgentInstall ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-ui-bg p-8 text-center">
              <div className="mb-8 max-w-xl rounded-xl border border-ui-border bg-ui-surface p-10 shadow-sm">
                <ICONS.Wrench className="mx-auto mb-5 h-14 w-14 text-status-warning-text" />
                <h2 className="mb-3 text-2xl font-bold text-ui-text">{t('diagnostics.installAgentTitle')}</h2>
                <p className="mx-auto mb-6 max-w-md text-sm leading-6 text-ui-text-muted">
                  {t('diagnostics.installAgentBody')}
                </p>
                <Button onClick={() => onOpenInstallModal(selectedCluster.id)} variant="primary" size="sm">
                  <ICONS.Wrench className="w-4 h-4" />
                  {t('diagnostics.openInstallCommand')}
                </Button>
              </div>
              <button
                onClick={onNavigateBackToClusters}
                className={`${THEME_CLASSES.primary.text} font-semibold flex items-center gap-2 hover:gap-3 transition-all`}
              >
                {t('diagnostics.returnToClusters')} <ICONS.ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-ui-bg p-8 text-center">
              <div className="mb-8 rounded-xl border border-ui-border bg-ui-surface p-10 shadow-sm">
                <ICONS.Activity className="mx-auto mb-6 h-16 w-16 text-ui-text-muted" />
                <h2 className="mb-3 text-2xl font-bold text-ui-text">{t('diagnostics.idleTitle')}</h2>
                <p className="mx-auto max-w-xs text-sm leading-6 text-ui-text-muted">
                  {t('diagnostics.idleBody')}
                </p>
              </div>
              <button
                onClick={onNavigateBackToClusters}
                className={`${THEME_CLASSES.primary.text} font-semibold flex items-center gap-2 hover:gap-3 transition-all`}
              >
                {t('diagnostics.returnToDashboard')} <ICONS.ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
