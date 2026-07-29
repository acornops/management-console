import { describe, expect, it } from 'vitest';

import { getDialogFocusWrapIndex, shouldCloseDialogOnKeyDown } from './Dialog';

describe('Dialog keyboard behavior', () => {
  it('closes on Escape when closing is enabled', () => {
    expect(shouldCloseDialogOnKeyDown('Escape', false)).toBe(true);
  });

  it('does not close on Escape while a blocking action is pending', () => {
    expect(shouldCloseDialogOnKeyDown('Escape', true)).toBe(false);
  });

  it('ignores non-Escape keys', () => {
    expect(shouldCloseDialogOnKeyDown('Enter', false)).toBe(false);
    expect(shouldCloseDialogOnKeyDown(' ', false)).toBe(false);
  });
});

describe('Dialog focus wrapping', () => {
  it('wraps Tab from the last focusable item to the first', () => {
    expect(getDialogFocusWrapIndex({
      currentIndex: 2,
      focusableCount: 3,
      shiftKey: false
    })).toBe(0);
  });

  it('wraps Shift+Tab from the first focusable item to the last', () => {
    expect(getDialogFocusWrapIndex({
      currentIndex: 0,
      focusableCount: 3,
      shiftKey: true
    })).toBe(2);
  });

  it('moves focus inside the dialog when focus starts outside', () => {
    expect(getDialogFocusWrapIndex({
      currentIndex: -1,
      focusableCount: 3,
      shiftKey: false
    })).toBe(0);
  });

  it('lets ordinary tab movement proceed inside the dialog', () => {
    expect(getDialogFocusWrapIndex({
      currentIndex: 1,
      focusableCount: 3,
      shiftKey: false
    })).toBeNull();
  });
});
