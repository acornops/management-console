import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Dialog } from '@/components/common/Dialog';

interface UnsavedChangesDialogProps {
  title: string;
  body: string;
  cancelLabel: string;
  discardLabel: string;
  onCancel: () => void;
  onDiscard: () => void;
}

export const UnsavedChangesDialog: React.FC<UnsavedChangesDialogProps> = ({
  title,
  body,
  cancelLabel,
  discardLabel,
  onCancel,
  onDiscard
}) => (
  <Dialog
    className="w-full max-w-md overflow-hidden rounded-xl border border-ui-border bg-ui-surface shadow-2xl"
    overlayClassName="z-[120] bg-ui-text/35 dark:bg-ui-bg/70"
    titleId="unsaved-changes-dialog-title"
    onClose={onCancel}
  >
    <div className="flex items-center justify-between border-b border-ui-border bg-ui-bg px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-status-warning-soft text-status-warning-text">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <h3 id="unsaved-changes-dialog-title" className="type-panel-title">{title}</h3>
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="rounded-lg p-1.5 text-ui-text-muted transition-colors hover:bg-ui-surface disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={cancelLabel}
      >
        <X className="h-4 w-4" />
      </button>
    </div>

    <div className="px-6 py-5">
      <p className="type-body text-ui-text">{body}</p>
    </div>

    <div className="flex justify-end gap-3 border-t border-ui-border bg-ui-bg px-6 py-4">
      <Button variant="secondary" size="sm" onClick={onCancel}>{cancelLabel}</Button>
      <Button variant="danger" size="sm" onClick={onDiscard}>{discardLabel}</Button>
    </div>
  </Dialog>
);
