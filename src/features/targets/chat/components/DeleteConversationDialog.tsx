import React from 'react';
import type { TFunction } from 'i18next';
import { DestructiveConfirmationDialog } from '@acornops/ui';

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
  <DestructiveConfirmationDialog
    open
    overlayClassName="z-[120] bg-ui-text/35 dark:bg-ui-bg/70"
    titleId="delete-conversation-title"
    title={t('chat.deleteConversation')}
    subtitle={t('chat.deleteConversationSubtitle')}
    description={(
      <>
        <span className="block">{t('chat.deleteConversationBody', { name: sessionName })}</span>
        <span className="mt-2 block">{t('chat.deleteConversationBoundary')}</span>
      </>
    )}
    error={error}
    cancelLabel={t('app.cancel')}
    closeLabel={t('chat.closeDeleteConversation')}
    confirmLabel={t('chat.deleteConversation')}
    loadingLabel={t('app.deleting')}
    pending={isDeleting}
    onCancel={onClose}
    onConfirm={() => void onConfirm()}
  />
);
