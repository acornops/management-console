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
}) => (
  <div
    data-search-filter-frame="true"
    className={twMerge(
      'flex w-full min-w-0 max-w-full flex-wrap items-center gap-3 rounded-lg border border-ui-border bg-ui-surface p-4 shadow-sm [contain:inline-size] lg:flex-nowrap',
      className
    )}
  >
    <div data-search-filter-frame-search="true" className="w-full min-w-0 flex-none lg:flex-[1_1_12rem]">
      {search}
    </div>

    {filterControls.length > 0 && (
      <div
        data-search-filter-frame-filters="true"
        className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:contents"
      >
        {filterControls.map((control, index) => (
          <div
            key={index}
            className="w-full min-w-0 lg:w-[clamp(10.5rem,14vw,14rem)] lg:flex-none"
          >
            {control}
          </div>
        ))}
      </div>
    )}

    {trailingActions && (
      <div
        data-search-filter-frame-actions="true"
        className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:w-auto lg:flex-none lg:grid-cols-1"
      >
        {trailingActions}
      </div>
    )}

    {resultSummary && (
      <div
        data-search-filter-frame-summary="true"
        className="flex min-h-11 w-full min-w-0 items-center justify-end text-right lg:w-auto lg:flex-none"
      >
        {resultSummary}
      </div>
    )}
  </div>
);
