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
  const themeMenu = readSource('src/components/common/ThemeMenu.tsx');
  const themeToggleIcon = readSource('src/components/common/ThemeToggleIcon.tsx');
  const appPageContent = readSource('src/app/AppPageContent.tsx');
  const pageComposition = readSource('src/components/common/PageComposition.tsx');
  const kubernetesClusterDetail = readSource('src/features/kubernetes-cluster-detail/KubernetesClusterDetail.tsx');
  const styles = readSource('src/styles.css');

  it('routes every application theme control through the shared transition hook', () => {
    expect(app).toContain('const handleSelectTheme = useThemeTransition(setThemePreference, resolvedTheme);');
    expect(loginPage).toContain('onSelect={onSelectTheme}');
    expect(desktopSidebar).toContain('onSelect={onSelectTheme}');
    expect(mobileNavigation).toContain('onSelect={onSelectTheme}');
    expect(themeMenu).toContain('onSelect(option, event.currentTarget);');
    // The theme flips in place (no View Transition snapshot) so live motion never
    // freezes, and a decorative, non-occluding ripple acknowledges the switch.
    expect(themeTransitionHook).not.toContain('startViewTransition');
    expect(themeTransitionHook).toContain('onChangeTheme();');
    expect(themeTransitionHook).toContain('themeSelectionChangesResolvedTheme');
    expect(themeTransitionHook).toContain("window.matchMedia('(prefers-reduced-motion: reduce)')");
    expect(themeTransitionHook).toContain('theme-reveal-ripple');
    expect(styles).toContain('.theme-reveal-ripple {');
    expect(styles).toContain('@keyframes theme-reveal-ripple');
    expect(styles).toContain('animation: theme-reveal-ripple 320ms cubic-bezier(0.22, 1, 0.36, 1) forwards;');
    expect(styles).not.toContain('::view-transition');
    expect(themeMenu.match(/<ThemeToggleIcon resolvedTheme=\{resolvedTheme\}/g)).toHaveLength(3);
    expect(themeToggleIcon).toContain("const destinationTheme = resolvedTheme === 'dark' ? 'light' : 'dark';");
    expect(themeToggleIcon).toContain('initial={shouldReduceMotion ? false : { opacity: 0, rotate: -24, scale: 0.82 }}');
    expect(themeToggleIcon).toContain('exit={shouldReduceMotion ? undefined : { opacity: 0, rotate: 24, scale: 0.82 }}');
    expect(themeToggleIcon).toContain('{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }');
    expect(themeToggleIcon).toContain('? { duration: 0 }');
  });

  it('renders route headers and Kubernetes tab panels immediately', () => {
    expect(pageComposition).toContain('<header');
    expect(pageComposition).not.toContain('<motion.header');
    expect(pageComposition).not.toContain('headerMotion');
    expect(appPageContent).not.toContain('fadeTransition');
    expect(appPageContent).not.toContain('<motion.div');
    expect(kubernetesClusterDetail).not.toContain('<AnimatePresence mode="wait">');
    expect(kubernetesClusterDetail).not.toContain('fadeTransition');
    expect(kubernetesClusterDetail).toContain("{activeView === 'overview' && (");
    expect(kubernetesClusterDetail).toContain("{activeView === 'resources' && <ResourcesView");
  });

  it('keeps Settings tab state intact while adding a scoped shared indicator', () => {
    expect(settingsPage).toContain('<LayoutGroup id={settingsTabsLayoutGroupId}>');
    expect(settingsPage).toContain('{isActive && <ActiveTabIndicator />}');
    expect(settingsPage).toContain('aria-pressed={isActive}');
    expect(settingsPage).toContain('onSelectTab?.(tab);');
  });
});
