import { requestJson } from './http';
import type {
  AutoTriageMinimumSeverity,
  AutoTriageWriteMode,
  AutomaticInvestigationSummary,
  StartExistingAutoTriageInvestigationsResult,
  TargetAutoTriageSettings
} from './autoTriageTypes';

function targetAutoTriagePath(workspaceId: string, targetId: string): string {
  return `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/targets/${encodeURIComponent(targetId)}/auto-triage`;
}

export const autoTriageApi = {
  async getTargetAutoTriageSettings(
    workspaceId: string,
    targetId: string,
    options?: { signal?: AbortSignal }
  ): Promise<TargetAutoTriageSettings> {
    return requestJson<TargetAutoTriageSettings>(
      targetAutoTriagePath(workspaceId, targetId),
      options?.signal ? { signal: options.signal } : undefined
    );
  },

  async updateTargetAutoTriageSettings(
    workspaceId: string,
    targetId: string,
    input: {
      expectedRevision: number;
      enabled: boolean;
      minimumSeverity: AutoTriageMinimumSeverity;
      writeMode: AutoTriageWriteMode;
      additionalInstructions: string;
    }
  ): Promise<TargetAutoTriageSettings> {
    return requestJson<TargetAutoTriageSettings>(
      targetAutoTriagePath(workspaceId, targetId),
      { method: 'PATCH', body: JSON.stringify(input) }
    );
  },

  async startExistingAutoTriageInvestigations(
    workspaceId: string,
    targetId: string,
    expectedSettingsRevision: number
  ): Promise<StartExistingAutoTriageInvestigationsResult> {
    return requestJson<StartExistingAutoTriageInvestigationsResult>(
      `${targetAutoTriagePath(workspaceId, targetId)}/investigations`,
      { method: 'POST', body: JSON.stringify({ expectedSettingsRevision }) }
    );
  },

  async retryIssueAutomaticInvestigation(
    workspaceId: string,
    issueId: string
  ): Promise<AutomaticInvestigationSummary> {
    return requestJson<AutomaticInvestigationSummary>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/issues/${encodeURIComponent(issueId)}/automatic-investigation`,
      { method: 'POST' }
    );
  }
};
