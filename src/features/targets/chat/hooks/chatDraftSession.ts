import type { ChatSession } from '@/types';
import type { ControlPlaneTargetChatActivity } from '@/services/controlPlaneApi';
import { createConversationId } from '@/features/targets/chat/hooks/chatSessionSync';
import { buildRecentActivityWarning } from '@/features/targets/chat/hooks/targetChatState';

type ActivityWarningTranslator = (key: string, options?: Record<string, unknown>) => string;

export async function createDraftSessionWithWarning(args: {
  getTargetChatActivity: () => Promise<ControlPlaneTargetChatActivity>;
  currentUserId: string;
  name: string;
  t: ActivityWarningTranslator;
}): Promise<ChatSession> {
  let recentActivityWarning: ChatSession['recentActivityWarning'];
  try {
    recentActivityWarning = buildRecentActivityWarning(await args.getTargetChatActivity(), args.currentUserId, args.t);
  } catch {
    recentActivityWarning = undefined;
  }
  return {
    id: createConversationId(),
    name: args.name,
    hydrated: true,
    messages: [],
    timestamp: Date.now(),
    status: 'open',
    recentActivityWarning
  };
}
