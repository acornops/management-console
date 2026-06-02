import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface MiniProgressBarProps {
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

interface PageLoadingFallbackProps {
  label: string;
  className?: string;
}

export const PageLoadingFallback: React.FC<PageLoadingFallbackProps> = ({ label, className }) => (
  <div
    role="status"
    aria-live="polite"
    className={twMerge(
      clsx('flex h-full min-h-0 flex-1 items-center justify-center bg-ui-bg px-4 py-6 sm:px-6 lg:px-10 lg:py-8', className)
    )}
  >
    <span className="sr-only">{label}</span>
    <MiniProgressBar className="w-32" />
  </div>
);

interface InlineLoadingIndicatorProps {
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

interface TableLoadingRowsProps {
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
