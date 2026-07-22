import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DataTable, DataTableFrame, DataTableHeaderCell, DataTableStateRow } from '@/components/common/DataTable';

describe('DataTable primitives', () => {
  it('keeps state rows inside the table frame and active column count', () => {
    const markup = renderToStaticMarkup(
      <DataTableFrame>
        <DataTable caption="Targets">
          <thead><tr><DataTableHeaderCell>Name</DataTableHeaderCell><DataTableHeaderCell numeric>Status</DataTableHeaderCell></tr></thead>
          <tbody><DataTableStateRow columns={2} phase="loading" itemCount={0} loading={<span>Loading targets</span>} empty={<span>No targets</span>} error={<span>Load failed</span>} /></tbody>
        </DataTable>
      </DataTableFrame>
    );
    expect(markup).toContain('<caption class="sr-only">Targets</caption>');
    expect(markup).toContain('colSpan="2"');
    expect(markup).toContain('Loading targets');
    expect(markup).not.toContain('No targets');
  });

  it('uses a keyboard-reachable sort control and aria-sort', () => {
    const markup = renderToStaticMarkup(<table><thead><tr><DataTableHeaderCell sortDirection="ascending" onSort={() => undefined}>Name</DataTableHeaderCell></tr></thead></table>);
    expect(markup).toContain('aria-sort="ascending"');
    expect(markup).toContain('<button type="button"');
  });
});
