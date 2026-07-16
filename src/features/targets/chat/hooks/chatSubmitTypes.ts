import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { ChatRuntimeSelection, ChatSession } from '@/types';
import type { ControlPlaneSession } from '@/services/controlPlaneApi';
import type { ActiveRunStreamControls } from '@/features/targets/chat/hooks/chatRunCancellation';
import type { LiveRunTrace } from '@/features/targets/chat/types';
import type { TargetDescriptor } from '@/features/targets/targetDescriptor';

export interface ChatSubmitArgs {
  target: TargetDescriptor;
  activeSession: ChatSession;
  activeSessionId: string | null;
  canChat: boolean;
  canRequestWriteRuns: boolean;
  inputValue: string;
  isLoading: boolean;
  overrideInput?: string;
  runtimeSelection?: ChatRuntimeSelection;
  shouldStickToBottomRef: MutableRefObject<boolean>;
  onUpdateSessions: (sessions: ChatSession[]) => void;
  setActiveSessionId: (sessionId: string) => void;
  setInputValue: (value: string) => void;
  setIsLoading: (value: boolean) => void;
  setActiveRunId: (runId: string | null) => void;
  setRunTracesByRunId: Dispatch<SetStateAction<Record<string, LiveRunTrace>>>;
  setTraceExpandedByRunId: Dispatch<SetStateAction<Record<string, boolean>>>;
  draftConversationName: string;
  fallbackBackendErrorMessage: string;
  runCancelledMessage: string;
  createSession?: (workspaceId: string, targetId: string, title: string) => Promise<ControlPlaneSession>;
  isRunCancelled?: (runId: string) => boolean;
  markRunCancelled?: (runId: string) => void;
  registerRunStream?: (runId: string, controls: ActiveRunStreamControls) => void;
  unregisterRunStream?: (runId: string) => void;
  suppressedRunIdsRef?: MutableRefObject<ReadonlySet<string>>;
  onMessageAccepted?: (result: {
    backendSessionId: string;
    createdBackendSession: boolean;
  }) => void;
  onRuntimeSelectionRejected?: () => void;
}
