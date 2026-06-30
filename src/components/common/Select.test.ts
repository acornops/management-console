import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { getBoundaryEnabledOptionIndex, getNextEnabledOptionIndex, SelectOption } from './Select';

const root = resolve(__dirname, '../../..');
const selectSource = readFileSync(resolve(root, 'src/components/common/Select.tsx'), 'utf8');

const options: Array<SelectOption<string>> = [
  { value: 'viewer', label: 'Viewer' },
  { value: 'operator', label: 'Operator' },
  { value: 'admin', label: 'Admin' },
  { value: 'owner', label: 'Owner', disabled: true }
];

describe('Select keyboard navigation helpers', () => {
  it('moves to the next enabled option and wraps past disabled options', () => {
    expect(getNextEnabledOptionIndex(options, 0, 1)).toBe(1);
    expect(getNextEnabledOptionIndex(options, 2, 1)).toBe(0);
  });

  it('moves to the previous enabled option and skips disabled options', () => {
    expect(getNextEnabledOptionIndex(options, 2, -1)).toBe(1);
    expect(getNextEnabledOptionIndex(options, 0, -1)).toBe(2);
  });

  it('finds first and last enabled options for Home and End', () => {
    expect(getBoundaryEnabledOptionIndex(options, 'first')).toBe(0);
    expect(getBoundaryEnabledOptionIndex(options, 'last')).toBe(2);
  });

  it('returns -1 when every option is disabled', () => {
    const disabledOptions: Array<SelectOption<string>> = [
      { value: 'owner', label: 'Owner', disabled: true }
    ];

    expect(getNextEnabledOptionIndex(disabledOptions, 0, 1)).toBe(-1);
    expect(getBoundaryEnabledOptionIndex(disabledOptions, 'first')).toBe(-1);
    expect(getBoundaryEnabledOptionIndex(disabledOptions, 'last')).toBe(-1);
  });
});

describe('Select source contracts', () => {
  it('listens for outside pointer events in capture phase so dialogs cannot swallow dismissal clicks', () => {
    expect(selectSource).toContain("document.addEventListener('mousedown', handlePointerDown, true);");
    expect(selectSource).toContain("document.removeEventListener('mousedown', handlePointerDown, true);");
  });
});
