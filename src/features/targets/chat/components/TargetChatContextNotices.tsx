import React from 'react';
import type { TFunction } from 'i18next';
import { Bot } from 'lucide-react';

import { InlineAlert } from '@acornops/ui';
import type { ChatSession } from '@/types';

export const TargetChatContextNotices: React.FC<{
  activeSession: ChatSession | null;
  isPanel: boolean;
  sessionDeepLinkError?: string | null;
  t: TFunction;
}> = ({ activeSession, isPanel, sessionDeepLinkError, t }) => (
  <>
    {sessionDeepLinkError && (
      <div className={`${isPanel ? 'px-5 sm:px-6' : 'px-[var(--ao-route-padding-x)]'} bg-ui-bg`}>
        <InlineAlert tone="warning">{sessionDeepLinkError}</InlineAlert>
      </div>
    )}
    {activeSession?.origin === 'auto_triage' && activeSession.automaticInvestigation && (
      <div className={`${isPanel ? 'px-5 sm:px-6' : 'px-[var(--ao-route-padding-x)]'} bg-ui-bg`}>
        <div className="type-caption type-emphasis flex flex-wrap items-center gap-x-2 gap-y-1 border-y border-ui-border py-2 text-ui-text-muted">
          <Bot className="h-4 w-4 text-accent-strong" aria-hidden="true" />
          <span>{t('chat.automaticInvestigation')}</span>
          <span aria-hidden="true">·</span>
          <span>{t(`chat.issueSeverity.${activeSession.automaticInvestigation.severity}`)}</span>
          <span aria-hidden="true">·</span>
          <span>{t(`chat.automaticWriteMode.${activeSession.automaticInvestigation.writeMode}`)}</span>
          {activeSession.automaticInvestigation.effectiveToolMode === 'read_only'
            && activeSession.automaticInvestigation.writeMode !== 'read_only' && (
            <>
              <span aria-hidden="true">·</span>
              <span>{t('chat.automaticPolicyReadOnly')}</span>
            </>
          )}
          {activeSession.automaticInvestigation.writeMode === 'full_write'
            && activeSession.automaticInvestigation.confirmationRequiredForWrite && (
            <>
              <span aria-hidden="true">·</span>
              <span>{t('chat.automaticPolicyReduced')}</span>
            </>
          )}
        </div>
      </div>
    )}
  </>
);
