import { describe, expect, it, vi } from 'vitest';

import {
  DARK_THEME_COLOR,
  LIGHT_THEME_COLOR,
  getSystemTheme,
  getThemeColor,
  observeResolvedTheme,
  parseThemePreference,
  resolveThemePreference,
  themeSelectionChangesResolvedTheme,
  type ThemeMediaQuery
} from './theme';

function createMediaQuery(matches: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const mediaQuery: ThemeMediaQuery = {
    matches,
    addEventListener: vi.fn((_type, listener) => listeners.add(listener)),
    removeEventListener: vi.fn((_type, listener) => listeners.delete(listener))
  };
  return {
    mediaQuery,
    change(nextMatches: boolean) {
      mediaQuery.matches = nextMatches;
      listeners.forEach((listener) => listener({ matches: nextMatches } as MediaQueryListEvent));
    }
  };
}

describe('theme resolution', () => {
  it.each([
    ['system', 'system'],
    ['light', 'light'],
    ['dark', 'dark'],
    ['invalid', 'system'],
    [null, 'system']
  ] as const)('parses %s as %s', (value, expected) => {
    expect(parseThemePreference(value)).toBe(expected);
  });

  it('resolves System against the media query and leaves explicit themes unchanged', () => {
    expect(resolveThemePreference('system', false)).toBe('light');
    expect(resolveThemePreference('system', true)).toBe('dark');
    expect(resolveThemePreference('light', true)).toBe('light');
    expect(resolveThemePreference('dark', false)).toBe('dark');
  });

  it('reads the operating-system appearance through prefers-color-scheme', () => {
    const matchMedia = vi.fn(() => ({ matches: true }));
    expect(getSystemTheme(matchMedia)).toBe('dark');
    expect(matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
  });

  it('reports whether a selection actually changes the resolved appearance', () => {
    expect(themeSelectionChangesResolvedTheme('system', 'dark', true)).toBe(false);
    expect(themeSelectionChangesResolvedTheme('light', 'dark', true)).toBe(true);
    expect(themeSelectionChangesResolvedTheme('dark', 'dark', false)).toBe(false);
  });

  it('maps resolved themes to the synchronized browser chrome colors', () => {
    expect(getThemeColor('light')).toBe(LIGHT_THEME_COLOR);
    expect(getThemeColor('dark')).toBe(DARK_THEME_COLOR);
  });
});

describe('system theme observation', () => {
  it('subscribes to live OS changes only while System is active', () => {
    const { mediaQuery, change } = createMediaQuery(false);
    const onChange = vi.fn();
    const dispose = observeResolvedTheme('system', mediaQuery, onChange);

    expect(onChange).toHaveBeenLastCalledWith('light');
    expect(mediaQuery.addEventListener).toHaveBeenCalledOnce();
    change(true);
    expect(onChange).toHaveBeenLastCalledWith('dark');

    dispose();
    expect(mediaQuery.removeEventListener).toHaveBeenCalledOnce();
    change(false);
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it.each(['light', 'dark'] as const)('resolves explicit %s without subscribing', (preference) => {
    const { mediaQuery } = createMediaQuery(preference === 'light');
    const onChange = vi.fn();
    observeResolvedTheme(preference, mediaQuery, onChange);

    expect(onChange).toHaveBeenCalledWith(preference);
    expect(mediaQuery.addEventListener).not.toHaveBeenCalled();
  });
});
