import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DangerZone, DangerZoneRow } from './DangerZone';

describe('DangerZone', () => {
  it('uses one neutral divided surface for standing destructive actions', () => {
    const html = renderToStaticMarkup(
      <DangerZone className="mt-10">
        <DangerZoneRow
          id="leave-title"
          title="Leave workspace"
          description="Remove your own access."
          action={<button type="button">Leave</button>}
        />
        <DangerZoneRow
          id="delete-title"
          title="Delete workspace"
          description="Permanently remove this workspace."
          tone="danger"
          action={<button type="button">Delete</button>}
        />
      </DangerZone>
    );

    expect(html).toContain('data-danger-zone="true"');
    expect(html).toContain('divide-y divide-ui-border');
    expect(html).toContain('border-ui-border bg-ui-surface');
    expect(html).not.toContain('bg-status-danger-soft');
    expect(html).toContain('data-danger-zone-row="neutral"');
    expect(html).toContain('data-danger-zone-row="danger"');
    expect(html).toContain('flex w-full shrink-0 justify-end sm:w-auto');
    expect(html).not.toContain('sm:w-64');
  });

  it('keeps danger emphasis on the destructive title while descriptions remain neutral', () => {
    const html = renderToStaticMarkup(
      <DangerZone>
        <DangerZoneRow
          id="delete-title"
          title="Delete agent"
          description="This cannot be undone."
          headingLevel="h3"
          tone="danger"
          action={<button type="button">Delete</button>}
        />
      </DangerZone>
    );

    expect(html).toContain('<h3 id="delete-title" class="type-row-title mb-1 text-status-danger-text">');
    expect(html).toContain('type-caption max-w-2xl text-ui-text-muted');
  });
});
