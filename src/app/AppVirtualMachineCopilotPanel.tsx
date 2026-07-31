import React from 'react';
import { useTranslation } from 'react-i18next';
import { AssistantDockFrame } from '@/app/AssistantDockFrame';
import { VirtualMachineChatView } from '@/pages/virtual-machines/VirtualMachineChatView';
import type { ControlPlaneVirtualMachine } from '@/services/controlPlaneApi';
import type { Workspace } from '@/types';
import { AppPaths } from '@/utils/routes';

interface AppVirtualMachineCopilotPanelProps {
  currentUserId: string;
  initialPrompt: string;
  isDark: boolean;
  vm: ControlPlaneVirtualMachine;
  width: number;
  workspace: Workspace;
  navigate: (path: string) => void;
  onClose: () => void;
  onInitialPromptHandled: () => void;
  onResizeWidth: (width: number) => void;
}

export const AppVirtualMachineCopilotPanel: React.FC<AppVirtualMachineCopilotPanelProps> = ({
  currentUserId,
  initialPrompt,
  isDark,
  vm,
  width,
  workspace,
  navigate,
  onClose,
  onInitialPromptHandled,
  onResizeWidth
}) => {
  const { t } = useTranslation();
  return (
    <AssistantDockFrame
      ariaLabel={t('app.vmAssistant')}
      dockId="virtual-machine"
      isOpen
      resizeLabel={t('app.resizeVmAssistant')}
      width={width}
      onClose={onClose}
      onWidthChange={onResizeWidth}
    >
      <VirtualMachineChatView
        vm={vm}
        workspace={workspace}
        currentUserId={currentUserId}
        isDark={isDark}
        initialInputValue={initialPrompt}
        displayMode="panel"
        onClose={onClose}
        onMaximize={() => {
          onClose();
          navigate(AppPaths.workspaceVirtualMachineDetail(workspace.id, vm.id, 'chat'));
        }}
        onOpenAiSettings={() => {
          onClose();
          navigate(AppPaths.workspaceAiSettings(
            workspace.id,
            AppPaths.workspaceVirtualMachineDetail(workspace.id, vm.id, 'chat')
          ));
        }}
        onInitialInputConsumed={onInitialPromptHandled}
      />
    </AssistantDockFrame>
  );
};
