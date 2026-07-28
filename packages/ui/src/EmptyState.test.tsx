import { renderToStaticMarkup } from 'react-dom/server';
import { Search } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders one framed collection-state anatomy with an optional action', () => {
    const markup = renderToStaticMarkup(
      <EmptyState
        icon={<Search />}
        title="No clusters found"
        description="Connect a cluster to start monitoring it."
        eyebrow="Cluster inventory"
        details={<p>Connect, install, verify.</p>}
        actions={<button type="button">Connect cluster</button>}
        footer="Invited by a teammate? Open their link."
      />
    );

    expect(markup).toContain('data-empty-state="true"');
    expect(markup).toContain('data-empty-state-surface="framed"');
    expect(markup).toContain('role="status"');
    expect(markup).toContain('border-dashed');
    expect(markup).toContain('data-empty-state-illustration="ledger"');
    expect(markup).toContain('type-panel-title');
    expect(markup).toContain('type-body');
    expect(markup).toContain('Cluster inventory');
    expect(markup).toContain('Connect, install, verify.');
    expect(markup).toContain('Connect cluster');
    expect(markup).toContain('Invited by a teammate? Open their link.');
  });

  it('keeps the shared anatomy while nesting cleanly in an existing surface', () => {
    const markup = renderToStaticMarkup(
      <EmptyState
        embedded
        headingLevel={3}
        icon={<Search />}
        title="No results"
        description="Adjust the filters."
      />
    );

    expect(markup).toContain('data-empty-state-surface="embedded"');
    expect(markup).toContain('<h3 class="type-panel-title text-ui-text">No results</h3>');
    expect(markup).not.toContain('data-empty-state-illustration');
    expect(markup).not.toContain('border-dashed');
  });
});
