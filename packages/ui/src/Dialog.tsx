import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { twMerge } from 'tailwind-merge';

import { modalOverlayMotion, modalPanelMotion } from './motion';
import {
  getModalFocusWrapIndex,
  shouldCloseModalOnKeyDown,
  useModalIsolation
} from './ModalIsolation';

export interface DialogProps {
  children: React.ReactNode;
  className: string;
  titleId: string;
  closeDisabled?: boolean;
  descriptionId?: string;
  id?: string;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  overlayClassName?: string;
  onClose: () => void;
  style?: React.CSSProperties;
}

const dialogOverlayClassName =
  'fixed inset-0 z-50 flex items-center justify-center bg-ui-text/40 p-4 dark:bg-ui-bg/75';

export function shouldCloseDialogOnKeyDown(key: string, closeDisabled: boolean): boolean {
  return shouldCloseModalOnKeyDown(key, closeDisabled);
}

export const getDialogFocusWrapIndex = getModalFocusWrapIndex;

export const Dialog: React.FC<DialogProps> = ({
  children,
  className,
  titleId,
  closeDisabled = false,
  descriptionId,
  id,
  initialFocusRef,
  overlayClassName,
  onClose,
  style
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const { isTopmost, onKeyDown } = useModalIsolation({
    closeDisabled,
    containerRef,
    initialFocusRef,
    onClose,
    open: true,
    panelRef
  });
  const reducedMotion = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.01 }
  } as const;

  return (
    <motion.div
      {...(shouldReduceMotion ? reducedMotion : modalOverlayMotion)}
      ref={containerRef}
      className={twMerge(dialogOverlayClassName, overlayClassName)}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !closeDisabled && isTopmost()) {
          onClose();
        }
      }}
    >
      <motion.div
        {...(shouldReduceMotion ? reducedMotion : modalPanelMotion)}
        id={id}
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className={className}
        style={style}
        onKeyDown={onKeyDown}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div data-floating-layer="true" className="pointer-events-none absolute inset-0 z-[120]" />
        {children}
      </motion.div>
    </motion.div>
  );
};
