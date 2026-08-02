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
});
