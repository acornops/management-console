import React from 'react';
import { ControlledTargetChatView } from '@/features/targets/chat/components/ControlledTargetChatView';
import { useTargetChat } from '@/features/targets/chat/hooks/useTargetChat';
import { createMarkdownComponents } from '@/features/targets/chat/lib/markdown';
import { toVirtualMachineTargetDescriptor } from '@/features/targets/targetDescriptor';
import type { ControlPlaneVirtualMachine } from '@/services/controlPlaneApi';
import { ChatSession, Workspace } from '@/types';
import { assistantSessionFromLocation } from '@/utils/routes';
import { useSessionCachedState } from '@/hooks/sessionDataCache';

interface VirtualMachineChatViewProps {
  vm: ControlPlaneVirtualMachine;
  workspace: Workspace;
  currentUserId: string;
  isDark: boolean;
  initialInputValue?: string;
  displayMode?: 'full' | 'panel';
  onClose?: () => void;
  onMaximize?: () => void;
  onOpenAiSettings: () => void;
  onInitialInputConsumed?: () => void;
}

const suggestionKeys = [
  'virtualMachines.chat.suggestions.unhealthyServices',
  'virtualMachines.chat.suggestions.hostLogErrors',
  'virtualMachines.chat.suggestions.networkListeners',
  'virtualMachines.chat.suggestions.processHealth'
];

export const VirtualMachineChatView: React.FC<VirtualMachineChatViewProps> = ({
  vm,
  workspace,
  currentUserId,
  isDark,
  initialInputValue,
  displayMode,
  onClose,
  onMaximize,
  onOpenAiSettings,
  onInitialInputConsumed
}) => {
  const [chatSessions, setChatSessions] = useSessionCachedState<ChatSession[]>(`workspace:${workspace.id}:target:${vm.id}:chat-sessions`, []);
  const assistantMarkdownComponents = React.useMemo(() => createMarkdownComponents('assistant'), []);
  const userMarkdownComponents = React.useMemo(() => createMarkdownComponents('user'), []);
  const initialActiveSessionId = assistantSessionFromLocation(window.location);
  const target = React.useMemo(
    () => toVirtualMachineTargetDescriptor(vm, chatSessions),
    [chatSessions, vm]
  );
  const permissions = workspace.permissions;
  const canChat = Boolean(permissions?.create_sessions && permissions.create_read_only_runs);
  const canCancelRuns = Boolean(permissions?.cancel_runs);
  const canDeleteSessions = Boolean(permissions?.delete_sessions);
  const canManageAiSettings = Boolean(permissions?.manage_ai_settings);
  const controller = useTargetChat({
    target,
    currentUserId,
    canChat,
    canRequestWriteRuns: false,
    isChatActive: true,
    initialActiveSessionId,
    onUpdateSessions: setChatSessions
  });
  const handledInitialInputRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    const prompt = initialInputValue?.trim();
    if (!prompt) {
      handledInitialInputRef.current = null;
      return;
    }
    if (handledInitialInputRef.current === prompt) return;
    handledInitialInputRef.current = prompt;
    void controller.handleCreateSessionWithInput(prompt);
    onInitialInputConsumed?.();
  }, [controller.handleCreateSessionWithInput, initialInputValue, onInitialInputConsumed]);

  return (
    <ControlledTargetChatView
      controller={controller}
      currentUserId={currentUserId}
      subject={target}
      isDark={isDark}
      titleKey="virtualMachines.chat.title"
      descriptionKey="virtualMachines.chat.description"
      promptTitleKey="virtualMachines.chat.promptTitle"
      promptBodyKey="virtualMachines.chat.promptBody"
      suggestionKeys={suggestionKeys}
      inputPlaceholderKey="virtualMachines.chat.inputPlaceholder"
      noChatAccessKey="virtualMachines.chat.noChatAccess"
      footerKey="virtualMachines.chat.footer"
      footerNoAccessKey="chat.footerNoAccess"
      canChat={canChat}
      canRequestWriteRuns={false}
      canApproveWriteActions={false}
      canCancelRuns={canCancelRuns}
      canDeleteSessions={canDeleteSessions}
      canManageAiSettings={canManageAiSettings}
      assistantMarkdownComponents={assistantMarkdownComponents}
      userMarkdownComponents={userMarkdownComponents}
      onOpenAiSettings={onOpenAiSettings}
      displayMode={displayMode}
      onClose={onClose}
      onMaximize={onMaximize}
    />
  );
};
