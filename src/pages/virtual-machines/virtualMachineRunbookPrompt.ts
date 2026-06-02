import type { PendingVmRunbookPrompt } from '@/pages/runbooks/runbookModel';

export const getSelectedVmRunbookPrompt = (
  pendingPrompt: PendingVmRunbookPrompt | null | undefined,
  workspaceId: string,
  selectedId: string | null
): string =>
  selectedId && pendingPrompt?.workspaceId === workspaceId && pendingPrompt.targetId === selectedId
    ? pendingPrompt.prompt
    : '';

export const shouldClearPendingVmRunbookPrompt = (
  pendingPrompt: PendingVmRunbookPrompt | null | undefined,
  workspaceId: string,
  selectedId: string | null,
  view: string
): boolean =>
  Boolean(
    pendingPrompt &&
    pendingPrompt.workspaceId === workspaceId &&
    (!selectedId || selectedId !== pendingPrompt.targetId || view !== 'chat')
  );
