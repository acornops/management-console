import type React from 'react';
import type { ChatMessage, ChatRuntimeSelection, ChatSession, KubernetesCluster, PendingApproval } from '@/types';
import type {
  ControlPlaneSession,
  ControlPlaneSessionListPage,
  ControlPlaneTargetChatActivity
} from '@/services/controlPlaneApi';
import type { AssistantNavStatus } from '@/app/assistantNavStatus';
import type { LiveRunTrace } from '@/features/kubernetes-cluster-detail/types';

export interface UseTargetChatArgs {
  target: KubernetesCluster;
  currentUserId: string;
  canChat: boolean;
  canRequestWriteRuns: boolean;
  isChatActive: boolean;
  onUpdateSessions: (sessions: ChatSession[]) => void;
  onSessionDeleted?: (session: ChatSession) => void;
  initialActiveSessionId?: string | null;
  sessionApi?: {
    createSession?: (workspaceId: string, targetId: string, title: string) => Promise<ControlPlaneSession>;
    listSessions?: (workspaceId: string, targetId: string, options?: { limit?: number; cursor?: string; q?: string; status?: string }) => Promise<ControlPlaneSessionListPage>;
    getTargetChatActivity?: (workspaceId: string, targetId: string) => Promise<ControlPlaneTargetChatActivity>;
  };
}

export interface TargetChatController {
  sessions: ChatSession[];
  activeSessionId: string | null;
  activeSession: ChatSession | null;
  isActiveSessionOwner: boolean;
  conversationNotice: string | null;
  recentActivityWarning: ChatSession['recentActivityWarning'] | null;
  inputValue: string;
  isLoading: boolean;
  isRunActive: boolean;
  isSessionsLoading: boolean;
  isLoadingEarlierMessages: boolean;
  hasEarlierMessages: boolean;
  activeRunId: string | null;
  isCancellingRun: boolean;
  visibleMessages: ChatMessage[];
  runTracesByRunId: Record<string, LiveRunTrace>;
  sessionAssistantStatuses?: Record<string, AssistantNavStatus>;
  traceExpandedByRunId: Record<string, boolean>;
  transcriptRef: (node: HTMLDivElement | null) => void;
  setActiveSessionId: (sessionId: string) => void;
  handleCreateSession: () => void;
  handleDismissRecentActivityWarning: (sessionId?: string) => void;
  handleOpenRecentActivitySession: (sessionId: string) => void;
  handleDeleteSession: (sessionId: string) => Promise<void>;
  handleCancelRun: () => Promise<void>;
  setInputValue: (value: string) => void;
  setTraceExpandedByRunId: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  handleChatScroll: () => void;
  handleLoadEarlierMessages: () => Promise<void>;
  handleSend: (overrideInput?: string, runtimeSelection?: ChatRuntimeSelection) => Promise<void>;
  handleSendInNewSession: (overrideInput: string, runtimeSelection?: ChatRuntimeSelection) => Promise<void>;
  handleEditLastUserMessage: (messageId: string, nextContent: string, runtimeSelection?: ChatRuntimeSelection) => Promise<void>;
  handleApprove: (approvalId: string) => Promise<void>;
  handleReject: (approvalId: string) => Promise<void>;
  isInFlightAssistantPlaceholder: (message: ChatMessage) => boolean;
}
