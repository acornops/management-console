import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SearchFilterFrame } from './SearchFilterFrame';

describe('SearchFilterFrame', () => {
  it('provides the canonical framed responsive slots', () => {
    const markup = renderToStaticMarkup(
      <SearchFilterFrame
        search={<input aria-label="Search" />}
        filterControls={[<button key="status">Status</button>, <button key="source">Source</button>]}
        trailingActions={<button>Clear all</button>}
        resultSummary={<span role="status">2 results</span>}
      />
    );

    expect(markup).toContain('data-search-filter-frame="true"');
    expect(markup).toContain('gap-3 rounded-lg border border-ui-border bg-ui-surface p-4 shadow-sm');
    expect(markup).toContain('data-search-filter-frame-search="true"');
    expect(markup).toContain('data-search-filter-frame-filters="true"');
    expect(markup).toContain('sm:grid-cols-2 lg:contents');
    expect(markup).toContain('lg:w-[clamp(10.5rem,14vw,14rem)]');
    expect(markup).toContain('data-search-filter-frame-actions="true"');
    expect(markup).toContain('data-search-filter-frame-summary="true"');
    expect(markup).toContain('lg:flex-nowrap');
  });
});
