import type { TFunction } from 'i18next';
import { useLayoutEffect, useRef, useState } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/common/Button';
import type { ChatSession } from '@/types';

interface ChatComposerNoticeProps {
  activeSessionId: string | null;
  isPanel: boolean;
  conversationNotice: string | null;
  recentActivityWarning: ChatSession['recentActivityWarning'] | null;
  onDismissRecentActivityWarning: (sessionId: string) => void;
  onOpenRecentActivitySession: (sessionId: string) => void;
  t: TFunction;
}

export function ChatComposerNotice({
  activeSessionId,
  isPanel,
  conversationNotice,
  recentActivityWarning,
  onDismissRecentActivityWarning,
  onOpenRecentActivitySession,
  t
}: ChatComposerNoticeProps) {
  const recentActivityWarningKey = recentActivityWarning
    ? [
        activeSessionId || '',
        recentActivityWarning.message,
        recentActivityWarning.actionSessionId || '',
        recentActivityWarning.actionLabel || ''
      ].join('\u001F')
    : null;
  const [dismissingWarningKey, setDismissingWarningKey] = useState<string | null>(null);
  const dismissTimeoutRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    setDismissingWarningKey(null);
    if (dismissTimeoutRef.current !== null) {
      window.clearTimeout(dismissTimeoutRef.current);
      dismissTimeoutRef.current = null;
    }
  }, [recentActivityWarningKey]);

  useLayoutEffect(() => () => {
    if (dismissTimeoutRef.current !== null) window.clearTimeout(dismissTimeoutRef.current);
  }, []);

  const isDismissingPrompt = Boolean(recentActivityWarningKey && dismissingWarningKey === recentActivityWarningKey);

  if (!conversationNotice && !recentActivityWarning) return null;

  const dismissPromptThenRun = (sessionId: string, action: (sessionId: string) => void) => {
    if (isDismissingPrompt || !recentActivityWarningKey || dismissTimeoutRef.current !== null) return;
    setDismissingWarningKey(recentActivityWarningKey);
    dismissTimeoutRef.current = window.setTimeout(() => {
      dismissTimeoutRef.current = null;
      action(sessionId);
    }, 220);
  };

  const actionSessionId = recentActivityWarning?.actionSessionId;
  const warningCardMotionClass = isDismissingPrompt
    ? 'translate-y-[calc(100%+0.75rem)] scale-[0.98] opacity-0'
    : 'translate-y-0 opacity-100';

  return (
    <div className={`${isPanel ? 'max-w-[36rem]' : 'max-w-2xl'} mx-auto -mb-2 space-y-2 px-3 text-sm text-ui-text sm:px-4`}>
      {conversationNotice && (
        <div className="relative z-0 mx-auto flex min-h-10 w-fit max-w-[92%] items-center gap-2.5 rounded-t-2xl border border-ui-border bg-ui-surface px-4 pb-4 pt-2.5 shadow-sm">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ui-bg text-ui-text-muted">
            <Info className="h-3.5 w-3.5" />
          </span>
          <p className="min-w-0 break-words text-xs font-semibold leading-5 text-ui-text-muted">{conversationNotice}</p>
        </div>
      )}
      {recentActivityWarning && (
        <div className={`relative z-0 mx-auto w-fit max-w-[94%] rounded-t-2xl border border-status-warning/35 bg-status-warning-soft/60 px-4 pb-6 pt-3 shadow-sm ring-1 ring-status-warning/10 transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none ${warningCardMotionClass}`}>
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ui-bg text-status-warning-text ring-1 ring-status-warning/20">
              <AlertTriangle className="h-3.5 w-3.5" />
            </span>
            <p className="min-w-0 break-words text-xs font-semibold leading-5 text-ui-text">{recentActivityWarning.message}</p>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2 pl-8">
            {actionSessionId && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={isDismissingPrompt}
                onClick={() => onOpenRecentActivitySession(actionSessionId)}
              >
                {recentActivityWarning.actionLabel || t('chat.openConversation')}
              </Button>
            )}
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={isDismissingPrompt || !activeSessionId}
              onClick={() => {
                if (activeSessionId) dismissPromptThenRun(activeSessionId, onDismissRecentActivityWarning);
              }}
            >
              {t('chat.continueSeparateChat')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
