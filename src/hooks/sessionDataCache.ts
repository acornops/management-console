import React from 'react';

interface CacheRecord<T> {
  value: T;
  updatedAt: number;
}

const cache = new Map<string, CacheRecord<unknown>>();
const MAX_SESSION_CACHE_ENTRIES = 250;
let cacheOwnerId: string | null = null;

function resolveInitialValue<T>(initialValue: T | (() => T)): T {
  return typeof initialValue === 'function'
    ? (initialValue as () => T)()
    : initialValue;
}

export function setSessionDataCacheOwner(ownerId: string | null): void {
  if (cacheOwnerId === ownerId) return;
  cache.clear();
  cacheOwnerId = ownerId;
}

export function clearSessionDataCache(): void {
  cache.clear();
}

export function hasSessionDataCacheValue(key: string): boolean {
  return cache.has(key);
}

export function readSessionDataCache<T>(key: string): CacheRecord<T> | undefined {
  const record = cache.get(key) as CacheRecord<T> | undefined;
  if (record) {
    cache.delete(key);
    cache.set(key, record);
  }
  return record;
}

export function writeSessionDataCache<T>(key: string, value: T): void {
  cache.delete(key);
  cache.set(key, { value, updatedAt: Date.now() });
  while (cache.size > MAX_SESSION_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey === undefined) break;
    cache.delete(oldestKey);
  }
}

export function deleteSessionDataCache(key: string): void {
  cache.delete(key);
}

export function deleteSessionDataCachePrefix(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

export function useSessionCachedState<T>(
  key: string,
  initialValue: T | (() => T)
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const ownerAtMountRef = React.useRef(cacheOwnerId);
  const initialValueRef = React.useRef(initialValue);
  initialValueRef.current = initialValue;
  const readValue = React.useCallback(() => (
    readSessionDataCache<T>(key)?.value ?? resolveInitialValue(initialValueRef.current)
  ), [key]);
  const [snapshot, setSnapshot] = React.useState<{ key: string; value: T }>(() => ({
    key,
    value: readValue()
  }));

  const value = snapshot.key === key ? snapshot.value : readValue();
  const valueRef = React.useRef({ key, value });
  valueRef.current = { key, value };

  React.useEffect(() => {
    if (snapshot.key === key) return;
    const nextValue = readValue();
    valueRef.current = { key, value: nextValue };
    setSnapshot({ key, value: nextValue });
  }, [key, readValue, snapshot.key]);

  const setValue = React.useCallback<React.Dispatch<React.SetStateAction<T>>>((update) => {
    if (ownerAtMountRef.current !== cacheOwnerId) return;
    const currentValue = valueRef.current.key === key ? valueRef.current.value : readValue();
    const nextValue = typeof update === 'function'
      ? (update as (previous: T) => T)(currentValue)
      : update;
    writeSessionDataCache(key, nextValue);
    valueRef.current = { key, value: nextValue };
    setSnapshot({ key, value: nextValue });
  }, [key, readValue]);

  return [value, setValue];
}
