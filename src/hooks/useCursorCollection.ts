import React from 'react';
import type { PagedResult } from '@/services/control-plane/types';
import type { CursorCollectionPhase } from '@/hooks/resourceLifecycle';
import { readSessionDataCache, writeSessionDataCache } from '@/hooks/sessionDataCache';

export type CursorCollectionStrategy = 'manual' | 'sentinel' | 'drain';

export interface CursorCollectionOptions<T, TFilters> {
  cacheKey?: string;
  filters: TFilters;
  getKey: (item: T) => string;
  loadPage: (request: {
    cursor?: string;
    limit: number;
    filters: TFilters;
    signal: AbortSignal;
  }) => Promise<PagedResult<T>>;
  pageSize: number;
  strategy: CursorCollectionStrategy;
}

export interface CursorCollectionState<T> {
  items: T[];
  nextCursor?: string;
  phase: CursorCollectionPhase;
  error?: string;
}

export interface CursorCollectionResult<T> extends CursorCollectionState<T> {
  loadMore(): Promise<void>;
  loadAll(): Promise<T[]>;
  refresh(): Promise<void>;
  retry(): Promise<void>;
  sentinelRef: React.RefCallback<HTMLElement>;
}

type RequestMode = 'initial' | 'refresh' | 'append';
type Listener<T> = (state: CursorCollectionState<T>) => void;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error || 'The collection could not be loaded.');
}

function deduplicate<T>(items: T[], getKey: (item: T) => string): T[] {
  const byKey = new Map<string, T>();
  items.forEach((item) => byKey.set(getKey(item), item));
  return [...byKey.values()];
}

function stableFilterKey(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableFilterKey).join(',')}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableFilterKey(entry)}`)
    .join(',')}}`;
}

/**
 * Request coordinator used by useCursorCollection. It is exported so the
 * cancellation and pagination contract can be verified without a DOM test
 * environment.
 */
export class CursorCollectionController<T, TFilters> {
  private options: CursorCollectionOptions<T, TFilters>;
  private state: CursorCollectionState<T>;
  private scopeKey: string;
  private listeners = new Set<Listener<T>>();
  private abortController?: AbortController;
  private requestVersion = 0;
  private requestedCursors = new Set<string>();
  private failedMode: RequestMode = 'initial';

  constructor(options: CursorCollectionOptions<T, TFilters>) {
    this.options = options;
    this.scopeKey = this.getScopeKey();
    this.state = this.readCachedState() ?? { items: [], phase: 'loading' };
  }

  updateOptions(options: CursorCollectionOptions<T, TFilters>): void {
    this.options = options;
  }

  getState(): CursorCollectionState<T> {
    return this.state;
  }

  subscribe(listener: Listener<T>): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  reset(): Promise<void> {
    this.abort();
    this.requestedCursors.clear();
    const nextScopeKey = this.getScopeKey();
    const scopeChanged = nextScopeKey !== this.scopeKey;
    this.scopeKey = nextScopeKey;
    const cachedState = this.readCachedState();
    const hasVisibleItems = this.state.items.length > 0;
    if (scopeChanged || cachedState) {
      this.setState(cachedState ?? (hasVisibleItems
        ? { items: this.state.items, nextCursor: undefined, phase: 'refreshing' }
        : { items: [], phase: 'loading' }));
    }
    return this.request(cachedState || hasVisibleItems ? 'refresh' : 'initial', Boolean(cachedState));
  }

  refresh(): Promise<void> {
    return this.request('refresh');
  }

  loadMore(): Promise<void> {
    if (!this.state.nextCursor || this.state.phase === 'loadingMore') return Promise.resolve();
    return this.request('append');
  }

  async loadAll(): Promise<T[]> {
    if (!this.state.nextCursor) return this.state.items;
    if (this.state.phase === 'loadingMore') {
      throw new Error('Wait for the current page to finish loading before loading all items.');
    }
    await this.request('append', false, true);
    if (this.state.phase === 'error' || this.state.nextCursor) {
      throw new Error(this.state.error || 'The complete collection could not be loaded.');
    }
    return this.state.items;
  }

  retry(): Promise<void> {
    return this.request(this.failedMode);
  }

  abort(): void {
    this.requestVersion += 1;
    this.abortController?.abort();
    this.abortController = undefined;
  }

  dispose(): void {
    this.abort();
    this.listeners.clear();
  }

  private setState(state: CursorCollectionState<T>): void {
    this.state = state;
    if (this.options.cacheKey && state.phase === 'ready') {
      writeSessionDataCache(this.scopeKey, {
        items: state.items,
        nextCursor: state.nextCursor,
        phase: 'ready' as const
      });
    }
    this.listeners.forEach((listener) => listener(state));
  }

