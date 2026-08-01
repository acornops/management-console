import React from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

import { Button } from './Button';
import { menuOptionClassName, menuSurfaceClassName } from './menuStyles';
import { useFloatingActionMenu } from './useFloatingActionMenu';

export type MenuInitialFocus = 'first' | 'last' | React.RefObject<HTMLElement | null>;

function enabledMenuItems(container: HTMLElement | null): HTMLElement[] {
  return Array.from(container?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? []).filter(
    (item) => !item.hasAttribute('disabled') && item.getAttribute('aria-disabled') !== 'true'
  );
}

export function getMenuFocusIndex(currentIndex: number, itemCount: number, key: 'ArrowDown' | 'ArrowUp' | 'Home' | 'End'): number | null {
  if (itemCount <= 0) return null;
  if (key === 'Home') return 0;
  if (key === 'End') return itemCount - 1;
  if (key === 'ArrowDown') return currentIndex < 0 ? 0 : (currentIndex + 1) % itemCount;
  return currentIndex < 0 ? itemCount - 1 : (currentIndex - 1 + itemCount) % itemCount;
}

export function findMenuTypeaheadIndex(labels: string[], currentIndex: number, query: string): number | null {
  if (!query || labels.length === 0) return null;
  const normalizedQuery = query.toLocaleLowerCase();
  for (let offset = 1; offset <= labels.length; offset += 1) {
    const index = (Math.max(currentIndex, -1) + offset) % labels.length;
    if (labels[index]?.trim().toLocaleLowerCase().startsWith(normalizedQuery)) return index;
  }
  return null;
}

export interface MenuSurfaceProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect' | 'role'> {
  initialFocus?: MenuInitialFocus;
  label: string;
  onDismiss?: (restoreFocus: boolean) => void;
}

export const MenuSurface = React.forwardRef<HTMLDivElement, MenuSurfaceProps>(({
  children,
  className,
  initialFocus = 'first',
  label,
  onDismiss,
  onKeyDown,
  ...props
}, forwardedRef) => {
  const localRef = React.useRef<HTMLDivElement>(null);
  const typeaheadRef = React.useRef('');
  const typeaheadTimerRef = React.useRef<number | null>(null);
  React.useImperativeHandle(forwardedRef, () => localRef.current as HTMLDivElement);

  React.useLayoutEffect(() => {
    const items = enabledMenuItems(localRef.current);
    items.forEach((item) => { item.tabIndex = -1; });
    const target = typeof initialFocus === 'object'
      ? initialFocus.current
      : initialFocus === 'last'
        ? items.at(-1)
        : items[0];
    const frame = window.requestAnimationFrame(() => target?.focus({ preventScroll: true }));
    return () => window.cancelAnimationFrame(frame);
  }, [initialFocus]);

  React.useEffect(() => () => {
    if (typeaheadTimerRef.current !== null) window.clearTimeout(typeaheadTimerRef.current);
  }, []);

  return (
    <div
      {...props}
      ref={localRef}
      role="menu"
      aria-label={label}
      className={menuSurfaceClassName(twMerge('type-ui p-1', className))}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented) return;
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          onDismiss?.(true);
          return;
        }
        if (event.key === 'Tab') {
          onDismiss?.(false);
          return;
        }
        const items = enabledMenuItems(localRef.current);
        const currentIndex = items.indexOf(document.activeElement as HTMLElement);
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          event.preventDefault();
          const nextIndex = getMenuFocusIndex(currentIndex, items.length, event.key as 'ArrowDown' | 'ArrowUp' | 'Home' | 'End');
          if (nextIndex !== null) items[nextIndex]?.focus({ preventScroll: true });
          return;
        }
        if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return;
        typeaheadRef.current += event.key;
        if (typeaheadTimerRef.current !== null) window.clearTimeout(typeaheadTimerRef.current);
        typeaheadTimerRef.current = window.setTimeout(() => { typeaheadRef.current = ''; }, 500);
        const nextIndex = findMenuTypeaheadIndex(items.map((item) => item.textContent ?? ''), currentIndex, typeaheadRef.current);
        if (nextIndex !== null) {
          event.preventDefault();
          items[nextIndex]?.focus({ preventScroll: true });
        }
      }}
    >
      {children}
    </div>
  );
});

MenuSurface.displayName = 'MenuSurface';

export type MenuLinkProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'role'>;

export const MenuLink = React.forwardRef<HTMLAnchorElement, MenuLinkProps>(({ className, ...props }, ref) => (
  <a {...props} ref={ref} role="menuitem" tabIndex={-1} className={menuOptionClassName({ className })} />
));

MenuLink.displayName = 'MenuLink';

