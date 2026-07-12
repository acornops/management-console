import React from 'react';

const URL_SEARCH_CHANGED_EVENT = 'acornops:url-search-changed';

export type UrlSearchUpdate = Record<string, string | null | undefined>;

export function updateUrlSearch(update: UrlSearchUpdate, options: { replace?: boolean } = {}): void {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(update)) {
    if (value === null || value === undefined || value === '') url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  }
  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  if (options.replace) window.history.replaceState({}, '', nextUrl);
  else window.history.pushState({}, '', nextUrl);
  window.dispatchEvent(new Event(URL_SEARCH_CHANGED_EVENT));
}

export function useUrlSearchState(): URLSearchParams {
  const [search, setSearch] = React.useState(() => window.location.search);
  React.useEffect(() => {
    const refresh = () => setSearch(window.location.search);
    window.addEventListener('popstate', refresh);
    window.addEventListener(URL_SEARCH_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener('popstate', refresh);
      window.removeEventListener(URL_SEARCH_CHANGED_EVENT, refresh);
    };
  }, []);
  return React.useMemo(() => new URLSearchParams(search), [search]);
}
