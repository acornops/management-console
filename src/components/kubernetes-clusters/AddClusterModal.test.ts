import { describe, expect, it } from 'vitest';

import { updateInstallCommandNamespaceScope } from './AddClusterModal';

const baseCommand = [
  "helm upgrade --install 'acornops-agent' 'oci://ghcr.io/acornops/charts/acornops-agentk'",
  "  --namespace 'acornops'",
  '  --create-namespace',
  "  --set-string clusterName='payments-prod'",
  "  --set-string config.platformUrl='https://api.acornops.dev'",
  "  --set-string config.clusterId='cluster-1'",
  "  --set-string config.agentKey='agent-key'",
  "  --set-json namespaceScope.include='[]'",
  "  --set-json namespaceScope.exclude='[]'"
].join(' \\\n');

describe('updateInstallCommandNamespaceScope', () => {
  it('updates namespace scope without changing command ownership fields', () => {
    const command = updateInstallCommandNamespaceScope(baseCommand, 'payments, shared', 'sandbox');

    expect(command).toContain("--set-json namespaceScope.include='[\"payments\",\"shared\"]'");
    expect(command).toContain("--set-json namespaceScope.exclude='[\"sandbox\"]'");
    expect(command).toContain("--set-string config.watchNamespaces='payments,shared'");
  });

  it('preserves write RBAC returned by the control plane', () => {
    const command = updateInstallCommandNamespaceScope(
      `${baseCommand} \\\n  --set rbac.write.enabled=true`,
      '',
      ''
    );

    expect(command).toContain('rbac.write.enabled=true');
  });
});