  private getScopeKey(): string {
    if (!this.options.cacheKey) return '';
    return [
      'cursor-collection',
      this.options.cacheKey,
      stableFilterKey(this.options.filters),
      this.options.pageSize,
      this.options.strategy
    ].join(':');
  }

  private readCachedState(): CursorCollectionState<T> | undefined {
    if (!this.options.cacheKey) return undefined;
    return readSessionDataCache<CursorCollectionState<T>>(this.scopeKey)?.value;
  }

  private async request(mode: RequestMode, preserveCachedEmpty = false, drainRemaining = false): Promise<void> {
    this.abort();
    const version = this.requestVersion;
    const controller = new AbortController();
    this.abortController = controller;
    const retainedItems = mode === 'initial' ? [] : this.state.items;
    const phase: CursorCollectionPhase = mode === 'append'
      ? 'loadingMore'
      : preserveCachedEmpty && retainedItems.length === 0
        ? 'ready'
      : mode === 'refresh' || retainedItems.length > 0
        ? 'refreshing'
        : 'loading';
    this.setState({
      items: retainedItems,
      nextCursor: mode === 'append' ? this.state.nextCursor : undefined,
      phase
    });

    try {
      const shouldDrain = drainRemaining || (this.options.strategy === 'drain' && mode !== 'append');
      let cursor = mode === 'append' ? this.state.nextCursor : undefined;
      let loadedItems: T[] = [];
      let nextCursor: string | undefined;
      const operationCursors = new Set<string>();

      do {
        if (cursor) {
          if (this.requestedCursors.has(cursor) || operationCursors.has(cursor)) {
            throw new Error('The collection returned a repeated cursor. Refresh to retry pagination.');
          }
          operationCursors.add(cursor);
        }
        const page = await this.options.loadPage({
          cursor,
          limit: this.options.pageSize,
          filters: this.options.filters,
          signal: controller.signal
        });
        if (controller.signal.aborted || version !== this.requestVersion) return;
        loadedItems = deduplicate([...loadedItems, ...page.items], this.options.getKey);
        nextCursor = page.nextCursor;
        if (nextCursor && (nextCursor === cursor || operationCursors.has(nextCursor))) {
          throw new Error('The collection returned a repeated cursor. Refresh to retry pagination.');
        }
        cursor = shouldDrain ? nextCursor : undefined;
      } while (shouldDrain && cursor);

      if (mode === 'append') operationCursors.forEach((value) => this.requestedCursors.add(value));
      else this.requestedCursors.clear();
      const items = deduplicate(
        mode === 'append' ? [...retainedItems, ...loadedItems] : loadedItems,
        this.options.getKey
      );
      this.setState({ items, nextCursor, phase: 'ready' });
    } catch (error) {
      if (controller.signal.aborted || version !== this.requestVersion) return;
      const repeatedCursor = errorMessage(error).includes('repeated cursor');
      this.failedMode = repeatedCursor ? 'refresh' : mode;
      this.setState({
        items: retainedItems,
        nextCursor: mode === 'append' ? this.state.nextCursor : undefined,
        phase: 'error',
        error: errorMessage(error)
      });
    } finally {
      if (version === this.requestVersion) this.abortController = undefined;
    }
  }
}

export function useCursorCollection<T, TFilters>(
  options: CursorCollectionOptions<T, TFilters>
): CursorCollectionResult<T> {
  const controllerRef = React.useRef<CursorCollectionController<T, TFilters> | null>(null);
  if (!controllerRef.current) controllerRef.current = new CursorCollectionController(options);
  const controller = controllerRef.current;
  controller.updateOptions(options);

  const [state, setState] = React.useState<CursorCollectionState<T>>(() => controller.getState());
  const [sentinel, setSentinel] = React.useState<HTMLElement | null>(null);
  const filtersKey = stableFilterKey(options.filters);

  React.useEffect(() => controller.subscribe(setState), [controller]);

  React.useEffect(() => {
    void controller.reset();
    return () => controller.abort();
  }, [controller, filtersKey, options.pageSize, options.strategy]);

  React.useEffect(() => {
    if (
      options.strategy !== 'sentinel'
      || !sentinel
      || !state.nextCursor
      || state.phase === 'loadingMore'
      || typeof IntersectionObserver === 'undefined'
    ) return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void controller.loadMore();
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [controller, options.strategy, sentinel, state.nextCursor, state.phase]);

  React.useEffect(() => () => controller.dispose(), [controller]);

  const loadMore = React.useCallback(() => controller.loadMore(), [controller]);
  const loadAll = React.useCallback(() => controller.loadAll(), [controller]);
  const refresh = React.useCallback(() => controller.refresh(), [controller]);
  const retry = React.useCallback(() => controller.retry(), [controller]);

  return {
    ...state,
    loadMore,
    loadAll,
    refresh,
    retry,
    sentinelRef: setSentinel
  };
}
