export function suggestCatalogSourceName(value: string): string {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
    return url.hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}
