import { describe, expect, it } from 'vitest';
import { resourcePhaseForRequest, type ResourcePhase } from '@/hooks/resourceLifecycle';

describe('resource lifecycle', () => {
  it.each<[boolean, ResourcePhase]>([
    [false, 'loading'],
    [true, 'refreshing']
  ])('derives request phase for hasContent=%s', (hasContent, expected) => {
    expect(resourcePhaseForRequest(hasContent)).toBe(expected);
  });
});
