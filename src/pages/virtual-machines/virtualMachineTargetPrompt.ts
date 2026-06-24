import type { PendingVmTargetPrompt } from '@/pages/target-prompts/targetPromptModel';

export const getSelectedVmTargetPrompt = (
  pendingPrompt: PendingVmTargetPrompt | null | undefined,
  workspaceId: string,
  selectedId: string | null
): string =>
  selectedId && pendingPrompt?.workspaceId === workspaceId && pendingPrompt.targetId === selectedId
    ? pendingPrompt.prompt
    : '';

export const shouldClearPendingVmTargetPrompt = (
  pendingPrompt: PendingVmTargetPrompt | null | undefined,
  workspaceId: string,
  selectedId: string | null,
  view: string
): boolean =>
  Boolean(
    pendingPrompt &&
    pendingPrompt.workspaceId === workspaceId &&
    (!selectedId || selectedId !== pendingPrompt.targetId || view !== 'chat')
  );
