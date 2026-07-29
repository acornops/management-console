import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  DataTable,
  DataTableFrame,
  DataTableGridHeader,
  DataTableGridHeaderCell,
  DataTableHeader,
  DataTableHeaderCell,
  DataTableStateRow
} from '@acornops/ui';

describe('DataTable primitives', () => {
  it('keeps state rows inside the table frame and active column count', () => {
    const markup = renderToStaticMarkup(
      <DataTableFrame>
        <DataTable caption="Targets">
          <DataTableHeader><tr><DataTableHeaderCell>Name</DataTableHeaderCell><DataTableHeaderCell numeric>Status</DataTableHeaderCell></tr></DataTableHeader>
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

  it('replaces terminal zero-row table anatomy while retaining populated headers', () => {
    const emptyTableMarkup = renderToStaticMarkup(
      <table>
        <DataTableHeader collectionState={{ phase: 'ready', itemCount: 0 }}>
          <tr><DataTableHeaderCell>Name</DataTableHeaderCell></tr>
        </DataTableHeader>
        <tbody><DataTableStateRow columns={1} phase="ready" itemCount={0} loading={null} empty={<span>No targets</span>} error={null} /></tbody>
      </table>
    );
    const populatedTableMarkup = renderToStaticMarkup(
      <table>
        <DataTableHeader collectionState={{ phase: 'refreshing', itemCount: 1 }}>
          <tr><DataTableHeaderCell>Name</DataTableHeaderCell></tr>
        </DataTableHeader>
        <tbody><tr><td>Cluster A</td></tr></tbody>
      </table>
    );

    expect(emptyTableMarkup).not.toContain('<thead');
    expect(emptyTableMarkup).toContain('No targets');
    expect(populatedTableMarkup).toContain('<thead');
    expect(populatedTableMarkup).toContain('Cluster A');
  });

  it('keeps generic loading headerless unless a table-shaped skeleton opts in', () => {
    const genericLoadingMarkup = renderToStaticMarkup(
      <DataTableGridHeader collectionState={{ phase: 'loading', itemCount: 0 }}>
        <DataTableGridHeaderCell>Target</DataTableGridHeaderCell>
      </DataTableGridHeader>
    );
    const skeletonLoadingMarkup = renderToStaticMarkup(
      <table>
        <DataTableHeader collectionState={{ phase: 'loading', itemCount: 0, showDuringInitialLoading: true }}>
          <tr><DataTableHeaderCell>Target</DataTableHeaderCell></tr>
        </DataTableHeader>
      </table>
    );

    expect(genericLoadingMarkup).toBe('');
    expect(skeletonLoadingMarkup).toContain('<thead');
  });

  it('renders zero-row refreshes as loading state rather than a blank body', () => {
    const markup = renderToStaticMarkup(
      <table>
        <tbody>
          <DataTableStateRow
            columns={1}
            phase="refreshing"
            itemCount={0}
            loading={<span>Refreshing targets</span>}
            empty={<span>No targets</span>}
            error={null}
          />
        </tbody>
      </table>
    );

    expect(markup).toContain('Refreshing targets');
    expect(markup).not.toContain('No targets');
  });

  it('shares one visible header anatomy across semantic tables and responsive ledgers', () => {
    const tableMarkup = renderToStaticMarkup(
      <table><DataTableHeader><tr><DataTableHeaderCell>Target</DataTableHeaderCell></tr></DataTableHeader></table>
    );
    const gridMarkup = renderToStaticMarkup(
      <DataTableGridHeader showAt="xl"><DataTableGridHeaderCell>Target</DataTableGridHeaderCell></DataTableGridHeader>
    );
    expect(tableMarkup).toContain('border-b border-ui-border bg-ui-bg');
    expect(tableMarkup).toContain('type-label bg-ui-bg text-left text-ui-text-muted');
    expect(tableMarkup).toContain('lg:px-8 lg:py-5');
    expect(gridMarkup).toContain('border-b border-ui-border bg-ui-bg');
    expect(gridMarkup).toContain('xl:grid xl:px-8 xl:py-5');
    expect(gridMarkup).toContain('type-label whitespace-nowrap text-ui-text-muted');
  });

  it('keeps dense decision tables in the same vocabulary without wide padding', () => {
    const markup = renderToStaticMarkup(
      <table><thead><tr><DataTableHeaderCell density="dense">Decision</DataTableHeaderCell></tr></thead></table>
    );
    expect(markup).toContain('type-label bg-ui-bg text-left text-ui-text-muted px-4 py-4');
    expect(markup).not.toContain('lg:px-8');
  });

  it('offers compact anatomy only through an explicit shared density', () => {
    const tableMarkup = renderToStaticMarkup(
      <table><thead><tr><DataTableHeaderCell density="compact">Issue</DataTableHeaderCell></tr></thead></table>
    );
    const gridMarkup = renderToStaticMarkup(
      <DataTableGridHeader density="compact" showAt="md">
        <DataTableGridHeaderCell>Issue</DataTableGridHeaderCell>
      </DataTableGridHeader>
    );

    expect(tableMarkup).toContain('type-label bg-ui-bg text-left text-ui-text-muted px-5 py-3');
    expect(gridMarkup).toContain('border-b border-ui-border bg-ui-bg px-5 py-3 md:grid');
    expect(gridMarkup).not.toContain('lg:px-8');
  });

  it('supports page-level responsive ledgers that reveal at the medium breakpoint', () => {
    const markup = renderToStaticMarkup(
      <DataTableGridHeader showAt="md">
        <DataTableGridHeaderCell>Time</DataTableGridHeaderCell>
      </DataTableGridHeader>
    );

    expect(markup).toContain('md:grid lg:px-8 lg:py-5');
  });
});
