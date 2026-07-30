import React from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';

import { Button } from './Button';
import { menuSurfaceClassName } from './menuStyles';
import { useFloatingActionMenu } from './useFloatingActionMenu';

type MenuFocusTarget = 'first' | 'last';

export interface OverflowActionMenuProps {
  children: (close: (restoreFocus?: boolean) => void) => React.ReactNode;
  disabled?: boolean;
  estimatedHeight?: number;
  label: string;
}

export const OverflowActionMenu = React.forwardRef<HTMLButtonElement, OverflowActionMenuProps>(({ children, disabled = false, estimatedHeight = 152, label }, forwardedRef) => {
  const menuId = React.useId();
  const [open, setOpen] = React.useState(false);
  const pendingFocusRef = React.useRef<MenuFocusTarget>('first');
  const { triggerRef, menuRef, style, close } = useFloatingActionMenu({
    open,
    setOpen,
    estimatedHeight,
    width: 208
  });

  const setTriggerRef = React.useCallback(
    (node: HTMLButtonElement | null) => {
      triggerRef.current = node;
      if (typeof forwardedRef === 'function') forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    },
    [forwardedRef, triggerRef]
  );

  const menuItems = React.useCallback(() => Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? []), [menuRef]);

  const openMenu = (focusTarget: MenuFocusTarget) => {
    pendingFocusRef.current = focusTarget;
    setOpen(true);
  };

  React.useLayoutEffect(() => {
    if (!open || !style) return undefined;
    const items = menuItems();
    items.forEach((item) => {
      item.tabIndex = -1;
    });
    const target = pendingFocusRef.current === 'last' ? items[items.length - 1] : items[0];
    const frame = window.requestAnimationFrame(() => target?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [menuItems, open, style]);

  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const items = menuItems();
    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
      return;
    }
    if (event.key === 'Tab') {
      close();
      return;
    }
    if (items.length === 0) return;

    let nextIndex: number | null = null;
    if (event.key === 'ArrowDown') nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % items.length;
    if (event.key === 'ArrowUp') nextIndex = currentIndex < 0 ? items.length - 1 : (currentIndex - 1 + items.length) % items.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = items.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    items[nextIndex]?.focus();
  };

  const menu =
    open && style && typeof document !== 'undefined'
      ? createPortal(
          <div ref={menuRef} id={menuId} role="menu" aria-label={label} onKeyDown={handleMenuKeyDown} className={menuSurfaceClassName('type-ui fixed z-[130] p-1')} style={style}>
            {children(close)}
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <Button
        ref={setTriggerRef}
        type="button"
        variant="tertiary"
        size="icon"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={label}
        disabled={disabled}
        onClick={() => {
          if (open) close();
          else openMenu('first');
        }}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
          event.preventDefault();
          openMenu(event.key === 'ArrowUp' ? 'last' : 'first');
        }}
        className={open ? 'bg-ui-bg text-ui-text' : undefined}
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
      </Button>
      {menu}
    </>
  );
});

OverflowActionMenu.displayName = 'OverflowActionMenu';
