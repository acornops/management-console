import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '..');
const readSource = (path: string) => readFileSync(resolve(root, path), 'utf8');

describe('focused application motion source contracts', () => {
  const app = readSource('src/App.tsx');
  const loginPage = readSource('src/pages/LoginPage.tsx');
  const desktopSidebar = readSource('src/app/AppDesktopSidebar.tsx');
  const mobileNavigation = readSource('src/app/AppMobileNavigation.tsx');
  const settingsPage = readSource('src/pages/SettingsPage.tsx');
  const themeTransitionHook = readSource('src/hooks/useThemeTransition.ts');
  const styles = readSource('src/styles.css');

  it('routes every application theme control through the shared transition hook', () => {
    expect(app).toContain('const handleToggleTheme = useThemeTransition(toggleTheme);');
    expect(loginPage).toContain('onClick={onToggleTheme}');
    expect(desktopSidebar).toContain('onClick={onToggleTheme}');
    expect(mobileNavigation).toContain('onClick={onToggleTheme}');
    // The theme flips in place (no View Transition snapshot) so live motion never
    // freezes, and a decorative, non-occluding ripple acknowledges the switch.
    expect(themeTransitionHook).not.toContain('startViewTransition');
    expect(themeTransitionHook).toContain('onToggleTheme();');
    expect(themeTransitionHook).toContain("window.matchMedia('(prefers-reduced-motion: reduce)')");
    expect(themeTransitionHook).toContain('theme-reveal-ripple');
    expect(styles).toContain('.theme-reveal-ripple {');
    expect(styles).toContain('@keyframes theme-reveal-ripple');
    expect(styles).not.toContain('::view-transition');
  });

  it('keeps Settings tab state intact while adding a scoped shared indicator', () => {
    expect(settingsPage).toContain('<LayoutGroup id={settingsTabsLayoutGroupId}>');
    expect(settingsPage).toContain('{isActive && <ActiveTabIndicator />}');
    expect(settingsPage).toContain('aria-pressed={isActive}');
    expect(settingsPage).toContain('onSelectTab?.(tab);');
  });
});
