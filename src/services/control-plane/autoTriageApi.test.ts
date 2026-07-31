import { beforeEach, describe, expect, it, vi } from 'vitest';

const requestJson = vi.fn();
vi.mock('./http', () => ({ requestJson }));

describe('auto-triage API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requestJson.mockResolvedValue({});
  });

  it('uses the revisioned shared target settings endpoint', async () => {
    const { autoTriageApi } = await import('./autoTriageApi');
    await autoTriageApi.updateTargetAutoTriageSettings('workspace 1', 'target/1', {
      expectedRevision: 3,
      enabled: true,
      minimumSeverity: 'warning',
      writeMode: 'approval_required',
      additionalInstructions: 'Check the runbook.',
      namespaceInclude: ['payments'],
      namespaceExclude: ['sandbox'],
      includeClusterScopedIssues: false
    });
    expect(requestJson).toHaveBeenCalledWith(
      '/api/v1/workspaces/workspace%201/targets/target%2F1/auto-triage',
      {
        method: 'PATCH',
        body: JSON.stringify({
          expectedRevision: 3,
          enabled: true,
          minimumSeverity: 'warning',
          writeMode: 'approval_required',
          additionalInstructions: 'Check the runbook.',
          namespaceInclude: ['payments'],
          namespaceExclude: ['sandbox'],
          includeClusterScopedIssues: false
        })
      }
    );
  });

  it('starts current issues only through the explicit revision-bound action', async () => {
    const { autoTriageApi } = await import('./autoTriageApi');
    await autoTriageApi.startExistingAutoTriageInvestigations('workspace-1', 'target-1', 4);
    expect(requestJson).toHaveBeenCalledWith(
      '/api/v1/workspaces/workspace-1/targets/target-1/auto-triage/investigations',
      { method: 'POST', body: JSON.stringify({ expectedSettingsRevision: 4 }) }
    );
  });

  it('uses the idempotent issue lifecycle retry endpoint', async () => {
    const { autoTriageApi } = await import('./autoTriageApi');
    await autoTriageApi.retryIssueAutomaticInvestigation('workspace-1', 'issue/1');
    expect(requestJson).toHaveBeenCalledWith(
      '/api/v1/workspaces/workspace-1/issues/issue%2F1/automatic-investigation',
      { method: 'POST' }
    );
  });
});
