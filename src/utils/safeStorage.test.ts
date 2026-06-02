import { afterEach, describe, expect, it } from 'vitest';

import { safeStorage } from './safeStorage';

const originalWindow = globalThis.window;

describe('safeStorage', () => {
  afterEach(() => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: originalWindow,
      writable: true
    });
  });

  it('falls back when browser storage is unavailable or blocked', () => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        localStorage: {
          getItem: () => {
            throw new DOMException('blocked', 'SecurityError');
          },
          setItem: () => {
            throw new DOMException('blocked', 'SecurityError');
          },
          removeItem: () => {
            throw new DOMException('blocked', 'SecurityError');
          }
        }
      },
      writable: true
    });

    expect(safeStorage.getItem('theme')).toBeNull();
    expect(() => safeStorage.setItem('theme', 'dark')).not.toThrow();
    expect(() => safeStorage.removeItem('theme')).not.toThrow();
  });
});
