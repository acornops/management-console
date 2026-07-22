import React from 'react';
import { twMerge } from 'tailwind-merge';
import type { CursorCollectionPhase } from '@/hooks/resourceLifecycle';

export interface CollectionStateProps extends React.HTMLAttributes<HTMLDivElement> {
  phase: CursorCollectionPhase;
  itemCount: number;
  filtered?: boolean;
  loading: React.ReactNode;
  empty: React.ReactNode;
  filteredEmpty?: React.ReactNode;
  error: React.ReactNode;
  feedback?: React.ReactNode;
  announcement?: React.ReactNode;
}

/**
 * Selects collection content with one precedence order. Refresh, append, and
 * failures with retained items never replace the visible collection.
 */
export const CollectionState: React.FC<CollectionStateProps> = ({
  announcement,
  children,
  className,
  empty,
  error,
  feedback,
  filtered = false,
  filteredEmpty,
  itemCount,
  loading,
  phase,
  ...props
}) => {
  const isBusy = phase === 'loading' || phase === 'refreshing' || phase === 'loadingMore';
  const hasContent = itemCount > 0;
  let content = children;

  if (phase === 'loading' && !hasContent) content = loading;
  else if (phase === 'error' && !hasContent) content = error;
  else if (!hasContent) content = filtered && filteredEmpty ? filteredEmpty : empty;

  return (
    <div className={twMerge('collection-state min-w-0', className)} aria-busy={isBusy || undefined} {...props}>
      {content}
      {hasContent && (phase === 'refreshing' || phase === 'loadingMore' || phase === 'error') && feedback}
      {announcement && <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">{announcement}</div>}
    </div>
  );
};
