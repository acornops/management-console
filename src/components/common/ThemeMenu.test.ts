import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { getThemeMenuFocusIndex } from './ThemeMenu';

const root = process.cwd();
const themeMenu = readFileSync(resolve(root, 'src/components/common/ThemeMenu.tsx'), 'utf8');
const themeToggleIcon = readFileSync(resolve(root, 'src/components/common/ThemeToggleIcon.tsx'), 'utf8');
const loginPage = readFileSync(resolve(root, 'src/pages/LoginPage.tsx'), 'utf8');
const desktopSidebar = readFileSync(resolve(root, 'src/app/AppDesktopSidebar.tsx'), 'utf8');
const mobileNavigation = readFileSync(resolve(root, 'src/app/AppMobileNavigation.tsx'), 'utf8');

describe('ThemeMenu', () => {
  it('wraps arrow navigation and supports Home and End', () => {
    expect(getThemeMenuFocusIndex(0, 'ArrowDown')).toBe(1);
    expect(getThemeMenuFocusIndex(2, 'ArrowDown')).toBe(0);
    expect(getThemeMenuFocusIndex(0, 'ArrowUp')).toBe(2);
    expect(getThemeMenuFocusIndex(1, 'Home')).toBe(0);
    expect(getThemeMenuFocusIndex(1, 'End')).toBe(2);
  });

  it('uses radio-menu semantics, checked state, Escape handling, outside dismissal, and focus restoration', () => {
    expect(themeMenu).toContain('role="menu"');
    expect(themeMenu).toContain('role="menuitemradio"');
    expect(themeMenu).toContain('aria-checked={isSelected}');
    expect(themeMenu).toContain("['ArrowDown', 'ArrowUp', 'Home', 'End']");
    expect(themeMenu).toContain("event.key === 'Escape'");
    expect(themeMenu).toContain("document.addEventListener('mousedown', handlePointerDown)");
    expect(themeMenu).toContain('triggerRef.current?.focus');
  });

  it('shows Monitor, Sun, Moon, and the current preference label', () => {
    expect(themeMenu).toContain("['system', 'light', 'dark']");
    expect(themeMenu).toContain('<Monitor');
    expect(themeMenu).toContain('<Sun');
    expect(themeMenu).toContain('<Moon');
    expect(themeMenu).toContain('{selectedLabel}');
  });

  it('shows the shared current-theme icon on all three triggers', () => {
    expect(themeMenu).toContain("import { ThemeToggleIcon } from '@/components/common/ThemeToggleIcon';");
    expect(themeMenu.match(/<ThemeToggleIcon resolvedTheme=\{resolvedTheme\}/g)).toHaveLength(3);
    expect(themeToggleIcon).toContain("resolvedTheme === 'dark' ? Moon : Sun");
    expect(themeToggleIcon).toContain('key={resolvedTheme}');
    expect(themeToggleIcon).toContain('duration: 0.16');
    expect(themeToggleIcon).toContain('opacity: 0, rotate: -24, scale: 0.82');
    expect(themeToggleIcon).toContain('useReducedMotion()');
  });

  it('is the shared implementation on login, desktop account, and mobile navigation surfaces', () => {
    expect(loginPage).toContain('<ThemeMenu');
    expect(loginPage).toContain('variant="login"');
    expect(desktopSidebar).toContain('<ThemeMenu');
    expect(desktopSidebar).toContain('variant="account"');
    expect(mobileNavigation).toContain('<ThemeMenu');
    expect(mobileNavigation).toContain('variant="mobile"');
  });
});
