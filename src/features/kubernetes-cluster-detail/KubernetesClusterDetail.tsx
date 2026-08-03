import React, { useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ControlledTargetChatView } from '@/features/targets/chat/components/ControlledTargetChatView';
import { ClusterSettingsView } from '@/features/kubernetes-cluster-detail/components/detail/views/ClusterSettingsView';
import { CapabilityAdminView } from '@/features/capabilities/CapabilityAdminView';
import { NamespaceScopeDialog } from '@/features/kubernetes-cluster-detail/components/detail/views/NamespaceScopeDialog';
import { OverviewView } from '@/features/kubernetes-cluster-detail/components/detail/views/OverviewView';
import { ResourcesView } from '@/features/kubernetes-cluster-detail/components/detail/views/ResourcesView';
import { useCapabilityCatalogCache } from '@/features/targets/admin/useCapabilityCatalogCache';
import { resolveClusterChatFooterKey } from '@/features/kubernetes-cluster-detail/components/detail/clusterChatFooter';
import { createMarkdownComponents } from '@/features/targets/chat/lib/markdown';
import { KubernetesClusterDetailProps, View } from '@/features/kubernetes-cluster-detail/types';
import { toKubernetesTargetDescriptor } from '@/features/targets/targetDescriptor';
import { managedSubviewPathSegment, parseClusterSubview } from '@/utils/routes';

interface KubernetesClusterDetailLocationState {
  view: View;
  sessionId: string | null;
}

function parseDetailView(value?: string | null): View | null {
  const view = parseClusterSubview(value || undefined);
  return view && view !== 'health' ? view : null;
}

function parseViewFromPath(pathname: string): View | null {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) {
    return null;
  }
  const lastSegment = segments[segments.length - 1] || null;
  return parseDetailView(lastSegment);
}

function buildPathWithView(pathname: string, view: View): string {
  const segments = pathname.split('/').filter(Boolean);
  const segment = managedSubviewPathSegment(view);
  if (segments.length === 0) {
    return `/${segment}`;
  }
  const lastSegment = segments[segments.length - 1];
  if (parseDetailView(lastSegment)) {
    segments[segments.length - 1] = segment;
  } else {
    segments.push(segment);
  }
  return `/${segments.join('/')}`;
}

function parseLocationState(): KubernetesClusterDetailLocationState {
  const params = new URLSearchParams(window.location.search);
  const viewParam = params.get('tab');
  const viewFromPath = parseViewFromPath(window.location.pathname);
  const sessionParam = params.get('session');

  const view: View = parseDetailView(viewParam) || viewFromPath || 'overview';

  return {
    view,
    sessionId: sessionParam && sessionParam.trim().length > 0 ? sessionParam : null
  };
}

/**
 * Container for cluster-level pages and guided troubleshooting.
 *
 * State orchestration for chat is delegated to `useTargetChat`, while this
 * component composes the view-level panels.
 */
