import { describe, expect, it } from 'vitest';
import {
  buttonComponent,
  contrastRatio,
  darkTheme,
  lightTheme,
  rgbVariableValue,
  tailwindConfig
} from './stylesTestSupport';

describe('quiet neutral button contract', () => {
  it('uses one quiet outline treatment for secondary and icon buttons', () => {
    expect(buttonComponent).toContain('secondary: quietNeutralButtonClass');
    expect(buttonComponent).toContain('icon: quietNeutralButtonClass');
    expect(buttonComponent).toContain('border border-control-secondary-boundary bg-transparent');
    expect(buttonComponent).toContain('text-control-secondary-fg shadow-none');
    expect(buttonComponent).toContain('hover:bg-control-secondary-hover active:bg-control-secondary-hover');
    expect(buttonComponent).toContain('focus-visible:ring-accent');
    expect(buttonComponent).toContain('disabled:opacity-50');
  });

  it('keeps destructive icon buttons quiet until interaction', () => {
    expect(buttonComponent).toContain('dangerIcon: quietDangerIconButtonClass');
    expect(buttonComponent).toContain('border border-control-secondary-boundary bg-transparent text-ui-text-muted shadow-none');
    expect(buttonComponent).toContain('hover:border-status-danger/30 hover:bg-status-danger-soft hover:text-status-danger-text');
    expect(buttonComponent).toContain('active:border-status-danger/30 active:bg-status-danger-soft active:text-status-danger-text');
  });

  it('publishes a theme-aware secondary boundary through the Tailwind preset', () => {
    expect(lightTheme).toContain('--ao-control-secondary-boundary: var(--ao-border)');
    expect(darkTheme).toContain('--ao-control-secondary-boundary: var(--ao-border)');
    expect(rgbVariableValue(lightTheme, '--ao-control-secondary-boundary-rgb')).toEqual(rgbVariableValue(lightTheme, '--ao-border-rgb'));
    expect(rgbVariableValue(darkTheme, '--ao-control-secondary-boundary-rgb')).toEqual(rgbVariableValue(darkTheme, '--ao-border-rgb'));
    expect(tailwindConfig).toContain("'control-secondary-boundary'");
  });

  it('keeps neutral button content accessible on supported surfaces', () => {
    const surfaces = ['--ao-bg-rgb', '--ao-surface-rgb', '--ao-surface-strong-rgb', '--ao-brand-orange-soft-rgb'];

    for (const theme of [lightTheme, darkTheme]) {
      for (const surface of surfaces) {
        expect(contrastRatio(rgbVariableValue(theme, '--ao-control-secondary-fg-rgb'), rgbVariableValue(theme, surface))).toBeGreaterThanOrEqual(4.5);
      }
      expect(contrastRatio(rgbVariableValue(theme, '--ao-control-secondary-fg-rgb'), rgbVariableValue(theme, '--ao-control-secondary-hover-rgb'))).toBeGreaterThanOrEqual(4.5);
    }
  });
});
