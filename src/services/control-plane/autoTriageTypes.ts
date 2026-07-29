export type AutoTriageMinimumSeverity = 'critical' | 'warning' | 'info';
export type AutoTriageWriteMode =
  | 'follow_target'
  | 'read_only'
  | 'approval_required'
  | 'full_write';

export interface AutomaticInvestigationSessionContext {
  issueId: string;
  lifecycleVersion: number;
  severity: 'critical' | 'warning' | 'info';
  scopeKind?: string;
  scopeName?: string;
  objectKind?: string;
  objectName?: string;
  writeMode: AutoTriageWriteMode;
  effectiveToolMode: 'read_only' | 'read_write';
  confirmationRequiredForWrite: boolean;
}

export type AutoTriageReadinessReason =
  | 'ai_provider_credentials_missing'
  | 'target_agent_disconnected'
  | 'no_diagnostic_tools'
  | 'mcp_tools_need_setup'
  | 'optional_mcp_tools_unavailable';

export interface AutomaticInvestigationSummary {
  issueId: string;
  lifecycleVersion: number;
  state:
    | 'queued'
    | 'investigating'
    | 'awaiting_approval'
    | 'findings_ready'
    | 'failed'
    | 'cancelled'
    | 'deleted';
  sessionId?: string;
  runId?: string;
  updatedAt: string;
  errorCode?: string;
  canRetry: boolean;
}

export interface TargetAutoTriageSettings {
  workspaceId: string;
  targetId: string;
  enabled: boolean;
  minimumSeverity: AutoTriageMinimumSeverity;
  writeMode: AutoTriageWriteMode;
  additionalInstructions: string;
  revision: number;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
  canEdit: boolean;
  eligibleCurrentIssueCount: number;
  queueSummary?: {
    activeCount: number;
    waitingCount: number;
    oldestWaitingAt?: string;
  };
  effectiveBehavior: {
    requestedWriteMode: AutoTriageWriteMode;
    effectiveToolMode: 'read_only' | 'read_write';
    confirmationRequiredForWrite: boolean;
    targetCeilingApplied: boolean;
    targetSupportsWrite: boolean;
    summary:
      | 'read_only'
      | 'approval_required'
      | 'automatic_write'
      | 'reduced_to_approval'
      | 'agent_read_only';
  };
  readiness: {
    status: 'ready' | 'needs_setup' | 'temporarily_unavailable';
    reasons: AutoTriageReadinessReason[];
    unavailableOptionalMcpToolCount: number;
  };
}

export interface StartExistingAutoTriageInvestigationsResult {
  queuedCount: number;
  alreadyExistsCount: number;
  skippedCount: number;
}
