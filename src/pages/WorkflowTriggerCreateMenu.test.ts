import { describe, expect, it } from 'vitest';

import { getWorkflowTriggerCreateMenuFocusIndex } from './WorkflowTriggerCreateMenu';

describe('WorkflowTriggerCreateMenu', () => {
  it('wraps arrow navigation and supports Home and End', () => {
    expect(getWorkflowTriggerCreateMenuFocusIndex(0, 'ArrowDown')).toBe(1);
    expect(getWorkflowTriggerCreateMenuFocusIndex(2, 'ArrowDown')).toBe(0);
    expect(getWorkflowTriggerCreateMenuFocusIndex(0, 'ArrowUp')).toBe(2);
    expect(getWorkflowTriggerCreateMenuFocusIndex(1, 'Home')).toBe(0);
    expect(getWorkflowTriggerCreateMenuFocusIndex(1, 'End')).toBe(2);
  });
});
