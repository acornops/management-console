import { renderToStaticMarkup } from 'react-dom/server';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it, vi } from 'vitest';
import { en } from '@/i18n/locales/en.js';
import { IssuePagination } from './IssuePagination';
import type { CursorCollectionResult } from '@/hooks/useCursorCollection';
import type { ControlPlaneIssueItem } from '@/services/controlPlaneApi';

async function render(phase: CursorCollectionResult<ControlPlaneIssueItem>['phase'], error?: string, total = 120) {
  const i18n = createInstance();
  await i18n.init({ lng: 'en', resources: { en: { translation: en } } });
  return renderToStaticMarkup(<I18nextProvider i18n={i18n}><IssuePagination total={total} collection={{
    items: Array.from({ length: 50 }, (_, i) => ({ id: String(i) }) as ControlPlaneIssueItem),
    phase, error, nextCursor: 'page-2', loadMore: vi.fn(), retry: vi.fn(), refresh: vi.fn(), loadAll: vi.fn(), sentinelRef: vi.fn()
  }} /></I18nextProvider>);
}

describe('IssuePagination', () => {
  it('does not present a stale summary as a total below the loaded count', async () => {
    const html = await render('ready', undefined, 1);
    expect(html).toContain('50 issues loaded');
    expect(html).not.toContain('50 of 1');
  });
  it('shows loaded versus total issues and an explicit next-page action', async () => {
    const html = await render('ready');
    expect(html).toContain('50 of 120 issues loaded');
    expect(html).toContain('Load more issues');
  });
  it('retains the loaded count and exposes retry after a page failure', async () => {
    const html = await render('error', 'Offline');
    expect(html).toContain('50 of 120 issues loaded');
    expect(html).toContain('Retry');
    expect(html).not.toContain('Load more issues');
  });
  it('disables pagination while a request is pending', async () => {
    const html = await render('loadingMore');
    expect(html).toContain('disabled=""');
    expect(html).toContain('Loading');
  });
});
