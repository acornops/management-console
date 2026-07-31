import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { updateInstallCommandNamespaceScope } from './AddClusterModal';

const repositoryRoot = resolve(__dirname, '../../..');
const modalSource = readFileSync(resolve(repositoryRoot, 'src/components/kubernetes-clusters/AddClusterModal.tsx'), 'utf8');
const englishLocale = readFileSync(resolve(repositoryRoot, 'src/i18n/locales/en.js'), 'utf8');

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
    expect(command).not.toContain('config.watchNamespaces');
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

describe('cluster onboarding hierarchy', () => {
  it('uses progressive disclosure before choosing agent access', () => {
    expect(englishLocale).toContain("requireNamespaceScope: 'Require namespace scope?'");
    expect(englishLocale).toContain("requireRbacAdditions: 'Require additional Kubernetes resources?'");
    expect(englishLocale).toContain("rbacAdditionsHelp: 'Optionally enable additional resources for this cluster.'");
    expect(modalSource).toContain('aria-expanded={checked}');
    expect(modalSource).toContain("onIncludeNamespacesChange('')");
    expect(modalSource).toContain("onExcludeNamespacesChange('')");
    expect(modalSource).toContain('onSelectedRbacAdditionKeysChange([])');
    expect(modalSource.indexOf("t('clusterSetup.requireRbacAdditions')")).toBeLessThan(
      modalSource.indexOf('<ClusterAgentAccessModeSelector')
    );
  });
});
