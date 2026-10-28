import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { waitForRunTerminalState } from './runMonitoring';
import { ControlPlaneRequestError } from './http';
const { delay } = vi.hoisted(() => ({ delay: vi.fn() }));
vi.mock('./http', async (original) => ({ ...await original<typeof import('./http')>(), delay }));
const getRun = vi.fn();
beforeEach(() => { vi.clearAllMocks(); getRun.mockReset(); });
afterEach(() => { vi.restoreAllMocks(); });
describe('run monitoring', () => {
  it('keeps polling the same run through transient rollout failures', async () => {
    const spy = getRun
      .mockRejectedValueOnce(new ControlPlaneRequestError('draining', 503, 'SERVICE_DRAINING'))
      .mockRejectedValueOnce(new TypeError('connection closed'))
      .mockResolvedValueOnce({ id: 'run-1', status: 'running' } as never)
      .mockResolvedValueOnce({ id: 'run-1', status: 'completed' } as never);

    await expect(waitForRunTerminalState('run-1', getRun, { timeoutMs: 1000, pollIntervalMs: 10 }))
      .resolves.toEqual({ id: 'run-1', status: 'completed' });
    expect(spy.mock.calls).toEqual([['run-1'], ['run-1'], ['run-1'], ['run-1']]);
    expect(delay.mock.calls.map(([ms]) => ms)).toEqual([10, 20, 10]);
  });

  it.each([401, 403, 404])('does not retry a permanent run polling failure (%s)', async (status) => {
    const error = new ControlPlaneRequestError('denied', status);
    const spy = getRun.mockRejectedValue(error);

    await expect(waitForRunTerminalState('run-1', getRun)).rejects.toBe(error);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(delay).not.toHaveBeenCalled();
  });

  it('bounds monitoring during a persistent outage without claiming that the run failed', async () => {
    getRun.mockRejectedValue(new TypeError('connection closed'));
    vi.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValueOnce(5).mockReturnValueOnce(11);

    await expect(waitForRunTerminalState('run-2', getRun, { timeoutMs: 10, pollIntervalMs: 1 }))
      .rejects.toMatchObject({ name: 'RunMonitoringTimeoutError' });
  });

});
