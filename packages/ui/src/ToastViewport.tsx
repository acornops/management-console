import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { CheckCircle2 } from 'lucide-react';

import { CloseButton } from './CloseButton';

export interface AppToast {
  id: string;
  message: string;
}

export const TOAST_DURATION_MS = 3800;

export interface ToastViewportProps {
  toasts: AppToast[];
  dismissLabel?: string;
  isDark?: boolean;
  onDismiss: (id: string) => void;
}

/**
 * Fixed-position toast stack for short, non-blocking status feedback.
 */
export const ToastViewport: React.FC<ToastViewportProps> = ({
  dismissLabel = 'Dismiss notification',
  toasts,
  onDismiss
}) => {
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
              className="pointer-events-auto relative mb-3 w-full overflow-hidden rounded-xl border border-ui-border bg-ui-surface shadow-lg"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-center gap-3 py-2 pl-4 pr-2">
                <div
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-status-success-soft text-status-success-text"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                </div>
                <p className="flex-1 text-sm font-medium text-ui-text">
                  {toast.message}
                </p>
                <CloseButton
                  onClick={() => onDismiss(toast.id)}
                  aria-label={dismissLabel}
                  className="rounded-full border-transparent bg-transparent text-ui-text-muted shadow-none hover:bg-ui-bg hover:text-ui-text"
                />
              </div>
              <motion.div
                aria-hidden="true"
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: TOAST_DURATION_MS / 1000, ease: 'linear' }}
                className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-accent motion-reduce:hidden"
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>,
    document.body
  );
};
