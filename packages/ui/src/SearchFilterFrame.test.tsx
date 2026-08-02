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
    expect(markup).toContain('gap-3 [contain:inline-size] rounded-lg border border-ui-border bg-ui-surface p-4 shadow-sm');
    expect(markup).toContain('data-search-filter-frame-search="true"');
    expect(markup).toContain('data-search-filter-frame-filters="true"');
    expect(markup).toContain('sm:grid-cols-2 lg:contents');
    expect(markup).toContain('lg:w-[clamp(10.5rem,14vw,14rem)]');
    expect(markup).toContain('data-search-filter-frame-actions="true"');
    expect(markup).toContain('data-search-filter-frame-summary="true"');
    expect(markup).toContain('lg:flex-nowrap');
  });

  it('keeps dense three-filter toolbars stacked until 2xl', () => {
    const markup = renderToStaticMarkup(
      <SearchFilterFrame
        search={<input aria-label="Search" />}
        filterControls={[
          <button key="status">Status</button>,
          <button key="source">Source</button>,
          <button key="workflow">Workflow</button>
        ]}
        resultSummary={<span role="status">3 results</span>}
      />
    );

    expect(markup).toContain('sm:grid-cols-2 lg:grid-cols-3 2xl:contents');
    expect(markup).toContain('2xl:w-[clamp(10.5rem,14vw,14rem)]');
    expect(markup).toContain('2xl:flex-nowrap');
  });

  it('can compact dense filters to preserve a wider search field', () => {
    const markup = renderToStaticMarkup(
      <SearchFilterFrame
        embedded
        filterWidth="compact"
        search={<input aria-label="Search" />}
        filterControls={[
          <button key="state">State</button>,
          <button key="origin">Origin</button>,
          <button key="workflow">Workflow</button>
        ]}
      />
    );

    expect(markup).toContain('2xl:w-44 2xl:flex-none');
  });

  it('can settle a compact dense toolbar into one row at xl', () => {
    const markup = renderToStaticMarkup(
      <SearchFilterFrame
        denseBreakpoint="xl"
        filterWidth="compact"
        search={<input aria-label="Search" />}
        filterControls={[
          <button key="state">State</button>,
          <button key="origin">Origin</button>,
          <button key="workflow">Workflow</button>
        ]}
        resultSummary={<span role="status">3 results</span>}
      />
    );

    expect(markup).toContain('xl:flex-nowrap');
    expect(markup).toContain('lg:grid-cols-3 xl:contents');
    expect(markup).toContain('xl:w-44 xl:flex-none');
    expect(markup).toContain('xl:w-auto xl:flex-none');
  });

  it('can embed its controls inside a parent toolbar without nesting another frame', () => {
    const markup = renderToStaticMarkup(
      <SearchFilterFrame embedded search={<input aria-label="Search" />} resultSummary={<span>2 results</span>} />
    );

    expect(markup).toContain('gap-3 [contain:inline-size] p-0');
    expect(markup).toContain('data-search-filter-frame="true" class="flex w-full min-w-0 max-w-full flex-wrap items-center gap-3 [contain:inline-size] p-0');
  });

  it('gives embedded view searches a stable shared width', () => {
    const markup = renderToStaticMarkup(
      <SearchFilterFrame embedded searchWidth="fixed" search={<input aria-label="Search" />} resultSummary={<span>2 results</span>} />
    );

    expect(markup).toContain('w-full min-w-0 flex-none sm:w-80');
    expect(markup).toContain('lg:ml-auto');
  });
});
