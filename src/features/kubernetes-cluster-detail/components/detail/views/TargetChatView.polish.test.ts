import { describe, expect, it } from 'vitest';
import {
  approvalCheckpoint,
  chatComposerNotice,
  chatView,
  conversationHistory,
  enLocale,
  traceFooter,
  zhLocale
} from '@/stylesTestSupport';

describe('target chat polish contracts', () => {
  it('keeps desktop conversation history as a non-blocking route rail', () => {
    expect(chatView).toContain('setIsHistoryOpen(true)');
    expect(chatView).toContain('setIsHistoryOpen(false)');
    expect(chatView).toContain('desktopHistoryPanelId');
    expect(chatView).toContain('relative hidden h-full shrink-0 overflow-visible border-r border-ui-border bg-ui-surface shadow-sm lg:flex');
    expect(chatView).toContain('absolute inset-0 z-[110] lg:hidden');
    expect(chatView).toContain('usesOverlayHistory');
    expect(chatView).toContain('historyPanelRef.current?.focus');
    expect(chatView).toContain('getFocusableHistoryElements');
    expect(chatView).toContain('getHistoryFocusWrapIndex');
    expect(chatView).toContain('aria-modal="true"');
    expect(chatView).toContain('aria-hidden="true"');
    expect(chatView).toContain('aria-pressed={isHistoryOpen}');
    expect(chatView).toContain('absolute left-0 top-1/2 z-20');
    expect(chatView).toContain('right-[-2.25rem] top-1/2');
    expect(chatView).toContain('side="right"');
    expect(chatView).toContain("t('chat.hideHistory')");
    expect(chatView).toContain("t('chat.showHistory')");
    expect(chatView).toContain('<History className="h-4 w-4" />');
    expect(chatView).not.toContain('[clip-path:polygon');
    expect(chatView).toContain('lg:grid-cols-[minmax(0,1fr)_auto]');
    expect(chatView).not.toContain("Tooltip content={t('chat.newChat')}");
    expect(chatView).toContain('onClick={onCreateSession}');
    expect(chatView).not.toContain('lg:grid-cols-[auto_minmax(0,1fr)_auto]');
    expect(conversationHistory).toContain('aria-current={isActive ?');
    expect(conversationHistory).toContain("t('chat.conversationHistory')");
    expect(conversationHistory).toContain("t('chat.historyContext', { name: appName })");
    expect(conversationHistory).not.toContain('onCreateSession');
    expect(conversationHistory).not.toContain('onClose');
    expect(chatView).toMatch(/const selectSession = \(sessionId: string\) => \{\s+onSelectSession\(sessionId\);\s+\};/);
    expect(chatView).not.toContain("event.key === 'Escape'");
    expect(chatView).not.toContain('xl:w-80');
  });

  it('renders approvals as inline operational checkpoints', () => {
    expect(approvalCheckpoint).toContain('interface ApprovalCheckpointProps');
    expect(approvalCheckpoint).toContain('data-chat-approval-checkpoint="true"');
    expect(approvalCheckpoint).toContain('const StatusIcon');
    expect(approvalCheckpoint).toContain('const statusToneClass');
    expect(approvalCheckpoint).toContain("t(`chat.approvalStatusLabel.${approvalStatus}`)");
    expect(approvalCheckpoint).toContain("t('chat.approvalActionLabel')");
    expect(approvalCheckpoint).toContain("t('chat.approvalConsequenceLabel')");
    expect(approvalCheckpoint).toContain("t('chat.approvalConsequence')");
    expect(approvalCheckpoint).toContain("t('chat.approvalHelp')");
    expect(approvalCheckpoint).toContain('type-code mt-1 max-h-36');
    expect(chatView).toMatch(/<ApprovalCheckpoint[\s\S]*?onApprove=\{onApprove\}/);
    expect(enLocale).toContain("approvalCheckpoint: 'Approval checkpoint'");
    expect(enLocale).toContain("approvalStatusLabel: {");
    expect(enLocale).toContain("approveAction: 'Approve once'");
    expect(zhLocale).toContain("approvalCheckpoint: '批准检查点'");
    expect(zhLocale).toContain('approvalStatusLabel: {');
    expect(zhLocale).toContain("approveAction: '批准一次'");
  });

  it('keeps polish shared across transcript, composer, and trace surfaces', () => {
    expect(chatView).toContain('max-w-[min(48rem,94%)]');
    expect(enLocale).toContain("conversationHistory: 'Conversation History'");
    expect(enLocale).toContain("showHistory: 'Show conversation history'");
    expect(enLocale).toContain("hideHistory: 'Hide conversation history'");
    expect(enLocale).toContain("runCancelledMessage: 'Run cancelled. You can send another message when ready.'");
    expect(chatView).toContain('Plus');
    expect(chatView).toContain('type-route-title');
    expect(chatView).toContain('type-body mt-2 max-w-2xl');
    expect(chatView).toContain('t(resolvedDescriptionKey, { name: cluster.name })');
    expect(chatView).toContain("variant=\"secondary\"");
    expect(chatView).toContain('composerActionLabel');
    expect(chatView).toContain('canCancelActiveRun');
    expect(chatView).toContain("type={isRunActive ? 'button' : 'submit'}");
    expect(chatView).toContain('Square');
    expect(chatView).not.toContain("t('chat.runStatus')");
    expect(chatView).toContain('focus-visible:ring-status-danger/20');
    expect(chatView).toContain("t('chat.targetContext', { name: cluster.name })");
    expect(chatView).not.toContain("aria-label={t('chat.closeHistory')}");
    expect(chatComposerNotice).toContain('AlertTriangle');
    expect(chatComposerNotice).toContain('Info');
    expect(chatComposerNotice).toContain('border-status-warning/30 bg-status-warning-soft/45');
    expect(traceFooter).toContain('aria-expanded={isExpanded}');
    expect(traceFooter).toContain('aria-controls={contentId}');
    expect(traceFooter).toContain('Run updates');
    expect(enLocale).toContain("targetContext: 'Target context: {{name}}'");
    expect(zhLocale).toContain("targetContext: '目标上下文：{{name}}'");
  });
});
