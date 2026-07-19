import React from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Link2, Plus, Search } from 'lucide-react';

import { Button } from '@/components/common/Button';

interface AddMcpServerActionProps {
  browseHref: string;
  disabled?: boolean;
  onConnectByUrl: () => void;
  size?: React.ComponentProps<typeof Button>['size'];
}

interface McpMenuPositionInput {
  boundary: { top: number; left: number; width: number; height: number };
  trigger: { top: number; bottom: number; right: number };
  menuWidth: number;
  menuHeight: number;
}

interface McpMenuPosition {
  left: number;
  placement: 'top' | 'bottom';
  top: number;
}

const menuGap = 8;
const viewportPadding = 8;

export function getMcpMenuPosition({ boundary, trigger, menuWidth, menuHeight }: McpMenuPositionInput): McpMenuPosition {
  const triggerTop = trigger.top - boundary.top;
  const triggerBottom = trigger.bottom - boundary.top;
  const triggerRight = trigger.right - boundary.left;
  const spaceBelow = boundary.height - triggerBottom - menuGap - viewportPadding;
  const spaceAbove = triggerTop - menuGap - viewportPadding;
  const placement = spaceBelow < menuHeight && spaceAbove > spaceBelow ? 'top' : 'bottom';
  const maximumLeft = Math.max(viewportPadding, boundary.width - viewportPadding - menuWidth);
  const left = Math.min(Math.max(viewportPadding, triggerRight - menuWidth), maximumLeft);
  const preferredTop = placement === 'top'
    ? triggerTop - menuGap - menuHeight
    : triggerBottom + menuGap;
  const maximumTop = Math.max(viewportPadding, boundary.height - viewportPadding - menuHeight);
  const top = Math.min(Math.max(viewportPadding, preferredTop), maximumTop);

  return { left, placement, top };
}

export const AddMcpServerAction: React.FC<AddMcpServerActionProps> = ({
  browseHref,
  disabled = false,
  onConnectByUrl,
  size = 'md'
}) => {
  const [open, setOpen] = React.useState(false);
  const [menuPosition, setMenuPosition] = React.useState<(McpMenuPosition & { strategy: 'absolute' | 'fixed' }) | null>(null);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const getPortalHost = React.useCallback((): HTMLElement | null => {
    if (typeof document === 'undefined') return null;
    const dialog = triggerRef.current?.closest<HTMLElement>('[role="dialog"]');
    return dialog?.querySelector<HTMLElement>('[data-floating-layer="true"]') || document.body;
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!wrapperRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  React.useLayoutEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      const portalHost = getPortalHost();
      if (!trigger || !menu || !portalHost) return;

      const triggerRect = trigger.getBoundingClientRect();
      const usesViewport = portalHost === document.body;
      const boundaryRect = usesViewport
        ? { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight }
        : portalHost.getBoundingClientRect();
      setMenuPosition({
        ...getMcpMenuPosition({
          boundary: boundaryRect,
          trigger: triggerRect,
          menuWidth: menu.offsetWidth,
          menuHeight: menu.offsetHeight
        }),
        strategy: usesViewport ? 'fixed' : 'absolute'
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    document.addEventListener('scroll', updatePosition, true);
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updatePosition);
    if (triggerRef.current) resizeObserver?.observe(triggerRef.current);
    if (menuRef.current) resizeObserver?.observe(menuRef.current);
    return () => {
      window.removeEventListener('resize', updatePosition);
      document.removeEventListener('scroll', updatePosition, true);
      resizeObserver?.disconnect();
    };
  }, [getPortalHost, open]);

  const portalHost = open ? getPortalHost() : null;

  return <>
    <div ref={wrapperRef} className="relative">
      <Button
        ref={triggerRef}
        type="button"
        variant="secondary"
        size={size}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key !== 'Escape' || !open) return;
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
        }}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Add MCP server
        <ChevronDown className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
    {open && portalHost && createPortal(
      <div
        ref={menuRef}
        role="menu"
        aria-label="Add MCP server"
        data-placement={menuPosition?.placement}
        className={`${menuPosition?.strategy === 'absolute' ? 'absolute' : 'fixed'} pointer-events-auto z-[120] w-64 rounded-lg border border-control-boundary bg-ui-surface p-1.5 text-ui-text shadow-xl`}
        style={menuPosition ? { left: menuPosition.left, top: menuPosition.top } : { visibility: 'hidden' }}
        onKeyDown={(event) => {
          if (event.key !== 'Escape') return;
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          triggerRef.current?.focus();
        }}
      >
        <a
          role="menuitem"
          href={browseHref}
          className="flex min-h-11 items-start gap-3 rounded-md px-3 py-2 text-left hover:bg-ui-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-control-boundary"
        >
          <Search className="mt-0.5 h-4 w-4 shrink-0 text-ui-text-muted" aria-hidden="true" />
          <span><span className="block text-sm font-semibold">Browse registries</span><span className="type-caption text-ui-text-muted">Install a pinned server from an approved source.</span></span>
        </a>
        <button
          role="menuitem"
          type="button"
          className="flex min-h-11 w-full items-start gap-3 rounded-md px-3 py-2 text-left hover:bg-ui-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-control-boundary"
          onClick={() => {
            setOpen(false);
            onConnectByUrl();
          }}
        >
          <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-ui-text-muted" aria-hidden="true" />
          <span><span className="block text-sm font-semibold">Connect by URL</span><span className="type-caption text-ui-text-muted">Use an HTTPS Streamable HTTP endpoint.</span></span>
        </button>
      </div>,
      portalHost
    )}
  </>;
};
