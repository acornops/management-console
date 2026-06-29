import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../../..');
const virtualMachineResourcesView = readFileSync(
  resolve(root, 'src/pages/virtual-machines/VirtualMachineResourcesView.tsx'),
  'utf8'
);

describe('VirtualMachineResourcesView resource filters', () => {
  it('uses the shared compact category tabs instead of large description cards', () => {
    expect(virtualMachineResourcesView).toContain("import { ResourceCategoryTabs } from '@/components/common/ResourceCategoryTabs'");
    expect(virtualMachineResourcesView).toContain('<ResourceCategoryTabs<VmResourceCategory>');
    expect(virtualMachineResourcesView).toContain("labelPrefix=\"virtualMachines.resources.categories\"");
    expect(virtualMachineResourcesView).toContain('counts={counts}');
    expect(virtualMachineResourcesView).not.toContain('descriptionKey:');
    expect(virtualMachineResourcesView).not.toContain('min-h-[6.5rem]');
    expect(virtualMachineResourcesView).not.toContain('virtualMachines.resources.categoryDescriptions');
  });
});
