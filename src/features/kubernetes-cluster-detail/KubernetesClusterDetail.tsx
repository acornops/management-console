import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TargetChatView } from '@/features/kubernetes-cluster-detail/components/detail/views/TargetChatView';
import { ClusterSettingsView } from '@/features/kubernetes-cluster-detail/components/detail/views/ClusterSettingsView';
import { McpServersView } from '@/features/kubernetes-cluster-detail/components/detail/views/McpServersView';
import { NamespaceScopeDialog } from '@/features/kubernetes-cluster-detail/components/detail/views/NamespaceScopeDialog';
import { OverviewView } from '@/features/kubernetes-cluster-detail/components/detail/views/OverviewView';
import { ResourcesView } from '@/features/kubernetes-cluster-detail/components/detail/views/ResourcesView';
import { TargetSkillsView } from '@/features/kubernetes-cluster-detail/components/detail/views/TargetSkillsView';
import { TargetToolsView } from '@/features/kubernetes-cluster-detail/components/detail/views/TargetToolsView';
import { createMarkdownComponents } from '@/features/kubernetes-cluster-detail/lib/markdown';
import { KubernetesClusterDetailProps, View } from '@/features/kubernetes-cluster-detail/types';
import { fadeTransition } from '@/lib/motion';

interface KubernetesClusterDetailLocationState {
  view: View;
  sessionId: string | null;
}

const VIEWS: View[] = ['overview', 'resources', 'mcpServers', 'skills', 'tools', 'chat', 'settings'];

function normalizeView(value: string | null): View | null {
  if (value === 'mcp-servers') return 'mcpServers';
  if (value === 'tools') return 'tools';
  return isView(value) ? value : null;
}

function viewPathSegment(view: View): string {
  if (view === 'mcpServers') return 'mcp-servers';
  return view;
}

function isView(value: string | null): value is View {
  return value !== null && VIEWS.includes(value as View);
}

function parseViewFromPath(pathname: string): View | null {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) {
    return null;
  }
  const lastSegment = segments[segments.length - 1] || null;
  return normalizeView(lastSegment);
}

