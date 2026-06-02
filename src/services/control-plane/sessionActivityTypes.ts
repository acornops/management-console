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
