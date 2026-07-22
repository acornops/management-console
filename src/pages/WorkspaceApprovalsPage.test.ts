import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const page = readFileSync(resolve(root, 'src/pages/WorkspaceApprovalsPage.tsx'), 'utf8');

describe('WorkspaceApprovalsPage asynchronous isolation', () => {
  it('clears prior rows and ignores stale loads when workspace or focus changes', () => {
    expect(page).toContain("const scopeKey = `${workspace.id}\\u0000${runId || ''}\\u0000${approvalId || ''}`");
    expect(page).toContain('approvalRequestSequence.current === requestSequence');
    expect(page).toContain('setApprovalsByFilter({ pending: [], decided: [] })');
    expect(page).toContain('void loadApprovals(true)');
    expect(page).toContain('const scopeStateCurrent = stateScopeKey === scopeKey');
    expect(page).toContain('const visibleApprovalPhase = scopeStateCurrent ? approvalPhase : \'loading\'');
  });

  it('does not project an old approval decision into a newly selected scope', () => {
    expect(page).toContain('const decisionScopeKey = scopeKey');
    expect(page).toContain('if (currentScopeKey.current !== decisionScopeKey) return');
  });
});
