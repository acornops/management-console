import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Select } from './Select';

const hooks = vi.hoisted(() => ({ values: [] as any[], index: 0 }));
vi.mock('react', async (original) => ({
  ...await original<typeof import('react')>(),
  useState: (initial: unknown) => {
    const index = hooks.index++;
    if (!(index in hooks.values)) hooks.values[index] = initial;
    return [hooks.values[index], (value: any) => { hooks.values[index] = typeof value === 'function' ? value(hooks.values[index]) : value; }];
  },
  useRef: () => ({ current: null }), useId: () => 'test-select',
  useEffect: () => undefined, useMemo: (callback: () => unknown) => callback(), useCallback: (callback: unknown) => callback
}));
function trigger() {
  hooks.index = 0;
  const tree = Select({ value: 'github', options: [{ value: 'github', label: 'GitHub' }], onChange: () => undefined }) as ReactElement<any>;
  return tree.props.children[0].props;
}
beforeEach(() => { hooks.values = []; });
describe('nested Select Escape ownership', () => {
  it('closes only an open menu and leaves its parent authoring dialog open', () => {
    trigger().onClick();
    expect(trigger()['aria-expanded']).toBe(true);
    let stopped = false;
    let parentOpen = true;
    trigger().onKeyDown({ key: 'Escape', preventDefault() {}, stopPropagation() { stopped = true; } });
    if (!stopped) parentOpen = false;
    expect(trigger()['aria-expanded']).toBe(false);
    expect(parentOpen).toBe(true);
  });
  it('leaves closed-menu Escape available to the parent dismissal guard', () => {
    let stopped = false;
    trigger().onKeyDown({ key: 'Escape', preventDefault() {}, stopPropagation() { stopped = true; } });
    expect(stopped).toBe(false);
  });
});
