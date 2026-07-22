import { describe, expect, it } from 'vitest';

import { getMcpMenuPosition } from './AddMcpServerAction';

describe('getMcpMenuPosition', () => {
  it('keeps the menu inside the floating layer and right-aligns it to the trigger', () => {
    expect(getMcpMenuPosition({
      boundary: { top: 0, left: 0, width: 1000, height: 700 },
      trigger: { top: 120, bottom: 156, right: 960 },
      menuWidth: 256,
      menuHeight: 132
    })).toEqual({ left: 704, placement: 'bottom', top: 164 });
  });

  it('opens above the trigger when the lower edge would clip the menu', () => {
    expect(getMcpMenuPosition({
      boundary: { top: 100, left: 600, width: 400, height: 300 },
      trigger: { top: 340, bottom: 376, right: 980 },
      menuWidth: 256,
      menuHeight: 132
    })).toEqual({ left: 124, placement: 'top', top: 100 });
  });
});
