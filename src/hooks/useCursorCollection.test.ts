import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CursorCollectionController, cursorCollectionStateForScope, type CursorCollectionOptions } from '@/hooks/useCursorCollection';
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

  it('keeps the pending request when refreshed objects produce the same target filters', async () => {
    const pendingPage = deferred<PagedResult<Item>>();
    const loadPage = () => pendingPage.promise;
    const controller = new CursorCollectionController(options(loadPage, {
      cacheKey: 'target-issues', filters: { query: 'vm-1' }, clearItemsOnScopeChange: true
    }));
    const pending = controller.reset();
    controller.updateOptions(options(loadPage, {
      cacheKey: 'target-issues', filters: { query: 'vm-1' }, clearItemsOnScopeChange: true
    }));
    pendingPage.resolve({ items: [{ id: 'issue-1' }], nextCursor: 'next' });
    await pending;
    expect(controller.getState()).toEqual({ items: [{ id: 'issue-1' }], nextCursor: 'next', phase: 'ready' });
  });

  it('rejects a stale target response as soon as options change, before the next reset', async () => {
    const oldTarget = deferred<PagedResult<Item>>();
    const controller = new CursorCollectionController(options(() => oldTarget.promise, { cacheKey: 'issues', clearItemsOnScopeChange: true }));
    const pending = controller.reset();
    controller.updateOptions(options(async () => ({ items: [{ id: 'new-target' }] }), {
      cacheKey: 'issues', clearItemsOnScopeChange: true, filters: { query: 'new-target' }
    }));
    oldTarget.resolve({ items: [{ id: 'old-target' }] });
    await pending;
    expect(controller.getState().items).toEqual([]);
    await controller.reset();
    expect(controller.getState().items).toEqual([{ id: 'new-target' }]);
  });

  it('refreshes only the loaded pages and retains history and its cursor on failure', async () => {
    let fail = false;
    const requests: Array<string | undefined> = [];
    const controller = new CursorCollectionController(options(async ({ cursor }) => {
      requests.push(cursor);
      if (fail && cursor === 'page-2') throw new Error('Offline');
      return { items: Array.from({ length: 50 }, (_, i) => ({ id: `${cursor || 'page-1'}-${i}` })), nextCursor: cursor ? 'page-3' : 'page-2' };
    }, { refreshLoadedPages: true }));
    await controller.reset();
    await controller.loadMore();
    fail = true;
    await controller.refresh();
    expect(controller.getState().items).toHaveLength(100);
    expect(controller.getState().nextCursor).toBe('page-3');
    expect(controller.getState().phase).toBe('error');
    fail = false;
    await controller.retry();
    expect(controller.getState().items).toHaveLength(100);
    expect(controller.getState().nextCursor).toBe('page-3');
    expect(requests).toEqual([undefined, 'page-2', undefined, 'page-2', undefined, 'page-2']);
  });

  it('does not interrupt pagination with a background refresh', async () => {
    const appended = deferred<PagedResult<Item>>();
    const loader = vi.fn().mockResolvedValueOnce({ items: [{ id: 'one' }], nextCursor: 'next' }).mockReturnValueOnce(appended.promise);
    const controller = new CursorCollectionController(options(loader, { refreshLoadedPages: true }));
    await controller.reset();
    const pending = controller.loadMore();
    await controller.refresh();
    appended.resolve({ items: [{ id: 'two' }] });
    await pending;
    expect(controller.getState().items.map((item) => item.id)).toEqual(['one', 'two']);
    expect(loader).toHaveBeenCalledTimes(2);
  });

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

  it('retains visible items when filters reset while a new query is pending', async () => {
    const filteredPage = deferred<PagedResult<Item>>();
    const loadPage = vi.fn()
      .mockResolvedValueOnce({ items: [{ id: 'one', label: 'old' }] })
      .mockReturnValueOnce(filteredPage.promise);
    const controller = new CursorCollectionController(options(loadPage, { cacheKey: 'workspace:1:items' }));
    await controller.reset();

    controller.updateOptions(options(loadPage, {
      cacheKey: 'workspace:1:items',
      filters: { query: 'new' }
    }));
    const pending = controller.reset();

    expect(controller.getState()).toEqual({
      items: [{ id: 'one', label: 'old' }],
      nextCursor: undefined,
      phase: 'refreshing'
    });

    filteredPage.resolve({ items: [{ id: 'one', label: 'new' }] });
    await pending;
    expect(controller.getState()).toEqual({
      items: [{ id: 'one', label: 'new' }],
      nextCursor: undefined,
      phase: 'ready'
    });
  });

  it('clears visible items for an identity-scoped collection when filters change', async () => {
    const filteredPage = deferred<PagedResult<Item>>();
    const loadPage = vi.fn()
      .mockResolvedValueOnce({ items: [{ id: 'one', label: 'old' }] })
      .mockReturnValueOnce(filteredPage.promise);
    const controller = new CursorCollectionController(options(loadPage, {
      cacheKey: 'workspace:1:server-tools',
      clearItemsOnScopeChange: true
    }));
    await controller.reset();

    controller.updateOptions(options(loadPage, {
      cacheKey: 'workspace:1:server-tools',
      clearItemsOnScopeChange: true,
      filters: { query: 'new-server' }
    }));
    const pending = controller.reset();

    expect(controller.getState()).toEqual({ items: [], phase: 'loading' });
    filteredPage.resolve({ items: [{ id: 'two', label: 'new' }] });
    await pending;
    expect(controller.getState()).toEqual({
      items: [{ id: 'two', label: 'new' }],
      nextCursor: undefined,
      phase: 'ready'
    });
  });

  it('hides retained rows during the render before an identity reset effect commits', () => {
    const staleState = { items: [{ id: 'server-one-tool' }], phase: 'ready' as const };

    expect(cursorCollectionStateForScope(staleState, true, 'server-one', 'server-two'))
      .toEqual({ items: [], phase: 'loading' });
    expect(cursorCollectionStateForScope(staleState, false, 'server-one', 'server-two'))
      .toBe(staleState);
  });

  it('rehydrates the exact cached scope while clearing uncached identity changes', async () => {
    const secondScope = deferred<PagedResult<Item>>();
    const firstScopeRefresh = deferred<PagedResult<Item>>();
    const loadPage = vi.fn()
      .mockResolvedValueOnce({ items: [{ id: 'one', label: 'cached-one' }] })
      .mockReturnValueOnce(secondScope.promise)
      .mockReturnValueOnce(firstScopeRefresh.promise);
    const controller = new CursorCollectionController(options(loadPage, {
      cacheKey: 'workspace:1:server-tools',
      clearItemsOnScopeChange: true
    }));
    await controller.reset();

    controller.updateOptions(options(loadPage, {
      cacheKey: 'workspace:1:server-tools',
      clearItemsOnScopeChange: true,
      filters: { query: 'server-two' }
    }));
    const secondPending = controller.reset();
    expect(controller.getState()).toEqual({ items: [], phase: 'loading' });
    secondScope.resolve({ items: [{ id: 'two', label: 'cached-two' }] });
    await secondPending;

    controller.updateOptions(options(loadPage, {
      cacheKey: 'workspace:1:server-tools',
      clearItemsOnScopeChange: true,
      filters: { query: '' }
    }));
    const firstPending = controller.reset();
    expect(controller.getState()).toEqual({
      items: [{ id: 'one', label: 'cached-one' }],
      nextCursor: undefined,
      phase: 'refreshing'
    });
    firstScopeRefresh.resolve({ items: [{ id: 'one', label: 'fresh-one' }] });
    await firstPending;
    expect(controller.getState().items).toEqual([{ id: 'one', label: 'fresh-one' }]);
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

  it('loads every remaining page for a bulk collection action', async () => {
    const loadPage = vi.fn()
      .mockResolvedValueOnce({ items: [{ id: 'one' }], nextCursor: 'two' })
      .mockResolvedValueOnce({ items: [{ id: 'two' }], nextCursor: 'three' })
      .mockResolvedValueOnce({ items: [{ id: 'three' }] });
    const controller = new CursorCollectionController(options(loadPage));
    await controller.reset();

    await expect(controller.loadAll()).resolves.toEqual([
      { id: 'one' },
      { id: 'two' },
      { id: 'three' }
    ]);
    expect(loadPage).toHaveBeenCalledTimes(3);
    expect(controller.getState()).toEqual({
      items: [{ id: 'one' }, { id: 'two' }, { id: 'three' }],
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
