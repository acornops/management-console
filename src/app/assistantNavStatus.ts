import type { TargetChatController } from '@/features/kubernetes-cluster-detail/hooks/useTargetChat';
import type { LiveRunTrace } from '@/features/kubernetes-cluster-detail/types';
import type { ChatSession } from '@/types';

export type AssistantNavStatus = 'idle' | 'working' | 'review' | 'done';

function latestTraceTimestamp(trace: LiveRunTrace): number {
  const stepTimestamp = trace.steps.at(-1)?.timestamp || 0;
  const reasoningTimestamp = trace.reasoningSummaries?.at(-1)?.timestamp || 0;
  const eventTimestamp = trace.timelineEvents?.at(-1)?.timestamp || 0;
  return Math.max(stepTimestamp, reasoningTimestamp, eventTimestamp);
}

function latestRunMessageStatus(session: ChatSession, sessionRunIds: string[]): AssistantNavStatus {
  const latestRunId = [...sessionRunIds].reverse()[0];
  if (!latestRunId) return 'idle';
  const latestRunAssistantMessage = [...session.messages]
    .reverse()
    .find((message) => message.role === 'assistant' && message.runId === latestRunId);
  if (!latestRunAssistantMessage) return 'idle';
  if (latestRunAssistantMessage.content.trim()) return 'done';
  if (latestRunAssistantMessage.approval && latestRunAssistantMessage.approval.status !== 'pending') return 'done';
  return 'idle';
}

export function deriveAssistantRuntimeStatus(controller: TargetChatController | null): AssistantNavStatus {
  if (!controller) return 'idle';

  const needsReview = controller.visibleMessages.some((message) => message.approval?.status === 'pending');
  if (needsReview) return 'review';
  if (controller.isRunActive) return 'working';

  const latestTerminalTrace = Object.values(controller.runTracesByRunId)
    .filter((trace) => trace.status === 'completed' || trace.status === 'failed')
    .sort((left, right) => latestTraceTimestamp(right) - latestTraceTimestamp(left))[0];

  if (latestTerminalTrace) return 'done';
  return 'idle';
}

export function deriveAssistantSessionStatus(
  session: ChatSession,
  runTracesByRunId: Record<string, LiveRunTrace> = {}
): AssistantNavStatus {
  if (session.messages.some((message) => message.approval?.status === 'pending')) return 'review';
  if (session.hasActiveRun) return 'working';

  const sessionRunIds = [...new Set(session.messages.map((message) => message.runId).filter(Boolean) as string[])];
  const latestTrace = sessionRunIds
    .map((runId) => runTracesByRunId[runId])
    .filter(Boolean)
    .sort((left, right) => latestTraceTimestamp(right) - latestTraceTimestamp(left))[0];

  if (!latestTrace) return latestRunMessageStatus(session, sessionRunIds);
  if (latestTrace.status === 'connecting' || latestTrace.status === 'running') return 'working';
  if (latestTrace.status === 'completed' || latestTrace.status === 'failed') return 'done';
  return latestRunMessageStatus(session, sessionRunIds);
}

export function isActiveAssistantStatus(status: AssistantNavStatus): boolean {
  return status === 'working' || status === 'review';
}

export function isTerminalAssistantStatus(status: AssistantNavStatus): boolean {
  return status === 'done';
}
