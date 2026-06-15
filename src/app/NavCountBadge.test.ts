import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { NavCountBadge } from '@/app/NavCountBadge';

const root = resolve(__dirname, '../..');
const navCountBadge = readFileSync(resolve(root, 'src/app/NavCountBadge.tsx'), 'utf8');

describe('NavCountBadge', () => {
  it('keeps nav count markers circular', () => {
    expect(navCountBadge).toContain('const MAX_NAV_BADGE_COUNT = 9;');
    expect(navCountBadge).toContain('h-5 w-5 min-w-5');
    expect(navCountBadge).not.toContain('px-');
    expect(navCountBadge).not.toContain('py-');
  });

  it('caps visible counts while preserving the exact count for assistive context', () => {
    const singleDigitMarkup = renderToStaticMarkup(React.createElement(NavCountBadge, { count: 7 }));
    const doubleDigitMarkup = renderToStaticMarkup(React.createElement(NavCountBadge, { count: 12 }));

    expect(singleDigitMarkup).toContain('>7</span>');
    expect(singleDigitMarkup).toContain('aria-label="7"');
    expect(doubleDigitMarkup).toContain('>9+</span>');
    expect(doubleDigitMarkup).toContain('title="12"');
    expect(doubleDigitMarkup).toContain('aria-label="12"');
  });
});
