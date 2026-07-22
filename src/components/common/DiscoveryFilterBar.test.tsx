import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import {
  createDiscoveryFilterGroup,
  DiscoveryFilterBar,
  restoreDiscoveryFocus
} from './DiscoveryFilterBar';

const statusFilter = (value: 'all' | 'active' = 'all', onChange = vi.fn()) =>
  createDiscoveryFilterGroup<'all' | 'active'>({
    id: 'status',
    label: 'Status',
    value,
    defaultValue: 'all',
    options: [
      { value: 'all', label: 'All', count: 8 },
      { value: 'active', label: 'Active', count: 2 }
    ],
    onChange
  });

const renderBar = ({
  query = '',
  filters = [statusFilter()]
}: {
  query?: string;
  filters?: ReturnType<typeof statusFilter>[];
} = {}) => renderToStaticMarkup(
  <DiscoveryFilterBar
    idPrefix="catalog"
    query={query}
    queryLabel="Search catalog"
    queryPlaceholder="Search catalog"
    queryClearLabel="Clear search"
    resultSummary="2 of 8 results"
    filters={filters}
    clearAllLabel="Clear all"
    onQueryChange={() => undefined}
    onClearAll={() => undefined}
  />
);

describe('DiscoveryFilterBar', () => {
  it('safely erases typed filter definitions and ignores unknown shared values', () => {
    const onChange = vi.fn<(value: 'all' | 'active') => void>();
    const filter = statusFilter('all', onChange);

    filter.onChange('active');
    filter.onChange('unknown');

    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith('active');
    expect(filter.options[1]).toEqual({ value: 'active', label: 'Active', count: 2 });
  });

  it('renders the shared frame, visible typed selects, option counts, and polite results', () => {
    const markup = renderBar({ query: 'agent', filters: [statusFilter('active')] });

    expect(markup).toContain('data-search-filter-frame="true"');
    expect(markup).toContain('rounded-lg border border-ui-border bg-ui-surface p-4 shadow-sm');
    expect(markup).toContain('type="search"');
    expect(markup).toContain('for="catalog-search"');
    expect(markup).toContain('aria-label="Clear search"');
    expect(markup).toContain('id="catalog-status"');
    expect(markup).toContain('aria-label="Status"');
    expect(markup).toContain('aria-haspopup="listbox"');
    expect(markup).toContain('Active');
    expect(markup).toContain('>2</span>');
    expect(markup).toContain('Clear all');
    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain('2 of 8 results');
  });

  it('renders search-only composition without a categorical select or contextual Clear all', () => {
    const markup = renderBar({ query: 'agent', filters: [] });

    expect(markup).toContain('aria-label="Clear search"');
    expect(markup).not.toContain('aria-haspopup="listbox"');
    expect(markup).not.toContain('Clear all');
  });

  it('shows contextual Clear all only for at least two active conditions', () => {
    expect(renderBar({ query: '', filters: [statusFilter('active')] })).not.toContain('Clear all');
    expect(renderBar({ query: 'agent', filters: [statusFilter('all')] })).not.toContain('Clear all');
    expect(renderBar({ query: 'agent', filters: [statusFilter('active')] })).toContain('Clear all');
  });

  it('omits the search clear control when the query is empty', () => {
    expect(renderBar()).not.toContain('aria-label="Clear search"');
  });

  it('restores focus through the scheduled post-action callback', () => {
    const focus = vi.fn();
    let scheduled: (() => void) | undefined;
    restoreDiscoveryFocus({ focus }, (callback) => { scheduled = callback; });

    expect(focus).not.toHaveBeenCalled();
    scheduled?.();
    expect(focus).toHaveBeenCalledOnce();
  });
});
