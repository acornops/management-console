import { renderToStaticMarkup } from 'react-dom/server';
import { Search } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders one quiet collection-state anatomy with optional supporting content', () => {
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
    expect(markup).toContain('data-empty-state-surface="embedded"');
    expect(markup).toContain('role="status"');
    expect(markup).toContain('h-10 w-10');
    expect(markup).toContain('bg-ui-text/[0.06]');
    expect(markup).toContain('text-ui-text-muted');
    expect(markup).not.toContain('border-dashed');
    expect(markup).not.toContain('data-empty-state-illustration');
    expect(markup).not.toContain('text-accent-strong');
    expect(markup).toContain('type-panel-title');
    expect(markup).toContain('type-body');
    expect(markup).toContain('w-full max-w-lg');
    expect(markup).not.toContain('w-full max-w-md');
    expect(markup).toContain('Cluster inventory');
    expect(markup).toContain('Connect, install, verify.');
    expect(markup).toContain('Connect cluster');
    expect(markup).toContain('Invited by a teammate? Open their link.');
  });

  it('keeps the legacy embedded prop visually compatible with the canonical presentation', () => {
    const defaultMarkup = renderToStaticMarkup(
      <EmptyState
        headingLevel={3}
        icon={<Search />}
        title="No results"
        description="Adjust the filters."
      />
    );
    const legacyEmbeddedMarkup = renderToStaticMarkup(
      <EmptyState
        embedded
        headingLevel={3}
        icon={<Search />}
        title="No results"
        description="Adjust the filters."
      />
    );

    expect(legacyEmbeddedMarkup).toBe(defaultMarkup);
    expect(defaultMarkup).toContain('data-empty-state-surface="embedded"');
    expect(defaultMarkup).toContain('<h3 class="type-panel-title text-ui-text">No results</h3>');
    expect(defaultMarkup).toContain('bg-ui-text/[0.06]');
    expect(defaultMarkup).not.toContain('border border-ui-border bg-ui-bg');
    expect(defaultMarkup).not.toContain('data-empty-state-illustration');
    expect(defaultMarkup).not.toContain('border-dashed');
  });
});
