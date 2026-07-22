import type { ChatMessage } from '@/types';
import type { LiveRunTrace } from '@/features/targets/chat/types';
import {
  isBlankAssistantMessage,
  isPendingAssistantPlaceholder
} from '@/features/targets/chat/lib/session-utils';
import { isTraceInProgress } from '@/features/targets/chat/hooks/chatRunTrace';

export function isInFlightAssistantMessage(
  message: ChatMessage,
  isRunActive: boolean,
  runTracesByRunId: Record<string, LiveRunTrace>
): boolean {
  if (isPendingAssistantPlaceholder(message)) return true;
  if (!isBlankAssistantMessage(message)) return false;

  const messageId = String(message.id || '');
  if (isRunActive && (messageId.startsWith('pending-') || messageId.startsWith('stream-'))) return true;
  if (!message.runId) return false;

  const trace = runTracesByRunId[message.runId];
  return trace ? isTraceInProgress(trace) : false;
}
