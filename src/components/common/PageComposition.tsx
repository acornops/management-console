import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface PageShellProps extends React.HTMLAttributes<HTMLDivElement> {
  embedded?: boolean;
  width?: 'full' | 'content' | 'narrow';
}

const pageWidthClasses: Record<NonNullable<PageShellProps['width']>, string> = {
  full: 'max-w-none',
  content: 'mx-auto max-w-[96rem]',
  narrow: 'mx-auto max-w-5xl'
};

/** Canonical scrolling and responsive route margins for authenticated pages. */
export const PageShell = React.forwardRef<HTMLDivElement, PageShellProps>(
  ({ children, className, embedded = false, width = 'full', ...props }, ref) => (
    <div
      ref={ref}
      className={twMerge(clsx(
        'page-shell min-w-0 w-full max-w-full',
        embedded
          ? 'page-shell--embedded'
          : 'min-h-0 flex-1 overflow-x-hidden overflow-y-auto bg-ui-bg px-[var(--route-padding-x)] py-[var(--route-padding-y)] custom-scrollbar stable-scrollbar-gutter',
        className
      ))}
      {...props}
    >
      <div className={pageWidthClasses[width]}>{children}</div>
    </div>
  )
);

PageShell.displayName = 'PageShell';

export interface PageHeaderProps {
  actions?: React.ReactNode;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  breadcrumbs?: React.ReactNode;
  className?: string;
  context?: React.ReactNode;
  description?: React.ReactNode;
  id?: string;
  title: React.ReactNode;
}

/** Route identity and action hierarchy shared by every authenticated surface. */
export const PageHeader: React.FC<PageHeaderProps> = ({
  actions,
  breadcrumbs,
  className,
  context,
  description,
  title,
  ...props
}) => (
  <header
    className={twMerge(
      'page-header mb-[var(--header-content-gap)] flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between',
      className
    )}
    {...props}
  >
    <div className="min-w-0 max-w-3xl">
      {breadcrumbs && <nav aria-label="Breadcrumb" className="mb-2 type-caption text-ui-text-muted">{breadcrumbs}</nav>}
      {context && <div className="mb-2 type-label text-ui-text-muted">{context}</div>}
      <h1 className="type-route-title break-words text-ui-text">{title}</h1>
      {description && <div className="type-body mt-2 max-w-[72ch] text-ui-text-muted">{description}</div>}
    </div>
    {actions && <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end">{actions}</div>}
  </header>
);

export interface PageSectionProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  actions?: React.ReactNode;
  description?: React.ReactNode;
  title?: React.ReactNode;
}

export const PageSection: React.FC<PageSectionProps> = ({ actions, children, className, description, title, ...props }) => (
  <section className={twMerge('page-section mt-[var(--section-gap)] first:mt-0', className)} {...props}>
    {(title || description || actions) && (
      <div className="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {title && <h2 className="type-section-title text-ui-text">{title}</h2>}
          {description && <div className="type-caption mt-1 max-w-[72ch] text-ui-text-muted">{description}</div>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    )}
    {children}
  </section>
);

export type DataSurfaceState = 'ready' | 'loading' | 'empty' | 'error';

export interface DataSurfaceProps extends React.HTMLAttributes<HTMLElement> {
  count?: React.ReactNode;
  description?: React.ReactNode;
  empty?: React.ReactNode;
  error?: React.ReactNode;
  heading?: React.ReactNode;
  icon?: React.ReactNode;
  loading?: React.ReactNode;
  state?: DataSurfaceState;
  toolbar?: React.ReactNode;
}

export const DataSurface: React.FC<DataSurfaceProps> = ({
  children,
  className,
  count,
  description,
  empty,
  error,
  heading,
  icon,
  loading,
  state = 'ready',
  toolbar,
  ...props
}) => {
  const stateContent = state === 'loading' ? loading : state === 'empty' ? empty : state === 'error' ? error : children;

  return (
    <section className={twMerge('data-surface min-w-0 overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm', className)} {...props}>
      {(heading || description || icon || count || toolbar) && (
        <TableToolbar>
          <div className="flex min-w-0 items-center gap-3">
            {icon && <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-ui-border bg-ui-surface text-accent-strong">{icon}</div>}
            <div className="min-w-0">
              {heading && <h2 className="type-section-title text-ui-text">{heading}</h2>}
              {description && <div className="type-caption mt-1 text-ui-text-muted">{description}</div>}
            </div>
          </div>
          {(count || toolbar) && <div className="flex shrink-0 flex-wrap items-center gap-3">{count && <span className="type-caption font-semibold text-ui-text-muted">{count}</span>}{toolbar}</div>}
        </TableToolbar>
      )}
      <div aria-busy={state === 'loading' || undefined}>{stateContent}</div>
    </section>
  );
};

export const TableToolbar: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className, ...props }) => (
  <div
    className={twMerge('table-toolbar flex flex-col gap-3 border-b border-ui-border bg-ui-bg px-[var(--surface-padding)] py-4 sm:flex-row sm:items-center sm:justify-between', className)}
    {...props}
  >
    {children}
  </div>
);
