export function findLoadedLogMatches(content: string, query: string): Array<{ start: number; end: number }> {
  if (!query) return [];
  const matches: Array<{ start: number; end: number }> = [];
  // Literal matching keeps characters such as brackets meaningful as log text.
  const pattern = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  for (const match of content.matchAll(pattern)) {
    matches.push({ start: match.index, end: match.index + match[0].length });
  }
  return matches;
}

export function safeLogFilename(source: string): string {
  const stem = source.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'logs';
  return `${stem}-loaded-logs.txt`;
}
