import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../../..');
const virtualMachineResourcesView = readFileSync(
  resolve(root, 'src/pages/virtual-machines/VirtualMachineResourcesView.tsx'),
  'utf8'
);

describe('VirtualMachineResourcesView resource filters', () => {
  it('uses shared tabs and a resource search bar instead of large description cards', () => {
    expect(virtualMachineResourcesView).toContain("import { ResourceCategoryTabs } from '@/components/common/ResourceCategoryTabs'");
    expect(virtualMachineResourcesView).toContain('<ResourceCategoryTabs<VmResourceCategory>');
    expect(virtualMachineResourcesView).toContain("labelPrefix=\"virtualMachines.resources.categories\"");
    expect(virtualMachineResourcesView).toContain('counts={counts}');
    expect(virtualMachineResourcesView).not.toContain('attentionCounts=');
    expect(virtualMachineResourcesView).toContain('data-vm-resource-search-filter-bar="true"');
    expect(virtualMachineResourcesView).toContain('id="vm-resource-search"');
    expect(virtualMachineResourcesView).toContain('matchesSearch(resourceSearchTerm');
    expect(virtualMachineResourcesView).toContain('sortInventoryAttentionFirst');
    expect(virtualMachineResourcesView).toContain("t('virtualMachines.resources.logTime')");
    expect(virtualMachineResourcesView).toContain("t('virtualMachines.resources.logSource')");
    expect(virtualMachineResourcesView).toContain("t('virtualMachines.resources.logMessage')");
    expect(virtualMachineResourcesView).toContain('filteredLogs.map');
    expect(virtualMachineResourcesView).toContain('min-h-[14rem]');
    expect(virtualMachineResourcesView).toContain('<h2 className="mt-3 truncate text-sm font-bold text-ui-text">');
    expect(virtualMachineResourcesView).not.toContain('<h3 className="mt-3 truncate text-sm font-bold text-ui-text">');
    expect(virtualMachineResourcesView).not.toContain('descriptionKey:');
    expect(virtualMachineResourcesView).not.toContain('min-h-[6.5rem]');
    expect(virtualMachineResourcesView).not.toContain('virtualMachines.resources.categoryDescriptions');
    expect(virtualMachineResourcesView).not.toContain('serviceCount');
  });
});
