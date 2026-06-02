import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../../../../../..');
const clusterSettingsView = readFileSync(
  resolve(root, 'src/features/kubernetes-cluster-detail/components/detail/views/ClusterSettingsView.tsx'),
  'utf8'
);

describe('cluster settings view structure', () => {
  it('keeps policy controls gated while read-only settings remain visible', () => {
    expect(clusterSettingsView).toContain('const canEditNamespaceScope = canManageCluster && Boolean(onEditNamespaceScope);');
    expect(clusterSettingsView).toContain('const canEditWriteConfirmations = canManageCluster && Boolean(onUpdateWriteConfirmationPolicy);');
    expect(clusterSettingsView).toContain('action={canEditNamespaceScope ? (');
    expect(clusterSettingsView).toContain('action={canEditWriteConfirmations ? (');
    expect(clusterSettingsView).toContain('cluster.writeConfirmationPolicy?.effectiveRequired ?? true');
    expect(clusterSettingsView).toContain("type WriteConfirmationPolicyValue = 'required' | 'not_required';");
    expect(clusterSettingsView).not.toContain("value: 'inherit'");
    expect(clusterSettingsView).not.toContain('writeConfirmationsInherit');
    expect(clusterSettingsView).toContain("void onUpdateWriteConfirmationPolicy?.(value === 'required');");
    expect(clusterSettingsView).toContain('break-words text-xs leading-5 text-ui-text-muted');
    expect(clusterSettingsView).toContain("label={t('clusterSettings.clusterName')}");
    expect(clusterSettingsView).toContain("label={t('clusterSettings.connectionState')}");
    expect(clusterSettingsView).toContain("label={t('clusterSettings.lastTelemetry')}");
  });
});
