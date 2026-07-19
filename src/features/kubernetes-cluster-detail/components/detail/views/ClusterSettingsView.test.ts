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
    expect(clusterSettingsView).toContain('const canEditClusterName = canManageCluster && Boolean(onUpdateName);');
    expect(clusterSettingsView).toContain("const canReinstallAgent = agentConnectionState === 'disconnected' && canManageAgentKeys && Boolean(onReinstallAgent);");
    expect(clusterSettingsView).toContain('action={canEditNamespaceScope ? (');
    expect(clusterSettingsView).toContain('action={canEditWriteConfirmations ? (');
    expect(clusterSettingsView).toContain('data-cluster-settings-action="edit-name"');
    expect(clusterSettingsView).toContain('data-cluster-settings-action="save-name"');
    expect(clusterSettingsView).toContain('data-cluster-settings-name-editor="true"');
    expect(clusterSettingsView).toContain('data-cluster-settings-action="reinstall-agent"');
    expect(clusterSettingsView).toContain('await onUpdateName?.(trimmedDraftName);');
    expect(clusterSettingsView).toContain("event.key === 'Enter'");
    expect(clusterSettingsView).toContain("event.key === 'Escape'");
    expect(clusterSettingsView).toContain('cancelClusterNameEdit');
    expect(clusterSettingsView).toContain('clusterNameInputRef.current?.focus();');
    expect(clusterSettingsView).toContain('clusterNameInputRef.current?.select();');
    expect(clusterSettingsView).toContain("t('clusterSettings.clusterNameRequired')");
    expect(clusterSettingsView).toContain('aria-invalid={Boolean(clusterNameValidationError)}');
    expect(clusterSettingsView).toContain('cluster.writeConfirmationPolicy?.effectiveRequired ?? true');
    expect(clusterSettingsView).toContain("type WriteConfirmationPolicyValue = 'required' | 'not_required';");
    expect(clusterSettingsView).not.toContain("value: 'inherit'");
    expect(clusterSettingsView).not.toContain('writeConfirmationsInherit');
    expect(clusterSettingsView).toContain("void onUpdateWriteConfirmationPolicy?.(value === 'required');");
    expect(clusterSettingsView).toContain('break-words text-xs leading-5 text-ui-text-muted');
    expect(clusterSettingsView).toContain("label={t('clusterSettings.clusterName')}");
    expect(clusterSettingsView).toContain("label={t('clusterSettings.connectionState')}");
    expect(clusterSettingsView).toContain("label={t('clusterSettings.lastTelemetry')}");
    expect(clusterSettingsView).toContain('canManageCluster && onDeleteCluster');
    expect(clusterSettingsView).toContain('<TargetDeleteZone');
    expect(clusterSettingsView).toContain('confirmationI18nKey="dashboard.deleteClusterConfirmationLabel"');
    expect(clusterSettingsView).toContain('onDelete={onDeleteCluster}');
  });
});
