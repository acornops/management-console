import { describe, expect, it } from 'vitest';
import {
  getDockedPanelMaximumWidth,
  getResourceCardPreservingDockWidth,
  getSidePanelMaximumWidth
} from '@/app/dockedPanelLayout';

describe('docked panel layout', () => {
  it('preserves the sidebar and a useful main-content width', () => {
    expect(getDockedPanelMaximumWidth(1440)).toBe(624);
    expect(getDockedPanelMaximumWidth(1280)).toBe(464);
    expect(getDockedPanelMaximumWidth(1440, 64)).toBe(792);
  });

  it('uses the wider overlay allowance below the dock breakpoint', () => {
    expect(getSidePanelMaximumWidth(1200, false)).toBe(983);
    expect(getSidePanelMaximumWidth(1440, true)).toBe(624);
    expect(getSidePanelMaximumWidth(1440, true, 64)).toBe(792);
  });

  it('sizes a dock to replace one bounded resource-card track', () => {
    expect(getResourceCardPreservingDockWidth(664, 420, 16, 4)).toBe(550);
    expect(getResourceCardPreservingDockWidth(856, 420, 16, 4)).toBe(646);
    expect(getResourceCardPreservingDockWidth(3000, 420, 16, 4)).toBe(656);
  });
});
