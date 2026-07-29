import React from 'react';
import type { TFunction } from 'i18next';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@acornops/ui';
import { DialogFrame } from '@acornops/ui';
import type { ChatSession } from '@/types';

interface TargetChatGateDialogProps {
  activeSessionId: string | null;
  isPanel: boolean;
  recentActivityWarning: ChatSession['recentActivityWarning'] | null;
  onDismissRecentActivityWarning: (sessionId: string) => void;
  onOpenRecentActivitySession: (sessionId: string) => void;
  t: TFunction;
}

export const TargetChatGateDialog: React.FC<TargetChatGateDialogProps> = ({
  activeSessionId,
  isPanel,
  recentActivityWarning,
  onDismissRecentActivityWarning,
  onOpenRecentActivitySession,
  t
}) => {
  const dialogTitleId = React.useId();
  const dialogBodyId = React.useId();
  const primaryActionRef = React.useRef<HTMLButtonElement>(null);
  const actionSessionId = recentActivityWarning?.actionSessionId;
  const recentActivityBody = recentActivityWarning?.message.trim();
  const recentActivityActionLabel = recentActivityWarning?.actionLabel?.trim();

  if (!recentActivityWarning) return null;

  const title = t('chat.recentActivityActionTitle');
  const body = recentActivityBody || t('chat.chooseRecentActivityAction');
  return (
    <DialogFrame
      unframed
      titleId={dialogTitleId}
      descriptionId={dialogBodyId}
      initialFocusRef={primaryActionRef}
      closeDisabled={!activeSessionId}
      onClose={() => {
        if (activeSessionId) onDismissRecentActivityWarning(activeSessionId);
      }}
      overlayClassName="absolute z-[150] bg-ui-bg/88 dark:bg-ui-bg/92"
      className={`${isPanel ? 'max-w-sm' : 'max-w-md'} w-full rounded-lg border border-ui-border bg-ui-surface p-5 text-ui-text shadow-2xl shadow-ui-text/15 outline-none`}
    >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-ui-border bg-ui-bg text-ui-text-muted">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 id={dialogTitleId} className="type-panel-title text-ui-text">
              {title}
            </h2>
            <p id={dialogBodyId} className="mt-2 text-sm font-medium leading-6 text-ui-text-muted">
              {body}
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            ref={actionSessionId ? undefined : primaryActionRef}
            type="button"
            variant={actionSessionId ? 'secondary' : 'primary'}
            size="sm"
            disabled={!activeSessionId}
            onClick={() => {
              if (activeSessionId) onDismissRecentActivityWarning(activeSessionId);
            }}
          >
            {t('chat.continueSeparateChat')}
          </Button>
          {actionSessionId && (
            <Button ref={primaryActionRef} type="button" variant="primary" size="sm" onClick={() => onOpenRecentActivitySession(actionSessionId)}>
              {recentActivityActionLabel || t('chat.openConversation')}
            </Button>
          )}
        </div>
    </DialogFrame>
  );
};
