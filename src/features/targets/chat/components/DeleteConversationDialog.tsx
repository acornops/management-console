import React from 'react';
import type { TFunction } from 'i18next';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { CloseButton } from '@/components/common/ComponentVocabulary';
import { Dialog } from '@/components/common/Dialog';

interface DeleteConversationDialogProps {
  sessionName: string;
  isDeleting: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  t: TFunction;
}

export const DeleteConversationDialog: React.FC<DeleteConversationDialogProps> = ({
  sessionName,
  isDeleting,
  error,
  onClose,
  onConfirm,
  t
}) => (
  <Dialog
    className="w-full max-w-md overflow-hidden rounded-xl border border-ui-border bg-ui-surface shadow-2xl"
    closeDisabled={isDeleting}
    overlayClassName="z-[120] bg-ui-text/35 dark:bg-ui-bg/70"
    titleId="delete-conversation-title"
    onClose={onClose}
  >
    <div className="flex items-center justify-between border-b border-ui-border bg-ui-bg px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-status-danger-soft text-status-danger-text">
          <Trash2 className="h-4 w-4" />
        </div>
        <div>
          <h3 id="delete-conversation-title" className="type-panel-title">{t('chat.deleteConversation')}</h3>
          <p className="mt-0.5 text-[11px] font-semibold text-ui-text-muted">{t('chat.deleteConversationSubtitle')}</p>
        </div>
      </div>
      <CloseButton
        onClick={onClose}
        disabled={isDeleting}
        aria-label={t('chat.closeDeleteConversation')}
      />
    </div>

    <div className="space-y-3 px-6 py-5">
      <p className="type-body">{t('chat.deleteConversationBody', { name: sessionName })}</p>
      <p className="type-caption rounded-lg border border-status-warning/25 bg-status-warning-soft px-3 py-2 text-status-warning-text">
        {t('chat.deleteConversationBoundary')}
      </p>
      {error && (
        <div className="type-caption rounded-lg border border-status-danger/25 bg-status-danger-soft px-3 py-2 text-status-danger-text">
          {error}
        </div>
      )}
    </div>
    <div className="flex justify-end gap-3 border-t border-ui-border bg-ui-bg px-6 py-4">
      <Button onClick={onClose} disabled={isDeleting} variant="secondary" size="sm">
        {t('app.cancel')}
      </Button>
      <Button onClick={() => void onConfirm()} disabled={isDeleting} variant="danger" size="sm">
        {isDeleting ? t('app.deleting') : t('chat.deleteConversation')}
      </Button>
    </div>
  </Dialog>
);
