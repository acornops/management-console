import { afterEach, describe, expect, it, vi } from 'vitest';

import { mapResourceSignals } from './resourceSignals';

describe('mapResourceSignals', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('maps unhealthy snapshot resources into alerts with appropriate severities', () => {
    const alerts = mapResourceSignals(
      {
        pods: [
          {
            name: 'api',
            namespace: 'default',
            phase: 'Running',
            restartCount: 1,
            containerStatuses: [
              {
                name: 'api',
                restartCount: 3,
                state: {
                  waiting: {
                    reason: 'CrashLoopBackOff'
                  }
                }
              }
            ]
          },
          {
            name: 'worker',
            phase: 'Pending'
          }
        ],
        nodes: [
          {
            name: 'node-a',
            status: {
              conditions: [{ type: 'Ready', status: 'False' }]
            }
          },
          {
            name: 'node-b'
          }
        ],
        pvcs: [
          {
            name: 'cache-data',
            namespace: 'data',
            status: 'Lost'
          },
          {
            name: 'scratch',
            status: 'Pending'
          }
        ],
        jobs: [
          {
            name: 'nightly-backup',
            namespace: 'ops',
            failed: 2
          }
        ]
      },
      '2026-05-25T00:00:00.000Z'
    );

    expect(alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'snapshot-pod-default-api',
          severity: 'critical',
          message: 'Latest snapshot reports pod api in namespace default as CrashLoopBackOff. Restart count: 3.',
          reason: 'CrashLoopBackOff',
          objectKind: 'Pod'
        }),
        expect.objectContaining({
          id: 'snapshot-pod-default-worker',
          severity: 'warning',
          reason: 'Pending'
        }),
        expect.objectContaining({
          id: 'snapshot-node-node-a',
          severity: 'critical',
          reason: 'NotReady'
        }),
        expect.objectContaining({
          id: 'snapshot-node-node-b',
          severity: 'warning',
          reason: 'Unknown'
        }),
        expect.objectContaining({
          id: 'snapshot-pvc-data-cache-data',
          severity: 'critical',
          objectKind: 'PersistentVolumeClaim',
          reason: 'Lost'
        }),
        expect.objectContaining({
          id: 'snapshot-pvc-default-scratch',
          severity: 'warning',
          reason: 'Pending'
        }),
        expect.objectContaining({
          id: 'snapshot-job-ops-nightly-backup',
          severity: 'critical',
          reason: 'Failed'
        })
      ])
    );
  });

  it('falls back to Date.now when a snapshot timestamp cannot be parsed', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);

    const [alert] = mapResourceSignals(
      {
        pods: [
          {
            name: 'api',
            phase: 'Failed'
          }
        ]
      },
      'bad-timestamp'
    );

    expect(alert.timestamp).toBe(1_700_000_000_000);
  });
});
