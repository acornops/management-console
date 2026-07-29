import React from 'react';
import { ChevronRight, MoreHorizontal } from 'lucide-react';

import { Button } from '@acornops/ui';
import { menuSurfaceClassName } from '@acornops/ui';

export type TargetCatalogKind = 'cluster' | 'vm';

interface TargetCatalogCardProps {
  targetKind: TargetCatalogKind;
  actionLabel: string;
  disabled?: boolean;
  onActivate: () => void;
  children: React.ReactNode;
}

export const ResourceCatalogCard: React.FC<{
  actionLabel: string;
  disabled?: boolean;
  onActivate: () => void;
  cardAttribute?: Record<string, string>;
  actionAttribute?: Record<string, string>;
  children: React.ReactNode;
}> = ({ actionLabel, disabled = false, onActivate, cardAttribute = {}, actionAttribute = {}, children }) => {
  return (
    <article
      {...cardAttribute}
      className="group relative flex min-w-0 flex-col overflow-visible rounded-lg border border-ui-border bg-ui-surface shadow-sm transition-colors hover:border-accent/25"
    >
      <button
        {...actionAttribute}
        type="button"
        aria-label={actionLabel}
        disabled={disabled}
        onClick={onActivate}
        className="control-target absolute inset-0 z-0 cursor-pointer rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-control-boundary disabled:cursor-not-allowed"
      />
      <div className="pointer-events-none relative z-10 flex min-w-0 flex-col">{children}</div>
    </article>
  );
};

export const TargetCatalogCard: React.FC<TargetCatalogCardProps> = ({ targetKind, ...props }) => (
  <ResourceCatalogCard
    {...props}
    cardAttribute={targetKind === 'cluster' ? { 'data-cluster-card': 'true' } : { 'data-vm-card': 'true' }}
    actionAttribute={targetKind === 'cluster' ? { 'data-cluster-card-primary-action': 'true' } : { 'data-vm-card-primary-action': 'true' }}
  />
);
export const TargetCatalogStatusPill: React.FC<{
  label: string;
  reason: string;
  toneClassName: string;
}> = ({ label, reason, toneClassName }) => (
  <span className={`inline-flex max-w-[8.5rem] items-center rounded-full border px-2 py-0.5 type-micro-label ${toneClassName}`} aria-label={`${label}: ${reason}`}>
    <span className="truncate">{label}</span>
  </span>
);

export const TargetCatalogActionHint: React.FC<{ label: string }> = ({ label }) => (
  <span
    aria-hidden="true"
    className="mt-1 inline-flex items-center gap-1 type-caption font-semibold text-ui-text-muted transition-colors group-hover:text-accent-strong group-focus-within:text-accent-strong"
  >
    {label}
    <ChevronRight className="h-3.5 w-3.5" />
  </span>
);

interface TargetCatalogActionMenuProps {
  targetKind: TargetCatalogKind;
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

type MenuFocusTarget = 'first' | 'last';

export const ResourceCatalogActionMenu: React.FC<Omit<TargetCatalogActionMenuProps, 'targetKind'> & {
  triggerAttribute?: Record<string, string>;
}> = ({ triggerAttribute = {}, label, open, onOpenChange, children }) => {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const pendingFocusRef = React.useRef<MenuFocusTarget>('first');
  const onOpenChangeRef = React.useRef(onOpenChange);
  const menuId = React.useId();

  const menuItems = React.useCallback(() => Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? []), []);

  React.useLayoutEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  const openMenu = React.useCallback(
    (focusTarget: MenuFocusTarget) => {
      pendingFocusRef.current = focusTarget;
      onOpenChangeRef.current(true);
    },
    []
  );

  const closeMenu = React.useCallback(
    (restoreFocus = false) => {
      onOpenChangeRef.current(false);
      if (restoreFocus) {
        window.requestAnimationFrame(() => triggerRef.current?.focus());
      }
    },
    []
  );

  React.useLayoutEffect(() => {
    if (!open) return undefined;
    const items = menuItems();
    items.forEach((item) => {
      item.tabIndex = -1;
    });
    const target = pendingFocusRef.current === 'last' ? items[items.length - 1] : items[0];
    const frame = window.requestAnimationFrame(() => target?.focus());

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) closeMenu();
    };
    document.addEventListener('mousedown', handlePointerDown, true);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('mousedown', handlePointerDown, true);
    };
  }, [closeMenu, menuItems, open]);

  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const items = menuItems();
    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu(true);
      return;
    }
    if (event.key === 'Tab') {
      onOpenChangeRef.current(false);
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

  return (
    <div ref={rootRef} className="pointer-events-auto relative z-20">
      <Button
        ref={triggerRef}
        {...triggerAttribute}
        type="button"
        variant="tertiary"
        size="icon"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={label}
        onClick={(event) => {
          event.stopPropagation();
          if (open) closeMenu();
          else openMenu('first');
        }}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
          event.preventDefault();
          event.stopPropagation();
          openMenu(event.key === 'ArrowUp' ? 'last' : 'first');
        }}
        className={open ? 'bg-ui-bg text-ui-text' : undefined}
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
      </Button>
      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={handleMenuKeyDown}
          className={menuSurfaceClassName('absolute right-0 top-11 w-52 p-1 text-sm sm:top-9')}
        >
          {children}
        </div>
      )}
    </div>
  );
};

export const TargetCatalogActionMenu: React.FC<TargetCatalogActionMenuProps> = ({ targetKind, ...props }) => (
  <ResourceCatalogActionMenu
    {...props}
    triggerAttribute={targetKind === 'cluster' ? { 'data-cluster-overflow-action': 'toggle' } : { 'data-vm-overflow-action': 'toggle' }}
  />
);
