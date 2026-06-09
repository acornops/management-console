import { ChatMessage } from '@/types';

export interface ActiveRunStreamControls {
  abort: () => void;
}

export function replaceCancelledRunAssistantMessages(
  messages: ChatMessage[],
  runId: string,
  cancelledMessage: string,
  timestamp = Date.now()
): ChatMessage[] {
  let replaced = false;
  const cancelledRunMessage: ChatMessage = {
    id: `cancelled-${runId}`,
    role: 'assistant',
    content: cancelledMessage,
    runId,
    timestamp
  };
  const nextMessages: ChatMessage[] = [];
  let insertionIndex = -1;
  for (const message of messages) {
    if (message.role === 'assistant' && message.runId === runId) {
      if (replaced) {
        continue;
      }
      replaced = true;
      nextMessages.push({ ...cancelledRunMessage, id: message.id || cancelledRunMessage.id });
      insertionIndex = nextMessages.length - 1;
      continue;
    }
    nextMessages.push(message);
    if (message.runId === runId) {
      insertionIndex = nextMessages.length - 1;
    }
  }
  if (replaced) {
    return nextMessages;
  }
  if (insertionIndex < 0) {
    return [...nextMessages, cancelledRunMessage];
  }
  return [
    ...nextMessages.slice(0, insertionIndex + 1),
    cancelledRunMessage,
    ...nextMessages.slice(insertionIndex + 1)
  ];
}

export function replacePendingCancelledRunMessages(
  messages: ChatMessage[],
  args: {
    pendingRunId: string;
    acceptedRunId: string;
    userMessageId: string;
    pendingAssistantMessageId?: string;
    streamingMessageId: string;
    cancelledMessage: string;
    timestamp?: number;
  }
): ChatMessage[] {
  const remappedMessages = messages.map((message) => {
    if (message.id === args.userMessageId) {
      return { ...message, runId: args.acceptedRunId, timestamp: args.timestamp ?? message.timestamp };
    }
    if (message.id === args.pendingAssistantMessageId || message.runId === args.pendingRunId) {
      return { ...message, id: args.streamingMessageId, runId: args.acceptedRunId };
    }
    return message;
  });

  return replaceCancelledRunAssistantMessages(
    remappedMessages,
    args.acceptedRunId,
    args.cancelledMessage,
    args.timestamp
  );
}
