import { renderToStaticMarkup } from 'react-dom/server';
import { Activity } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { IconTile } from './IconTile';

describe('IconTile', () => {
  it('renders a flat neutral decorative tile by default', () => {
    const markup = renderToStaticMarkup(<IconTile><Activity /></IconTile>);

    expect(markup).toContain('data-icon-tile="true"');
    expect(markup).toContain('data-icon-tile-size="md"');
    expect(markup).toContain('data-icon-tile-tone="neutral"');
    expect(markup).toContain('bg-ui-text/[0.06]');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).not.toContain('border');
    expect(markup).not.toContain('shadow');
  });

  it('supports identity and semantic tones without control styling', () => {
    const accent = renderToStaticMarkup(<IconTile tone="accent" size="sm"><Activity /></IconTile>);
    const warning = renderToStaticMarkup(<IconTile tone="warning"><Activity /></IconTile>);

    expect(accent).toContain('text-accent-strong');
    expect(accent).toContain('data-icon-tile-size="sm"');
    expect(warning).toContain('bg-status-warning-soft');
    expect(warning).toContain('text-status-warning-text');
    expect(warning).not.toContain('border');
  });
});
