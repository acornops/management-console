import { describe, expect, it } from 'vitest';
import {
  getDockedPanelMaximumWidth,
  getSidePanelMaximumWidth
} from '@/app/dockedPanelLayout';

describe('docked panel layout', () => {
  it('preserves the sidebar and a useful main-content width', () => {
    expect(getDockedPanelMaximumWidth(1440)).toBe(624);
    expect(getDockedPanelMaximumWidth(1280)).toBe(464);
  });

  it('uses the wider overlay allowance below the dock breakpoint', () => {
    expect(getSidePanelMaximumWidth(1200, false)).toBe(983);
    expect(getSidePanelMaximumWidth(1440, true)).toBe(624);
  });
});
