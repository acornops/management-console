import React from 'react';

export interface FloatingMenuPositionInput {
  boundary: { top: number; left: number; width: number; height: number };
  trigger: { top: number; bottom: number; left?: number; right: number };
  menuWidth: number;
  menuHeight: number;
  gap?: number;
  padding?: number;
}

export interface FloatingMenuPosition {
  left: number;
  placement: 'top' | 'bottom';
  top: number;
}

export function getFloatingMenuPosition({
  boundary,
  trigger,
  menuWidth,
  menuHeight,
  gap = 8,
  padding = 8
}: FloatingMenuPositionInput): FloatingMenuPosition {
  const triggerTop = trigger.top - boundary.top;
  const triggerBottom = trigger.bottom - boundary.top;
  const triggerRight = trigger.right - boundary.left;
  const spaceBelow = boundary.height - triggerBottom - gap - padding;
  const spaceAbove = triggerTop - gap - padding;
  const placement = spaceBelow < menuHeight && spaceAbove > spaceBelow ? 'top' : 'bottom';
  const maximumLeft = Math.max(padding, boundary.width - padding - menuWidth);
  const left = Math.min(Math.max(padding, triggerRight - menuWidth), maximumLeft);
  const preferredTop = placement === 'top' ? triggerTop - gap - menuHeight : triggerBottom + gap;
  const maximumTop = Math.max(padding, boundary.height - padding - menuHeight);

  return {
    left,
    placement,
    top: Math.min(Math.max(padding, preferredTop), maximumTop)
  };
}

interface FloatingActionMenuOptions {
  open: boolean;
  setOpen: (open: boolean) => void;
  estimatedHeight: number;
  width?: number;
}

interface FloatingActionMenuState {
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  menuRef: React.RefObject<HTMLDivElement | null>;
  portalHost: HTMLElement | null;
  placement: 'top' | 'bottom' | null;
  style: React.CSSProperties | null;
  close: (restoreFocus?: boolean) => void;
}

export function useFloatingActionMenu({
  open,
  setOpen,
  estimatedHeight,
  width = 224
}: FloatingActionMenuOptions): FloatingActionMenuState {
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const [portalHost, setPortalHost] = React.useState<HTMLElement | null>(null);
  const [placement, setPlacement] = React.useState<'top' | 'bottom' | null>(null);
  const [style, setStyle] = React.useState<React.CSSProperties | null>(null);

  const close = React.useCallback((restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) window.requestAnimationFrame(() => triggerRef.current?.focus({ preventScroll: true }));
  }, [setOpen]);

  const resolvePortalHost = React.useCallback(() => {
    if (typeof document === 'undefined') return null;
    const dialog = triggerRef.current?.closest<HTMLElement>('[role="dialog"]');
    return dialog?.querySelector<HTMLElement>('[data-floating-layer="true"]') ?? document.body;
  }, []);

  const updatePosition = React.useCallback(() => {
    const trigger = triggerRef.current;
    const host = resolvePortalHost();
    if (!trigger || !host) return;
    const usesViewport = host === document.body;
    const boundary = usesViewport
      ? { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight }
      : host.getBoundingClientRect();
    const menu = menuRef.current;
    const position = getFloatingMenuPosition({
      boundary,
      trigger: trigger.getBoundingClientRect(),
      menuWidth: menu?.offsetWidth || width,
      menuHeight: menu?.offsetHeight || estimatedHeight
    });
    setPortalHost(host);
    setPlacement(position.placement);
    setStyle({
      position: usesViewport ? 'fixed' : 'absolute',
      left: position.left,
      top: position.top,
      width
    });
  }, [estimatedHeight, resolvePortalHost, width]);

  React.useLayoutEffect(() => {
    if (!open) {
      setPortalHost(null);
      setPlacement(null);
      setStyle(null);
      return undefined;
    }
    updatePosition();
    const frame = window.requestAnimationFrame(updatePosition);
    return () => window.cancelAnimationFrame(frame);
  }, [open, resolvePortalHost, updatePosition]);

  React.useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      close();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !menuRef.current?.contains(event.target as Node)) {
        close(true);
        return;
      }
      if (event.key === 'Tab' && menuRef.current?.contains(event.target as Node)) close();
    };
    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('resize', updatePosition);
    document.addEventListener('scroll', updatePosition, true);
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updatePosition);
    if (triggerRef.current) resizeObserver?.observe(triggerRef.current);
    if (menuRef.current) resizeObserver?.observe(menuRef.current);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('resize', updatePosition);
      document.removeEventListener('scroll', updatePosition, true);
      resizeObserver?.disconnect();
    };
  }, [close, open, updatePosition]);

  return { triggerRef, menuRef, portalHost, placement, style, close };
}
