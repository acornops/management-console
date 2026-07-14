import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { ICONS, THEME_CLASSES } from '@/constants';
import { CloseButton } from '@/components/common/ComponentVocabulary';

export interface AppToast {
  id: string;
  message: string;
}

interface ToastViewportProps {
  toasts: AppToast[];
  isDark: boolean;
  onDismiss: (id: string) => void;
}

/**
 * Fixed-position toast stack for short, non-blocking status feedback.
 */
export const ToastViewport: React.FC<ToastViewportProps> = ({
  toasts,
  onDismiss
}) => {
  const { t } = useTranslation();

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div className="fixed inset-x-0 bottom-6 z-[100] flex justify-center px-4 pointer-events-none">
      <div className="w-full max-w-[22rem]">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="pointer-events-auto mb-3 w-full rounded-xl border border-ui-border bg-ui-surface shadow-lg"
              role="status"
              aria-live="polite"
            >
              <div className="px-4 py-3 flex items-start gap-3">
                <div
                  className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-status-success-soft text-status-success-text"
                >
                  <ICONS.CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <p className="flex-1 text-sm font-medium text-ui-text">
                  {toast.message}
                </p>
                <CloseButton
                  onClick={() => onDismiss(toast.id)}
                  aria-label={t('common.dismissNotification')}
                />
              </div>
              <motion.div
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: 3.8, ease: 'linear' }}
                className={`h-0.5 origin-left ${THEME_CLASSES.primary.bg}`}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>,
    document.body
  );
};
