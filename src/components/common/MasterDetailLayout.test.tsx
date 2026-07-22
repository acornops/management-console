import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { MasterDetailEmptyState, MasterDetailLayout, MasterDetailListHeader, MasterDetailLoading, MasterDetailPaneBody, MasterDetailPaneHeader, MasterDetailRow, masterDetailGridClass } from './MasterDetailLayout';

describe('MasterDetailLayout', () => {
  it('uses the fixed desktop library template and one divided surface', () => {
    expect(masterDetailGridClass).toContain('min-h-[32rem]');
    expect(masterDetailGridClass).toContain('border border-ui-border');
    expect(masterDetailGridClass).toContain('lg:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)]');
    expect(masterDetailGridClass).not.toContain('gap-');

    const markup = renderToStaticMarkup(
      <MasterDetailLayout
        list={<div>Library</div>}
        detail={<div>Detail</div>}
        showDetailOnCompact={false}
        compactBackLabel="Back to library"
        onCompactBack={() => undefined}
      />
    );

    expect(markup).toContain('data-master-detail-list="true" class="block min-w-0 lg:border-r lg:border-ui-border"');
    expect(markup).toContain('data-master-detail-detail="true" class="hidden lg:block min-w-0"');
    expect(markup).not.toContain('Back to library');
  });

  it('drills into detail on compact screens and exposes Back', () => {
    const markup = renderToStaticMarkup(
      <MasterDetailLayout
        list={<div>Library</div>}
        detail={<div>Detail</div>}
        showDetailOnCompact
        compactBackLabel="Back to library"
        onCompactBack={() => undefined}
      />
    );

    expect(markup).toContain('data-master-detail-list="true" class="hidden lg:block min-w-0 lg:border-r lg:border-ui-border"');
    expect(markup).toContain('data-master-detail-detail="true" class="block min-w-0"');
    expect(markup).toContain('Back to library');
  });

  it('standardizes library and detail-pane anatomy', () => {
    const markup = renderToStaticMarkup(<>
      <MasterDetailListHeader>Library</MasterDetailListHeader>
      <MasterDetailLoading>Loading resources…</MasterDetailLoading>
      <MasterDetailRow
        title="Resource"
        description="Resource description"
        metadata="2 capabilities"
        status="Active"
        ariaLabel="Select Resource"
        selected
        onClick={() => undefined}
      />
      <MasterDetailEmptyState title="Nothing found" description="Adjust the filters." />
      <MasterDetailPaneHeader badges="Active" title="Resource" description="Resource description" />
      <MasterDetailPaneBody><div>Details</div></MasterDetailPaneBody>
    </>);

    expect(markup).toContain('min-h-24 w-full px-4 py-3');
    expect(markup).toContain('bg-accent-soft/45');
    expect(markup).toContain('aria-label="Select Resource"');
    expect(markup).toMatch(/aria-describedby="[^"]+ [^"]+ [^"]+"/);
    expect(markup).toContain('border-b border-ui-border bg-ui-bg');
    expect(markup).toContain('grid gap-5 bg-ui-bg/45 p-4 sm:p-5');
    expect(markup).toContain('Nothing found');
  });
});
