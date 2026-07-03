import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { TFunction } from 'i18next';
import { AlertTriangle, Bot, Settings } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { getDialogFocusWrapIndex } from '@/components/common/Dialog';
import type { AiSettingsGateReason } from '@/features/targets/chat/components/targetChatViewHelpers';
import type { ChatSession } from '@/types';

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

interface TargetChatGateDialogProps {
  activeSessionId: string | null;
  aiSettingsGateReason: AiSettingsGateReason;
  canManageAiSettings: boolean;
  isPanel: boolean;
  recentActivityWarning: ChatSession['recentActivityWarning'] | null;
  onDismissRecentActivityWarning: (sessionId: string) => void;
  onOpenAiSettings: () => void;
  onOpenRecentActivitySession: (sessionId: string) => void;
  t: TFunction;
}

export const TargetChatGateDialog: React.FC<TargetChatGateDialogProps> = ({
  activeSessionId,
  aiSettingsGateReason,
  canManageAiSettings,
  isPanel,
  recentActivityWarning,
  onDismissRecentActivityWarning,
  onOpenAiSettings,
  onOpenRecentActivitySession,
  t
}) => {
  const shouldReduceMotion = useReducedMotion();
  const dialogTitleId = React.useId();
  const dialogBodyId = React.useId();
  const dialogRef = React.useRef<HTMLElement>(null);
  const primaryActionRef = React.useRef<HTMLButtonElement>(null);
  const actionSessionId = recentActivityWarning?.actionSessionId;
  const recentActivityBody = recentActivityWarning?.message.trim();
  const recentActivityActionLabel = recentActivityWarning?.actionLabel?.trim();
  const hasRecentActivityAction = Boolean(recentActivityWarning && (activeSessionId || actionSessionId));
  const hasDialogAction = recentActivityWarning ? hasRecentActivityAction : canManageAiSettings;

  React.useEffect(() => {
    const restoreTarget = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const primaryAction = primaryActionRef.current;
    if (primaryAction && !primaryAction.disabled) {
      primaryAction.focus({ preventScroll: true });
    } else {
      dialogRef.current?.focus({ preventScroll: true });
    }

    return () => {
      if (restoreTarget && document.contains(restoreTarget)) {
        restoreTarget.focus({ preventScroll: true });
      }
    };
  }, [activeSessionId, actionSessionId, aiSettingsGateReason, canManageAiSettings, Boolean(recentActivityWarning)]);

  if (!recentActivityWarning && !aiSettingsGateReason) return null;

  const title = recentActivityWarning
    ? t('chat.recentActivityActionTitle')
    : t('chat.aiSettingsRequiredTitle');
  const body = recentActivityWarning
    ? recentActivityBody || t('chat.chooseRecentActivityAction')
    : canManageAiSettings && aiSettingsGateReason === 'unavailable'
      ? t('chat.aiSettingsUnavailableManageBody')
      : canManageAiSettings
      ? t('chat.aiSettingsRequiredManageBody')
      : t('chat.aiSettingsRequiredReadOnlyBody');
  const icon = recentActivityWarning ? (
    <AlertTriangle className="h-5 w-5" />
  ) : canManageAiSettings ? (
    <Settings className="h-5 w-5" />
  ) : (
    <Bot className="h-5 w-5" />
  );
  const handleDialogKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Tab' || !hasDialogAction) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusableElements = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)).filter((element) => {
      if (element.getAttribute('aria-hidden') === 'true' || element.hasAttribute('hidden')) return false;
      const style = window.getComputedStyle(element);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
    const targetIndex = getDialogFocusWrapIndex({
      currentIndex: focusableElements.findIndex((element) => element === document.activeElement),
      focusableCount: focusableElements.length,
      shiftKey: event.shiftKey
    });
    if (targetIndex !== null) {
      event.preventDefault();
      event.stopPropagation();
      (focusableElements[targetIndex] || dialog).focus({ preventScroll: true });
    }
  };

  return (
    <motion.div
      className="absolute inset-0 z-[150] flex items-center justify-center bg-ui-bg/70 p-4 backdrop-blur-sm"
      initial={shouldReduceMotion ? false : { opacity: 0 }}
      animate={shouldReduceMotion ? undefined : { opacity: 1 }}
      exit={shouldReduceMotion ? undefined : { opacity: 0 }}
      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.section
        ref={dialogRef}
        role="dialog"
        aria-modal={hasDialogAction ? true : undefined}
        aria-labelledby={dialogTitleId}
        aria-describedby={dialogBodyId}
        tabIndex={-1}
        onKeyDown={handleDialogKeyDown}
        initial={shouldReduceMotion ? false : { opacity: 0, y: 10, scale: 0.98 }}
        animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
        exit={shouldReduceMotion ? undefined : { opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className={`${isPanel ? 'max-w-sm' : 'max-w-md'} w-full rounded-lg border border-ui-border bg-ui-surface p-5 text-ui-text shadow-2xl shadow-ui-text/15 outline-none`}
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-ui-border bg-ui-bg text-ui-text-muted">
            {icon}
          </span>
          <div className="min-w-0">
            <h2 id={dialogTitleId} className="text-base font-semibold leading-6 text-ui-text">
              {title}
            </h2>
            <p id={dialogBodyId} className="mt-2 text-sm font-medium leading-6 text-ui-text-muted">
              {body}
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {recentActivityWarning ? (
            <>
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
                <Button
                  ref={primaryActionRef}
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => onOpenRecentActivitySession(actionSessionId)}
                >
                  {recentActivityActionLabel || t('chat.openConversation')}
                </Button>
              )}
            </>
          ) : canManageAiSettings ? (
            <Button ref={primaryActionRef} type="button" variant="primary" size="sm" onClick={onOpenAiSettings}>
              {t('chat.openAiSettings')}
            </Button>
          ) : null}
        </div>
      </motion.section>
    </motion.div>
  );
};
