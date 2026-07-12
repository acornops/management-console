import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { getResourceCategoryTabModel } from './ResourceCategoryTabs';

const resourceCategoryTabsSource = readFileSync(resolve(__dirname, 'ResourceCategoryTabs.tsx'), 'utf8');

describe('ResourceCategoryTabs', () => {
  it('builds translated tabs with counts and active tab state', () => {
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
        isActive: false
      },
      {
        value: 'services',
        label: 'translated:virtualMachines.resources.categories.services',
        count: 5,
        isActive: true
      },
      {
        value: 'logs',
        label: 'translated:virtualMachines.resources.categories.logs',
        count: 2,
        isActive: false
      }
    ]);
  });

  it('keeps tabs compact without a reserved issue badge slot', () => {
    expect(resourceCategoryTabsSource).not.toContain('attentionCounts');
    expect(resourceCategoryTabsSource).not.toContain('reservesAttentionSlot');
    expect(resourceCategoryTabsSource).not.toContain('min-w-[4.5rem]');
    expect(resourceCategoryTabsSource).not.toContain("t('resources.families.issueCount'");
  });

  it('supports keyboard navigation for tab semantics', () => {
    expect(resourceCategoryTabsSource).toContain('const handleTabKeyDown =');
    expect(resourceCategoryTabsSource).toContain("event.key === 'ArrowRight'");
    expect(resourceCategoryTabsSource).toContain("event.key === 'ArrowLeft'");
    expect(resourceCategoryTabsSource).toContain("event.key === 'Home'");
    expect(resourceCategoryTabsSource).toContain("event.key === 'End'");
    expect(resourceCategoryTabsSource).toContain('tabIndex={tab.isActive ? 0 : -1}');
    expect(resourceCategoryTabsSource).toContain('onKeyDown={(event) => handleTabKeyDown(event, index)}');
    expect(resourceCategoryTabsSource).toContain('<LayoutGroup id={layoutGroupId}>');
    expect(resourceCategoryTabsSource).toContain('{tab.isActive && <ActiveTabIndicator />}');
  });
});
