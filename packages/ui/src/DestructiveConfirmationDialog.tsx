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
  closeLabel?: string;
  confirmDisabled?: boolean;
  confirmLabel: string;
  description: React.ReactNode;
  error?: string | null;
  loadingLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
  overlayClassName?: string;
  pending?: boolean;
  subtitle: string;
  title: string;
  titleId: string;
}

export const DestructiveConfirmationDialog: React.FC<DestructiveConfirmationDialogProps> = ({
  cancelLabel,
  closeLabel,
  confirmDisabled = false,
  confirmLabel,
  description,
  error,
  loadingLabel,
  onCancel,
  onConfirm,
  open,
  overlayClassName,
  pending = false,
  subtitle,
  title,
  titleId
}) => (
  <DialogFrame
    open={open}
    onClose={onCancel}
    closeDisabled={pending}
    closeLabel={closeLabel}
    overlayClassName={overlayClassName}
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
        disabled={confirmDisabled}
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
