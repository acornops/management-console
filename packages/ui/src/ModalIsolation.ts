import React from 'react';

interface FocusWrapInput {
  currentIndex: number;
  focusableCount: number;
  shiftKey: boolean;
}

export interface InertableElement {
  getAttribute(name: string): string | null;
  hasAttribute(name: string): boolean;
  removeAttribute(name: string): void;
  setAttribute(name: string, value: string): void;
}

export interface BackgroundTreeElement extends InertableElement {
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

interface ScrollLockSnapshot {
  overflow: string;
  paddingRight: string;
  references: number;
}

export interface ModalIsolationOptions {
  closeDisabled?: boolean;
  containerRef: React.RefObject<HTMLElement | null>;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  open: boolean;
  panelRef: React.RefObject<HTMLElement | null>;
}

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

const backgroundInertSnapshots = new WeakMap<InertableElement, BackgroundInertSnapshot<InertableElement>>();
const scrollLockSnapshots = new WeakMap<Document, ScrollLockSnapshot>();
const modalStack: symbol[] = [];

export function shouldCloseModalOnKeyDown(key: string, closeDisabled: boolean): boolean {
  return key === 'Escape' && !closeDisabled;
}

export function getModalFocusWrapIndex({
  currentIndex,
  focusableCount,
  shiftKey
}: FocusWrapInput): number | null {
  if (focusableCount <= 0) return null;
  if (currentIndex < 0) return shiftKey ? focusableCount - 1 : 0;
  if (shiftKey && currentIndex === 0) return focusableCount - 1;
  if (!shiftKey && currentIndex === focusableCount - 1) return 0;
  return null;
}

function getFocusableModalElements(panel: HTMLElement): HTMLElement[] {
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
    typeof candidate.contains === 'function'
    && typeof candidate.getAttribute === 'function'
    && typeof candidate.hasAttribute === 'function'
    && typeof candidate.removeAttribute === 'function'
    && typeof candidate.setAttribute === 'function'
    && candidate.children !== undefined
  );
}

export function getModalBackgroundTargets<T extends BackgroundTreeElement>(
  container: T | null,
  stopAt?: T | null
): T[] {
  const targets = new Set<T>();
  let current = container;

  while (container && current?.parentElement) {
    const parent = current.parentElement;
    Array.from(parent.children).forEach((child) => {
      if (!isBackgroundTreeElement(child) || child === current || child.contains(container)) return;
      targets.add(child as T);
    });
    if (parent === stopAt) break;
    current = parent as T;
  }

  return Array.from(targets);
}

export function applyModalBackgroundInert<T extends InertableElement>(elements: T[]): () => void {
  const appliedElements = Array.from(new Set(elements));
  appliedElements.forEach((element) => {
    const existingSnapshot = backgroundInertSnapshots.get(element);
    if (existingSnapshot) {
      existingSnapshot.references += 1;
    } else {
      backgroundInertSnapshots.set(element, {
        ariaHidden: element.getAttribute('aria-hidden'),
        element,
        inert: element.getAttribute('inert'),
        references: 1
      });
    }
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
      if (snapshot.references > 0) return;

      if (snapshot.ariaHidden === null) element.removeAttribute('aria-hidden');
      else element.setAttribute('aria-hidden', snapshot.ariaHidden);
      if (snapshot.inert === null) element.removeAttribute('inert');
      else element.setAttribute('inert', snapshot.inert);
      backgroundInertSnapshots.delete(element);
    });
  };
}

export function applyModalScrollLock(documentObject: Document): () => void {
  const existingSnapshot = scrollLockSnapshots.get(documentObject);
  if (existingSnapshot) {
    existingSnapshot.references += 1;
  } else {
    const { body, documentElement, defaultView } = documentObject;
    const scrollbarWidth = Math.max(0, (defaultView?.innerWidth ?? 0) - documentElement.clientWidth);
    const computedPadding = Number.parseFloat(defaultView?.getComputedStyle(body).paddingRight ?? '0') || 0;
    scrollLockSnapshots.set(documentObject, {
      overflow: body.style.overflow,
      paddingRight: body.style.paddingRight,
      references: 1
    });
    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) body.style.paddingRight = `${computedPadding + scrollbarWidth}px`;
  }

  let restored = false;
  return () => {
    if (restored) return;
    restored = true;
    const snapshot = scrollLockSnapshots.get(documentObject);
    if (!snapshot) return;
    snapshot.references -= 1;
    if (snapshot.references > 0) return;
    documentObject.body.style.overflow = snapshot.overflow;
    documentObject.body.style.paddingRight = snapshot.paddingRight;
    scrollLockSnapshots.delete(documentObject);
  };
}

export function useModalIsolation({
  closeDisabled = false,
  containerRef,
  initialFocusRef,
  onClose,
  open,
  panelRef
}: ModalIsolationOptions) {
  const stackToken = React.useRef(Symbol('modal-isolation'));

  React.useEffect(() => {
    if (!open || typeof document === 'undefined') return undefined;

    const token = stackToken.current;
    const restoreTarget = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    modalStack.push(token);
    const restoreBackground = applyModalBackgroundInert(
      getModalBackgroundTargets(containerRef.current, document.body)
    );
    const restoreScroll = applyModalScrollLock(document);
    const focusTimer = window.setTimeout(() => {
      const focusTarget = initialFocusRef?.current || panelRef.current;
      focusTarget?.focus({ preventScroll: true });
    }, 0);

    return () => {
      window.clearTimeout(focusTimer);
      const stackIndex = modalStack.lastIndexOf(token);
      if (stackIndex >= 0) modalStack.splice(stackIndex, 1);
      restoreBackground();
      restoreScroll();
      if (restoreTarget && document.contains(restoreTarget)) {
        restoreTarget.focus({ preventScroll: true });
      }
    };
  }, [containerRef, initialFocusRef, open, panelRef]);

  const isTopmost = React.useCallback(
    () => modalStack.at(-1) === stackToken.current,
    []
  );

  const onKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLElement>) => {
    if (!isTopmost()) return;
    if (shouldCloseModalOnKeyDown(event.key, closeDisabled)) {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;

    const panel = panelRef.current;
    if (!panel) return;
    const focusableElements = getFocusableModalElements(panel);
    const targetIndex = getModalFocusWrapIndex({
      currentIndex: focusableElements.findIndex((element) => element === document.activeElement),
      focusableCount: focusableElements.length,
      shiftKey: event.shiftKey
    });
    if (targetIndex === null) return;

    event.preventDefault();
    event.stopPropagation();
    focusableElements[targetIndex]?.focus({ preventScroll: true });
  }, [closeDisabled, isTopmost, onClose, panelRef]);

  return { isTopmost, onKeyDown };
}
