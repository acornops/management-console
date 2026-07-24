import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { FetchToolDrawer } from '@/pages/agents/FetchToolDrawer';

describe('FetchToolDrawer', () => {
  it('uses a full-viewport layer above its parent Agent drawer', () => {
    const html = renderToStaticMarkup(
      <FetchToolDrawer
        initialConfig={{ allowedUrlPatterns: ['https://status.example.com/api/health'] }}
        isOpen
        saving={false}
        onClose={vi.fn()}
        onSave={vi.fn(async () => undefined)}
      />
    );

    expect(html).toContain('fixed inset-0');
    expect(html).toContain('z-[130]');
    expect(html).toContain('flex h-full');
  });
});
