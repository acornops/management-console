import React from 'react';
import type { TFunction } from 'i18next';
import { Trash2 } from 'lucide-react';
import { Button, IconTile, InlineAlert } from '@acornops/ui';
import { CloseButton } from '@acornops/ui';
import { DialogFrame } from '@acornops/ui';

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
  <DialogFrame unframed
    className="w-full max-w-md overflow-hidden rounded-xl border border-ui-border bg-ui-surface shadow-2xl"
    closeDisabled={isDeleting}
    overlayClassName="z-[120] bg-ui-text/35 dark:bg-ui-bg/70"
    titleId="delete-conversation-title"
    onClose={onClose}
  >
    <div className="flex items-center justify-between border-b border-ui-border bg-ui-bg px-6 py-4">
      <div className="flex items-center gap-3">
        <IconTile size="sm" tone="danger">
          <Trash2 className="h-4 w-4" />
        </IconTile>
        <div>
          <h3 id="delete-conversation-title" className="type-panel-title">{t('chat.deleteConversation')}</h3>
          <p className="mt-0.5 type-caption">{t('chat.deleteConversationSubtitle')}</p>
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
      <InlineAlert tone="warning">
        {t('chat.deleteConversationBoundary')}
      </InlineAlert>
      {error && (
        <InlineAlert tone="danger" role="alert">
          {error}
        </InlineAlert>
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
  </DialogFrame>
);