export interface ActionMenuProps {
  children: React.ReactNode | ((close: (restoreFocus?: boolean) => void) => React.ReactNode);
  className?: string;
  defaultOpen?: boolean;
  disabled?: boolean;
  estimatedHeight?: number;
  initialFocus?: MenuInitialFocus;
  label: string;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  trigger?: React.ReactElement<React.ButtonHTMLAttributes<HTMLButtonElement>>;
  width?: number;
}

export const ActionMenu = React.forwardRef<HTMLButtonElement, ActionMenuProps>(({
  children,
  className,
  defaultOpen = false,
  disabled = false,
  estimatedHeight = 152,
  initialFocus = 'first',
  label,
  onOpenChange,
  open: controlledOpen,
  trigger,
  width = 208
}, forwardedRef) => {
  const menuId = React.useId();
  const pendingInitialFocusRef = React.useRef<MenuInitialFocus>(initialFocus);
  const triggerRequestedOpenRef = React.useRef(false);
  const initialFocusAppliedRef = React.useRef(false);
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const open = controlledOpen ?? uncontrolledOpen;
  const previousOpenRef = React.useRef(open);
  if (open && !previousOpenRef.current) {
    if (!triggerRequestedOpenRef.current) pendingInitialFocusRef.current = initialFocus;
    triggerRequestedOpenRef.current = false;
  }
  React.useEffect(() => {
    previousOpenRef.current = open;
  }, [open]);
  const setOpen = React.useCallback((nextOpen: boolean) => {
    if (controlledOpen === undefined) setUncontrolledOpen(nextOpen);
    onOpenChange?.(nextOpen);
  }, [controlledOpen, onOpenChange]);
  const { triggerRef, menuRef, portalHost, placement, style, close } = useFloatingActionMenu({
    open,
    setOpen,
    estimatedHeight,
    width
  });
  const isPositioned = style !== null;
  React.useLayoutEffect(() => {
    if (!open) {
      initialFocusAppliedRef.current = false;
      return undefined;
    }
    if (!isPositioned || initialFocusAppliedRef.current) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const items = enabledMenuItems(menuRef.current);
      const requestedFocus = pendingInitialFocusRef.current;
      const target = typeof requestedFocus === 'object'
        ? requestedFocus.current
        : requestedFocus === 'last'
          ? items.at(-1)
          : items[0];
      target?.focus({ preventScroll: true });
      initialFocusAppliedRef.current = true;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isPositioned, menuRef, open]);
  const setTriggerRef = React.useCallback((node: HTMLButtonElement | null) => {
    triggerRef.current = node;
    if (typeof forwardedRef === 'function') forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  }, [forwardedRef, triggerRef]);

  const triggerElement = trigger ?? (
    <Button type="button" variant="tertiary" size="icon">
      <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
    </Button>
  );
  const originalOnClick = triggerElement.props.onClick;
  const originalOnKeyDown = triggerElement.props.onKeyDown;
  const renderedTrigger = React.cloneElement(triggerElement, {
    ref: setTriggerRef,
    disabled: disabled || triggerElement.props.disabled,
    'aria-haspopup': 'menu',
    'aria-expanded': open,
    'aria-controls': open ? menuId : undefined,
    'aria-label': triggerElement.props['aria-label'] ?? label,
    onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
      originalOnClick?.(event);
      if (!event.defaultPrevented) {
        pendingInitialFocusRef.current = initialFocus;
        triggerRequestedOpenRef.current = !open;
        setOpen(!open);
      }
    },
    onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => {
      originalOnKeyDown?.(event);
      if (event.defaultPrevented || (event.key !== 'ArrowDown' && event.key !== 'ArrowUp')) return;
      event.preventDefault();
      pendingInitialFocusRef.current = event.key === 'ArrowUp' ? 'last' : 'first';
      triggerRequestedOpenRef.current = true;
      setOpen(true);
    }
  } as React.ButtonHTMLAttributes<HTMLButtonElement> & { ref: React.Ref<HTMLButtonElement> });

  const menu = open && portalHost && typeof document !== 'undefined'
    ? createPortal(
        <MenuSurface
          ref={menuRef}
          id={menuId}
          label={label}
          initialFocus={pendingInitialFocusRef.current}
          onDismiss={close}
          data-placement={placement ?? undefined}
          className={twMerge('pointer-events-auto z-[130]', className)}
          style={style ?? { visibility: 'hidden', width }}
          onClick={(event) => {
            const item = (event.target as HTMLElement).closest<HTMLElement>('[role^="menuitem"]');
            if (item && item.getAttribute('aria-disabled') !== 'true' && !item.hasAttribute('disabled')) close();
          }}
        >
          {typeof children === 'function' ? children(close) : children}
        </MenuSurface>,
        portalHost
      )
    : null;

  return <>{renderedTrigger}{menu}</>;
});

ActionMenu.displayName = 'ActionMenu';
