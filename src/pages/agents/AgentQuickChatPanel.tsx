import React from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { RightSidePanel } from '@acornops/ui';
import {
  appDockRootId,
  desktopSidebarWidth,
  dockedPanelMinimumWidth,
  getSidePanelMaximumWidth,
  minimumMainContentWidth,
  useDockedPanelLayout
} from '@/app/dockedPanelLayout';
import { AgentChatPanel } from '@/pages/agents/AgentChatPanel';
import type { AgentDefinition } from '@/pages/agents/agentModel';
import type { Workspace } from '@/types';

interface AgentQuickChatPanelProps {
  agent: AgentDefinition | undefined;
  currentUserId: string;
  isDark: boolean;
  isOpen: boolean;
  permissions?: Workspace['permissions'];
  onClose: () => void;
  onMaximize: () => void;
  onOpenAiSettings: () => void;
}

export const AgentQuickChatPanel: React.FC<AgentQuickChatPanelProps> = ({
  agent,
  currentUserId,
  isDark,
  isOpen,
  permissions,
  onClose,
  onMaximize,
  onOpenAiSettings
}) => {
  const { t } = useTranslation();
  const [width, setWidth] = React.useState(420);
  const isResizingRef = React.useRef(false);
  const resizeFrameRef = React.useRef<number | null>(null);
  const pendingWidthRef = React.useRef(width);
  const isDocked = useDockedPanelLayout();

  React.useEffect(() => {
    pendingWidthRef.current = width;
  }, [width]);

  React.useEffect(() => {
    const commitPendingWidth = () => {
      resizeFrameRef.current = null;
      setWidth(pendingWidthRef.current);
    };
    const handleMouseMove = (event: MouseEvent) => {
      if (!isResizingRef.current) return;
      const maxWidth = getSidePanelMaximumWidth(window.innerWidth, isDocked);
      pendingWidthRef.current = Math.min(
        Math.max(window.innerWidth - event.clientX, dockedPanelMinimumWidth),
        maxWidth
      );
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
      if (resizeFrameRef.current !== null) window.cancelAnimationFrame(resizeFrameRef.current);
    };
  }, [isDocked]);

  if (!isOpen || !agent) return null;

  const maximumWidth = getSidePanelMaximumWidth(window.innerWidth, isDocked);
  const panelContents = (
    <>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={t('agentChat.resizeQuickChat')}
        aria-valuemin={dockedPanelMinimumWidth}
        aria-valuemax={maximumWidth}
        aria-valuenow={width}
        tabIndex={0}
        className="absolute left-0 top-0 z-[110] h-full w-1.5 cursor-ew-resize transition-colors hover:bg-accent/30"
        onMouseDown={(event) => {
          event.preventDefault();
          isResizingRef.current = true;
          document.body.style.cursor = 'ew-resize';
          document.body.style.userSelect = 'none';
        }}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
          event.preventDefault();
          const direction = event.key === 'ArrowLeft' ? 1 : -1;
          const step = event.shiftKey ? 48 : 16;
          setWidth((current) => Math.min(
            Math.max(current + direction * step, dockedPanelMinimumWidth),
            getSidePanelMaximumWidth(window.innerWidth, isDocked)
          ));
        }}
      />
      <AgentChatPanel
        agent={agent}
        currentUserId={currentUserId}
        displayMode="panel"
        isDark={isDark}
        permissions={permissions}
        onClose={onClose}
        onMaximize={onMaximize}
        onOpenAiSettings={onOpenAiSettings}
      />
    </>
  );

  if (isDocked) {
    const dockHost = document.getElementById(appDockRootId);
    if (!dockHost) return null;

    return createPortal(
      <aside
        aria-label={t('agentChat.quickChatLabel', { name: agent.name })}
        data-docked-assistant="true"
        data-docked-agent-chat="true"
        className="relative flex h-full min-h-0 shrink-0 flex-col overflow-hidden border-l border-ui-border bg-ui-surface"
        style={{
          width,
          minWidth: dockedPanelMinimumWidth,
          maxWidth: `calc(100vw - ${desktopSidebarWidth + minimumMainContentWidth}px)`
        }}
      >
        {panelContents}
        <div data-floating-layer="true" className="pointer-events-none absolute inset-0 z-[120]" />
      </aside>,
      dockHost
    );
  }

  return (
    <RightSidePanel
      isOpen
      onClose={onClose}
      ariaLabel={t('agentChat.quickChatLabel', { name: agent.name })}
      style={{ width }}
      className="max-w-[calc(100vw-1rem)]"
    >
      {panelContents}
    </RightSidePanel>
  );
};
