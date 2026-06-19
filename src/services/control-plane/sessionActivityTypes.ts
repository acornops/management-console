import type { ControlPlaneRunStatus, TargetType } from './types';

export interface ControlPlaneTargetChatActivity {
  targetId: string;
  targetType: TargetType;
  targetName: string;
  windowSeconds: number;
  generatedAt: string;
  recentActivity: Array<{
    sessionId: string;
    title: string;
    createdBy: string;
    createdByUser?: {
      id: string;
      displayName: string;
    };
    lastActivityAt: string;
    lastRunId?: string;
    lastRunStatus?: ControlPlaneRunStatus;
    activeRun?: {
      runId: string;
      status: Extract<ControlPlaneRunStatus, 'queued' | 'dispatching' | 'running' | 'waiting_for_approval' | 'cancelling'>;
      toolAccessMode: 'read_only' | 'read_write';
      requestedAt: string;
    };
    hasActiveRun: boolean;
    hasRecentWriteCapableRun: boolean;
    latestToolAccessMode?: 'read_only' | 'read_write';
  }>;
}

export type ControlPlaneTargetChatActivityEventType =
  | 'message.created'
  | 'run.created'
  | 'run.status_changed'
  | 'assistant_message.committed'
  | 'approval.requested'
  | 'approval.decided'
  | 'approval.expired'
  | 'session.deleted';

export interface ControlPlaneTargetChatActivityEvent {
  id: string;
  workspaceId: string;
  targetId: string;
  targetType: TargetType;
  sessionId: string;
  runId?: string;
  messageId?: string;
  approvalId?: string;
  type: ControlPlaneTargetChatActivityEventType;
  payload: Record<string, unknown>;
  createdAt: string;
}
