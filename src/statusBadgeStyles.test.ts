import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const statusBadge = readFileSync(resolve(__dirname, '../packages/ui/src/StatusBadge.tsx'), 'utf8');
const approvalCheckpoint = readFileSync(resolve(__dirname, 'features/targets/chat/components/ApprovalCheckpoint.tsx'), 'utf8');
const resourceStatus = readFileSync(resolve(__dirname, 'features/kubernetes-cluster-detail/components/workloads/workloadExplorerParts.tsx'), 'utf8');
const workloadDetails = readFileSync(resolve(__dirname, 'features/kubernetes-cluster-detail/components/workloads/WorkloadDetailsDrawer.tsx'), 'utf8');
const clusterOverview = readFileSync(resolve(__dirname, 'features/kubernetes-cluster-detail/components/detail/views/OverviewView.tsx'), 'utf8');
const vmIssues = readFileSync(resolve(__dirname, 'pages/virtual-machines/VirtualMachineIssuesPanel.tsx'), 'utf8');
const memberIdentity = readFileSync(resolve(__dirname, 'pages/workspace-members/WorkspaceMemberIdentityField.tsx'), 'utf8');
const userSettings = readFileSync(resolve(__dirname, 'pages/UserSettingsPage.tsx'), 'utf8');

describe('shared status badge styles', () => {
  it('uses fill and text without outlines for status pills', () => {
    expect(statusBadge).toContain("'inline-flex max-w-full items-center rounded-full type-micro-label'");
    expect(statusBadge).toContain("'bg-status-warning-soft text-status-warning-text'");
    expect(statusBadge).not.toContain('border-status-warning');
    expect(statusBadge).not.toContain('rounded-full border type-micro-label');
  });

  it('routes feature status pills through the shared badge', () => {
    expect(approvalCheckpoint).toContain('<StatusBadge tone={statusTone}');
    expect(resourceStatus).toContain('<StatusBadge');
    expect(resourceStatus).toContain("tone={healthy ? 'success' : 'warning'}");
    expect(workloadDetails).toContain("<StatusBadge tone={container.ready ? 'success' : 'warning'}");
    expect(clusterOverview).toContain('<StatusBadge tone="warning"');
    expect(vmIssues).toContain('<StatusBadge tone="warning"');
    expect(memberIdentity).toContain('<StatusBadge tone="neutral"');
    expect(userSettings).toContain('<StatusBadge tone="success"');
    expect(approvalCheckpoint).not.toContain('rounded-full border px-2.5 py-1');
    expect(resourceStatus).not.toContain('rounded-full border px-3 py-1.5');
    expect(memberIdentity).not.toContain('rounded-full border border-ui-border bg-ui-bg px-2 py-1 type-micro-label');
  });
});
