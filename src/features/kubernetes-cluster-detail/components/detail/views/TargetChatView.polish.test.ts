import { describe, expect, it } from 'vitest';
import {
  approvalCheckpoint,
  assistantTurn,
  chatComposerNotice,
  chatView,
  conversationHistory,
  enLocale,
  markdownComponents,
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
    expect(assistantTurn).toMatch(/<ApprovalCheckpoint[\s\S]*?onApprove=\{onApprove\}/);
    expect(enLocale).toContain("approvalCheckpoint: 'Approval checkpoint'");
    expect(enLocale).toContain("approvalStatusLabel: {");
    expect(enLocale).toContain("approveAction: 'Approve once'");
    expect(zhLocale).toContain("approvalCheckpoint: '批准检查点'");
    expect(zhLocale).toContain('approvalStatusLabel: {');
    expect(zhLocale).toContain("approveAction: '批准一次'");
  });

  it('keeps polish shared across transcript, composer, and trace surfaces', () => {
    expect(assistantTurn).toContain('data-chat-assistant-turn="true"');
    expect(assistantTurn).toContain('className="w-full min-w-0 text-sm font-medium text-ui-text"');
    expect(assistantTurn).toContain('max-w-[72ch]');
    expect(assistantTurn).toContain('data-chat-assistant-loading-row="true"');
    expect(assistantTurn).toContain('min-h-8');
    expect(assistantTurn).toContain("t('chat.preparingResponse')");
    expect(assistantTurn).not.toContain("t('chat.analyzing')");
    expect(assistantTurn).not.toContain("t('chat.startingAssistant')");
    expect(chatView).toContain('max-w-[min(42rem,88%)] rounded-lg border border-ui-text-muted/20 bg-ui-text');
    expect(chatView).not.toContain("max-w-[min(48rem,94%)] border border-ui-border bg-ui-surface text-ui-text");
    expect(chatView).not.toContain('AnimatePresence mode="popLayout"');
    expect(chatView).not.toContain('layout="position"');
    expect(chatView).not.toContain('<motion.div\n                    key={message.id}');
    expect(enLocale).toContain("conversationHistory: 'Conversation History'");
    expect(enLocale).toContain("showHistory: 'Show conversation history'");
    expect(enLocale).toContain("hideHistory: 'Hide conversation history'");
    expect(enLocale).toContain("runCancelledMessage: 'Run cancelled. You can send another message when ready.'");
    expect(chatView).toContain('Plus');
    expect(chatView).toContain('type-route-title');
    expect(chatView).toContain('type-body mt-2 max-w-2xl');
    expect(chatView).toContain('t(resolvedDescriptionKey, { name: cluster.name })');
    expect(chatView).toContain("variant=\"secondary\"");
    expect(chatView).toContain('const newChatDisabledReason =');
    expect(chatView).toContain("t('chat.newChatWaitingForRun')");
    expect(chatView).toContain('Tooltip content={newChatDisabledReason}');
    expect(enLocale).toContain("newChatWaitingForRun: 'Start a new chat after this response finishes or cancel the current run.'");
    expect(zhLocale).toContain("newChatWaitingForRun: '当前回复完成后再开始新聊天，或先取消当前运行。'");
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
    expect(chatView).toContain('const activeRunTrace = isInFlightPlaceholder && activeRunId ? runTracesByRunId[activeRunId] : undefined;');
    expect(chatView).toContain('const trace = activeRunTrace || messageTrace;');
    expect(chatView).toContain('const traceRunId = trace?.runId || message.runId || message.id;');
    expect(chatView).toContain("label: 'Preparing response'");
    expect(chatView).toContain("detail: 'Waiting for the first progress update.'");
    expect(traceFooter).toContain('aria-expanded={isExpanded}');
    expect(traceFooter).toContain('aria-controls={contentId}');
    expect(traceFooter).not.toContain('AnimatePresence initial={false} mode="wait"');
    expect(traceFooter).toContain('getTraceActivityLabel(trace)');
    expect(traceFooter).toContain("const activitySummary = trace.status === 'connecting'");
    expect(traceFooter).toContain("? 'Waiting for progress'");
    expect(traceFooter).toContain('`${trace.steps.length} steps`');
    expect(traceFooter).toContain('`${completedToolCalls} of ${trace.toolCalls.length} tools complete`');
    expect(traceFooter).toContain("const disclosureLabel = isExpanded ? 'Hide run details' : 'Show run details';");
    expect(traceFooter).toContain('mt-3 max-w-[72ch]');
    expect(traceFooter).toContain('group inline-flex min-h-10 max-w-full items-center gap-2 rounded-md px-2.5 py-1.5');
    expect(traceFooter).toContain('{disclosureLabel}');
    expect(traceFooter).toContain('bg-ui-surface/45 text-ui-text-muted hover:bg-ui-surface/75 hover:text-ui-text');
    expect(traceFooter).toContain('type-micro-label w-[9.25rem] shrink-0 text-ui-text-muted');
    expect(traceFooter).toContain('type-caption min-w-0 max-w-[min(20rem,45vw)] truncate');
    expect(traceFooter).not.toContain('group flex min-h-10 w-full');
    expect(traceFooter).not.toContain('border border-ui-border bg-ui-bg/80');
    expect(traceFooter).not.toContain('rounded-full px-2 py-0.5');
    expect(traceFooter).toContain('hidden={!isExpanded}');
    expect(traceFooter).toContain('max-h-60 divide-y divide-ui-border overflow-y-auto overscroll-contain');
    expect(traceFooter).toContain('max-h-44 divide-y divide-ui-border overflow-y-auto overscroll-contain');
    expect(traceFooter).toContain('Progress steps');
    expect(traceFooter).not.toContain('Run updates');
    expect(traceFooter).not.toContain('const statusLabel = trace.status');
    expect(markdownComponents).toContain("href?.startsWith('#/')");
    expect(markdownComponents).toContain("target={isInternalRoute ? undefined : '_blank'}");
    expect(markdownComponents).toContain("rel={isInternalRoute ? undefined : 'noreferrer'}");
    expect(enLocale).toContain("targetContext: 'Target context: {{name}}'");
    expect(enLocale).toContain("preparingResponse: 'Preparing response...'");
    expect(enLocale).not.toContain("analyzing: 'Preparing run record...'");
    expect(enLocale).not.toContain("startingAssistant: 'Starting assistant...'");
    expect(zhLocale).toContain("targetContext: '目标上下文：{{name}}'");
    expect(zhLocale).toContain("preparingResponse: '正在准备回复...'");
    expect(zhLocale).not.toContain("analyzing: '正在准备运行记录...'");
    expect(zhLocale).not.toContain("startingAssistant: '正在启动 AI 助手...'");
    const visibleChatStatusSources = `${assistantTurn}\n${chatView}\n${traceFooter}`;
    expect(visibleChatStatusSources).not.toContain('Starting assistant');
    expect(visibleChatStatusSources).not.toContain('run record');
    expect(visibleChatStatusSources).not.toContain('control plane');
    expect(visibleChatStatusSources).not.toContain('execution engine');
    expect(visibleChatStatusSources).not.toContain('reasoning trace');
  });
});
