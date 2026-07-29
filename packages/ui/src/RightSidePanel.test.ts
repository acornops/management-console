import { describe, expect, it } from 'vitest';

import { applyRightSidePanelBackgroundInert, getRightSidePanelBackgroundTargets } from './RightSidePanel';

function createInertableElement(initialAttributes: Record<string, string> = {}) {
  const attributes = new Map(Object.entries(initialAttributes));

  return {
    attributes,
    getAttribute(name: string) {
      return attributes.get(name) ?? null;
    },
    hasAttribute(name: string) {
      return attributes.has(name);
    },
    removeAttribute(name: string) {
      attributes.delete(name);
    },
    setAttribute(name: string, value: string) {
      attributes.set(name, value);
    }
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

describe('RightSidePanel background inerting', () => {
  it('collects background siblings across the panel ancestor branch', () => {
    const body = createTreeElement('body');
    const root = createTreeElement('root');
    const appChrome = createTreeElement('appChrome');
    const page = createTreeElement('page');
    const header = createTreeElement('header');
    const fallbackNotice = createTreeElement('fallbackNotice');
    const drawerHost = createTreeElement('drawerHost');
    const drawerContainer = createTreeElement('drawerContainer');
    const workflowDetail = createTreeElement('workflowDetail');

    linkTree(body, [root]);
    linkTree(root, [appChrome, page]);
    linkTree(page, [header, fallbackNotice, drawerHost, workflowDetail]);
    linkTree(drawerHost, [drawerContainer]);

    expect(getRightSidePanelBackgroundTargets(drawerContainer, body).map((element) => element.name)).toEqual([
      'header',
      'fallbackNotice',
      'workflowDetail',
      'appChrome'
    ]);
  });

  it('hides background targets while the panel is open and restores their previous state', () => {
    const visibleBackground = createInertableElement();
    const alreadyHiddenBackground = createInertableElement({ 'aria-hidden': 'true' });
    const alreadyInertBackground = createInertableElement({ inert: 'until-ready' });

    const restore = applyRightSidePanelBackgroundInert([
      visibleBackground,
      alreadyHiddenBackground,
      alreadyInertBackground
    ]);

    expect(visibleBackground.getAttribute('aria-hidden')).toBe('true');
    expect(visibleBackground.hasAttribute('inert')).toBe(true);
    expect(alreadyHiddenBackground.getAttribute('aria-hidden')).toBe('true');
    expect(alreadyInertBackground.hasAttribute('inert')).toBe(true);

    restore();

    expect(visibleBackground.hasAttribute('aria-hidden')).toBe(false);
    expect(visibleBackground.hasAttribute('inert')).toBe(false);
    expect(alreadyHiddenBackground.getAttribute('aria-hidden')).toBe('true');
    expect(alreadyInertBackground.getAttribute('inert')).toBe('until-ready');
  });

  it('keeps background targets hidden until every overlapping panel scope closes', () => {
    const visibleBackground = createInertableElement();

    const restoreFirstPanel = applyRightSidePanelBackgroundInert([visibleBackground]);
    const restoreSecondPanel = applyRightSidePanelBackgroundInert([visibleBackground]);

    restoreFirstPanel();

    expect(visibleBackground.getAttribute('aria-hidden')).toBe('true');
    expect(visibleBackground.hasAttribute('inert')).toBe(true);

    restoreSecondPanel();

    expect(visibleBackground.hasAttribute('aria-hidden')).toBe(false);
    expect(visibleBackground.hasAttribute('inert')).toBe(false);
  });
});
