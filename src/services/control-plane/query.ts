export function pageQuery(options?: { limit?: number; cursor?: string; q?: string; filters?: Record<string, string | undefined> }): string {
  const params = new URLSearchParams();
  if (typeof options?.limit === 'number') params.set('limit', String(options.limit));
  if (options?.cursor) params.set('cursor', options.cursor);
  if (options?.q) params.set('q', options.q);
  for (const [key, value] of Object.entries(options?.filters || {})) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}
