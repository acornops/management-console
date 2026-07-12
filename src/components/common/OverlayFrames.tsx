import React from 'react';
import { twMerge } from 'tailwind-merge';

import { Button } from '@/components/common/Button';
import { CloseButton } from '@/components/common/ComponentVocabulary';
import { Dialog } from '@/components/common/Dialog';
import { RightSidePanel } from '@/components/common/RightSidePanel';

type FrameWidth = 'sm' | 'md' | 'lg' | 'xl';

const dialogWidths: Record<FrameWidth, string> = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl'
};

const drawerWidths: Record<FrameWidth, string> = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl'
};

interface FrameContentProps {
  bodyClassName?: string;
  children: React.ReactNode;
  closeLabel?: string;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
  title: React.ReactNode;
  titleId: string;
}

const FrameContent: React.FC<FrameContentProps> = ({ bodyClassName, children, closeLabel = 'Close', description, footer, onClose, title, titleId }) => (
  <>
    <header className="flex min-w-0 items-start justify-between gap-4 border-b border-ui-border px-[var(--overlay-padding-x)] py-[var(--overlay-padding-y)]">
      <div className="min-w-0">
        <h2 id={titleId} className="type-section-title break-words text-ui-text">{title}</h2>
        {description && <div className="type-caption mt-1 max-w-[65ch] text-ui-text-muted">{description}</div>}
      </div>
      <CloseButton onClick={onClose} label={closeLabel} />
    </header>
    <div className={twMerge('min-h-0 flex-1 overflow-y-auto px-[var(--overlay-padding-x)] py-[var(--overlay-padding-y)] custom-scrollbar', bodyClassName)}>{children}</div>
    {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-ui-border px-[var(--overlay-padding-x)] py-[var(--overlay-padding-y)]">{footer}</footer>}
  </>
);

export interface DialogFrameProps extends FrameContentProps {
  closeDisabled?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  open?: boolean;
  width?: FrameWidth;
}

export const DialogFrame: React.FC<DialogFrameProps> = ({ closeDisabled = false, initialFocusRef, open = true, width = 'md', ...content }) => {
  if (!open) return null;

  return (
    <Dialog
      titleId={content.titleId}
      closeDisabled={closeDisabled}
      initialFocusRef={initialFocusRef}
      onClose={content.onClose}
      className={twMerge('flex max-h-[min(90vh,52rem)] w-full flex-col overflow-hidden rounded-xl border border-ui-border bg-ui-surface shadow-2xl', dialogWidths[width])}
    >
      <FrameContent {...content} />
    </Dialog>
  );
};

export interface DrawerFrameProps extends FrameContentProps {
  closeDisabled?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  open: boolean;
  width?: FrameWidth;
}

export const DrawerFrame: React.FC<DrawerFrameProps> = ({ closeDisabled = false, initialFocusRef, open, width = 'md', ...content }) => (
  <RightSidePanel
    isOpen={open}
    onClose={content.onClose}
    closeDisabled={closeDisabled}
    initialFocusRef={initialFocusRef}
    titleId={content.titleId}
    className={drawerWidths[width]}
  >
    <FrameContent {...content} />
  </RightSidePanel>
);

export interface DestructiveConfirmationActionsProps {
  cancelLabel?: string;
  confirmLabel: string;
  disabled?: boolean;
  loadingLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
  pending?: boolean;
}

export const DestructiveConfirmationActions: React.FC<DestructiveConfirmationActionsProps> = ({
  cancelLabel = 'Cancel',
  confirmLabel,
  disabled,
  loadingLabel = 'Working...',
  onCancel,
  onConfirm,
  pending
}) => (
  <>
    <Button variant="tertiary" onClick={onCancel} disabled={pending}>{cancelLabel}</Button>
    <Button variant="danger" onClick={onConfirm} disabled={disabled || pending}>{pending ? loadingLabel : confirmLabel}</Button>
  </>
);
