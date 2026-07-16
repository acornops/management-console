import { useCallback, useMemo, useState } from 'react';
import type { ChatRuntimeSelection, ChatSession } from '@/types';
import type { TargetDescriptor } from '@/features/targets/targetDescriptor';
import {
  readChatComposerRuntime,
  removeChatComposerRuntime,
  writeChatComposerRuntime
} from '@/features/targets/chat/lib/chatComposerRuntimeStorage';

interface UseChatComposerRuntimeArgs {
  activeSession: ChatSession | null;
  target: Pick<TargetDescriptor, 'id' | 'workspaceId' | 'chatSessions'>;
  currentUserId: string;
  onUpdateSessions: (sessions: ChatSession[]) => void;
}

export function useChatComposerRuntime({
  activeSession,
  target,
  currentUserId,
  onUpdateSessions
}: UseChatComposerRuntimeArgs) {
  const { id: targetId, workspaceId, chatSessions: sessions } = target;
  const [runtimeStorageRevision, setRuntimeStorageRevision] = useState(0);
  const [workspaceAiSettingsRefreshToken, setWorkspaceAiSettingsRefreshToken] = useState(0);
  const storedRuntimeSelection = useMemo(
    () => readChatComposerRuntime({
      userId: currentUserId,
      workspaceId,
      targetId,
      sessionId: activeSession?.backendSessionId
    }),
    [activeSession?.backendSessionId, currentUserId, runtimeStorageRevision, targetId, workspaceId]
  );
  const composerRuntimeSelection = storedRuntimeSelection
    || activeSession?.composerRuntimeSelection
    || activeSession?.lastRuntimeSelection;

  const setComposerRuntimeSelection = useCallback((selection: ChatRuntimeSelection) => {
    const backendSessionId = activeSession?.backendSessionId;
    writeChatComposerRuntime({ userId: currentUserId, workspaceId, targetId, sessionId: backendSessionId }, selection);
    setRuntimeStorageRevision((current) => current + 1);
    if (activeSession) {
      onUpdateSessions(sessions.map((session) =>
        session.id === activeSession.id ? { ...session, composerRuntimeSelection: selection } : session
      ));
    }
  }, [activeSession, currentUserId, onUpdateSessions, sessions, targetId, workspaceId]);

  const handleMessageAccepted = useCallback((result: {
    backendSessionId: string;
    createdBackendSession: boolean;
  }) => {
    removeChatComposerRuntime({ userId: currentUserId, workspaceId, targetId, sessionId: result.backendSessionId });
    if (result.createdBackendSession) {
      removeChatComposerRuntime({ userId: currentUserId, workspaceId, targetId });
    }
    setRuntimeStorageRevision((current) => current + 1);
  }, [currentUserId, targetId, workspaceId]);

  const clearComposerRuntimeSelection = useCallback((session: ChatSession) => {
    removeChatComposerRuntime({ userId: currentUserId, workspaceId, targetId, sessionId: session.backendSessionId });
    setRuntimeStorageRevision((current) => current + 1);
  }, [currentUserId, targetId, workspaceId]);

  const handleRuntimeSelectionRejected = useCallback(
    () => setWorkspaceAiSettingsRefreshToken((current) => current + 1),
    []
  );

  return {
    composerRuntimeSelection,
    workspaceAiSettingsRefreshToken,
    setComposerRuntimeSelection,
    handleMessageAccepted,
    handleRuntimeSelectionRejected,
    clearComposerRuntimeSelection
  };
}