function buildPathWithView(pathname: string, view: View): string {
  const segments = pathname.split('/').filter(Boolean);
  const segment = viewPathSegment(view);
  if (segments.length === 0) {
    return `/${segment}`;
  }
  const lastSegment = segments[segments.length - 1];
  if (normalizeView(lastSegment || null)) {
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

  const view: View = normalizeView(viewParam) || viewFromPath || 'overview';

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
  isDark,
  onSyncTools,
  onUpdateName,
  onUpdateNamespaceScope,
  onUpdateWriteConfirmationPolicy,
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
  const canReadPodLogs = Boolean(currentWorkspacePermissions?.read_target_logs);
  const canManageTools = Boolean(currentWorkspacePermissions?.manage_tools);
  const canManageMcp = Boolean(currentWorkspacePermissions?.manage_mcp);
  const canManageCluster = Boolean(currentWorkspacePermissions?.manage_targets);
  const [isNamespaceScopeDialogOpen, setIsNamespaceScopeDialogOpen] = useState(false);
  const assistantMarkdownComponents = useMemo(() => createMarkdownComponents('assistant'), []);
  const userMarkdownComponents = useMemo(() => createMarkdownComponents('user'), []);

  const {
    sessions,
    activeSessionId,
    isActiveSessionOwner,
    conversationNotice,
    recentActivityWarning,
    inputValue,
    isRunActive,
    isSessionsLoading,
    isLoadingEarlierMessages,
    hasEarlierMessages,
    activeRunId,
    isCancellingRun,
    visibleMessages,
    runTracesByRunId,
    sessionAssistantStatuses,
    transcriptRef,
    setActiveSessionId,
    handleCreateSession,
    handleDismissRecentActivityWarning,
    handleOpenRecentActivitySession,
    handleDeleteSession,
    handleCancelRun,
    setInputValue,
    handleChatScroll,
    handleLoadEarlierMessages,
    handleSend,
    handleEditLastUserMessage,
    handleApprove,
    handleReject,
    isInFlightAssistantPlaceholder
  } = chatController;

  const analyzePod = (podName: string) => {
    const prompt = `Analyze pod ${podName}`;
    if (onOpenCopilot) {
      onOpenCopilot(prompt);
      return;
    }
    handleCreateSession();
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
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={activeView} {...fadeTransition} className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {activeView === 'overview' && (
              <OverviewView
                cluster={cluster}
                isDark={isDark}
                onOpenCopilot={onOpenCopilot}
              />
            )}
            {activeView === 'resources' && <ResourcesView cluster={cluster} canReadPodLogs={canReadPodLogs} onAnalyzePod={analyzePod} />}
            {activeView === 'mcpServers' && (
              <McpServersView
                cluster={cluster}
                targetContext={{
                  workspaceId: cluster.workspaceId,
                  targetId: cluster.id,
                  targetType: 'kubernetes'
                }}
                canManageMcp={canManageMcp}
                canManageTools={canManageTools}
                canRequestWriteRuns={canRequestWriteRuns}
                onSyncTools={onSyncTools}
              />
            )}
            {activeView === 'skills' && (
              <TargetSkillsView
                cluster={cluster}
                targetContext={{
                  workspaceId: cluster.workspaceId,
                  targetId: cluster.id,
                  targetType: 'kubernetes'
                }}
                canManageSkills={Boolean(currentWorkspacePermissions?.manage_skills)}
              />
            )}
            {activeView === 'tools' && (
              <TargetToolsView
                cluster={cluster}
                targetContext={{
                  workspaceId: cluster.workspaceId,
                  targetId: cluster.id,
                  targetType: 'kubernetes'
                }}
                canManageTools={canManageTools}
              />
            )}
            {activeView === 'chat' && (
              <TargetChatView
                isDark={isDark}
                canChat={canChat}
                isConversationOwner={isActiveSessionOwner}
                conversationNotice={conversationNotice}
                recentActivityWarning={recentActivityWarning}
                canRequestWriteRuns={canRequestWriteRuns}
                canApproveWriteActions={canRequestWriteRuns}
                canCancelRuns={canCancelRuns}
                canDeleteSessions={canDeleteSessions}
                isRunActive={isRunActive}
                isSessionsLoading={isSessionsLoading}
                isLoadingEarlierMessages={isLoadingEarlierMessages}
                hasEarlierMessages={hasEarlierMessages}
                activeRunId={activeRunId}
                isCancellingRun={isCancellingRun}
                inputValue={inputValue}
                sessions={sessions}
                activeSessionId={activeSessionId}
                target={cluster}
                assistantMarkdownComponents={assistantMarkdownComponents}
                userMarkdownComponents={userMarkdownComponents}
                visibleMessages={visibleMessages}
                runTracesByRunId={runTracesByRunId}
                sessionAssistantStatuses={sessionAssistantStatuses}
                transcriptRef={transcriptRef}
                footerKey={canRequestWriteRuns ? undefined : 'chat.footerReadOnlyRole'}
                onChatScroll={handleChatScroll}
                onLoadEarlierMessages={handleLoadEarlierMessages}
                onInputChange={setInputValue}
                onSend={handleSend}
                onEditLastUserMessage={handleEditLastUserMessage}
                onApprove={handleApprove}
                onReject={handleReject}
                onSelectSession={setActiveSessionId}
                onCreateSession={handleCreateSession}
                onDismissRecentActivityWarning={handleDismissRecentActivityWarning}
                onOpenRecentActivitySession={handleOpenRecentActivitySession}
                onDeleteSession={handleDeleteSession}
                onCancelRun={handleCancelRun}
                isInFlightAssistantPlaceholder={isInFlightAssistantPlaceholder}
              />
            )}
            {activeView === 'settings' && (
              <ClusterSettingsView
                cluster={cluster}
                workspaceName={workspaceName}
                canManageCluster={canManageCluster}
                onUpdateName={onUpdateName}
                onEditNamespaceScope={onUpdateNamespaceScope ? () => setIsNamespaceScopeDialogOpen(true) : undefined}
                onUpdateWriteConfirmationPolicy={onUpdateWriteConfirmationPolicy}
              />
            )}
          </motion.div>
        </AnimatePresence>
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
