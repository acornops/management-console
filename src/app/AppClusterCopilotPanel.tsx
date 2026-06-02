import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { RightSidePanel } from '@/components/common/RightSidePanel';
import { ClusterChatPanel } from '@/features/kubernetes-cluster-detail/components/detail/ClusterChatPanel';
import type { TargetChatController } from '@/features/kubernetes-cluster-detail/hooks/useTargetChat';
import { KubernetesCluster, Workspace } from '@/types';
import { AppPaths } from '@/utils/routes';

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
      const maxWidth = Math.floor(window.innerWidth * 0.82);
      const nextWidth = Math.min(Math.max(window.innerWidth - event.clientX, 380), maxWidth);
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
  }, [onResizeWidth]);

  return (
    <RightSidePanel
      isOpen={isOpen && Boolean(cluster) && Boolean(chatController)}
      onClose={onClose}
      ariaLabel={t('app.aiChat')}
      style={{ width }}
      className="max-w-[calc(100vw-1rem)]"
    >
      {cluster && chatController && (
        <>
          <div
            role="separator"
            aria-orientation="vertical"
            className="absolute left-0 top-0 z-[110] h-full w-1.5 cursor-ew-resize transition-colors hover:bg-accent/30"
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
            onInitialPromptHandled={onInitialPromptHandled}
          />
        </>
      )}
    </RightSidePanel>
  );
};
