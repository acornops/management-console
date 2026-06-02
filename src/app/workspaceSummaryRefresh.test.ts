import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');

describe('workspace summary refreshes', () => {
  it('preserves loaded members during quota-only summary refreshes', () => {
    const clusterActions = readFileSync(resolve(root, 'src/app/useWorkspaceClusterActions.ts'), 'utf8');
    const virtualMachinesPage = readFileSync(resolve(root, 'src/pages/VirtualMachinesPage.tsx'), 'utf8');

    expect(clusterActions).toContain('members: _members');
    expect(virtualMachinesPage).toContain('members: _members');
  });
});
