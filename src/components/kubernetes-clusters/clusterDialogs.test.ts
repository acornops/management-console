import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../../..');
const addClusterModal = readFileSync(resolve(root, 'src/components/kubernetes-clusters/AddClusterModal.tsx'), 'utf8');
const installAgentModal = readFileSync(resolve(root, 'src/components/kubernetes-clusters/ClusterAgentInstallModal.tsx'), 'utf8');
const namespaceScopeDialog = readFileSync(
  resolve(root, 'src/features/kubernetes-cluster-detail/components/detail/views/NamespaceScopeDialog.tsx'),
  'utf8'
);

describe('cluster dialog accessibility contracts', () => {
  it('uses the shared dialog shell for the connect-cluster flow', () => {
    expect(addClusterModal).toContain("import { Dialog } from '@/components/common/Dialog'");
    expect(addClusterModal).toContain('titleId="add-cluster-title"');
    expect(addClusterModal).toContain('initialFocusRef={clusterNameInputRef}');
    expect(addClusterModal).toContain('htmlFor="add-cluster-name-input"');
    expect(addClusterModal).toContain('id="add-cluster-name-input"');
    expect(addClusterModal).toContain("aria-label={t('clusterSetup.closeAddDialog')}");
  });

  it('uses the shared dialog shell for the install-agent flow', () => {
    expect(installAgentModal).toContain("import { Dialog } from '@/components/common/Dialog'");
    expect(installAgentModal).toContain('titleId="install-agent-title"');
    expect(installAgentModal).toContain('initialFocusRef={generateCommandButtonRef}');
    expect(installAgentModal).toContain('id="install-agent-title"');
    expect(installAgentModal).toContain("aria-label={t('clusterSetup.closeInstallAgentDialog')}");
  });

  it('uses the shared dialog shell and labelled token controls for namespace scope', () => {
    expect(namespaceScopeDialog).toContain("import { Dialog } from '@/components/common/Dialog'");
    expect(namespaceScopeDialog).toContain('titleId="namespace-scope-title"');
    expect(namespaceScopeDialog).not.toContain('initialFocusRef={includeInputRef}');
    expect(namespaceScopeDialog).toContain('htmlFor="namespace-scope-include-input"');
    expect(namespaceScopeDialog).toContain('id="namespace-scope-include-input"');
    expect(namespaceScopeDialog).toContain('htmlFor="namespace-scope-exclude-input"');
    expect(namespaceScopeDialog).toContain('id="namespace-scope-exclude-input"');
    expect(namespaceScopeDialog).toContain("aria-label={t('clusterSetup.closeNamespaceScopeDialog')}");
  });
});
