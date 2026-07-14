import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getThemeRevealGeometry, startThemeTransition } from './useThemeTransition';

function createStyleDeclaration() {
  const values = new Map<string, string>();
  return {
    values,
    setProperty: (name: string, value: string) => values.set(name, value),
    removeProperty: (name: string) => {
      const value = values.get(name) || '';
      values.delete(name);
      return value;
    }
  };
}

function createElement(bounds = { left: 10, top: 20, width: 40, height: 20 }) {
  const attributes = new Map<string, string>();
  const listeners = new Map<string, Set<() => void>>();
  const style = createStyleDeclaration();
  return {
    className: '',
    style,
    removed: false,
    getBoundingClientRect: () => bounds,
    setAttribute: (name: string, value: string) => attributes.set(name, value),
    getAttribute: (name: string) => attributes.get(name) ?? null,
    hasAttribute: (name: string) => attributes.has(name),
    removeAttribute: (name: string) => attributes.delete(name),
    addEventListener: (type: string, callback: () => void) => {
      const set = listeners.get(type) ?? new Set();
      set.add(callback);
      listeners.set(type, set);
    },
    removeEventListener: (type: string, callback: () => void) => {
      listeners.get(type)?.delete(callback);
    },
    remove() {
      this.removed = true;
    },
    dispatch: (type: string) => listeners.get(type)?.forEach((callback) => callback())
  };
}

type FakeElement = ReturnType<typeof createElement>;
const asFake = (element: HTMLElement | null) => element as unknown as FakeElement | null;

describe('theme transition geometry', () => {
  it('uses the clicked control center and farthest viewport corner', () => {
    expect(getThemeRevealGeometry(
      { left: 10, top: 20, width: 40, height: 20 },
      { width: 100, height: 80 }
    )).toEqual({
      originX: 30,
      originY: 30,
      radius: Math.hypot(70, 50)
    });
  });
});

describe('startThemeTransition', () => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  let created: Array<ReturnType<typeof createElement>>;
  let appended: Array<ReturnType<typeof createElement>>;
  let matchMedia: ReturnType<typeof vi.fn>;
  let timeoutCallbacks: Array<() => void>;
  let clearedTimeouts: Set<number>;

  beforeEach(() => {
    created = [];
    appended = [];
    timeoutCallbacks = [];
    clearedTimeouts = new Set();
    matchMedia = vi.fn(() => ({ matches: false }));

    vi.stubGlobal('setTimeout', (callback: () => void) => {
      timeoutCallbacks.push(callback);
      return timeoutCallbacks.length;
    });
    vi.stubGlobal('clearTimeout', (id: number) => {
      clearedTimeouts.add(id);
    });
    vi.stubGlobal('document', {
      createElement: () => {
        const element = createElement();
        created.push(element);
        return element;
      },
      body: {
        appendChild: (element: ReturnType<typeof createElement>) => {
          appended.push(element);
        }
      }
    });
    vi.stubGlobal('window', {
      innerWidth: 100,
      innerHeight: 80,
      matchMedia
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalDocument) vi.stubGlobal('document', originalDocument);
    if (originalWindow) vi.stubGlobal('window', originalWindow);
  });

  it('recolours immediately and plays one non-occluding reveal from the control', () => {
    const button = createElement();
    const onChangeTheme = vi.fn();
    const activeReveal = { current: null } as any;

    const overlay = asFake(startThemeTransition({ button: button as any, onChangeTheme, activeReveal }));

    // The theme flips in place — no snapshot, so live motion never freezes.
    expect(onChangeTheme).toHaveBeenCalledOnce();
    expect(overlay).toBe(appended[0]);
    expect(overlay?.className).toBe('theme-reveal-ripple');
    expect(overlay?.getAttribute('aria-hidden')).toBe('true');
    expect(overlay?.style.values.get('--theme-reveal-x')).toBe('30px');
    expect(overlay?.style.values.get('--theme-reveal-y')).toBe('30px');
    expect(overlay?.style.values.get('--theme-reveal-radius')).toBe(`${Math.hypot(70, 50)}px`);
    expect(activeReveal.current?.overlay).toBe(overlay);
  });

  it('removes the reveal and clears state when the animation ends', () => {
    const button = createElement();
    const activeReveal = { current: null } as any;

    const overlay = asFake(startThemeTransition({ button: button as any, onChangeTheme: vi.fn(), activeReveal }));
    overlay?.dispatch('animationend');

    expect(overlay?.removed).toBe(true);
    expect(activeReveal.current).toBeNull();
  });

  it.each([
    ['reduced motion', true],
    ['full motion', false]
  ])('flips the theme for %s and only decorates with motion enabled', (_label, reducedMotion) => {
    matchMedia.mockReturnValue({ matches: reducedMotion });
    const button = createElement();
    const onChangeTheme = vi.fn();
    const activeReveal = { current: null } as any;

    const overlay = asFake(startThemeTransition({ button: button as any, onChangeTheme, activeReveal }));

    expect(onChangeTheme).toHaveBeenCalledOnce();
    if (reducedMotion) {
      expect(overlay).toBeNull();
      expect(appended).toHaveLength(0);
      expect(activeReveal.current).toBeNull();
    } else {
      expect(overlay).not.toBeNull();
      expect(appended).toHaveLength(1);
    }
  });

  it('tears down a stuck reveal via the failsafe timeout', () => {
    const button = createElement();
    const activeReveal = { current: null } as any;

    const overlay = asFake(startThemeTransition({ button: button as any, onChangeTheme: vi.fn(), activeReveal }));
    // animationend never fires (e.g. backgrounded tab); the failsafe must clean up.
    expect(overlay?.removed).toBe(false);
    expect(timeoutCallbacks).toHaveLength(1);

    timeoutCallbacks[0]();

    expect(overlay?.removed).toBe(true);
    expect(activeReveal.current).toBeNull();
  });

  it('disposes the previous reveal before starting a new one on rapid toggles', () => {
    const firstButton = createElement();
    const secondButton = createElement({ left: 70, top: 50, width: 20, height: 20 });
    const activeReveal = { current: null } as any;

    const first = asFake(startThemeTransition({ button: firstButton as any, onChangeTheme: vi.fn(), activeReveal }));
    const second = asFake(startThemeTransition({ button: secondButton as any, onChangeTheme: vi.fn(), activeReveal }));

    expect(first?.removed).toBe(true);
    expect(second?.removed).toBe(false);
    expect(appended).toHaveLength(2);
    expect(activeReveal.current?.overlay).toBe(second);
    expect(second?.style.values.get('--theme-reveal-x')).toBe('80px');
    expect(second?.style.values.get('--theme-reveal-y')).toBe('60px');
  });
});
