import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');

describe('WorkspaceApprovalsPage control-plane surface', () => {
  const approvalsPage = readFileSync(resolve(root, 'src/pages/WorkspaceApprovalsPage.tsx'), 'utf8');
  const workflowApi = readFileSync(resolve(root, 'src/services/control-plane/workflowApi.ts'), 'utf8');
  const enLocale = readFileSync(resolve(root, 'src/i18n/locales/en.js'), 'utf8');

  it('loads the unified inbox and decides approvals through run-scoped decisions', () => {
    expect(approvalsPage).toContain('listWorkspaceApprovalInbox');
    expect(approvalsPage).toContain('decideWorkflowRunApproval');
    expect(approvalsPage).toContain('await onApprovalDecision?.();');
    expect(approvalsPage).toContain("useState<ApprovalFilter>('pending')");
    expect(approvalsPage).toContain("(['pending', 'decided'] as ApprovalFilter[])");
    expect(workflowApi).toContain('/approvals');
    expect(approvalsPage).not.toContain('const approvalRows');
    expect(approvalsPage).not.toContain('placeholderNotice');
  });

  it('renders loading, empty, error, permission, and decision states', () => {
    expect(approvalsPage).toContain('isLoadingApprovals');
    expect(approvalsPage).toContain('approvalError');
    expect(approvalsPage).toContain('approvals.emptyTitle');
    expect(approvalsPage).toContain('approvals.permissionNotice');
    expect(approvalsPage).toContain('canDecideApprovals');
    expect(approvalsPage).toContain("decisionState[approval.approvalId]");
    expect(enLocale).toContain("emptyTitle: 'No approvals waiting'");
    expect(enLocale).toContain("permissionNotice: 'You need create_read_write_runs to approve write-capable workflow actions.'");
  });

  it('uses medium shared button sizing for the page-level refresh action', () => {
    expect(approvalsPage).toContain('<Button size="md" variant="secondary" onClick={() => void loadApprovals()}');
    expect(approvalsPage).not.toContain('<Button size="sm" variant="secondary" onClick={() => void loadApprovals()}');
  });
});
