import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface MiniProgressBarProps {
  className?: string;
}

export const MiniProgressBar: React.FC<MiniProgressBarProps> = ({ className }) => (
  <div
    aria-hidden="true"
    className={twMerge(clsx('h-1.5 w-36 overflow-hidden rounded-full bg-ui-border', className))}
  >
    <div className="loading-bar-sweep h-full w-2/5 rounded-full bg-accent" />
  </div>
);

export interface PageLoadingFallbackProps {
  label: string;
  className?: string;
}

export const PageLoadingFallback: React.FC<PageLoadingFallbackProps> = ({ label, className }) => (
  <div
    role="status"
    aria-live="polite"
    className={twMerge(
      clsx('flex h-full min-h-0 flex-1 items-center justify-center bg-ui-bg px-[var(--ao-route-padding-x)] py-[var(--ao-route-padding-y)]', className)
    )}
  >
    <span className="sr-only">{label}</span>
    <MiniProgressBar className="w-32" />
  </div>
);

export interface InlineLoadingIndicatorProps {
  label: string;
  className?: string;
}

export const InlineLoadingIndicator: React.FC<InlineLoadingIndicatorProps> = ({ label, className }) => (
  <div
    role="status"
    aria-live="polite"
    className={twMerge(
      clsx('type-label inline-flex items-center gap-2 rounded-lg border border-ui-border bg-ui-surface px-4 py-3 text-ui-text-muted', className)
    )}
  >
    <span aria-hidden="true" className="h-2 w-2 rounded-full bg-accent animate-pulse" />
    <span>{label}</span>
  </div>
);

const SkeletonLine: React.FC<{ className: string }> = ({ className }) => (
  <span aria-hidden="true" className={twMerge(clsx('block animate-pulse rounded-full bg-ui-border/70', className))} />
);

export interface CollectionLoadingSkeletonProps {
  /** Announces the pending collection without exposing decorative skeletons. */
  label: string;
  /** Uses a list for ledgers and a card grid for inventory-style collections. */
  variant?: 'list' | 'card-grid';
  /** Placeholder count. Defaults to four to fill the first viewport of a typical collection without implying a result total. */
  rows?: number;
  className?: string;
  gridClassName?: string;
  gridProps?: React.HTMLAttributes<HTMLDivElement> & Partial<Record<`data-${string}`, string | number | boolean>>;
  announce?: boolean;
}

/**
 * Shared loading anatomy for collection surfaces. It reserves the final
 * reading rhythm instead of presenting an empty bordered container.
 */
export const CollectionLoadingSkeleton: React.FC<CollectionLoadingSkeletonProps> = ({
  label,
  variant = 'list',
  rows = 4,
  className,
  gridClassName,
  gridProps,
  announce = true
}) => {
  const items = Array.from({ length: rows });

  if (variant === 'card-grid') {
    return (
      <div role={announce ? 'status' : undefined} aria-live={announce ? 'polite' : undefined} className={twMerge('min-w-0', className)}>
        <span className="sr-only">{label}</span>
        <div {...gridProps} aria-hidden="true" className={twMerge('grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3', gridClassName, gridProps?.className)}>
          {items.map((_, index) => (
            <div key={index} className="min-h-44 overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm">
              <div className="flex items-start gap-3 px-4 py-4">
                <span className="h-10 w-10 shrink-0 animate-pulse rounded-lg bg-ui-border/70" />
                <div className="min-w-0 flex-1 space-y-2 pt-0.5">
                  <SkeletonLine className="h-3.5 w-2/5" />
                  <SkeletonLine className="h-2.5 w-24" />
                </div>
                <SkeletonLine className="mt-1 h-5 w-14" />
              </div>
              <div className="border-t border-ui-border px-4 py-4">
                <SkeletonLine className="h-3 w-5/6" />
                <SkeletonLine className="mt-3 h-2.5 w-2/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div role={announce ? 'status' : undefined} aria-live={announce ? 'polite' : undefined} className={twMerge('divide-y divide-ui-border', className)}>
      <span className="sr-only">{label}</span>
      <div aria-hidden="true">
        {items.map((_, index) => (
          <div key={index} className="flex min-h-20 items-center gap-4 px-5 py-4">
            <span className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-ui-border/70" />
            <div className="min-w-0 flex-1 space-y-2">
              <SkeletonLine className="h-3 w-2/5" />
              <SkeletonLine className="h-2.5 w-3/5" />
            </div>
            <SkeletonLine className="hidden h-5 w-16 sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
};

export interface TableLoadingRowsProps {
  columns: number;
  label: string;
  rows?: number;
  cellClassName?: string;
  columnClassNames?: string[];
  showAvatarInFirstColumn?: boolean;
}

const skeletonWidths = ['w-32', 'w-24', 'w-28', 'w-20', 'w-12'];

export const TableLoadingRows: React.FC<TableLoadingRowsProps> = ({
  columns,
  label,
  rows = 4,
  cellClassName = 'px-8 py-6',
  columnClassNames = [],
  showAvatarInFirstColumn = false
}) => (
  <>
    <tr>
      <td colSpan={columns} role="status" aria-live="polite" className="sr-only">
        {label}
      </td>
    </tr>
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <tr key={rowIndex} aria-hidden="true" className="border-b border-ui-bg">
        {Array.from({ length: columns }).map((__, columnIndex) => (
          <td
            key={columnIndex}
            className={twMerge(clsx(cellClassName, columnClassNames[columnIndex]))}
          >
            <div className={twMerge(clsx('flex items-center gap-4', columnClassNames[columnIndex]?.includes('text-right') && 'justify-end'))}>
              {columnIndex === 0 && showAvatarInFirstColumn && (
                <div className="h-12 w-12 shrink-0 animate-pulse rounded-xl bg-ui-border/70" />
              )}
              {columnIndex === 0 && showAvatarInFirstColumn ? (
                <div className="space-y-2">
                  <div className="h-3 w-32 animate-pulse rounded-full bg-ui-border/70" />
                  <div className="h-2.5 w-44 animate-pulse rounded-full bg-ui-border/60" />
                </div>
              ) : (
                <div
                  className={twMerge(
                    clsx('h-3 animate-pulse rounded-full bg-ui-border/70', skeletonWidths[columnIndex % skeletonWidths.length])
                  )}
                />
              )}
            </div>
          </td>
        ))}
      </tr>
    ))}
  </>
);
