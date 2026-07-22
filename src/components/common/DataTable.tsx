import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { CursorCollectionPhase } from '@/hooks/resourceLifecycle';

export interface DataTableFrameProps extends React.HTMLAttributes<HTMLDivElement> {
  stickyHeader?: boolean;
}

export const DataTableFrame: React.FC<DataTableFrameProps> = ({ children, className, stickyHeader = false, ...props }) => (
  <div
    className={twMerge('min-w-0 overflow-x-auto rounded-lg border border-ui-border bg-ui-surface shadow-sm', stickyHeader && '[&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10', className)}
    {...props}
  >
    {children}
  </div>
);

export interface DataTableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  caption: React.ReactNode;
  captionHidden?: boolean;
}

export const DataTable: React.FC<DataTableProps> = ({ caption, captionHidden = true, children, className, ...props }) => (
  <table className={twMerge('w-full min-w-[44rem] border-collapse text-left', className)} {...props}>
    <caption className={captionHidden ? 'sr-only' : 'type-caption px-[var(--surface-padding)] py-3 text-left text-ui-text-muted'}>{caption}</caption>
    {children}
  </table>
);

export interface DataTableHeaderCellProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  numeric?: boolean;
  sortDirection?: 'ascending' | 'descending' | 'none';
  onSort?: () => void;
}

export const DataTableHeaderCell: React.FC<DataTableHeaderCellProps> = ({
  children,
  className,
  numeric = false,
  onSort,
  sortDirection,
  ...props
}) => (
  <th
    scope="col"
    aria-sort={sortDirection}
    className={twMerge(clsx('type-label bg-ui-bg px-4 py-3 text-ui-text-muted', numeric && 'text-right tabular-nums', className))}
    {...props}
  >
    {onSort ? <button type="button" className="control-target rounded-md px-1 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-control-boundary" onClick={onSort}>{children}</button> : children}
  </th>
);

export interface DataTableStateRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  columns: number;
  phase: CursorCollectionPhase;
  itemCount: number;
  filtered?: boolean;
  loading: React.ReactNode;
  empty: React.ReactNode;
  filteredEmpty?: React.ReactNode;
  error: React.ReactNode;
}

export const DataTableStateRow: React.FC<DataTableStateRowProps> = ({
  columns,
  empty,
  error,
  filtered = false,
  filteredEmpty,
  itemCount,
  loading,
  phase,
  ...props
}) => {
  if (itemCount > 0 || phase === 'refreshing' || phase === 'loadingMore') return null;
  const content = phase === 'loading'
    ? loading
    : phase === 'error'
      ? error
      : filtered && filteredEmpty
        ? filteredEmpty
        : empty;
  return <tr {...props}><td colSpan={columns} className="p-0">{content}</td></tr>;
};
