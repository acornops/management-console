import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearSessionDataCache,
  deleteSessionDataCachePrefix,
  hasSessionDataCacheValue,
  readSessionDataCache,
  setSessionDataCacheOwner,
  writeSessionDataCache
} from '@/hooks/sessionDataCache';

describe('session data cache', () => {
  beforeEach(() => {
    setSessionDataCacheOwner(null);
    clearSessionDataCache();
  });

  it('retains values for the active authenticated session', () => {
    setSessionDataCacheOwner('user-1');
    writeSessionDataCache('workspace:1:agents', [{ id: 'agent-1' }]);

    expect(hasSessionDataCacheValue('workspace:1:agents')).toBe(true);
    expect(readSessionDataCache<Array<{ id: string }>>('workspace:1:agents')?.value).toEqual([{ id: 'agent-1' }]);
  });

  it('clears all values when the authenticated owner changes', () => {
    setSessionDataCacheOwner('user-1');
    writeSessionDataCache('workspace:1:agents', [{ id: 'agent-1' }]);

    setSessionDataCacheOwner('user-2');

    expect(readSessionDataCache('workspace:1:agents')).toBeUndefined();
  });

  it('invalidates related resource families without affecting peers', () => {
    writeSessionDataCache('workspace:1:agents', ['agent']);
    writeSessionDataCache('workspace:1:workflows', ['workflow']);
    writeSessionDataCache('workspace:2:agents', ['other-agent']);

    deleteSessionDataCachePrefix('workspace:1:');

    expect(readSessionDataCache('workspace:1:agents')).toBeUndefined();
    expect(readSessionDataCache('workspace:1:workflows')).toBeUndefined();
    expect(readSessionDataCache('workspace:2:agents')?.value).toEqual(['other-agent']);
  });
});
