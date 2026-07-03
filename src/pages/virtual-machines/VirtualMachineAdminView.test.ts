import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../../..');

describe('VirtualMachineAdminView wiring', () => {
  const source = readFileSync(resolve(root, 'src/pages/virtual-machines/VirtualMachineAdminView.tsx'), 'utf8');

  it('passes a VM target descriptor to shared admin views', () => {
    expect(source).toContain("import { toVirtualMachineTargetDescriptor }");
    expect(source).toContain('const target = toVirtualMachineTargetDescriptor');
    expect(source).toContain('<TargetSkillsView');
    expect(source).toContain('target={target}');
    expect(source).toContain('<TargetToolsView');
    expect(source).toContain('<McpServersView');
  });

  it('does not depend on Kubernetes cluster shims', () => {
    expect(source).not.toContain('toClusterShim');
    expect(source).not.toContain('virtualMachineClusterShim');
    expect(source).not.toContain('KubernetesCluster');
    expect(source).not.toContain('targetContext');
  });
});
