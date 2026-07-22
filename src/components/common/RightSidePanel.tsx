import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { twMerge } from 'tailwind-merge';
import { sidePanelMotion } from '@/lib/motion';

interface RightSidePanelProps {
  ariaLabel?: string;
  children: React.ReactNode;
  className?: string;
  closeDisabled?: boolean;
  containerClassName?: string;
  descriptionId?: string;
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

interface InertableElement {
  getAttribute(name: string): string | null;
  hasAttribute(name: string): boolean;
  removeAttribute(name: string): void;
  setAttribute(name: string, value: string): void;
}

interface BackgroundTreeElement extends InertableElement {
  children: ArrayLike<unknown>;
  contains(element: any): boolean;
  parentElement: BackgroundTreeElement | null;
}

interface BackgroundInertSnapshot<T extends InertableElement> {
  ariaHidden: string | null;
  element: T;
  inert: string | null;
  references: number;
}

const backgroundInertSnapshots = new WeakMap<InertableElement, BackgroundInertSnapshot<InertableElement>>();

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

function isBackgroundTreeElement(element: unknown): element is BackgroundTreeElement {
  if (!element || typeof element !== 'object') return false;

  const candidate = element as Partial<BackgroundTreeElement>;
  return (
    typeof candidate.contains === 'function' &&
    typeof candidate.getAttribute === 'function' &&
    typeof candidate.hasAttribute === 'function' &&
    typeof candidate.removeAttribute === 'function' &&
    typeof candidate.setAttribute === 'function' &&
    candidate.children !== undefined
  );
}

export function getRightSidePanelBackgroundTargets<T extends BackgroundTreeElement>(container: T | null, stopAt?: T | null): T[] {
  const targets = new Set<T>();
  let current = container;

  while (container && current?.parentElement && current.parentElement !== stopAt) {
    const parent = current.parentElement;

    Array.from(parent.children).forEach((child) => {
      if (!isBackgroundTreeElement(child) || child === current || child.contains(container)) return;
      targets.add(child as T);
    });

    current = parent as T;
  }

  return Array.from(targets);
}

export function applyRightSidePanelBackgroundInert<T extends InertableElement>(elements: T[]): () => void {
  const uniqueElements = Array.from(new Set(elements));
  const appliedElements = uniqueElements.map((element) => {
    const existingSnapshot = backgroundInertSnapshots.get(element);
    if (existingSnapshot) {
      existingSnapshot.references += 1;
      return element;
    }

    backgroundInertSnapshots.set(element, {
      ariaHidden: element.getAttribute('aria-hidden'),
      element,
      inert: element.getAttribute('inert'),
      references: 1
    });
    return element;
  });

  appliedElements.forEach((element) => {
    element.setAttribute('aria-hidden', 'true');
    element.setAttribute('inert', '');
  });

  let restored = false;
  return () => {
    if (restored) return;
    restored = true;

    appliedElements.forEach((element) => {
      const snapshot = backgroundInertSnapshots.get(element);
      if (!snapshot) return;

      snapshot.references -= 1;
      if (snapshot.references > 0) {
        element.setAttribute('aria-hidden', 'true');
        element.setAttribute('inert', '');
        return;
      }

      if (snapshot.ariaHidden === null) {
        element.removeAttribute('aria-hidden');
      } else {
        element.setAttribute('aria-hidden', snapshot.ariaHidden);
      }

      if (snapshot.inert === null) {
        element.removeAttribute('inert');
      } else {
        element.setAttribute('inert', snapshot.inert);
      }

      backgroundInertSnapshots.delete(element);
    });
  };
}

export const RightSidePanel: React.FC<RightSidePanelProps> = ({
  ariaLabel,
  children,
  className,
  closeDisabled = false,
  containerClassName: customContainerClassName,
  descriptionId,
  initialFocusRef,
  isOpen,
  onClose,
  overlayClassName: customOverlayClassName,
  style,
  titleId
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const panelRef = React.useRef<HTMLElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const panelMotion = shouldReduceMotion
    ? {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.01 }
    }
    : sidePanelMotion;

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

  React.useEffect(() => {
    if (!isOpen) return undefined;

    return applyRightSidePanelBackgroundInert(getRightSidePanelBackgroundTargets(containerRef.current, document.body));
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div ref={containerRef} className={twMerge(containerClassName, customContainerClassName)}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={shouldReduceMotion ? { duration: 0.01 } : { duration: 0.14, ease: 'easeOut' }}
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
            aria-describedby={descriptionId}
            tabIndex={-1}
            className={twMerge(panelClassName, className)}
            style={style}
            {...panelMotion}
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
            <div data-floating-layer="true" className="pointer-events-none absolute inset-0 z-[120]" />
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
};
