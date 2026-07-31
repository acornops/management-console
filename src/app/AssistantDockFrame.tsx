import React from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { DrawerFrame } from '@acornops/ui';
import {
  appDockRootId,
  dockedPanelMinimumWidth,
  dockedPanelMotion,
  getResourceCardPreservingDockWidth,
  getSidePanelMaximumWidth,
  minimumMainContentWidth,
  resourceCardGridGap,
  useDesktopSidebarWidth,
  useDockedPanelLayout
} from '@/app/dockedPanelLayout';

const dockOpenEvent = 'acornops:assistant-dock-open';

interface AssistantDockFrameProps {
  ariaLabel: string;
  children: React.ReactNode;
  dockId: string;
  isOpen: boolean;
  resizeLabel: string;
  width: number;
  onClose: () => void;
  onExitComplete?: () => void;
  onWidthChange: (width: number) => void;
}

export const AssistantDockFrame: React.FC<AssistantDockFrameProps> = ({
  ariaLabel,
  children,
  dockId,
  isOpen,
  resizeLabel,
  width,
  onClose,
  onExitComplete,
  onWidthChange
}) => {
  const isResizingRef = React.useRef(false);
  const resizeFrameRef = React.useRef<number | null>(null);
  const pendingWidthRef = React.useRef(width);
  const isDocked = useDockedPanelLayout();
  const desktopSidebarWidth = useDesktopSidebarWidth();
  const shouldReduceMotion = useReducedMotion();
  const wasOpenRef = React.useRef(false);

  React.useEffect(() => {
    pendingWidthRef.current = width;
  }, [width]);

  React.useEffect(() => {
    if (!isOpen) return;
    window.dispatchEvent(new CustomEvent(dockOpenEvent, { detail: dockId }));
  }, [dockId, isOpen]);

  React.useLayoutEffect(() => {
    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = isOpen;
    if (!isOpen || wasOpen || !isDocked) return;

    const cardGrid = Array.from(
      document.querySelectorAll<HTMLElement>('[data-resource-card-grid="true"]')
    ).find((grid) => grid.getClientRects().length > 0);
    const pageContent = Array.from(
      document.querySelectorAll<HTMLElement>('.page-shell > div')
    ).find((content) => content.getClientRects().length > 0);
    const sizingSurface = cardGrid || pageContent;
    if (!sizingSurface) return;

    let columnGap = resourceCardGridGap;
    if (cardGrid) {
      const gridStyle = window.getComputedStyle(cardGrid);
      columnGap = Number.parseFloat(gridStyle.columnGap);
      if (!Number.isFinite(columnGap)) return;
      const dockedGridWidth = sizingSurface.getBoundingClientRect().width;
      const maximumWidth = getSidePanelMaximumWidth(window.innerWidth, true, desktopSidebarWidth);
      onWidthChange(Math.min(
        Math.max(
          getResourceCardPreservingDockWidth(
            dockedGridWidth,
            width,
            columnGap,
            cardGrid.children.length
          ),
          dockedPanelMinimumWidth
        ),
        maximumWidth
      ));
      return;
    }

    const dockedGridWidth = sizingSurface.getBoundingClientRect().width;
    const maximumWidth = getSidePanelMaximumWidth(window.innerWidth, true, desktopSidebarWidth);
    onWidthChange(Math.min(
      Math.max(
        getResourceCardPreservingDockWidth(dockedGridWidth, width, columnGap, 3),
        dockedPanelMinimumWidth
      ),
      maximumWidth
    ));
  }, [desktopSidebarWidth, isDocked, isOpen, onWidthChange, width]);

  React.useEffect(() => {
    const handleDockOpen = (event: Event) => {
      if (!isOpen || (event as CustomEvent<string>).detail === dockId) return;
      onClose();
    };
    window.addEventListener(dockOpenEvent, handleDockOpen);
    return () => window.removeEventListener(dockOpenEvent, handleDockOpen);
  }, [dockId, isOpen, onClose]);

  React.useEffect(() => {
    const commitPendingWidth = () => {
      resizeFrameRef.current = null;
      onWidthChange(pendingWidthRef.current);
    };
    const handleMouseMove = (event: MouseEvent) => {
      if (!isResizingRef.current) return;
      const maximumWidth = getSidePanelMaximumWidth(window.innerWidth, isDocked, desktopSidebarWidth);
      pendingWidthRef.current = Math.min(
        Math.max(window.innerWidth - event.clientX, dockedPanelMinimumWidth),
        maximumWidth
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
  }, [desktopSidebarWidth, isDocked, onWidthChange]);

  React.useEffect(() => {
    if (!isDocked && !isOpen) onExitComplete?.();
  }, [isDocked, isOpen, onExitComplete]);

  const maximumWidth = typeof window === 'undefined'
    ? dockedPanelMinimumWidth
    : getSidePanelMaximumWidth(window.innerWidth, isDocked, desktopSidebarWidth);
  const panelContents = (
    <>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={resizeLabel}
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
          onWidthChange(Math.min(
            Math.max(width + direction * step, dockedPanelMinimumWidth),
            maximumWidth
          ));
        }}
      />
      {children}
    </>
  );

  if (isDocked) {
    const dockHost = document.getElementById(appDockRootId);
    if (!dockHost) return null;

    return createPortal(
      <AnimatePresence onExitComplete={onExitComplete}>
        {isOpen && (
          <motion.aside
            aria-label={ariaLabel}
            data-docked-assistant="true"
            data-assistant-dock-id={dockId}
            className="relative flex h-full min-h-0 shrink-0 flex-col overflow-hidden border-l border-ui-border bg-ui-surface"
            style={{
              width,
              minWidth: dockedPanelMinimumWidth,
              maxWidth: `calc(100vw - ${desktopSidebarWidth + minimumMainContentWidth}px)`
            }}
            initial={shouldReduceMotion ? false : dockedPanelMotion.initial}
            animate={dockedPanelMotion.animate}
            exit={shouldReduceMotion ? { x: 0 } : dockedPanelMotion.exit}
            transition={shouldReduceMotion ? { duration: 0 } : dockedPanelMotion.transition}
          >
            {panelContents}
            <div data-floating-layer="true" className="pointer-events-none absolute inset-0 z-[120]" />
          </motion.aside>
        )}
      </AnimatePresence>,
      dockHost
    );
  }

  return (
    <DrawerFrame
      unframed
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel={ariaLabel}
      style={{ width }}
      className="max-w-[calc(100vw-1rem)]"
    >
      {panelContents}
    </DrawerFrame>
  );
};
