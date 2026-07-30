import React from 'react';
import { Bot } from 'lucide-react';

import type { TargetChatViewBodyProps } from '@/features/targets/chat/components/TargetChatViewBody.types';

export const AutomaticInvestigationBrief: React.FC<{
  session: NonNullable<TargetChatViewBodyProps['activeSession']>;
  message: TargetChatViewBodyProps['visibleMessages'][number];
  timestampLabel: string;
  t: TargetChatViewBodyProps['t'];
}> = ({ session, message, timestampLabel, t }) => (
  <div className="flex w-full justify-start">
    <div className="w-full max-w-2xl rounded-xl border border-ui-border bg-ui-surface p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-ui-border bg-ui-bg text-accent-strong">
          <Bot className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="type-body type-emphasis text-ui-text">{t('chat.automaticInvestigationStarted')}</p>
          <p className="type-caption mt-1 leading-5 text-ui-text-muted">
            {session.name} · {t(`chat.issueSeverity.${session.automaticInvestigation?.severity || 'warning'}`)} · {timestampLabel}
          </p>
        </div>
      </div>
      <details className="mt-4 border-t border-ui-border pt-3">
        <summary className="control-target type-caption type-emphasis w-fit cursor-pointer text-ui-text-muted hover:text-ui-text">
          {t('chat.viewInvestigationBrief')}
        </summary>
        <pre className="type-code mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-ui-bg p-3 leading-5 text-ui-text-muted">
          {message.content}
        </pre>
      </details>
    </div>
  </div>
);
