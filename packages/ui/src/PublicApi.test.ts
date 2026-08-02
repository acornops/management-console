import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  buttonClassName,
  closeButtonClassName,
  filterToggleButtonClassName,
  FileInput,
  formInputClassName,
  formTextareaClassName,
  getFilterToggleModel,
  getSegmentedTabModel,
  segmentedTabButtonClassName,
  textInputClassName,
  textareaClassName
} from '@acornops/ui';

const packageRoot = resolve(__dirname, '..');

describe('@acornops/ui public API', () => {
  it('composes close and text controls from canonical package styles', () => {
    expect(closeButtonClassName()).toBe(
      buttonClassName({ variant: 'icon', size: 'icon' })
    );
    expect(buttonClassName({ variant: 'tertiary', size: 'inline' })).toContain(
      'sm:min-h-8'
    );
    expect(textInputClassName()).toBe(formInputClassName());
    expect(textareaClassName()).toBe(formTextareaClassName());
    expect(textareaClassName('min-h-36')).toContain('min-h-36');
    expect(FileInput.displayName).toBe('FileInput');
  });

  it('builds accessible tab and filter state models', () => {
    const tabs = getSegmentedTabModel({
      items: [
        { value: 'overview', label: 'Overview', count: 2 },
        { value: 'runs', label: 'Runs' }
      ],
      activeValue: 'runs'
    });
    const filters = getFilterToggleModel({
      items: [
        { value: 'all', label: 'All', count: 4 },
        { value: 'blocked', label: 'Blocked' }
      ],
      activeValue: 'blocked'
    });

    expect(tabs[1]).toMatchObject({
      isActive: true,
      ariaSelected: true
    });
    expect(filters[1]).toMatchObject({
      isActive: true,
      ariaPressed: true
    });
    expect(segmentedTabButtonClassName({ isActive: true })).toContain(
      'border-transparent'
    );
    expect(segmentedTabButtonClassName({ isActive: true })).toContain(
      'text-ui-text'
    );
    expect(segmentedTabButtonClassName({ isActive: true })).not.toContain(
      'text-accent-readable'
    );
    const compactTabClassName = segmentedTabButtonClassName({ isActive: true, labelSize: 'compact' });
    expect(compactTabClassName).toContain('type-compact-ui');
    expect(compactTabClassName).toContain('min-h-11');
    expect(compactTabClassName).not.toContain('type-ui');
    expect(filterToggleButtonClassName({ isActive: true })).toContain(
      'bg-ui-surface'
    );
  });

  it('publishes named modules without a catch-all vocabulary', () => {
    const index = readFileSync(
      resolve(packageRoot, 'src/index.ts'),
      'utf8'
    );
    const packageJson = JSON.parse(
      readFileSync(resolve(packageRoot, 'package.json'), 'utf8')
    ) as { exports: Record<string, unknown> };

    expect(index).toContain("export * from './CloseButton';");
    expect(index).toContain("export * from './CompactControls';");
    expect(index).toContain("export * from './TextInput';");
    expect(index).toContain("export * from './DateTimePicker';");
    expect(index).toContain("export * from './FileInput';");
    expect(index).not.toContain('ComponentVocabulary');
    expect(packageJson.exports).toHaveProperty('.');
    expect(packageJson.exports).toHaveProperty('./tokens.css');
    expect(packageJson.exports).toHaveProperty('./fonts');
    expect(packageJson.exports).toHaveProperty('./tailwind-preset');
  });
});
