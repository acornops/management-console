import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const page = readFileSync(resolve(root, 'src/pages/WorkspaceApprovalsPage.tsx'), 'utf8');

describe('WorkspaceApprovalsPage asynchronous isolation', () => {
  it('scopes retained rows and ignores stale loads when workspace or focus changes', () => {
    expect(page).toContain("const scopeKey = `${workspace.id}\\u0000${runId || ''}\\u0000${approvalId || ''}`");
    expect(page).toContain('approvalRequestSequence.current === requestSequence');
    expect(page).toContain('useSessionCachedState<Record<ApprovalFilter, WorkspaceApprovalInboxRow[]>>(approvalRowsCacheKey');
    expect(page).not.toContain('setApprovalsByFilter({ pending: [], decided: [] })');
    expect(page).toContain('void loadApprovals(true)');
    expect(page).toContain('const scopeStateCurrent = stateScopeKey === scopeKey');
    expect(page).toContain('const visibleApprovalPhase = scopeStateCurrent ? approvalPhase : \'loading\'');
  });

  it('does not project an old approval decision into a newly selected scope', () => {
    expect(page).toContain('const decisionScopeKey = scopeKey');
    expect(page).toContain('if (currentScopeKey.current !== decisionScopeKey) return');
  });

  it('keeps terminal collection states inside the canonical data surface', () => {
    expect(page).toContain("import { DataSurface } from '@acornops/ui'");
    expect(page.match(/<DataSurface aria-label=\{t\('approvals\.queueTitle'\)\}>/g)).toHaveLength(3);
  });

  it('uses labeled stacked decisions on mobile and retains the dense desktop ledger', () => {
    expect(page).toContain('data-approval-layout="mobile"');
    expect(page).toContain('className="divide-y divide-ui-border md:hidden"');
    expect(page).toContain('data-approval-layout="desktop"');
    expect(page).toContain('className="hidden overflow-x-auto md:block"');
    expect(page).toContain("<dt className=\"type-micro-label text-ui-text-muted\">{t('approvals.table.activity')}</dt>");
    expect(page).toContain("<dt className=\"type-micro-label text-ui-text-muted\">{t('approvals.table.requestedBy')}</dt>");
    expect(page).toContain("<dt className=\"type-micro-label text-ui-text-muted\">{t('approvals.table.source')}</dt>");
    expect(page).toContain("<dt className=\"type-micro-label text-ui-text-muted\">{t('approvals.table.expires')}</dt>");
    expect(page).toContain('className="mt-4 grid grid-cols-2 gap-2"');
  });
});
