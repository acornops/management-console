import React from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { twMerge } from 'tailwind-merge';
import { sidePanelMotion } from './motion';
import {
  applyModalBackgroundInert,
  getModalBackgroundTargets,
  useModalIsolation
} from './ModalIsolation';

export interface RightSidePanelProps {
  ariaLabel?: string;
  children: React.ReactNode;
  className?: string;
  closeDisabled?: boolean;
  containerClassName?: string;
  descriptionId?: string;
  id?: string;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  isOpen: boolean;
  onClose: () => void;
  overlayClassName?: string;
  portalToBody?: boolean;
  side?: 'left' | 'right';
  style?: React.CSSProperties;
  titleId?: string;
}

const containerClassName = 'fixed inset-0 z-[100] flex justify-end';
const overlayClassName = 'absolute inset-0 bg-ui-text/25 dark:bg-ui-bg/70';
const panelClassName =
  'relative flex h-full w-full max-w-xl flex-col overflow-hidden bg-ui-surface shadow-2xl';
const leftSidePanelMotion = {
  initial: { x: -24, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: -24, opacity: 0 },
  transition: { duration: 0.16, ease: [0.16, 1, 0.3, 1] }
} as const;

export {
  applyModalBackgroundInert as applyRightSidePanelBackgroundInert,
  getModalBackgroundTargets as getRightSidePanelBackgroundTargets
};

export const RightSidePanel: React.FC<RightSidePanelProps> = ({
  ariaLabel,
  children,
  className,
  closeDisabled = false,
  containerClassName: customContainerClassName,
  descriptionId,
  id,
  initialFocusRef,
  isOpen,
  onClose,
  overlayClassName: customOverlayClassName,
  portalToBody = false,
  side = 'right',
  style,
  titleId
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const panelRef = React.useRef<HTMLElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const { isTopmost, onKeyDown } = useModalIsolation({
    closeDisabled,
    containerRef,
    initialFocusRef,
    onClose,
    open: isOpen,
    panelRef
  });
  const panelMotion = shouldReduceMotion
    ? {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.01 }
    }
    : side === 'left' ? leftSidePanelMotion : sidePanelMotion;

  const panel = (
    <AnimatePresence>
      {isOpen && (
        <div ref={containerRef} className={twMerge(containerClassName, side === 'left' && 'justify-start', customContainerClassName)}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={shouldReduceMotion ? { duration: 0.01 } : { duration: 0.14, ease: 'easeOut' }}
            className={twMerge(overlayClassName, customOverlayClassName)}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !closeDisabled && isTopmost()) {
                onClose();
              }
            }}
          />
          <motion.aside
            id={id}
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            aria-labelledby={ariaLabel ? undefined : titleId}
            aria-describedby={descriptionId}
            tabIndex={-1}
            className={twMerge(panelClassName, side === 'left' ? 'border-r border-ui-border' : 'border-l border-ui-border', className)}
            style={style}
            {...panelMotion}
            onKeyDown={onKeyDown}
            onMouseDown={(event) => event.stopPropagation()}
          >
            {children}
            <div data-floating-layer="true" className="pointer-events-none absolute inset-0 z-[120]" />
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );

  return portalToBody && typeof document !== 'undefined'
    ? createPortal(panel, document.body)
    : panel;
};
