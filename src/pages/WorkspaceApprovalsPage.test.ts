import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');

describe('WorkspaceApprovalsPage control-plane surface', () => {
  const approvalsPage = readFileSync(resolve(root, 'src/pages/WorkspaceApprovalsPage.tsx'), 'utf8');
  const workflowApi = readFileSync(resolve(root, 'src/services/control-plane/workflowApi.ts'), 'utf8');
  const componentVocabulary = readFileSync(resolve(root, 'src/components/common/ComponentVocabulary.tsx'), 'utf8');
  const enLocale = readFileSync(resolve(root, 'src/i18n/locales/en.js'), 'utf8');

  it('loads the unified inbox and decides approvals through run-scoped decisions', () => {
    expect(approvalsPage).toContain('listWorkspaceApprovalInbox');
    expect(approvalsPage).toContain('decideWorkflowRunApproval');
    expect(approvalsPage).toContain('await onApprovalDecision?.();');
    expect(approvalsPage).toContain("useState<ApprovalFilter>('pending')");
    expect(approvalsPage).toContain("{ value: 'pending', label: t('approvals.filters.pending') }");
    expect(approvalsPage).toContain("{ value: 'decided', label: t('approvals.filters.recent') }");
    expect(approvalsPage).toContain('<FilterToggleGroup<ApprovalFilter>');
    expect(approvalsPage).toContain("ariaLabel={t('approvals.filters.label')}");
    expect(componentVocabulary).toContain('aria-pressed={filter.ariaPressed}');
    expect(approvalsPage).toContain("status: focusedApproval ? 'all' : status");
    expect(approvalsPage).toContain('runId,');
    expect(approvalsPage).toContain('approvalId');
    expect(approvalsPage).toContain('isFocusedApproval');
    expect(workflowApi).toContain('/approvals');
    expect(workflowApi).toContain('params.runId');
    expect(workflowApi).toContain('params.approvalId');
    expect(approvalsPage).not.toContain('const approvalRows');
    expect(approvalsPage).not.toContain('placeholderNotice');
  });

  it('renders loading, empty, error, permission, and decision states', () => {
    expect(approvalsPage).toContain('isLoadingApprovals');
    expect(approvalsPage).toContain('approvalError');
    expect(approvalsPage).toContain('approvals.emptyTitle');
    expect(approvalsPage).toContain('approvals.focusedEmptyTitle');
    expect(approvalsPage).toContain('approvals.focusedNotice');
    expect(approvalsPage).toContain('{!focusedApproval && (');
    expect(approvalsPage).toContain('approvals.permissionNotice');
    expect(approvalsPage).toContain('canDecideApprovals');
    expect(approvalsPage).toContain("decisionState[approval.approvalId]");
    expect(enLocale).toContain("emptyTitle: 'No approvals waiting'");
    expect(enLocale).toContain("focusedNotice: 'Showing the approval referenced by this link.'");
    expect(enLocale).toContain("permissionNotice: 'You need create_read_write_runs to approve write-capable workflow actions.'");
  });

  it('uses medium shared button sizing for the page-level refresh action', () => {
    expect(approvalsPage).toContain('<Button size="md" variant="secondary" onClick={() => void loadApprovals()}');
    expect(approvalsPage).not.toContain('<Button size="sm" variant="secondary" onClick={() => void loadApprovals()}');
  });
});
