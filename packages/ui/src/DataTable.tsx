import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { CollectionPhase } from './types';

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
    <caption className={captionHidden ? 'sr-only' : 'type-caption px-[var(--ao-surface-padding)] py-3 text-left text-ui-text-muted'}>{caption}</caption>
    {children}
  </table>
);

export interface DataTableHeaderCollectionState {
  phase: CollectionPhase;
  itemCount: number;
  showDuringInitialLoading?: boolean;
}

export const shouldRenderDataTableHeader = ({
  phase,
  itemCount,
  showDuringInitialLoading = false
}: DataTableHeaderCollectionState): boolean => (
  itemCount > 0 || (phase === 'loading' && showDuringInitialLoading)
);

export interface DataTableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  collectionState?: DataTableHeaderCollectionState;
}

export const DataTableHeader: React.FC<DataTableHeaderProps> = ({
  children,
  className,
  collectionState,
  ...props
}) => {
  if (collectionState && !shouldRenderDataTableHeader(collectionState)) return null;
  return (
    <thead className={twMerge('border-b border-ui-border bg-ui-bg', className)} {...props}>
      {children}
    </thead>
  );
};

export type DataTableDensity = 'standard' | 'dense' | 'compact';
export type DataTableGridHeaderBreakpoint = 'md' | 'lg' | 'xl';

const dataTableHeaderCellDensityClassNames: Record<DataTableDensity, string> = {
  standard: 'px-4 py-4 sm:px-6 lg:px-8 lg:py-5',
  dense: 'px-4 py-4',
  compact: 'px-5 py-3'
};

const dataTableCellDensityClassNames: Record<DataTableDensity, string> = {
  standard: 'px-4 py-5 sm:px-6 lg:px-8 lg:py-6',
  dense: 'px-4 py-4',
  compact: 'px-5 py-4'
};

export type DataTableBodyProps = React.HTMLAttributes<HTMLTableSectionElement>;

export const DataTableBody: React.FC<DataTableBodyProps> = ({ children, className, ...props }) => (
  <tbody className={twMerge('divide-y divide-ui-border', className)} {...props}>
    {children}
  </tbody>
);

export type DataTableRowProps = React.HTMLAttributes<HTMLTableRowElement>;

export const DataTableRow = React.forwardRef<HTMLTableRowElement, DataTableRowProps>(({ children, className, ...props }, ref) => (
  <tr ref={ref} className={twMerge('bg-ui-surface transition-colors hover:bg-ui-bg/70', className)} {...props}>
    {children}
  </tr>
));

DataTableRow.displayName = 'DataTableRow';

export interface DataTableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  as?: 'td' | 'th';
  density?: DataTableDensity;
  numeric?: boolean;
  scope?: React.ThHTMLAttributes<HTMLTableCellElement>['scope'];
}

export const DataTableCell: React.FC<DataTableCellProps> = ({
  as: Element = 'td',
  children,
  className,
  density = 'standard',
  numeric = false,
  scope,
  ...props
}) => (
  <Element
    scope={Element === 'th' ? scope ?? 'row' : undefined}
    className={twMerge(clsx(
      'type-body align-top text-ui-text',
      dataTableCellDensityClassNames[density],
      numeric && 'text-right tabular-nums',
      className
    ))}
    {...props}
  >
    {children}
  </Element>
);

const dataTableGridHeaderDensityClassNames: Record<DataTableDensity, string> = {
  standard: 'px-4 py-4 sm:px-6',
  dense: 'px-4 py-4',
  compact: 'px-5 py-3'
};

const dataTableGridHeaderBreakpointClassNames: Record<
  DataTableGridHeaderBreakpoint,
  Record<DataTableDensity, string>
> = {
  md: {
    standard: 'md:grid lg:px-8 lg:py-5',
    dense: 'md:grid',
    compact: 'md:grid'
  },
  lg: {
    standard: 'lg:grid lg:px-8 lg:py-5',
    dense: 'lg:grid',
    compact: 'lg:grid'
  },
  xl: {
    standard: 'xl:grid xl:px-8 xl:py-5',
    dense: 'xl:grid',
    compact: 'xl:grid'
  }
};

export interface DataTableHeaderCellProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  density?: DataTableDensity;
  numeric?: boolean;
  sortDirection?: 'ascending' | 'descending' | 'none';
  onSort?: () => void;
}

export const DataTableHeaderCell: React.FC<DataTableHeaderCellProps> = ({
  children,
  className,
  density = 'standard',
  numeric = false,
  onSort,
  sortDirection,
  ...props
}) => (
  <th
    scope="col"
    aria-sort={sortDirection}
    className={twMerge(clsx(
      'type-label bg-ui-bg text-left text-ui-text-muted',
      dataTableHeaderCellDensityClassNames[density],
      numeric && 'text-right tabular-nums',
      className
    ))}
    {...props}
  >
    {onSort ? <button type="button" className="control-target rounded-md px-1 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-control-boundary" onClick={onSort}>{children}</button> : children}
  </th>
);

export interface DataTableGridHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  collectionState?: DataTableHeaderCollectionState;
  density?: DataTableDensity;
  showAt?: DataTableGridHeaderBreakpoint;
}

export const DataTableGridHeader: React.FC<DataTableGridHeaderProps> = ({
  children,
  className,
  collectionState,
  density = 'standard',
  showAt = 'lg',
  ...props
}) => {
  if (collectionState && !shouldRenderDataTableHeader(collectionState)) return null;
  return (
    <div
      className={twMerge(clsx(
        'hidden gap-4 border-b border-ui-border bg-ui-bg',
        dataTableGridHeaderDensityClassNames[density],
        dataTableGridHeaderBreakpointClassNames[showAt][density],
        className
      ))}
      {...props}
    >
      {children}
    </div>
  );
};

export interface DataTableGridHeaderCellProps extends React.HTMLAttributes<HTMLSpanElement> {
  numeric?: boolean;
}

export const DataTableGridHeaderCell: React.FC<DataTableGridHeaderCellProps> = ({
  children,
  className,
  numeric = false,
  ...props
}) => (
  <span
    className={twMerge(clsx(
      'type-label whitespace-nowrap text-ui-text-muted',
      numeric && 'text-right tabular-nums',
      className
    ))}
    {...props}
  >
    {children}
  </span>
);

export interface DataTableStateRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  columns: number;
  phase: CollectionPhase;
  itemCount: number;
  filtered?: boolean;
  loading: React.ReactNode;
  /** Optional table-valid skeleton rows for initial ledger loading. */
  loadingRows?: React.ReactNode;
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
  loadingRows,
  phase,
  ...props
}) => {
  if (itemCount > 0) return null;
  if ((phase === 'loading' || phase === 'refreshing' || phase === 'loadingMore') && loadingRows) return <>{loadingRows}</>;
  const content = phase === 'loading' || phase === 'refreshing' || phase === 'loadingMore'
    ? loading
    : phase === 'error'
      ? error
      : filtered && filteredEmpty
        ? filteredEmpty
        : empty;
  return <DataTableRow {...props}><DataTableCell colSpan={columns} className="p-0">{content}</DataTableCell></DataTableRow>;
};
