import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppSupport } from './useAppSupport';

const state = vi.hoisted(() => ({ values: [] as any[], index: 0 }));
vi.mock('react', async (original) => ({
  ...await original<typeof import('react')>(),
  useState: (initial: unknown) => {
    const index = state.index++;
    if (!(index in state.values)) state.values[index] = initial;
    return [state.values[index], (value: any) => { state.values[index] = typeof value === 'function' ? value(state.values[index]) : value; }];
  },
  useEffect: () => undefined,
  useCallback: (callback: unknown) => callback
}));
const args = { route: { kind: 'workspaces' }, workspaces: [], t: (key: string) => key } as unknown as Parameters<typeof useAppSupport>[0];
function render() { state.index = 0; return useAppSupport(args); }
beforeEach(() => { state.values = []; vi.useFakeTimers(); vi.stubGlobal('window', globalThis); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
describe('application toast lifecycle', () => {
  it('keeps legacy feedback neutral and carries an explicit error until ordinary expiry', () => {
    const support = render();
    support.showToast('Legacy notice');
    support.showToast('Unable to load', { tone: 'error' });
    expect(render().toasts.map(({ message, tone }) => ({ message, tone }))).toEqual([
      { message: 'Legacy notice', tone: undefined }, { message: 'Unable to load', tone: 'error' }
    ]);
    vi.advanceTimersByTime(3800);
    expect(render().toasts).toEqual([]);
  });
  it('dismisses only the requested notification', () => {
    render().showToast('First'); render().showToast('Second');
    render().dismissToast(render().toasts[0].id);
    expect(render().toasts.map(({ message }) => message)).toEqual(['Second']);
  });
});
