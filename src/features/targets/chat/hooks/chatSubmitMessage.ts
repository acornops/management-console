import type { ChatAssistantReference, ChatMessage } from '@/types';

export function buildOptimisticUserMessage(
  prompt: string,
  timestamp: number,
  clientMessageId: string,
  assistantReferences: ChatAssistantReference[]
): ChatMessage {
  return {
    id: clientMessageId,
    role: 'user',
    content: prompt,
    timestamp,
    clientMessageId,
    assistantReferences
  };
}
