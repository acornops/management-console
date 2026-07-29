import { describe, expect, it } from 'vitest';
import {
  contrastRatio,
  desktopSidebar,
  lightTheme,
  loginPage,
  mobileNavigation,
  rgbVariableValue
} from './stylesTestSupport';

describe('brand contrast exception', () => {
  it('preserves canonical orange only on explicitly marked wordmarks', () => {
    expect(contrastRatio(
      rgbVariableValue(lightTheme, '--ao-brand-orange-bright-rgb'),
      rgbVariableValue(lightTheme, '--ao-surface-rgb')
    )).toBeLessThan(4.5);
    for (const source of [desktopSidebar, mobileNavigation, loginPage]) {
      expect(source).toContain('data-brand-wordmark');
      expect(source).toContain('text-accent-bright');
    }
  });
});
