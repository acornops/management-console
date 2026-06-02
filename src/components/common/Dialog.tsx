import React from 'react';
import { motion } from 'framer-motion';
import { twMerge } from 'tailwind-merge';

import { modalOverlayMotion, modalPanelMotion } from '@/lib/motion';

interface DialogProps {
  children: React.ReactNode;
  className: string;
  titleId: string;
  closeDisabled?: boolean;
  id?: string;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  overlayClassName?: string;
  onClose: () => void;
}

interface DialogFocusWrapInput {
  currentIndex: number;
  focusableCount: number;
  shiftKey: boolean;
}

const dialogOverlayClassName =
  'fixed inset-0 z-50 flex items-center justify-center bg-ui-text/40 p-4 dark:bg-ui-bg/75';

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

export function shouldCloseDialogOnKeyDown(key: string, closeDisabled: boolean): boolean {
  return key === 'Escape' && !closeDisabled;
}

export function getDialogFocusWrapIndex({
  currentIndex,
  focusableCount,
  shiftKey
}: DialogFocusWrapInput): number | null {
  if (focusableCount <= 0) {
    return null;
  }

  if (currentIndex < 0) {
    return shiftKey ? focusableCount - 1 : 0;
  }

  if (shiftKey && currentIndex === 0) {
    return focusableCount - 1;
  }

  if (!shiftKey && currentIndex === focusableCount - 1) {
    return 0;
  }

  return null;
}

function getFocusableDialogElements(panel: HTMLElement): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector)).filter((element) => {
    if (element.getAttribute('aria-hidden') === 'true' || element.hasAttribute('hidden')) {
      return false;
    }

    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });
}

export const Dialog: React.FC<DialogProps> = ({
  children,
  className,
  titleId,
  closeDisabled = false,
  id,
  initialFocusRef,
  overlayClassName,
  onClose
}) => {
  const panelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const restoreTarget = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusTarget = initialFocusRef?.current || panelRef.current;
    focusTarget?.focus({ preventScroll: true });

    return () => {
      if (restoreTarget && document.contains(restoreTarget)) {
        restoreTarget.focus({ preventScroll: true });
      }
    };
  }, [initialFocusRef]);

  return (
    <motion.div
      {...modalOverlayMotion}
      className={twMerge(dialogOverlayClassName, overlayClassName)}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !closeDisabled) {
          onClose();
        }
      }}
    >
      <motion.div
        {...modalPanelMotion}
        id={id}
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={className}
        onKeyDown={(event) => {
          if (shouldCloseDialogOnKeyDown(event.key, closeDisabled)) {
            event.preventDefault();
            event.stopPropagation();
            onClose();
            return;
          }

          if (event.key === 'Tab') {
            const panel = panelRef.current;
            if (!panel) {
              return;
            }

            const focusableElements = getFocusableDialogElements(panel);
            const targetIndex = getDialogFocusWrapIndex({
              currentIndex: focusableElements.findIndex((element) => element === document.activeElement),
              focusableCount: focusableElements.length,
              shiftKey: event.shiftKey
            });

            if (targetIndex === null) {
              return;
            }

            event.preventDefault();
            event.stopPropagation();
            focusableElements[targetIndex]?.focus({ preventScroll: true });
          }
        }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>
  );
};
