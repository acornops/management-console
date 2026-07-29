import React from 'react';
import { twMerge } from 'tailwind-merge';

export interface SearchFilterFrameProps {
  search: React.ReactNode;
  filterControls?: ReadonlyArray<React.ReactNode>;
  trailingActions?: React.ReactNode;
  resultSummary?: React.ReactNode;
  className?: string;
}

export const SearchFilterFrame: React.FC<SearchFilterFrameProps> = ({
  search,
  filterControls = [],
  trailingActions,
  resultSummary,
  className
}) => {
  const dense = filterControls.length >= 3;

  return (
    <div
      data-search-filter-frame="true"
      className={twMerge(
        'flex w-full min-w-0 max-w-full flex-wrap items-center gap-3 rounded-lg border border-ui-border bg-ui-surface p-4 shadow-sm [contain:inline-size]',
        dense ? '2xl:flex-nowrap' : 'lg:flex-nowrap',
        className
      )}
    >
      <div
        data-search-filter-frame-search="true"
        className={twMerge(
          'w-full min-w-0 flex-none',
          dense ? '2xl:flex-[1_1_12rem]' : 'lg:flex-[1_1_12rem]'
        )}
      >
        {search}
      </div>

      {filterControls.length > 0 && (
        <div
          data-search-filter-frame-filters="true"
          className={twMerge(
            'grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-2',
            dense ? 'lg:grid-cols-3 2xl:contents' : 'lg:contents'
          )}
        >
          {filterControls.map((control, index) => (
            <div
              key={index}
              className={twMerge(
                'w-full min-w-0',
                dense
                  ? '2xl:w-[clamp(10.5rem,14vw,14rem)] 2xl:flex-none'
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
              ? '2xl:w-auto 2xl:flex-none 2xl:grid-cols-1'
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
            dense ? '2xl:w-auto 2xl:flex-none' : 'lg:w-auto lg:flex-none'
          )}
        >
          {resultSummary}
        </div>
      )}
    </div>
  );
};
