export type RunTraceStatus = 'connecting' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface RunTraceStep {
  id: string;
  label: string;
  detail?: string;
  status: 'info' | 'success' | 'error';
  timestamp: number;
}

export interface RunTraceToolCall {
  callId: string;
  tool: string;
  status: 'running' | 'completed';
  isError?: boolean;
  contextMeta?: {
    schema_version: 'v1';
    strategy: string;
    original_bytes?: number;
    context_bytes?: number;
    truncated: boolean;
    omissions: unknown[];
  };
  artifact?: {
    id: string;
    expires_at: string;
    sha256: string;
    uncompressed_bytes: number;
    compressed_bytes: number;
    content_type: string;
  };
  artifactUnavailable?: boolean;
  reportArtifact?: {
    reportId: string;
    title: string;
    mediaType: 'application/pdf';
    downloadUrl: string;
    retentionExpiresAt?: string;
  };
}

export interface RunTraceSkillLoad {
  skillRef: string;
  skillId?: string;
  name: string;
  status: 'loading' | 'loaded' | 'failed';
  fileCount?: number;
  totalBytes?: number;
}

export interface RunTraceUsage {
  inputTokens: number;
  outputTokens: number;
  toolCalls: number;
  reasoningTokens?: number;
}

export interface RunTraceReasoningSummary {
  id: string;
  text: string;
  provider?: string;
  model?: string;
  status: 'streaming' | 'completed' | 'unavailable';
  reason?: string;
  timestamp: number;
}

export interface RunTraceTimelineEvent {
  id: string;
  type: 'step' | 'reasoning' | 'tool' | 'skill';
  label: string;
  detail?: string;
  status: 'info' | 'success' | 'error' | 'streaming' | 'completed' | 'unavailable';
  provider?: string;
  model?: string;
  timestamp: number;
}

export interface LiveRunTrace {
  runId: string;
  status: RunTraceStatus;
  steps: RunTraceStep[];
  toolCalls: RunTraceToolCall[];
  skillLoads?: RunTraceSkillLoad[];
  reasoningSummaries?: RunTraceReasoningSummary[];
  timelineEvents?: RunTraceTimelineEvent[];
  activeReasoningSummary?: string;
  usage?: RunTraceUsage;
}