const KubernetesClusterDetail: React.FC<KubernetesClusterDetailProps> = ({
  cluster,
  requestedView,
  currentWorkspacePermissions,
  workspaceName,
  chatController,
  issueSummary,
  isDark,
  onSyncTools,
  onUpdateName,
  onUpdateNamespaceScope,
  onUpdatePermissionMode,
  onReinstallAgent,
  onDeleteCluster,
  onOpenAiSettings,
  onOpenCopilot,
  onActiveViewChange
}) => {
  const initialLocationState = parseLocationState();
  const [activeView, setActiveView] = useState<View>(requestedView || initialLocationState.view);
  const lastRequestedViewRef = React.useRef<View | undefined>(requestedView);
  const pendingRequestedViewRef = React.useRef<View | null>(null);

  const canChat = Boolean(currentWorkspacePermissions?.create_sessions && currentWorkspacePermissions.create_read_only_runs);
  const canRequestWriteRuns = Boolean(currentWorkspacePermissions?.create_read_write_runs);
  const canCancelRuns = Boolean(currentWorkspacePermissions?.cancel_runs);
  const canDeleteSessions = Boolean(currentWorkspacePermissions?.delete_sessions);
  const canManageAiSettings = Boolean(currentWorkspacePermissions?.manage_ai_settings);
  const canReadPodLogs = Boolean(currentWorkspacePermissions?.read_target_logs);
  const canManageTools = Boolean(currentWorkspacePermissions?.manage_tools || currentWorkspacePermissions?.manage_target_insights);
  const canManageMcp = Boolean(currentWorkspacePermissions?.manage_mcp);
  const canManageCluster = Boolean(currentWorkspacePermissions?.manage_targets);
  const canManageAgentKeys = Boolean(currentWorkspacePermissions?.manage_agent_keys);
  const [isNamespaceScopeDialogOpen, setIsNamespaceScopeDialogOpen] = useState(false);
  const assistantMarkdownComponents = useMemo(() => createMarkdownComponents('assistant'), []);
  const userMarkdownComponents = useMemo(() => createMarkdownComponents('user'), []);
  const target = useMemo(() => toKubernetesTargetDescriptor(cluster), [cluster]);
  const targetCacheKey = `${target.workspaceId}:${target.id}`;
  const {
    cachedCatalogs: cachedCapabilityCatalogs,
    cacheMcpServersCatalog,
    cacheSkillsCatalog,
    cacheToolsCatalog
  } = useCapabilityCatalogCache(targetCacheKey);

  const {
    currentUserId,
    activeSessionId,
    setInputValue
  } = chatController;

  const analyzePod = (podName: string) => {
    const prompt = `Analyze pod ${podName}`;
    if (onOpenCopilot) {
      onOpenCopilot(prompt);
      return;
    }
    setInputValue(prompt);
    setActiveView('chat');
  };

  React.useEffect(() => {
    const locationState = parseLocationState();
    setActiveView(requestedView || locationState.view);
  }, [cluster.id, requestedView]);

  React.useEffect(() => {
    if (!requestedView || requestedView === lastRequestedViewRef.current) {
      return;
    }
    lastRequestedViewRef.current = requestedView;
    pendingRequestedViewRef.current = requestedView;
    setActiveView(requestedView);
  }, [requestedView]);

  React.useEffect(() => {
    if (requestedView) {
      return;
    }

    if (pendingRequestedViewRef.current && pendingRequestedViewRef.current !== activeView) {
      return;
    }
    if (pendingRequestedViewRef.current === activeView) {
      pendingRequestedViewRef.current = null;
    }

    const params = new URLSearchParams(window.location.search);

    params.delete('namespaceView');
    params.delete('namespace');

    if (activeView === 'chat' && activeSessionId) {
      params.set('session', activeSessionId);
    } else {
      params.delete('session');
    }

    // Keep the active cluster subview in the path for durable refresh/share URLs.
    const nextPathname = buildPathWithView(window.location.pathname, activeView);
    const queryString = params.toString();
    const nextUrl = `${nextPathname}${queryString ? `?${queryString}` : ''}`;
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    if (nextUrl !== currentUrl) {
      window.history.replaceState({}, '', nextUrl);
    }
  }, [activeSessionId, activeView, requestedView]);

  React.useEffect(() => {
    if (pendingRequestedViewRef.current && pendingRequestedViewRef.current !== activeView) {
      return;
    }
    onActiveViewChange?.(activeView);
  }, [activeView, onActiveViewChange]);

  return (
    <div className="flex h-full min-h-0 relative overflow-hidden">
      <div className="flex-1 min-h-0 flex flex-col h-full relative overflow-hidden">
        <div key={activeView} className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {activeView === 'overview' && (
              <OverviewView
                cluster={cluster}
                issueSummary={issueSummary}
                isDark={isDark}
                onOpenCopilot={onOpenCopilot}
              />
            )}
            {activeView === 'resources' && <ResourcesView cluster={cluster} canReadPodLogs={canReadPodLogs} onAnalyzePod={analyzePod} />}
            {(activeView === 'mcpServers' || activeView === 'skills' || activeView === 'tools') && (
              <CapabilityAdminView
                cacheKey={targetCacheKey}
                section={activeView}
                subject={target}
                mcp={{
                  canManageMcp,
                  canManageTools,
                  canRequestWriteRuns,
                  initialCatalog: cachedCapabilityCatalogs?.mcpServers,
                  onCatalogChange: cacheMcpServersCatalog,
                  onSyncTools
                }}
                skills={{
                  canManageSkills: Boolean(currentWorkspacePermissions?.manage_skills),
                  initialCatalog: cachedCapabilityCatalogs?.skills,
                  onCatalogChange: cacheSkillsCatalog
                }}
                tools={{
                  canManageTools,
                  initialCatalog: cachedCapabilityCatalogs?.tools,
                  onCatalogChange: cacheToolsCatalog
                }}
              />
            )}
            {activeView === 'chat' && (
              <ControlledTargetChatView
                controller={chatController}
                currentUserId={currentUserId}
                subject={target}
                isDark={isDark}
                canChat={canChat}
                canRequestWriteRuns={canRequestWriteRuns}
                canApproveWriteActions={canRequestWriteRuns}
                canCancelRuns={canCancelRuns}
                canDeleteSessions={canDeleteSessions}
                canManageAiSettings={canManageAiSettings}
                assistantMarkdownComponents={assistantMarkdownComponents}
                userMarkdownComponents={userMarkdownComponents}
                footerKey={resolveClusterChatFooterKey(cluster, canRequestWriteRuns)}
                onOpenAiSettings={onOpenAiSettings}
              />
            )}
            {activeView === 'settings' && (
              <ClusterSettingsView
                cluster={cluster}
                workspaceName={workspaceName}
                canManageCluster={canManageCluster}
                canManageAgentKeys={canManageAgentKeys}
                canCreateReadWriteRuns={canRequestWriteRuns}
                onUpdateName={onUpdateName}
                onEditNamespaceScope={onUpdateNamespaceScope ? () => setIsNamespaceScopeDialogOpen(true) : undefined}
                onUpdatePermissionMode={onUpdatePermissionMode}
                onReinstallAgent={onReinstallAgent}
                onDeleteCluster={onDeleteCluster}
              />
            )}
        </div>
        <AnimatePresence>
          {isNamespaceScopeDialogOpen && (
            <NamespaceScopeDialog
              cluster={cluster}
              onClose={() => setIsNamespaceScopeDialogOpen(false)}
              onSave={async (scope) => {
                await onUpdateNamespaceScope?.(scope);
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default KubernetesClusterDetail;
