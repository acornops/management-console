import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CursorCollectionController, type CursorCollectionOptions } from '@/hooks/useCursorCollection';
import type { PagedResult } from '@/services/control-plane/types';
import { clearSessionDataCache } from '@/hooks/sessionDataCache';

interface Item { id: string; label?: string }
interface Filters { query: string }

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function options(
  loadPage: CursorCollectionOptions<Item, Filters>['loadPage'],
  overrides: Partial<CursorCollectionOptions<Item, Filters>> = {}
): CursorCollectionOptions<Item, Filters> {
  return {
    filters: { query: '' },
    getKey: (item) => item.id,
    loadPage,
    pageSize: 50,
    strategy: 'manual',
    ...overrides
  };
}

describe('CursorCollectionController', () => {
  beforeEach(() => clearSessionDataCache());

  it('loads the initial page into ready state', async () => {
    const loadPage = vi.fn(async (): Promise<PagedResult<Item>> => ({ items: [{ id: 'one' }], nextCursor: 'next' }));
    const controller = new CursorCollectionController(options(loadPage));

    await controller.reset();

    expect(loadPage).toHaveBeenCalledWith(expect.objectContaining({ cursor: undefined, limit: 50, filters: { query: '' } }));
    expect(controller.getState()).toEqual({ items: [{ id: 'one' }], nextCursor: 'next', phase: 'ready' });
  });

  it('retains visible items while refresh is pending', async () => {
    const refresh = deferred<PagedResult<Item>>();
    const loadPage = vi.fn()
      .mockResolvedValueOnce({ items: [{ id: 'one', label: 'old' }] })
      .mockReturnValueOnce(refresh.promise);
    const controller = new CursorCollectionController(options(loadPage));
    await controller.reset();

    const pending = controller.refresh();
    expect(controller.getState()).toEqual({ items: [{ id: 'one', label: 'old' }], nextCursor: undefined, phase: 'refreshing' });
    refresh.resolve({ items: [{ id: 'one', label: 'new' }] });
    await pending;
    expect(controller.getState().items).toEqual([{ id: 'one', label: 'new' }]);
  });

  it('hydrates a remounted collection from session cache while revalidating', async () => {
    const initialLoad = vi.fn(async (): Promise<PagedResult<Item>> => ({ items: [{ id: 'one', label: 'cached' }] }));
    const firstController = new CursorCollectionController(options(initialLoad, { cacheKey: 'workspace:1:items' }));
    await firstController.reset();

    const revalidation = deferred<PagedResult<Item>>();
    const secondLoad = vi.fn(() => revalidation.promise);
    const secondController = new CursorCollectionController(options(secondLoad, { cacheKey: 'workspace:1:items' }));

    expect(secondController.getState()).toEqual({
      items: [{ id: 'one', label: 'cached' }],
      nextCursor: undefined,
      phase: 'ready'
    });

    const pending = secondController.reset();
    expect(secondController.getState()).toEqual({
      items: [{ id: 'one', label: 'cached' }],
      nextCursor: undefined,
      phase: 'refreshing'
    });

    revalidation.resolve({ items: [{ id: 'one', label: 'fresh' }] });
    await pending;
    expect(secondController.getState().items).toEqual([{ id: 'one', label: 'fresh' }]);
  });

  it('keeps a cached empty result out of the initial-loading phase on remount', async () => {
    const firstController = new CursorCollectionController(options(
      vi.fn(async (): Promise<PagedResult<Item>> => ({ items: [] })),
      { cacheKey: 'workspace:1:empty-items' }
    ));
    await firstController.reset();

    const revalidation = deferred<PagedResult<Item>>();
    const secondController = new CursorCollectionController(options(
      vi.fn(() => revalidation.promise),
      { cacheKey: 'workspace:1:empty-items' }
    ));

    const pending = secondController.reset();
    expect(secondController.getState()).toEqual({ items: [], nextCursor: undefined, phase: 'ready' });
    revalidation.resolve({ items: [] });
    await pending;
    expect(secondController.getState().phase).toBe('ready');
  });

  it('appends and deduplicates pages by stable key', async () => {
    const loadPage = vi.fn()
      .mockResolvedValueOnce({ items: [{ id: 'one', label: 'old' }], nextCursor: 'two' })
      .mockResolvedValueOnce({ items: [{ id: 'one', label: 'new' }, { id: 'two' }] });
    const controller = new CursorCollectionController(options(loadPage));
    await controller.reset();

    await controller.loadMore();

    expect(loadPage).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: 'two' }));
    expect(controller.getState()).toEqual({
      items: [{ id: 'one', label: 'new' }, { id: 'two' }],
      nextCursor: undefined,
      phase: 'ready'
    });
  });

  it('aborts and ignores a stale response when filters reset', async () => {
    const first = deferred<PagedResult<Item>>();
    const second = deferred<PagedResult<Item>>();
    const signals: AbortSignal[] = [];
    const loadPage = vi.fn(({ signal }) => {
      signals.push(signal);
      return signals.length === 1 ? first.promise : second.promise;
    });
    const controller = new CursorCollectionController(options(loadPage));
    const firstRequest = controller.reset();
    controller.updateOptions(options(loadPage, { filters: { query: 'new' } }));
    const secondRequest = controller.reset();

    expect(signals[0].aborted).toBe(true);
    first.resolve({ items: [{ id: 'stale' }] });
    second.resolve({ items: [{ id: 'fresh' }] });
    await Promise.all([firstRequest, secondRequest]);
    expect(controller.getState().items).toEqual([{ id: 'fresh' }]);
  });

  it('turns a repeated cursor into a recoverable retained-content error', async () => {
    const loadPage = vi.fn()
      .mockResolvedValueOnce({ items: [{ id: 'one' }], nextCursor: 'repeat' })
      .mockResolvedValueOnce({ items: [{ id: 'two' }], nextCursor: 'repeat' })
      .mockResolvedValueOnce({ items: [{ id: 'fresh' }] });
    const controller = new CursorCollectionController(options(loadPage));
    await controller.reset();

    await controller.loadMore();
    expect(controller.getState()).toMatchObject({ items: [{ id: 'one' }], phase: 'error' });
    expect(controller.getState().error).toContain('repeated cursor');

    await controller.retry();
    expect(loadPage).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: undefined }));
    expect(controller.getState()).toEqual({ items: [{ id: 'fresh' }], nextCursor: undefined, phase: 'ready' });
  });

  it.each(['initial', 'refresh', 'append'] as const)('retains the correct content after %s failure', async (failureMode) => {
    const loadPage = vi.fn();
    if (failureMode === 'initial') loadPage.mockRejectedValueOnce(new Error('initial failed'));
    else {
      loadPage.mockResolvedValueOnce({ items: [{ id: 'one' }], nextCursor: failureMode === 'append' ? 'next' : undefined });
      loadPage.mockRejectedValueOnce(new Error(`${failureMode} failed`));
    }
    const controller = new CursorCollectionController(options(loadPage));
    await controller.reset();
    if (failureMode === 'refresh') await controller.refresh();
    if (failureMode === 'append') await controller.loadMore();

    expect(controller.getState().phase).toBe('error');
    expect(controller.getState().items).toEqual(failureMode === 'initial' ? [] : [{ id: 'one' }]);
    expect(controller.getState().error).toBe(`${failureMode} failed`);
  });

  it('drains a bounded collection without exposing an intermediate empty result', async () => {
    const phases: string[] = [];
    const loadPage = vi.fn()
      .mockResolvedValueOnce({ items: [], nextCursor: 'second' })
      .mockResolvedValueOnce({ items: [{ id: 'two' }] });
    const controller = new CursorCollectionController(options(loadPage, { strategy: 'drain' }));
    controller.subscribe((state) => phases.push(state.phase));

    await controller.reset();

    expect(loadPage).toHaveBeenCalledTimes(2);
    expect(phases).toEqual(['loading', 'ready']);
    expect(controller.getState().items).toEqual([{ id: 'two' }]);
  });
});
