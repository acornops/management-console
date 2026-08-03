import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const readSource = (path: string) => readFileSync(resolve(root, path), 'utf8');

describe('overview refresh continuity', () => {
  it('keeps populated workspace issues mounted during background refreshes', () => {
    const source = readSource('src/pages/WorkspaceOverviewPage.tsx');

    expect(source).not.toContain('const isLoadingIssues =');
    expect(source).not.toContain(': isLoadingIssues ? (');
  });

  it('reserves the cluster issue loader for the initial request', () => {
    const source = readSource('src/features/kubernetes-cluster-detail/components/detail/views/OverviewView.tsx');

    expect(source).toContain("const isInitialIssueLoad = issueLoadStatus === 'loading' && !hasIssueRows;");
    expect(source).toContain('{isInitialIssueLoad ? (');
  });

  it('uses the bounded cluster readiness summary before raw node inventory', () => {
    const source = readSource('src/features/kubernetes-cluster-detail/components/detail/views/OverviewView.tsx');

    expect(source).toContain('const snapshotReadyNodeCount = cluster.resourceSummary?.readyNodeCount;');
    expect(source).toContain("const hasSnapshotNodeReadiness = typeof snapshotReadyNodeCount === 'number'");
  });

  it('does not restart VM detail loading when the selected object is refreshed', () => {
    const source = readSource('src/pages/VirtualMachinesPage.tsx');

    expect(source).toContain('const selectedTargetId = selected?.id || null;');
    expect(source).toContain('listTargetIssues(workspace.id, selectedTargetId');
    expect(source).toMatch(/loadVmLogs,\s+selectedTargetId,\s+view,/);
    expect(source).not.toMatch(/loadVmLogs,\s+selected,\s+view,/);
  });

  it('keeps the VM overview header free of a target-wide assistant shortcut', () => {
    const source = readSource('src/pages/VirtualMachinesPage.tsx');

    expect(source).not.toContain('openVmTriage');
    expect(source).not.toContain('triageHostPrompt');
    expect(source).toContain('onOpenIssueTriage={openVmIssueTriage}');
  });
});
