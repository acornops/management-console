import React from 'react';
import { useTranslation } from 'react-i18next';
import { AssistantDockFrame } from '@/app/AssistantDockFrame';
import { AgentChatPanel } from '@/pages/agents/AgentChatPanel';
import type { AgentDefinition } from '@/pages/agents/agentModel';
import type { Workspace } from '@/types';

interface AgentQuickChatPanelProps {
  agent: AgentDefinition | undefined;
  currentUserId: string;
  isDark: boolean;
  isOpen: boolean;
  permissions?: Workspace['permissions'];
  onClose: () => void;
  onExitComplete?: () => void;
  onMaximize: () => void;
  onOpenAiSettings: () => void;
}

export const AgentQuickChatPanel: React.FC<AgentQuickChatPanelProps> = ({
  agent,
  currentUserId,
  isDark,
  isOpen,
  permissions,
  onClose,
  onExitComplete,
  onMaximize,
  onOpenAiSettings
}) => {
  const { t } = useTranslation();
  const [width, setWidth] = React.useState(420);

  if (!agent) return null;

  return (
    <AssistantDockFrame
      ariaLabel={t('agentChat.quickChatLabel', { name: agent.name })}
      dockId="agent"
      isOpen={isOpen}
      resizeLabel={t('agentChat.resizeQuickChat')}
      width={width}
      onClose={onClose}
      onExitComplete={onExitComplete}
      onWidthChange={setWidth}
    >
      <AgentChatPanel
        agent={agent}
        currentUserId={currentUserId}
        displayMode="panel"
        title={t('agentChat.quickChatLabel', { name: agent.name })}
        isDark={isDark}
        permissions={permissions}
        onClose={onClose}
        onMaximize={onMaximize}
        onOpenAiSettings={onOpenAiSettings}
      />
    </AssistantDockFrame>
  );
};
