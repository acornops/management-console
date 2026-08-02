import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CollectionLoadingSkeleton } from './Loading';

describe('CollectionLoadingSkeleton', () => {
  it('uses four placeholders as neutral first-viewport density by default', () => {
    const markup = renderToStaticMarkup(
      <CollectionLoadingSkeleton label="Loading agents" variant="card-grid" />
    );

    expect(markup.match(/min-h-44/g)).toHaveLength(4);
    expect(markup).toContain('Loading agents');
    expect(markup).not.toContain('0 agents');
  });

  it('allows denser cards to choose a smaller viewport-filling count', () => {
    const markup = renderToStaticMarkup(
      <CollectionLoadingSkeleton label="Loading clusters" variant="card-grid" rows={3} />
    );

    expect(markup.match(/min-h-44/g)).toHaveLength(3);
  });
});
