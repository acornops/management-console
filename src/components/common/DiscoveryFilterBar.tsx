import React from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { PageSearchInput } from '@/components/common/PageSearchInput';
import { SearchFilterFrame } from '@/components/common/SearchFilterFrame';
import { Select, type SelectOption } from '@/components/common/Select';

export interface DiscoveryFilterOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

export interface DiscoveryFilterGroupDefinition<T extends string> {
  id: string;
  label: string;
  value: T;
  defaultValue: T;
  options: ReadonlyArray<DiscoveryFilterOption<T>>;
  onChange: (value: T) => void;
}

export interface DiscoveryFilterGroup {
  id: string;
  label: string;
  value: string;
  defaultValue: string;
  options: ReadonlyArray<DiscoveryFilterOption<string>>;
  onChange: (value: string) => void;
}

export function createDiscoveryFilterGroup<T extends string>(
  definition: DiscoveryFilterGroupDefinition<T>
): DiscoveryFilterGroup {
  return {
    ...definition,
    onChange: (value) => {
      const option = definition.options.find((candidate) => candidate.value === value);
      if (option) definition.onChange(option.value);
    }
  };
}

type FocusTarget = Pick<HTMLElement, 'focus'>;
type FocusScheduler = (callback: () => void) => void;

export function restoreDiscoveryFocus(
  target: FocusTarget | null,
  schedule?: FocusScheduler
): void {
  const focus = () => target?.focus();
  if (schedule) {
    schedule(focus);
  } else if (typeof window !== 'undefined') {
    window.requestAnimationFrame(focus);
  } else {
    focus();
  }
}

interface DiscoveryFilterBarProps {
  idPrefix: string;
  query: string;
  queryLabel: string;
  queryPlaceholder: string;
  queryClearLabel: string;
  resultSummary: string;
  filters: ReadonlyArray<DiscoveryFilterGroup>;
  clearAllLabel: string;
  onQueryChange: (value: string) => void;
  onClearAll: () => void;
  className?: string;
}

const filterOptionLabel = (option: DiscoveryFilterOption<string>) => (
  <span className="flex w-full min-w-0 items-center justify-between gap-3">
    <span className="min-w-0 truncate">{option.label}</span>
    {typeof option.count === 'number' && (
      <span className="type-data shrink-0 text-xs text-ui-text-muted">{option.count}</span>
    )}
  </span>
);

export const DiscoveryFilterBar: React.FC<DiscoveryFilterBarProps> = ({
  idPrefix,
  query,
  queryLabel,
  queryPlaceholder,
  queryClearLabel,
  resultSummary,
  filters,
  clearAllLabel,
  onQueryChange,
  onClearAll,
  className
}) => {
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const hasQuery = query.length > 0;
  const activeConditionCount = (query.trim() ? 1 : 0)
    + filters.filter((filter) => filter.value !== filter.defaultValue).length;

  const handleClearSearch = () => {
    onQueryChange('');
    restoreDiscoveryFocus(searchInputRef.current);
  };

  const handleClearAll = () => {
    onClearAll();
    restoreDiscoveryFocus(searchInputRef.current);
  };

  const search = (
    <div className="relative min-w-0">
      <label htmlFor={`${idPrefix}-search`} className="sr-only">{queryLabel}</label>
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-text-muted" aria-hidden="true" />
      <PageSearchInput
        ref={searchInputRef}
        id={`${idPrefix}-search`}
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && hasQuery) {
            event.preventDefault();
            handleClearSearch();
          }
        }}
        placeholder={queryPlaceholder}
        className="w-full pl-11 pr-12 lg:w-full"
      />
      {hasQuery && (
        <button
          type="button"
          aria-label={queryClearLabel}
          onClick={handleClearSearch}
          className="absolute right-0 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md text-ui-text-muted transition-colors hover:bg-ui-bg hover:text-ui-text focus:outline-none focus-visible:ring-2 focus-visible:ring-control-boundary focus-visible:ring-inset"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );

  const filterControls = filters.map((filter) => (
    <Select<string>
      key={filter.id}
      id={`${idPrefix}-${filter.id}`}
      value={filter.value}
      options={filter.options.map<SelectOption<string>>((option) => ({
        value: option.value,
        label: filterOptionLabel(option)
      }))}
      onChange={filter.onChange}
      ariaLabel={filter.label}
      className="w-full"
    />
  ));

  const clearAllAction = activeConditionCount >= 2 ? (
    <Button
      type="button"
      variant="tertiary"
      size="md"
      onClick={handleClearAll}
      className="w-full whitespace-nowrap px-3 lg:w-auto"
    >
      {clearAllLabel}
    </Button>
  ) : undefined;

  const liveResultSummary = (
    <span
      className="min-w-0 text-ui-text-muted type-caption tabular-nums lg:whitespace-nowrap"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {resultSummary}
    </span>
  );

  return (
    <div data-discovery-filter-bar="true" className={className}>
      <SearchFilterFrame
        search={search}
        filterControls={filterControls}
        trailingActions={clearAllAction}
        resultSummary={liveResultSummary}
      />
    </div>
  );
};
