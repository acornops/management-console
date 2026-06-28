import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const hookSource = readFileSync(resolve(root, 'src/app/useTargetIssueSummary.ts'), 'utf8');
const routeTargetsSource = readFileSync(resolve(root, 'src/app/useSidebarRouteTargets.ts'), 'utf8');
const appShellSource = readFileSync(resolve(root, 'src/app/AppShell.tsx'), 'utf8');
const appPageContentSource = readFileSync(resolve(root, 'src/app/AppPageContent.tsx'), 'utf8');

describe('target issue summary refresh', () => {
  it('fetches immediately, polls every 30 seconds, refreshes on focus, and guards stale responses', () => {
    expect(hookSource).toContain('export const TARGET_ISSUE_SUMMARY_REFRESH_MS = 30000;');
    expect(hookSource).toContain('controlPlaneApi.getTargetIssueSummary(workspaceId, targetId)');
    expect(hookSource).toContain('refresh();');
    expect(hookSource).toContain('window.setInterval');
    expect(hookSource).toContain('window.addEventListener(\'focus\', handleFocus)');
    expect(hookSource).toContain('if (requestId !== latestRequestRef.current');
    expect(hookSource).toContain('requestKey !== activeKeyRef.current');
    expect(hookSource).toContain('activeKeyRef.current = enabled ? key : null;');
    expect(hookSource).toContain('setSummaryState(null);');
    expect(hookSource).toContain('summaryState?.key === key ? summaryState.summary : null');
    expect(hookSource).not.toContain('setSummaryState(null);\\n      })');
  });

  it('uses target issue summaries for sidebar badges instead of findings', () => {
    expect(appShellSource).toContain('const selectedTargetIssueSummary = useTargetIssueSummary(');
    expect(appShellSource).toContain('const selectedClusterIssueCount = isClusterSidebar ? selectedTargetIssueSummary?.total ?? 0 : 0;');
    expect(appShellSource).toContain('const selectedVmIssueCount = isVirtualMachineSidebar ? selectedTargetIssueSummary?.total ?? 0 : 0;');
    expect(routeTargetsSource).not.toContain('listVirtualMachineFindings');
    expect(appShellSource).toContain('selectedTargetIssueSummary={selectedTargetIssueSummary}');
    expect(appPageContentSource).toContain('issueSummary={route.kind === \'workspaceVirtualMachineDetail\' ? selectedTargetIssueSummary : null}');
  });
});
