import { describe, expect, it } from 'vitest';

import { shouldShowResourceCatalogStatus } from './TargetCatalogPrimitives';

describe('resource catalog status visibility', () => {
  it('omits routine success and keeps every exception tone visible', () => {
    expect(shouldShowResourceCatalogStatus('success')).toBe(false);
    expect(shouldShowResourceCatalogStatus('warning')).toBe(true);
    expect(shouldShowResourceCatalogStatus('danger')).toBe(true);
    expect(shouldShowResourceCatalogStatus('neutral')).toBe(true);
  });
});
