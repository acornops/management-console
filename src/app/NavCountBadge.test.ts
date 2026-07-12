import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { NavCountBadge } from '@/app/NavCountBadge';

const root = resolve(__dirname, '../..');
const navCountBadge = readFileSync(resolve(root, 'src/app/NavCountBadge.tsx'), 'utf8');

describe('NavCountBadge', () => {
  it('reserves a stable badge width for one through three characters', () => {
    expect(navCountBadge).toContain('const MAX_NAV_BADGE_COUNT = 99;');
    expect(navCountBadge).toContain('h-5 min-w-8');
    expect(navCountBadge).toContain('px-1');
    expect(navCountBadge).not.toContain('py-');
  });

  it('caps visible counts while preserving the exact count for assistive context', () => {
    const singleDigitMarkup = renderToStaticMarkup(React.createElement(NavCountBadge, { count: 7 }));
    const doubleDigitMarkup = renderToStaticMarkup(React.createElement(NavCountBadge, { count: 12 }));
    const cappedMarkup = renderToStaticMarkup(React.createElement(NavCountBadge, { count: 100 }));

    expect(singleDigitMarkup).toContain('>7</span>');
    expect(singleDigitMarkup).toContain('aria-label="7"');
    expect(doubleDigitMarkup).toContain('>12</span>');
    expect(doubleDigitMarkup).toContain('aria-label="12"');
    expect(cappedMarkup).toContain('>99+</span>');
    expect(cappedMarkup).toContain('title="100"');
    expect(cappedMarkup).toContain('aria-label="100"');
  });
});
