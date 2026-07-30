import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface SidebarProps extends React.HTMLAttributes<HTMLElement> {
  collapsed?: boolean;
}

/** Domain-neutral desktop sidebar surface. */
export const Sidebar = React.forwardRef<HTMLElement, SidebarProps>(({ children, className, collapsed = false, ...props }, ref) => (
  <aside
    ref={ref}
    data-sidebar-collapsed={collapsed || undefined}
    className={twMerge('flex min-h-0 shrink-0 flex-col border-r border-ui-border bg-ui-surface', collapsed ? 'w-16' : 'w-72', className)}
    {...props}
  >
    {children}
  </aside>
));

Sidebar.displayName = 'Sidebar';

export interface NavigationSectionProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  badge?: React.ReactNode;
  compactAfter?: boolean;
}

export const NavigationSection: React.FC<NavigationSectionProps> = ({ badge, children, className, compactAfter = false, title, ...props }) => (
  <div className={twMerge(compactAfter ? 'pb-5 px-3' : 'pb-7 px-3', className)} {...props}>
    {title && (
      <div className="mb-2 flex items-center justify-between px-3">
        <div className="type-label text-ui-text-muted">{title}</div>
        {badge}
      </div>
    )}
    <div className="space-y-1">{children}</div>
  </div>
);

export interface NavigationItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
}

export function navigationItemClassName({ active = false, className, disabled = false }: Pick<NavigationItemProps, 'active' | 'className' | 'disabled'> = {}): string {
  return twMerge(
    clsx(
      'type-ui group relative flex h-10 w-full items-center justify-between overflow-hidden rounded-md px-3 transition-colors duration-[160ms] outline-none motion-reduce:duration-0 focus-visible:ring-2 focus-visible:ring-accent/25',
      active ? 'type-emphasis bg-ui-bg text-ui-text' : 'text-ui-text-muted hover:bg-ui-bg hover:text-ui-text',
      disabled && 'cursor-not-allowed opacity-50',
      className
    )
  );
}

export const NavigationItem = React.forwardRef<HTMLButtonElement, NavigationItemProps>(({ active = false, children, className, disabled, leading, trailing, ...props }, ref) => (
  <button ref={ref} type="button" aria-current={active ? 'page' : undefined} className={navigationItemClassName({ active, className, disabled })} disabled={disabled} {...props}>
    <span className="relative z-10 flex min-w-0 items-center gap-3">
      {leading}
      <span className="truncate">{children}</span>
    </span>
    {trailing && <span className="relative z-10 flex items-center gap-2">{trailing}</span>}
  </button>
));

NavigationItem.displayName = 'NavigationItem';

export interface NavigationLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  active?: boolean;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
}

export const NavigationLink = React.forwardRef<HTMLAnchorElement, NavigationLinkProps>(({ active = false, children, className, leading, trailing, ...props }, ref) => (
  <a ref={ref} aria-current={active ? 'page' : undefined} className={navigationItemClassName({ active, className })} {...props}>
    <span className="relative z-10 flex min-w-0 items-center gap-3">
      {leading}
      <span className="truncate">{children}</span>
    </span>
    {trailing && <span className="relative z-10 flex items-center gap-2">{trailing}</span>}
  </a>
));

NavigationLink.displayName = 'NavigationLink';

export const MobileNavigation: React.FC<React.HTMLAttributes<HTMLElement>> = ({ children, className, ...props }) => (
  <nav className={twMerge('relative z-40 h-16 shrink-0 items-center justify-between border-b border-ui-border bg-ui-surface px-4', className)} {...props}>
    {children}
  </nav>
);
