import React from 'react';
import { Trash2 } from 'lucide-react';

import {
  DestructiveConfirmationActions,
  DialogFrame
} from './OverlayFrames';
import { IconTile } from './IconTile';
import { InlineAlert } from './InlineAlert';

export interface DestructiveConfirmationDialogProps {
  cancelLabel?: string;
  confirmLabel: string;
  description: React.ReactNode;
  error?: string | null;
  loadingLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
  pending?: boolean;
  subtitle: string;
  title: string;
  titleId: string;
}

export const DestructiveConfirmationDialog: React.FC<DestructiveConfirmationDialogProps> = ({
  cancelLabel,
  confirmLabel,
  description,
  error,
  loadingLabel,
  onCancel,
  onConfirm,
  open,
  pending = false,
  subtitle,
  title,
  titleId
}) => (
  <DialogFrame
    open={open}
    onClose={onCancel}
    closeDisabled={pending}
    titleId={titleId}
    title={(
      <span className="flex items-center gap-3">
        <IconTile size="sm" tone="danger">
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </IconTile>
        <span>{title}</span>
      </span>
    )}
    description={subtitle}
    width="sm"
    footer={(
      <DestructiveConfirmationActions
        cancelLabel={cancelLabel}
        confirmLabel={confirmLabel}
        loadingLabel={loadingLabel}
        onCancel={onCancel}
        onConfirm={onConfirm}
        pending={pending}
      />
    )}
  >
    <InlineAlert tone="warning" className="type-body">
      {description}
    </InlineAlert>
    {error && (
      <InlineAlert tone="danger" role="alert" aria-live="assertive" className="mt-4">
        {error}
      </InlineAlert>
    )}
  </DialogFrame>
);
