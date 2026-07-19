import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../../../../..');
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');
const chatView = [
  read('src/features/targets/chat/components/TargetChatView.tsx'),
  read('src/features/targets/chat/components/TargetChatViewBody.tsx'),
  read('src/features/targets/chat/components/TargetAssistantReadinessState.tsx')
].join('\n');
const chatController = read('src/features/targets/chat/hooks/useTargetChat.ts');
const readinessHook = read('src/features/targets/chat/hooks/useWorkspaceAiRuntimeReadiness.ts');
const chatGateDialog = read('src/features/targets/chat/components/TargetChatGateDialog.tsx');

describe('target assistant AI readiness gate', () => {
  it('uses inline setup states and one readiness predicate for every run-producing action', () => {
    expect(chatView).toContain('disabled={!canChat || !hasReadyAiRuntime}');
    expect(chatView).toContain('if (!canChat || !hasReadyAiRuntime) return;');
    expect(chatView).toContain('!pendingComposerFocusRef.current || !canPost || isRunActive || !hasReadyAiRuntime');
    expect(chatView).toContain('const isComposerRuntimeUnavailable = !hasReadyAiRuntime || !selectedModelOption?.ready;');
    expect(chatView).toContain('if (!nextContent || !canPost || isSubmittingEdit || isRunActive || !hasReadyAiRuntime || isComposerRuntimeUnavailable) return;');
    expect(chatView).toContain('<TargetAssistantReadinessState');
    expect(chatView).toContain('{hasReadyAiRuntime ? <TargetChatComposer');
    expect(chatController).toContain('canChat: args.canChatForSubmit && hasReadyAiRuntime');
    expect(chatController).toContain('if (!hasReadyAiRuntime) return;');
    expect(readinessHook).toContain('controlPlaneApi.getWorkspaceAiSettings(workspaceId)');
  });

  it('keeps only recent-activity decisions modal', () => {
    expect(chatView).toContain('const hasBlockingGate = Boolean(recentActivityWarning);');
    expect(chatView).toContain("content.setAttribute('inert', '')");
    expect(chatGateDialog).toContain('aria-modal="true"');
    expect(chatGateDialog).toContain("if (event.key !== 'Tab' || !hasRecentActivityAction) return;");
    expect(chatGateDialog).not.toContain('aiSettings');
  });
});
