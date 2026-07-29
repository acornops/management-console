import React from 'react';

interface FloatingActionMenuOptions {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  estimatedHeight: number;
  width?: number;
}

interface FloatingActionMenuState {
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  menuRef: React.RefObject<HTMLDivElement | null>;
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
  const [style, setStyle] = React.useState<React.CSSProperties | null>(null);

  const close = React.useCallback((restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, [setOpen]);

  const updatePosition = React.useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const top = Math.min(rect.bottom + 6, window.innerHeight - estimatedHeight - 8);
    setStyle({
      left: Math.max(8, rect.right - width),
      top: Math.max(8, top),
      width
    });
  }, [estimatedHeight, width]);

  React.useEffect(() => {
    if (!open) return undefined;
    updatePosition();
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      close();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close(true);
    };
    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [close, open, updatePosition]);

  return { triggerRef, menuRef, style, close };
}
