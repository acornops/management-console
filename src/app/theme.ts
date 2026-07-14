export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export const LIGHT_THEME_COLOR = '#fcfaf6';
export const DARK_THEME_COLOR = '#121110';

export interface ThemeMediaQuery {
  matches: boolean;
  addEventListener: (type: 'change', listener: (event: MediaQueryListEvent) => void) => void;
  removeEventListener: (type: 'change', listener: (event: MediaQueryListEvent) => void) => void;
}

export function parseThemePreference(value: string | null | undefined): ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
}

export function resolveThemePreference(preference: ThemePreference, prefersDark: boolean): ResolvedTheme {
  if (preference === 'system') {
    return prefersDark ? 'dark' : 'light';
  }
  return preference;
}

export function themeSelectionChangesResolvedTheme(
  preference: ThemePreference,
  currentTheme: ResolvedTheme,
  prefersDark: boolean
): boolean {
  return resolveThemePreference(preference, prefersDark) !== currentTheme;
}

export function getSystemTheme(
  matchMedia: (query: string) => Pick<MediaQueryList, 'matches'> = (query) => window.matchMedia(query)
): ResolvedTheme {
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getThemeColor(theme: ResolvedTheme): string {
  return theme === 'dark' ? DARK_THEME_COLOR : LIGHT_THEME_COLOR;
}

export function applyResolvedTheme(theme: ResolvedTheme, targetDocument: Document = document): void {
  const root = targetDocument.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.dataset.resolvedTheme = theme;

  const themeColor = targetDocument.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  themeColor?.setAttribute('content', getThemeColor(theme));
}

export function observeResolvedTheme(
  preference: ThemePreference,
  mediaQuery: ThemeMediaQuery,
  onChange: (theme: ResolvedTheme) => void
): () => void {
  const update = (prefersDark: boolean) => onChange(resolveThemePreference(preference, prefersDark));
  const handleChange = (event: MediaQueryListEvent) => update(event.matches);

  update(mediaQuery.matches);
  if (preference !== 'system') {
    return () => undefined;
  }

  mediaQuery.addEventListener('change', handleChange);
  return () => mediaQuery.removeEventListener('change', handleChange);
}
