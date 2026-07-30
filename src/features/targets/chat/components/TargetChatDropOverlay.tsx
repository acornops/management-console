import { AnimatePresence, motion } from 'framer-motion';
import { Upload } from 'lucide-react';
import type { TFunction } from 'i18next';
import type { ChatSession } from '@/types';

interface TargetChatDropOverlayProps {
  canPost: boolean;
  isFileDragActive: boolean;
  isRunActive: boolean;
  recentActivityWarning: ChatSession['recentActivityWarning'] | null;
  resolvedNoChatAccessKey: string;
  t: TFunction;
}

export function TargetChatDropOverlay({
  canPost,
  isFileDragActive,
  isRunActive,
  recentActivityWarning,
  resolvedNoChatAccessKey,
  t
}: TargetChatDropOverlayProps) {
  return (
    <AnimatePresence>
      {isFileDragActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-none absolute inset-0 z-[140] flex items-center justify-center bg-ui-bg/88 p-6 dark:bg-ui-bg/92"
        >
          <div className="flex min-h-48 w-full max-w-2xl flex-col items-center justify-center rounded-2xl border border-dashed border-accent/50 bg-accent/10 px-8 py-10 text-center shadow-lg shadow-ui-text/5">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-accent/30 bg-ui-surface text-accent-strong">
              <Upload className="h-5 w-5" />
            </div>
            <p className="type-panel-title mt-4 text-ui-text">{canPost && !isRunActive ? t('chat.dropFilesTitle') : t('chat.dropFilesUnavailableTitle')}</p>
            <p className="type-body mt-2 max-w-md leading-6 text-ui-text-muted">
              {canPost && !isRunActive ? t('chat.dropFilesBody') : recentActivityWarning ? t('chat.chooseRecentActivityAction') : t(resolvedNoChatAccessKey)}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
