import { ChatMessage } from '@/types';
import { ControlPlaneRequestError } from '@/services/control-plane/http';
import {
  buildChatFailureMessage,
  buildChatSetupFailureMessage,
  isBlankAssistantMessage,
  sanitizeChatMessages
} from '@/features/kubernetes-cluster-detail/lib/session-utils';
import { AppPaths } from '@/utils/routes';

function formatChatSubmitFailureMessage(error: unknown, workspaceId: string, fallbackMessage: string): string {
  if (error instanceof ControlPlaneRequestError && error.code === 'AI_PROVIDER_CREDENTIAL_MISSING') {
    return `The assistant cannot start because this workspace has no API key for its selected provider. Add one in [AI Settings](#${AppPaths.workspaceAiSettings(workspaceId)}), then try again.`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
}

export function buildChatSubmitFailureMessage(args: {
  error: unknown;
  workspaceId: string;
  fallbackMessage: string;
  runId?: string;
}): ChatMessage {
  const errorMessage = formatChatSubmitFailureMessage(args.error, args.workspaceId, args.fallbackMessage);
  return args.error instanceof ControlPlaneRequestError && args.error.code === 'AI_PROVIDER_CREDENTIAL_MISSING'
    ? buildChatSetupFailureMessage(errorMessage, args.runId)
    : buildChatFailureMessage(errorMessage, args.runId);
}

export function replacePendingAssistantWithFailure(args: {
  messages: ChatMessage[];
  pendingAssistantMessageId: string;
  pendingTraceRunId: string;
  acceptedRunId?: string;
  failureMessage: ChatMessage;
}): ChatMessage[] {
  const { messages, pendingAssistantMessageId, pendingTraceRunId, acceptedRunId, failureMessage } = args;
  const nextMessages = sanitizeChatMessages(messages).filter((message) => {
    if (message.id === pendingAssistantMessageId || message.runId === pendingTraceRunId) {
      return false;
    }
    if (
      acceptedRunId &&
      message.role === 'assistant' &&
      message.runId === acceptedRunId &&
      isBlankAssistantMessage(message)
    ) {
      return false;
    }
    return true;
  });
  return [...nextMessages, failureMessage];
}
