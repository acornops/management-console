import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '..');
const readSource = (path: string) => readFileSync(resolve(root, path), 'utf8');
const readProductionSource = (directory: string): string => readdirSync(resolve(root, directory), { withFileTypes: true })
  .flatMap((entry) => {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) return [readProductionSource(path)];
    return /\.tsx?$/.test(entry.name) && !entry.name.includes('.test.') ? [readSource(path)] : [];
  })
  .join('\n');

describe('destructive delete flow contracts', () => {
  it('uses the shared warning callout for pre-delete guidance', () => {
    [
      readSource('packages/ui/src/DestructiveConfirmationDialog.tsx'),
      readSource('src/app/AppDialogs.tsx'),
      readSource('src/components/dashboard/Dashboard.tsx'),
      readSource('src/features/targets/TargetDeleteZone.tsx'),
      readSource('src/pages/virtual-machines/VirtualMachinesListView.tsx'),
      readSource('src/pages/WorkspaceWorkflowsPage.components.tsx')
    ].forEach((source) => {
      expect(source).toContain('InlineAlert tone="warning"');
    });
  });

  it('routes simple destructive confirmations through the shared dialog', () => {
    [
      readSource('src/features/external-integrations/ExternalIntegrationSettingsPanel.tsx'),
      readSource('src/pages/WorkspaceAgentDetailPanel.tsx'),
      readSource('src/pages/workspace-members/WorkspaceMemberDetailsPanel.tsx'),
      readSource('src/pages/WorkspaceAiSettingsPage.tsx'),
      readSource('src/pages/WorkspaceCatalogSources.tsx'),
      readSource('src/features/targets/admin/McpServersDialogs.tsx'),
      readSource('src/features/targets/admin/TargetInsightsResetDialog.tsx'),
      readSource('src/features/targets/admin/TargetSkillsView.tsx'),
      readSource('src/features/targets/chat/components/DeleteConversationDialog.tsx')
    ].forEach((source) => {
      expect(source).toContain('DestructiveConfirmationDialog');
    });
  });

  it('does not use native or danger-styled inline destructive confirmation', () => {
    const productionSource = readProductionSource('src');

    expect(productionSource).not.toContain('window.confirm(');
    expect(productionSource).not.toContain('confirmVariant="danger"');
  });

  it('preserves exact resource-name casing in typed confirmations', () => {
    [
      readSource('src/app/AppDialogs.tsx'),
      readSource('src/components/dashboard/Dashboard.tsx'),
      readSource('src/features/targets/TargetDeleteZone.tsx'),
      readSource('src/pages/virtual-machines/VirtualMachinesListView.tsx')
    ].forEach((source) => {
      expect(source).toContain('name: <span className="normal-case type-emphasis text-status-danger-text" />');
    });

    expect(readSource('src/pages/WorkspaceWorkflowsPage.components.tsx')).toContain(
      'Type <span className="normal-case type-emphasis text-status-danger-text">{workflowToDelete.name}</span> to confirm'
    );
  });

  it('reactively excludes deleted clusters from stale loaded catalog pages', () => {
    const source = readSource('src/pages/KubernetesClustersPage.tsx');

    expect(source).toContain('const [deletedClusterIds, setDeletedClusterIds] = useState<ReadonlySet<string>>(() => new Set());');
    expect(source).toContain('setDeletedClusterIds((current) => new Set(current).add(cluster.id));');
    expect(source).toContain('[clusterCollection.items, deletedClusterIds]');
    expect(source).not.toContain('deletedClusterIdsRef');
  });
});
