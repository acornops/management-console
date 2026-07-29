import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { RightSidePanel } from '@acornops/ui';
import { ClusterChatPanel } from '@/features/kubernetes-cluster-detail/components/detail/ClusterChatPanel';
import type { TargetChatController } from '@/features/targets/chat/hooks/useTargetChat';
import { KubernetesCluster, Workspace } from '@/types';
import { AppPaths, withAssistantSession } from '@/utils/routes';
import {
  desktopSidebarWidth,
  dockedPanelMinimumWidth,
  getSidePanelMaximumWidth,
  minimumMainContentWidth,
  useDockedPanelLayout
} from '@/app/dockedPanelLayout';

interface AppClusterCopilotPanelProps {
  cluster: KubernetesCluster | null;
  chatController: TargetChatController | null;
  currentUserRole: Workspace['members'][number]['role'];
  currentWorkspacePermissions?: Workspace['permissions'];
  initialPrompt: { id: number; text: string } | null;
  isDark: boolean;
  isOpen: boolean;
  width: number;
  navigate: (path: string) => void;
  onClose: () => void;
  onInitialPromptHandled: () => void;
  onResizeWidth: (width: number) => void;
}

export const AppClusterCopilotPanel: React.FC<AppClusterCopilotPanelProps> = ({
  cluster,
  chatController,
  currentUserRole,
  currentWorkspacePermissions,
  initialPrompt,
  isDark,
  isOpen,
  width,
  navigate,
  onClose,
  onInitialPromptHandled,
  onResizeWidth
}) => {
  const { t } = useTranslation();
  const isResizingRef = useRef(false);
  const resizeFrameRef = useRef<number | null>(null);
  const pendingWidthRef = useRef(width);
  const isDocked = useDockedPanelLayout();

  useEffect(() => {
    pendingWidthRef.current = width;
  }, [width]);

  useEffect(() => {
    const commitPendingWidth = () => {
      resizeFrameRef.current = null;
      onResizeWidth(pendingWidthRef.current);
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isResizingRef.current) return;
      const maxWidth = getSidePanelMaximumWidth(window.innerWidth, isDocked);
      const nextWidth = Math.min(Math.max(window.innerWidth - event.clientX, dockedPanelMinimumWidth), maxWidth);
      pendingWidthRef.current = nextWidth;
      if (resizeFrameRef.current !== null) return;
      resizeFrameRef.current = window.requestAnimationFrame(commitPendingWidth);
    };

    const handleMouseUp = () => {
      if (!isResizingRef.current) return;
      isResizingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (resizeFrameRef.current !== null) {
        window.cancelAnimationFrame(resizeFrameRef.current);
        resizeFrameRef.current = null;
      }
    };
  }, [isDocked, onResizeWidth]);

  if (!isOpen || !cluster || !chatController) return null;

  const panelContents = (
    <>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={t('app.resizeClusterAssistant')}
        className="absolute left-0 top-0 z-[110] hidden h-full w-1.5 cursor-ew-resize transition-colors hover:bg-accent/30 xl:block"
        onMouseDown={(event) => {
          event.preventDefault();
          isResizingRef.current = true;
          document.body.style.cursor = 'ew-resize';
          document.body.style.userSelect = 'none';
        }}
      />
      <ClusterChatPanel
        cluster={cluster}
        chatController={chatController}
        currentUserRole={currentUserRole}
        currentWorkspacePermissions={currentWorkspacePermissions}
        initialPrompt={initialPrompt}
        isDark={isDark}
        onClose={onClose}
        onMaximize={() => {
          onClose();
          navigate(AppPaths.workspaceKubernetesClusterDiagnostics(cluster.workspaceId, cluster.id, 'chat'));
        }}
        onOpenAiSettings={() => {
          onClose();
          const returnTo = withAssistantSession(
            AppPaths.workspaceKubernetesClusterDiagnostics(cluster.workspaceId, cluster.id, 'chat'),
            chatController.activeSessionId
          );
          navigate(AppPaths.workspaceAiSettings(cluster.workspaceId, returnTo));
        }}
        onInitialPromptHandled={onInitialPromptHandled}
      />
    </>
  );

  if (isDocked) {
    return (
      <aside
        aria-label={t('app.clusterAssistant')}
        data-docked-assistant="true"
        className="relative flex h-full min-h-0 shrink-0 flex-col overflow-hidden border-l border-ui-border bg-ui-surface"
        style={{
          width,
          minWidth: dockedPanelMinimumWidth,
          maxWidth: `calc(100vw - ${desktopSidebarWidth + minimumMainContentWidth}px)`
        }}
      >
        {panelContents}
        <div data-floating-layer="true" className="pointer-events-none absolute inset-0 z-[120]" />
      </aside>
    );
  }

  return (
    <RightSidePanel
      isOpen
      onClose={onClose}
      ariaLabel={t('app.clusterAssistant')}
      style={{ width }}
      className="max-w-[calc(100vw-1rem)]"
    >
      {panelContents}
    </RightSidePanel>
  );
};
