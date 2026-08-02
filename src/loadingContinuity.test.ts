import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '..');
const readSource = (path: string) => readFileSync(resolve(root, path), 'utf8');

describe('initial collection loading continuity', () => {
  it('does not present unresolved catalog totals as zero', () => {
    const surfaces = [
      ['src/pages/WorkspaceAgentsCatalog.tsx', 'loading ? undefined'],
      ['src/pages/KubernetesClustersPage.tsx', 'catalogPending ? undefined'],
      ['src/pages/virtual-machines/VirtualMachinesListView.tsx', 'catalogPending ? undefined'],
      ['src/pages/WorkspaceWebhooksPage.tsx', 'webhooksPending ? undefined'],
      ['src/pages/WorkspaceIncomingWebhooksPage.tsx', 'triggersPending ? undefined'],
      ['src/pages/WorkspaceSchedulesPage.tsx', 'schedulesPending ? undefined']
    ] as const;

    for (const [path, pendingCountGuard] of surfaces) {
      expect(readSource(path), path).toContain(pendingCountGuard);
    }
  });

  it('uses loading labels instead of transient zero summaries and badges', () => {
    expect(readSource('src/pages/WorkspaceAuditLogPage.tsx')).toContain(
      "isInitialAuditLoading ? t('auditLog.loading')"
    );
    expect(readSource('src/pages/WorkspaceMembersPage.tsx')).toContain(
      "membersPending\n    ? t('members.loadingMembers')"
    );
    expect(readSource('src/pages/workspace-members/WorkspaceInvitationsPanel.tsx')).toContain(
      "invitationsPending ? t('members.loadingInvitations')"
    );
    expect(readSource('src/pages/WorkspaceActivityPage.tsx')).toContain(
      "phase === 'loading' && items.length === 0"
    );
    expect(readSource('src/pages/WorkspaceOverviewPage.tsx')).toContain(
      'state?.isLoading && cards.length === 0'
    );
  });

  it('keeps capability, embedded-table, and resource collections structurally loaded', () => {
    for (const path of [
      'src/features/targets/admin/TargetToolsView.tsx',
      'src/features/targets/admin/TargetSkillsView.tsx'
    ]) {
      expect(readSource(path), path).toContain('<TargetCapabilityInventoryLoading');
    }

    expect(readSource('src/features/targets/admin/McpServersView.tsx')).toContain('<McpServersCatalogLoading');

    expect(readSource('src/features/targets/admin/McpServerToolsDialog.tsx')).toContain('<CollectionLoadingSkeleton');
    expect(readSource('src/pages/WorkspaceCatalogSources.tsx')).toContain('<CollectionLoadingSkeleton');
    expect(readSource('src/pages/WorkspaceOverviewPage.tsx')).toContain('<CollectionLoadingSkeleton');
    expect(readSource('src/pages/virtual-machines/VirtualMachineResourcesView.tsx')).toContain('<CollectionLoadingSkeleton');
    expect(readSource('src/pages/WorkspaceWebhookDrawerTable.tsx')).toContain('<TableLoadingRows columns={5}');
    expect(readSource('src/pages/WorkspaceScheduleDrawerTable.tsx')).toContain('<TableLoadingRows columns={5}');
    expect(readSource('src/features/kubernetes-cluster-detail/components/workloads/WorkloadsExplorer.tsx')).toContain(
      'shouldShowInitialCollectionLoading'
    );
    expect(readSource('src/features/targets/admin/McpServersDialogs.tsx')).toContain('<CollectionLoadingSkeleton');
  });
});
