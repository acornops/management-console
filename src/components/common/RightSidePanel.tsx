import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { twMerge } from 'tailwind-merge';
import { sidePanelMotion } from '@/lib/motion';

interface RightSidePanelProps {
  ariaLabel?: string;
  children: React.ReactNode;
  className?: string;
  closeDisabled?: boolean;
  containerClassName?: string;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  isOpen: boolean;
  onClose: () => void;
  overlayClassName?: string;
  style?: React.CSSProperties;
  titleId?: string;
}

interface FocusWrapInput {
  currentIndex: number;
  focusableCount: number;
  shiftKey: boolean;
}

const containerClassName = 'fixed inset-0 z-[100] flex justify-end';
const overlayClassName = 'absolute inset-0 bg-ui-text/25 dark:bg-ui-bg/70';
const panelClassName =
  'relative flex h-full w-full max-w-xl flex-col overflow-hidden border-l border-ui-border bg-ui-surface shadow-2xl';

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

function getFocusWrapIndex({ currentIndex, focusableCount, shiftKey }: FocusWrapInput): number | null {
  if (focusableCount <= 0) return null;
  if (currentIndex < 0) return shiftKey ? focusableCount - 1 : 0;
  if (shiftKey && currentIndex === 0) return focusableCount - 1;
  if (!shiftKey && currentIndex === focusableCount - 1) return 0;
  return null;
}

function getFocusablePanelElements(panel: HTMLElement): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector)).filter((element) => {
    if (element.getAttribute('aria-hidden') === 'true' || element.hasAttribute('hidden')) return false;

    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });
}

export const RightSidePanel: React.FC<RightSidePanelProps> = ({
  ariaLabel,
  children,
  className,
  closeDisabled = false,
  containerClassName: customContainerClassName,
  initialFocusRef,
  isOpen,
  onClose,
  overlayClassName: customOverlayClassName,
  style,
  titleId
}) => {
  const panelRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    if (!isOpen) return undefined;

    const restoreTarget = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusTimer = window.setTimeout(() => {
      const focusTarget = initialFocusRef?.current || panelRef.current;
      focusTarget?.focus({ preventScroll: true });
    }, 0);

    return () => {
      window.clearTimeout(focusTimer);
      if (restoreTarget && document.contains(restoreTarget)) {
        restoreTarget.focus({ preventScroll: true });
      }
    };
  }, [initialFocusRef, isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className={twMerge(containerClassName, customContainerClassName)}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            className={twMerge(overlayClassName, customOverlayClassName)}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !closeDisabled) {
                onClose();
              }
            }}
          />
          <motion.aside
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            aria-labelledby={titleId}
            tabIndex={-1}
            className={twMerge(panelClassName, className)}
            style={style}
            {...sidePanelMotion}
            onKeyDown={(event) => {
              if (event.key === 'Escape' && !closeDisabled) {
                event.preventDefault();
                event.stopPropagation();
                onClose();
                return;
              }

              if (event.key !== 'Tab') return;

              const panel = panelRef.current;
              if (!panel) return;

              const focusableElements = getFocusablePanelElements(panel);
              const targetIndex = getFocusWrapIndex({
                currentIndex: focusableElements.findIndex((element) => element === document.activeElement),
                focusableCount: focusableElements.length,
                shiftKey: event.shiftKey
              });

              if (targetIndex === null) return;

              event.preventDefault();
              event.stopPropagation();
              focusableElements[targetIndex]?.focus({ preventScroll: true });
            }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            {children}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
};
