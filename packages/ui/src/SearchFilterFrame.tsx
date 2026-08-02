import React from 'react';
import { twMerge } from 'tailwind-merge';

export interface SearchFilterFrameProps {
  search: React.ReactNode;
  filterControls?: ReadonlyArray<React.ReactNode>;
  trailingActions?: React.ReactNode;
  resultSummary?: React.ReactNode;
  embedded?: boolean;
  searchWidth?: 'fluid' | 'fixed';
  filterWidth?: 'default' | 'compact';
  denseBreakpoint?: 'xl' | '2xl';
  stacked?: boolean;
  className?: string;
}

export const SearchFilterFrame: React.FC<SearchFilterFrameProps> = ({
  search,
  filterControls = [],
  trailingActions,
  resultSummary,
  embedded = false,
  searchWidth = 'fluid',
  filterWidth = 'default',
  denseBreakpoint = '2xl',
  stacked = false,
  className
}) => {
  const dense = filterControls.length >= 3;
  const denseAtXl = dense && denseBreakpoint === 'xl';

  return (
    <div
      data-search-filter-frame="true"
      className={twMerge(
        'flex w-full min-w-0 max-w-full flex-wrap items-center gap-3 [contain:inline-size]',
        embedded ? 'p-0' : 'rounded-lg border border-ui-border bg-ui-surface p-4 shadow-sm',
        dense ? (denseAtXl ? 'xl:flex-nowrap' : '2xl:flex-nowrap') : 'lg:flex-nowrap',
        stacked && 'flex-col items-stretch lg:flex-col lg:flex-wrap lg:items-stretch',
        className
      )}
    >
      <div
        data-search-filter-frame-search="true"
        className={twMerge(
          'w-full min-w-0 flex-none',
          searchWidth === 'fixed'
            ? 'sm:w-80'
            : dense ? (denseAtXl ? 'xl:flex-[1_1_12rem]' : '2xl:flex-[1_1_12rem]') : 'lg:flex-[1_1_12rem]',
          stacked && 'w-full flex-none sm:w-full lg:w-full lg:flex-none 2xl:flex-none'
        )}
      >
        {search}
      </div>

      {filterControls.length > 0 && (
        <div
          data-search-filter-frame-filters="true"
          className={twMerge(
            'grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-2',
            dense ? (denseAtXl ? 'lg:grid-cols-3 xl:contents' : 'lg:grid-cols-3 2xl:contents') : 'lg:contents'
          )}
        >
          {filterControls.map((control, index) => (
            <div
              key={index}
              className={twMerge(
                'w-full min-w-0',
                dense
                  ? filterWidth === 'compact'
                    ? denseAtXl ? 'xl:w-44 xl:flex-none' : '2xl:w-44 2xl:flex-none'
                    : denseAtXl ? 'xl:w-[clamp(10.5rem,14vw,14rem)] xl:flex-none' : '2xl:w-[clamp(10.5rem,14vw,14rem)] 2xl:flex-none'
                  : 'lg:w-[clamp(10.5rem,14vw,14rem)] lg:flex-none'
              )}
            >
              {control}
            </div>
          ))}
        </div>
      )}

      {trailingActions && (
        <div
          data-search-filter-frame-actions="true"
          className={twMerge(
            'grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-2',
            dense
              ? denseAtXl ? 'xl:w-auto xl:flex-none xl:grid-cols-1' : '2xl:w-auto 2xl:flex-none 2xl:grid-cols-1'
              : 'lg:w-auto lg:flex-none lg:grid-cols-1'
          )}
        >
          {trailingActions}
        </div>
      )}

      {resultSummary && (
        <div
          data-search-filter-frame-summary="true"
          className={twMerge(
            'flex min-h-0 w-full min-w-0 items-center justify-end pt-1 text-right sm:min-h-11 sm:pt-0',
            dense ? (denseAtXl ? 'xl:w-auto xl:flex-none' : '2xl:w-auto 2xl:flex-none') : 'lg:w-auto lg:flex-none',
            searchWidth === 'fixed' && (dense ? (denseAtXl ? 'xl:ml-auto' : '2xl:ml-auto') : 'lg:ml-auto'),
            stacked && 'w-full flex-none justify-start pt-1 text-left sm:min-h-0 lg:w-full'
          )}
        >
          {resultSummary}
        </div>
      )}
    </div>
  );
};
