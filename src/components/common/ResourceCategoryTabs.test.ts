import { describe, expect, it } from 'vitest';

import { getResourceCategoryTabModel } from './ResourceCategoryTabs';

describe('ResourceCategoryTabs', () => {
  it('builds translated tabs with counts, active state, and aria-pressed values', () => {
    const tabs = getResourceCategoryTabModel({
      categories: ['all', 'services', 'logs'] as const,
      active: 'services',
      counts: {
        all: 12,
        services: 5,
        logs: 2
      },
      labelPrefix: 'virtualMachines.resources.categories',
      translate: (key) => `translated:${key}`
    });

    expect(tabs).toEqual([
      {
        value: 'all',
        label: 'translated:virtualMachines.resources.categories.all',
        count: 12,
        isActive: false,
        ariaPressed: false
      },
      {
        value: 'services',
        label: 'translated:virtualMachines.resources.categories.services',
        count: 5,
        isActive: true,
        ariaPressed: true
      },
      {
        value: 'logs',
        label: 'translated:virtualMachines.resources.categories.logs',
        count: 2,
        isActive: false,
        ariaPressed: false
      }
    ]);
  });
});
