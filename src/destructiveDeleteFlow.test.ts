import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '..');
const readSource = (path: string) => readFileSync(resolve(root, path), 'utf8');

describe('destructive delete flow contracts', () => {
  it('uses the shared warning callout for pre-delete guidance', () => {
    [
      readSource('packages/ui/src/DestructiveConfirmationDialog.tsx'),
      readSource('src/app/AppDialogs.tsx'),
      readSource('src/components/dashboard/Dashboard.tsx'),
      readSource('src/features/targets/TargetDeleteZone.tsx'),
      readSource('src/features/targets/chat/components/DeleteConversationDialog.tsx'),
      readSource('src/pages/virtual-machines/VirtualMachinesListView.tsx'),
      readSource('src/pages/WorkspaceWorkflowsPage.components.tsx')
    ].forEach((source) => {
      expect(source).toContain('InlineAlert tone="warning"');
    });
  });

  it('keeps inline destructive consequences warning and confirmation actions dangerous', () => {
    [
      readSource('src/features/external-integrations/ExternalIntegrationSettingsPanel.tsx'),
      readSource('src/pages/agents/AgentCapabilitiesPanel.tsx'),
      readSource('src/pages/agents/AgentSkillsPanel.tsx'),
      readSource('src/pages/WorkspaceAgentDetailPanel.tsx'),
      readSource('src/pages/workspace-members/WorkspaceMemberDetailsPanel.tsx')
    ].forEach((source) => {
      expect(source).toContain('tone="warning"');
      expect(source).toContain('confirmVariant="danger"');
    });
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
  });

  it('reactively excludes deleted clusters from stale loaded catalog pages', () => {
    const source = readSource('src/pages/KubernetesClustersPage.tsx');

    expect(source).toContain('const [deletedClusterIds, setDeletedClusterIds] = useState<ReadonlySet<string>>(() => new Set());');
    expect(source).toContain('setDeletedClusterIds((current) => new Set(current).add(cluster.id));');
    expect(source).toContain('[clusterCollection.items, deletedClusterIds]');
    expect(source).not.toContain('deletedClusterIdsRef');
  });
});
