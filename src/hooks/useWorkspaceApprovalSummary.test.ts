import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(__dirname, 'useWorkspaceApprovalSummary.ts'), 'utf8');

describe('useWorkspaceApprovalSummary lifecycle', () => {
  it('loads immediately, polls every 30 seconds only while visible, and refreshes on focus', () => {
    expect(source).toContain('void refresh();');
    expect(source).toContain("document.visibilityState === 'visible'");
    expect(source).toContain('window.setInterval(poll, 30_000)');
    expect(source).toContain("document.addEventListener('visibilitychange', handleVisibilityChange)");
    expect(source).toContain("window.addEventListener('focus', handleFocus)");
  });

  it('invalidates stale requests and retains the last successful value on failure', () => {
    expect(source).toContain('const requestSequence = ++requestSequenceRef.current;');
    expect(source).toContain('requestSequence === requestSequenceRef.current');
    expect(source).toContain('requestSequenceRef.current += 1;');
    expect(source).toContain('setPendingCount(response.pendingCount);');
    expect(source).toContain('catch {');
    expect(source).not.toMatch(/catch \{[^}]*setPendingCount/s);
  });
});
