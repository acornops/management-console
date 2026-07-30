import { describe, expect, it } from 'vitest';

import {
  applyModalBackgroundInert,
  getModalBackgroundTargets,
  getModalFocusWrapIndex,
  shouldCloseModalOnKeyDown
} from './ModalIsolation';

function createInertableElement(initialAttributes: Record<string, string> = {}) {
  const attributes = new Map(Object.entries(initialAttributes));
  return {
    getAttribute: (name: string) => attributes.get(name) ?? null,
    hasAttribute: (name: string) => attributes.has(name),
    removeAttribute: (name: string) => attributes.delete(name),
    setAttribute: (name: string, value: string) => attributes.set(name, value)
  };
}

function createTreeElement(name: string) {
  const element = {
    ...createInertableElement(),
    children: [] as ReturnType<typeof createTreeElement>[],
    name,
    parentElement: null as ReturnType<typeof createTreeElement> | null,
    contains(target: ReturnType<typeof createTreeElement>): boolean {
      return element === target || element.children.some((child) => child.contains(target));
    }
  };
  return element;
}

function linkTree(parent: ReturnType<typeof createTreeElement>, children: ReturnType<typeof createTreeElement>[]) {
  parent.children = children;
  children.forEach((child) => {
    child.parentElement = parent;
  });
}

describe('shared modal isolation', () => {
  it('wraps focus and protects pending overlays from Escape', () => {
    expect(getModalFocusWrapIndex({ currentIndex: 2, focusableCount: 3, shiftKey: false })).toBe(0);
    expect(getModalFocusWrapIndex({ currentIndex: 0, focusableCount: 3, shiftKey: true })).toBe(2);
    expect(shouldCloseModalOnKeyDown('Escape', false)).toBe(true);
    expect(shouldCloseModalOnKeyDown('Escape', true)).toBe(false);
  });

  it('includes siblings at the inert boundary for body-level portals', () => {
    const body = createTreeElement('body');
    const app = createTreeElement('app');
    const overlay = createTreeElement('overlay');
    const notifications = createTreeElement('notifications');
    linkTree(body, [app, overlay, notifications]);

    expect(getModalBackgroundTargets(overlay, body).map((element) => element.name)).toEqual([
      'app',
      'notifications'
    ]);
  });

  it('keeps nested background references inert until the last overlay closes', () => {
    const background = createInertableElement();
    const restoreOuter = applyModalBackgroundInert([background]);
    const restoreInner = applyModalBackgroundInert([background]);

    restoreInner();
    expect(background.getAttribute('aria-hidden')).toBe('true');
    expect(background.hasAttribute('inert')).toBe(true);

    restoreOuter();
    expect(background.hasAttribute('aria-hidden')).toBe(false);
    expect(background.hasAttribute('inert')).toBe(false);
  });
});
