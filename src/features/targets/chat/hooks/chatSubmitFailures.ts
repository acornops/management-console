import { ChatMessage } from '@/types';
import { formatControlPlaneError } from '@/services/control-plane/errorFormatting';
import { ControlPlaneRequestError } from '@/services/control-plane/http';
import {
  buildChatFailureMessage,
  buildChatSetupFailureMessage,
  isBlankAssistantMessage,
  sanitizeChatMessages
} from '@/features/targets/chat/lib/session-utils';
import { AppPaths } from '@/utils/routes';
import { resolveMcpReadinessRecovery } from '@/services/control-plane/mcpReadinessRecovery';

function formatChatSubmitFailureMessage(error: unknown, workspaceId: string, fallbackMessage: string): string {
  if (error instanceof ControlPlaneRequestError && error.code === 'AI_PROVIDER_CREDENTIAL_MISSING') {
    return `The assistant cannot start because this workspace has no API key for its selected provider. Add one in [AI Settings](#${AppPaths.workspaceAiSettings(workspaceId)}), then try again.`;
  }

  if (error instanceof Error) {
    return formatControlPlaneError(error, fallbackMessage);
  }

  return fallbackMessage;
}

export function buildChatSubmitFailureMessage(args: {
  error: unknown;
  workspaceId: string;
  targetId: string;
  targetType: 'kubernetes' | 'virtual_machine';
  fallbackMessage: string;
  runId?: string;
}): ChatMessage {
  const recovery = resolveMcpReadinessRecovery(args.error, {
    workspaceId: args.workspaceId,
    scopeType: 'target',
    targetId: args.targetId,
    targetType: args.targetType
  });
  const errorMessage = recovery
    ? `${recovery.message} [${recovery.label}](#${recovery.href})`
    : formatChatSubmitFailureMessage(args.error, args.workspaceId, args.fallbackMessage);
  return recovery || (args.error instanceof ControlPlaneRequestError && args.error.code === 'AI_PROVIDER_CREDENTIAL_MISSING')
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
