import React from 'react';
import { twMerge } from 'tailwind-merge';

import { Button } from './Button';
import { CloseButton } from './CloseButton';
import { Dialog } from './Dialog';
import { RightSidePanel } from './RightSidePanel';

type FrameWidth = 'sm' | 'md' | 'lg' | 'xl';

const dialogWidths: Record<FrameWidth, string> = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl'
};

const dialogMaxWidths: Record<FrameWidth, string> = {
  sm: '28rem',
  md: '36rem',
  lg: '42rem',
  xl: '56rem'
};

const drawerWidths: Record<FrameWidth, string> = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl'
};

export interface FrameContentProps {
  bodyClassName?: string;
  children: React.ReactNode;
  closeDisabled?: boolean;
  closeLabel?: string;
  description?: React.ReactNode;
  descriptionId?: string;
  footer?: React.ReactNode;
  onClose: () => void;
  title?: React.ReactNode;
  titleId: string;
}

const FrameContent: React.FC<FrameContentProps> = ({ bodyClassName, children, closeDisabled = false, closeLabel = 'Close', description, descriptionId, footer, onClose, title, titleId }) => (
  <>
    <header className="flex min-w-0 items-start justify-between gap-4 border-b border-ui-border px-[var(--ao-overlay-padding-x)] py-[var(--ao-overlay-padding-y)]">
      <div className="min-w-0">
        <h2 id={titleId} className="type-section-title break-words text-ui-text">{title}</h2>
        {description && <div id={descriptionId} className="type-caption mt-1 max-w-[65ch] text-ui-text-muted">{description}</div>}
      </div>
      <CloseButton onClick={onClose} label={closeLabel} disabled={closeDisabled} />
    </header>
    <div className={twMerge('min-h-0 flex-1 overflow-y-auto px-[var(--ao-overlay-padding-x)] py-[var(--ao-overlay-padding-y)] custom-scrollbar', bodyClassName)}>{children}</div>
    {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-ui-border px-[var(--ao-overlay-padding-x)] py-[var(--ao-overlay-padding-y)]">{footer}</footer>}
  </>
);

export interface DialogFrameProps extends FrameContentProps {
  className?: string;
  closeDisabled?: boolean;
  id?: string;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  open?: boolean;
  overlayClassName?: string;
  unframed?: boolean;
  width?: FrameWidth;
}

export const DialogFrame: React.FC<DialogFrameProps> = ({
  className,
  closeDisabled = false,
  id,
  initialFocusRef,
  open = true,
  overlayClassName,
  unframed = false,
  width = 'md',
  ...content
}) => {
  if (!open) return null;
  const descriptionId = content.description ? content.descriptionId ?? `${content.titleId}-description` : undefined;

  return (
    <Dialog
      id={id}
      titleId={content.titleId}
      descriptionId={descriptionId}
      closeDisabled={closeDisabled}
      initialFocusRef={initialFocusRef}
      overlayClassName={overlayClassName}
      onClose={content.onClose}
      style={unframed ? undefined : {
        maxWidth: `min(calc(100vw - 2rem), ${dialogMaxWidths[width]})`,
        minWidth: 0,
        width: 'calc(100vw - 2rem)'
      }}
      className={twMerge(
        !unframed && 'flex min-w-0 max-h-[min(90vh,52rem)] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-ui-border bg-ui-surface shadow-2xl',
        !unframed && dialogWidths[width],
        className
      )}
    >
      {unframed
        ? content.children
        : <FrameContent {...content} descriptionId={descriptionId} closeDisabled={closeDisabled} />}
    </Dialog>
  );
};

export interface DrawerFrameProps extends Omit<FrameContentProps, 'titleId'> {
  ariaLabel?: string;
  className?: string;
  closeDisabled?: boolean;
  containerClassName?: string;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  id?: string;
  isOpen?: boolean;
  open?: boolean;
  overlayClassName?: string;
  portalToBody?: boolean;
  side?: 'left' | 'right';
  style?: React.CSSProperties;
  titleId?: string;
  unframed?: boolean;
  width?: FrameWidth;
}

export const DrawerFrame: React.FC<DrawerFrameProps> = ({
  ariaLabel,
  className,
  closeDisabled = false,
  containerClassName,
  initialFocusRef,
  id,
  isOpen,
  open,
  overlayClassName,
  portalToBody,
  side,
  style,
  unframed = false,
  width = 'md',
  ...content
}) => {
  const generatedTitleId = React.useId();
  const resolvedOpen = open ?? isOpen ?? false;
  const titleId = content.titleId ?? generatedTitleId;
  const descriptionId = content.description ? content.descriptionId ?? `${titleId}-description` : undefined;
  return (
    <RightSidePanel
      ariaLabel={ariaLabel}
      id={id}
      isOpen={resolvedOpen}
      onClose={content.onClose}
      closeDisabled={closeDisabled}
      containerClassName={containerClassName}
      initialFocusRef={initialFocusRef}
      titleId={unframed && ariaLabel ? undefined : titleId}
      descriptionId={descriptionId}
      overlayClassName={overlayClassName}
      portalToBody={portalToBody}
      side={side}
      style={style}
      className={twMerge(!unframed && drawerWidths[width], className)}
    >
      {unframed
        ? content.children
        : <FrameContent {...content} titleId={titleId} descriptionId={descriptionId} closeDisabled={closeDisabled} />}
    </RightSidePanel>
  );
};

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
