import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { NavCountBadge } from '@/app/NavCountBadge';

describe('NavCountBadge', () => {
  it('keeps the expanded pill and full two-digit count', () => {
    const markup = renderToStaticMarkup(<NavCountBadge count={42} />);

    expect(markup).toContain('data-nav-count-badge="default"');
    expect(markup).toContain('min-w-8');
    expect(markup).toContain('>42<');
  });

  it('uses a compact circle and abbreviates large rail counts accessibly', () => {
    const markup = renderToStaticMarkup(<NavCountBadge count={42} compact />);

    expect(markup).toContain('data-nav-count-badge="compact"');
    expect(markup).toContain('h-4 w-4 min-w-4');
    expect(markup).toContain('aria-label="42"');
    expect(markup).toContain('title="42"');
    expect(markup).toContain('>9+<');
  });
});
