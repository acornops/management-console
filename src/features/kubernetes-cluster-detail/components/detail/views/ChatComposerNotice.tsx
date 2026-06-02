import type { TFunction } from 'i18next';
import { AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/common/Button';
import type { ChatSession } from '@/types';

interface ChatComposerNoticeProps {
  isPanel: boolean;
  conversationNotice: string | null;
  recentActivityWarning: ChatSession['recentActivityWarning'] | null;
  onDismissRecentActivityWarning: () => void;
  onOpenRecentActivitySession: (sessionId: string) => void;
  t: TFunction;
}

export function ChatComposerNotice({
  isPanel,
  conversationNotice,
  recentActivityWarning,
  onDismissRecentActivityWarning,
  onOpenRecentActivitySession,
  t
}: ChatComposerNoticeProps) {
  if (!conversationNotice && !recentActivityWarning) return null;

  return (
    <div className={`${isPanel ? 'max-w-3xl' : 'max-w-4xl'} mx-auto mb-3 space-y-2 text-sm text-ui-text`}>
      {conversationNotice && (
        <div className="flex items-start gap-3 rounded-md border border-ui-border bg-ui-bg px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-ui-text-muted" />
          <p className="font-medium leading-5 text-ui-text-muted">{conversationNotice}</p>
        </div>
      )}
      {recentActivityWarning && (
        <div className="rounded-md border border-status-warning/30 bg-status-warning-soft/45 px-4 py-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-status-warning-text" />
            <p className="font-semibold leading-5 text-ui-text">{recentActivityWarning.message}</p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {recentActivityWarning.actionSessionId && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => onOpenRecentActivitySession(recentActivityWarning.actionSessionId as string)}
              >
                {recentActivityWarning.actionLabel || t('chat.openConversation')}
              </Button>
            )}
            <Button type="button" variant="primary" size="sm" onClick={onDismissRecentActivityWarning}>
              {t('chat.continueSeparateChat')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
